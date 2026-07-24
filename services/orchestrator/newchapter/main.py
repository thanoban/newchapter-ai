from __future__ import annotations

import hmac
import json
import os
import time
import uuid
from collections.abc import AsyncIterator
from typing import Literal

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .adapters.development import DevelopmentModelGateway
from .adapters.vertex import VertexModelGateway
from .domain import ConversationMessage, TurnRequest
from .orchestration import CareOrchestrator


class MessageInput(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class TurnInput(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[MessageInput] = Field(default_factory=list, max_length=8)
    channel: Literal["web", "voice"] = "web"


class TurnOutput(BaseModel):
    message: str
    riskLevel: str
    contributors: list[str]
    mode: str
    metadata: dict[str, str]


class ChatMessageInput(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1, max_length=10000)


class ChatCompletionInput(BaseModel):
    model: str = Field(default="newchapter-care", max_length=200)
    messages: list[ChatMessageInput] = Field(min_length=1, max_length=32)
    stream: bool = False
    user: str | None = Field(default=None, max_length=128)


def build_orchestrator() -> CareOrchestrator:
    if os.getenv("GOOGLE_CLOUD_PROJECT"):
        return CareOrchestrator(VertexModelGateway())
    return CareOrchestrator(DevelopmentModelGateway())


app = FastAPI(
    title="NewChapter Orchestrator",
    version="0.1.0",
    docs_url="/internal/docs",
    redoc_url=None,
)
orchestrator = build_orchestrator()


def authorize(authorization: str | None) -> None:
    expected = os.getenv("ORCHESTRATOR_SERVICE_TOKEN")
    if not expected:
        return
    expected = expected.strip()

    scheme, _, supplied = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not hmac.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="Invalid service token.")


async def run_chat_completion(
    payload: ChatCompletionInput,
) -> tuple[str, str]:
    user_positions = [
        index for index, message in enumerate(payload.messages) if message.role == "user"
    ]
    if not user_positions:
        raise HTTPException(status_code=422, detail="A user message is required.")

    current_index = user_positions[-1]
    current = payload.messages[current_index]
    history = tuple(
        ConversationMessage(role=message.role, content=message.content)
        for message in payload.messages[:current_index]
        if message.role in {"user", "assistant"}
    )[-8:]
    result = await orchestrator.handle(
        TurnRequest(
            conversation_id=payload.user or f"voice-{uuid.uuid4()}",
            message=current.content,
            history=history,
            channel="voice",
        )
    )
    return clean_spoken_response(result.message), result.risk_level.value


def clean_spoken_response(message: str) -> str:
    cleaned = message.strip()
    for prefix in ("nelly:", "maya:", "assistant:"):
        if cleaned.lower().startswith(prefix):
            return cleaned[len(prefix) :].lstrip()
    return cleaned


def completion_chunk(
    completion_id: str,
    model: str,
    delta: dict[str, str],
    finish_reason: str | None = None,
) -> str:
    body = {
        "id": completion_id,
        "object": "chat.completion.chunk",
        "created": int(time.time()),
        "model": model,
        "choices": [
            {
                "index": 0,
                "delta": delta,
                "finish_reason": finish_reason,
            }
        ],
    }
    return f"data: {json.dumps(body)}\n\n"


async def stream_completion(
    completion_id: str,
    model: str,
    message: str,
) -> AsyncIterator[str]:
    yield completion_chunk(completion_id, model, {"role": "assistant"})
    yield completion_chunk(completion_id, model, {"content": message})
    yield completion_chunk(completion_id, model, {}, "stop")
    yield "data: [DONE]\n\n"


@app.get("/healthz")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/readyz")
async def ready() -> dict[str, str]:
    mode = "vertex" if os.getenv("GOOGLE_CLOUD_PROJECT") else "development"
    return {"status": "ready", "modelGateway": mode}


@app.post(
    "/v1/conversations/{conversation_id}/turns",
    response_model=TurnOutput,
)
async def create_turn(
    conversation_id: str,
    payload: TurnInput,
    authorization: str | None = Header(default=None),
) -> TurnOutput:
    authorize(authorization)
    result = await orchestrator.handle(
        TurnRequest(
            conversation_id=conversation_id,
            message=payload.message,
            history=tuple(
                ConversationMessage(role=item.role, content=item.content)
                for item in payload.history
            ),
            channel=payload.channel,
        )
    )
    return TurnOutput(
        message=result.message,
        riskLevel=result.risk_level.value,
        contributors=list(result.contributors),
        mode=result.mode,
        metadata=result.metadata,
    )


@app.post("/v1/chat/completions")
async def chat_completions(
    payload: ChatCompletionInput,
    authorization: str | None = Header(default=None),
):
    authorize(authorization)
    message, risk_level = await run_chat_completion(payload)
    completion_id = f"chatcmpl-{uuid.uuid4().hex}"

    if payload.stream:
        return StreamingResponse(
            stream_completion(completion_id, payload.model, message),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-NewChapter-Risk-Level": risk_level,
            },
        )

    return {
        "id": completion_id,
        "object": "chat.completion",
        "created": int(time.time()),
        "model": payload.model,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": message},
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
    }
