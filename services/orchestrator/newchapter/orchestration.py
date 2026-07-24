from __future__ import annotations

import asyncio

from .agents import CareReviewer, ResponseComposer, build_specialists
from .domain import RiskLevel, TurnRequest, TurnResult
from .ports import ModelGateway
from .safety import IMMEDIATE_SAFETY_RESPONSE, SafetyTriage


SAFE_FALLBACK = (
    "What you’re feeling makes sense in the middle of a loss. We do not need to "
    "solve the whole story right now. Name the strongest feeling in one word, "
    "then notice where it sits in your body. What would feel like the kindest "
    "next ten minutes?"
)


class CareOrchestrator:
    def __init__(self, gateway: ModelGateway) -> None:
        self._triage = SafetyTriage()
        self._specialists = build_specialists(gateway)
        self._composer = ResponseComposer(gateway)
        self._reviewer = CareReviewer()

    async def handle(self, turn: TurnRequest) -> TurnResult:
        decision = self._triage.evaluate(turn.message)

        if decision.level is RiskLevel.IMMEDIATE:
            return TurnResult(
                message=IMMEDIATE_SAFETY_RESPONSE,
                risk_level=RiskLevel.IMMEDIATE,
                contributors=("safety",),
                mode="safety-override",
                metadata={"reason": decision.reason},
            )

        context = self._context(turn)
        if turn.channel == "voice":
            return await self._handle_voice(context, decision.level, decision.reason)

        notes = await asyncio.gather(
            *(agent.contribute(context) for agent in self._specialists),
            return_exceptions=True,
        )
        usable_notes = [
            str(note).strip()
            for note in notes
            if not isinstance(note, Exception) and str(note).strip()
        ]

        if not usable_notes:
            return self._fallback(decision.level, decision.reason)

        composed = await self._composer.compose(
            f"User context:\n{context}\n\nSpecialist notes:\n"
            + "\n---\n".join(usable_notes)
        )
        if not self._reviewer.approve(composed):
            return self._fallback(decision.level, "response-review-failed")

        return TurnResult(
            message=composed.strip(),
            risk_level=decision.level,
            contributors=("safety", "listener", "reframe", "coach", "critic"),
            metadata={"reason": decision.reason},
        )

    async def _handle_voice(
        self,
        context: str,
        level: RiskLevel,
        reason: str,
    ) -> TurnResult:
        try:
            composed = await self._composer.compose(context, voice=True)
        except Exception:
            return self._fallback(level, "voice-generation-failed")

        if not self._reviewer.approve(composed):
            return self._fallback(level, "voice-response-review-failed")

        return TurnResult(
            message=composed.strip(),
            risk_level=level,
            contributors=("safety", "listener", "reframe", "coach", "critic"),
            mode="vertex-voice-fast-path",
            metadata={"reason": reason},
        )

    @staticmethod
    def _context(turn: TurnRequest) -> str:
        recent = turn.history[-8:]
        transcript = "\n".join(
            f"{message.role}: {message.content[:1000]}" for message in recent
        )
        return f"{transcript}\nuser: {turn.message}".strip()

    @staticmethod
    def _fallback(level: RiskLevel, reason: str) -> TurnResult:
        return TurnResult(
            message=SAFE_FALLBACK,
            risk_level=level,
            contributors=("safety", "critic"),
            mode="safe-fallback",
            metadata={"reason": reason},
        )
