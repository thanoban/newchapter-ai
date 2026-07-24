from __future__ import annotations

import os

from google import genai
from google.genai import types


class VertexModelGateway:
    def __init__(self) -> None:
        project = os.environ["GOOGLE_CLOUD_PROJECT"]
        location = os.getenv("GOOGLE_CLOUD_LOCATION", "global")
        self._model = os.getenv("VERTEX_MODEL", "gemini-2.5-flash")
        self._voice_model = os.getenv(
            "VERTEX_VOICE_MODEL", "gemini-2.5-flash-lite"
        )
        self._client = genai.Client(
            vertexai=True,
            project=project,
            location=location,
            http_options=types.HttpOptions(api_version="v1"),
        )

    async def generate(
        self,
        *,
        agent: str,
        system_instruction: str,
        user_content: str,
    ) -> str:
        voice = agent == "voice-composer"
        response = await self._client.aio.models.generate_content(
            model=self._voice_model if voice else self._model,
            contents=user_content,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.35,
                max_output_tokens=120 if voice else 320,
            ),
        )
        return response.text or ""
