from unittest.mock import patch

from fastapi.testclient import TestClient

from newchapter import main
from newchapter.domain import RiskLevel, TurnResult


class StubOrchestrator:
    async def handle(self, turn):
        del turn
        return TurnResult(
            message="This hurts, and we can take one kind step at a time.",
            risk_level=RiskLevel.STANDARD,
            contributors=("safety", "listener", "reframe", "coach", "critic"),
        )


def test_openai_compatible_streaming_contract():
    original = main.orchestrator
    main.orchestrator = StubOrchestrator()
    try:
        with patch.dict(
            "os.environ", {"ORCHESTRATOR_SERVICE_TOKEN": "test-token"}, clear=False
        ):
            with TestClient(main.app) as client:
                response = client.post(
                    "/v1/chat/completions",
                    headers={"Authorization": "Bearer test-token"},
                    json={
                        "model": "newchapter-care",
                        "messages": [{"role": "user", "content": "I miss them."}],
                        "stream": True,
                    },
                )
    finally:
        main.orchestrator = original

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert '"object": "chat.completion.chunk"' in response.text
    assert '"content": "This hurts, and we can take one kind step at a time."' in response.text
    assert response.text.rstrip().endswith("data: [DONE]")


def test_openai_compatible_endpoint_rejects_wrong_token():
    with patch.dict(
        "os.environ", {"ORCHESTRATOR_SERVICE_TOKEN": "test-token"}, clear=False
    ):
        with TestClient(main.app) as client:
            response = client.post(
                "/v1/chat/completions",
                headers={"Authorization": "Bearer wrong-token"},
                json={
                    "messages": [{"role": "user", "content": "Hello"}],
                },
            )

    assert response.status_code == 401
