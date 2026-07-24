from __future__ import annotations

from .ports import ModelGateway


FOUNDATION = """
NewChapter is emotional support for adults after heartbreak. It is not therapy,
medical care, or emergency care. Do not diagnose. Do not promise recovery,
certainty, reconciliation, or memory erasure. Do not shame an ex-partner or
encourage harassment, surveillance, revenge, manipulation, or dependency on
the AI. Respect grief and user autonomy. Prefer one grounded observation and
one small, practical next step. Keep the contribution under 120 words.
""".strip()


class SpecialistAgent:
    def __init__(self, name: str, mission: str, gateway: ModelGateway) -> None:
        self.name = name
        self._mission = mission
        self._gateway = gateway

    async def contribute(self, context: str) -> str:
        return await self._gateway.generate(
            agent=self.name,
            system_instruction=f"{FOUNDATION}\n\nYour mission: {self._mission}",
            user_content=context,
        )


def build_specialists(gateway: ModelGateway) -> tuple[SpecialistAgent, ...]:
    return (
        SpecialistAgent(
            "listener",
            "Reflect the emotion and unmet need without interpreting beyond the evidence.",
            gateway,
        ),
        SpecialistAgent(
            "reframe",
            "Offer a gentle alternative to one rigid or self-blaming thought. Never invalidate.",
            gateway,
        ),
        SpecialistAgent(
            "coach",
            "Suggest one safe action achievable in the next ten minutes.",
            gateway,
        ),
    )


class ResponseComposer:
    def __init__(self, gateway: ModelGateway) -> None:
        self._gateway = gateway

    async def compose(self, context: str, *, voice: bool = False) -> str:
        if voice:
            return await self._gateway.generate(
                agent="voice-composer",
                system_instruction=(
                    f"{FOUNDATION}\n\nYou are Nelly, a calm presence companion. "
                    "Respond naturally to the user's latest spoken turn. Silently "
                    "apply three perspectives: reflect the emotion, loosen one "
                    "painful interpretation, and offer one tiny safe next step. "
                    "Never mention internal agents. Sound warm, patient, and "
                    "affectionately supportive without becoming romantic or "
                    "encouraging dependency. Use short sentences, gentle commas, "
                    "and natural pauses so the voice speaks slowly. Avoid clinical, "
                    "corporate, or overly cheerful language. Never start with your "
                    "name or a speaker label. Use no more than 28 spoken words, "
                    "split across at most three short sentences, and end with at "
                    "most one gentle question."
                ),
                user_content=context,
            )

        return await self._gateway.generate(
            agent="composer",
            system_instruction=(
                f"{FOUNDATION}\n\nCombine the specialist notes into one natural "
                "response spoken by Nelly. Do not mention agents or internal notes. "
                "Use two short paragraphs at most and end with one gentle question."
            ),
            user_content=context,
        )


class CareReviewer:
    _blocked_phrases = (
        "you should stalk",
        "get revenge",
        "i guarantee",
        "erase your memory",
        "only need me",
    )

    def approve(self, response: str) -> bool:
        normalized = response.lower()
        return bool(response.strip()) and not any(
            phrase in normalized for phrase in self._blocked_phrases
        )
