from __future__ import annotations

import re
from dataclasses import dataclass

from .domain import RiskLevel


@dataclass(frozen=True)
class SafetyDecision:
    level: RiskLevel
    reason: str


class SafetyTriage:
    """Deterministic first gate; Model Armor is an additional production gate."""

    _immediate_patterns = tuple(
        re.compile(pattern, re.IGNORECASE)
        for pattern in (
            r"\bkill myself\b",
            r"\bend my life\b",
            r"\bwant to die\b",
            r"\bsuicid(?:e|al)\b",
            r"\bhurt myself\b",
            r"\bhurt (?:him|her|them|someone)\b",
        )
    )
    _elevated_patterns = tuple(
        re.compile(pattern, re.IGNORECASE)
        for pattern in (
            r"\bno reason to live\b",
            r"\bcan't go on\b",
            r"\bnot safe\b",
            r"\blose control\b",
        )
    )

    def evaluate(self, text: str) -> SafetyDecision:
        if any(pattern.search(text) for pattern in self._immediate_patterns):
            return SafetyDecision(RiskLevel.IMMEDIATE, "explicit-harm-language")
        if any(pattern.search(text) for pattern in self._elevated_patterns):
            return SafetyDecision(RiskLevel.ELEVATED, "possible-safety-concern")
        return SafetyDecision(RiskLevel.STANDARD, "no-deterministic-risk-signal")


IMMEDIATE_SAFETY_RESPONSE = (
    "I’m really glad you said this out loud. Your immediate safety matters more "
    "than this chat. Please contact local emergency services now or go to the "
    "nearest emergency department, and ask a trusted person to stay with you. "
    "Move away from anything you could use to hurt yourself. Are you in "
    "immediate danger right now?"
)
