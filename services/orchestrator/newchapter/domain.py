from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class RiskLevel(StrEnum):
    STANDARD = "standard"
    ELEVATED = "elevated"
    IMMEDIATE = "immediate"


@dataclass(frozen=True)
class ConversationMessage:
    role: str
    content: str


@dataclass(frozen=True)
class TurnRequest:
    conversation_id: str
    message: str
    history: tuple[ConversationMessage, ...] = ()
    channel: str = "web"


@dataclass(frozen=True)
class AgentContribution:
    agent: str
    content: str


@dataclass(frozen=True)
class TurnResult:
    message: str
    risk_level: RiskLevel
    contributors: tuple[str, ...]
    mode: str = "vertex"
    metadata: dict[str, str] = field(default_factory=dict)
