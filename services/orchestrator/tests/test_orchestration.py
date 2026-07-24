import unittest

from newchapter.domain import RiskLevel, TurnRequest
from newchapter.orchestration import CareOrchestrator


class StubGateway:
    def __init__(self):
        self.calls = []

    async def generate(self, *, agent, system_instruction, user_content):
        del system_instruction, user_content
        self.calls.append(agent)
        if agent == "voice-composer":
            return "That sounds heavy. Take one slow breath with me. What feels strongest?"
        if agent == "composer":
            return "This hurts, and it makes sense. What is one kind thing you can do now?"
        return f"{agent} contribution"


class CareOrchestratorTests(unittest.IsolatedAsyncioTestCase):
    async def test_immediate_risk_bypasses_model_agents(self):
        result = await CareOrchestrator(StubGateway()).handle(
            TurnRequest("conversation-1", "I want to kill myself")
        )

        self.assertEqual(result.risk_level, RiskLevel.IMMEDIATE)
        self.assertEqual(result.mode, "safety-override")
        self.assertEqual(result.contributors, ("safety",))
        self.assertIn("immediate safety", result.message.lower())

    async def test_standard_turn_combines_specialists(self):
        result = await CareOrchestrator(StubGateway()).handle(
            TurnRequest("conversation-2", "I miss them every night")
        )

        self.assertEqual(result.risk_level, RiskLevel.STANDARD)
        self.assertEqual(result.mode, "vertex")
        self.assertIn("critic", result.contributors)
        self.assertIn("kind thing", result.message)

    async def test_voice_turn_uses_one_low_latency_composition_call(self):
        gateway = StubGateway()
        result = await CareOrchestrator(gateway).handle(
            TurnRequest(
                "conversation-3",
                "I am feeling depressed",
                channel="voice",
            )
        )

        self.assertEqual(gateway.calls, ["voice-composer"])
        self.assertEqual(result.mode, "vertex-voice-fast-path")
        self.assertIn("listener", result.contributors)


if __name__ == "__main__":
    unittest.main()
