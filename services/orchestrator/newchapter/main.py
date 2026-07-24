from __future__ import annotations

import os
from typing import Literal

from fastapi import FastAPI
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
async def create_turn(conversation_id: str, payload: TurnInput) -> TurnOutput:
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
