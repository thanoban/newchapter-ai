from __future__ import annotations


class DevelopmentModelGateway:
    """Credential-free adapter for local development and contract tests."""

    async def generate(
        self,
        *,
        agent: str,
        system_instruction: str,
        user_content: str,
    ) -> str:
        del system_instruction, user_content
        responses = {
            "listener": "There is real grief here, and it does not need to be rushed.",
            "reframe": "Missing someone is a feeling, not an instruction to act.",
            "coach": "Put both feet on the floor and take one slow breath.",
            "composer": (
                "There is real grief here, and it does not need to be rushed. "
                "Missing someone is a feeling, not an instruction to act. Put both "
                "feet on the floor and take one slow breath. What feeling is "
                "strongest right now?"
            ),
        }
        return responses.get(agent, "")
