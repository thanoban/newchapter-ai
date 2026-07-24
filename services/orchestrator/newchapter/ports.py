from __future__ import annotations

from typing import Protocol

from .domain import ConversationMessage


class ModelGateway(Protocol):
    async def generate(
        self,
        *,
        agent: str,
        system_instruction: str,
        user_content: str,
    ) -> str:
        """Generate one bounded agent contribution."""


class ConversationRepository(Protocol):
    async def append(
        self,
        conversation_id: str,
        messages: tuple[ConversationMessage, ...],
    ) -> None:
        """Persist messages through a consent and retention-aware adapter."""
