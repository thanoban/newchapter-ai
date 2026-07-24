# NewChapter AI

Safety-first emotional support for adults recovering from heartbreak, with a
real-time presence avatar and coordinated specialist agents powered by Vertex
AI.

NewChapter does not claim to erase thoughts, replace therapy, or provide
emergency care. Its goal is to reduce the urgency of painful thought loops and
help users choose one healthy next action.

## Repository structure

- `app/` — responsive Next/vinext web experience and secure backend-for-frontend
- `services/orchestrator/` — deployable FastAPI multi-agent coordination service
- `services/avatar-renderer/` — isolated LiveKit/Beyond Presence media adapter
- `docs/` — architecture, safety boundaries, and operating decisions
- `worker/` — Cloudflare-compatible web worker entry point

## Local web development

```bash
npm install
npm run dev
```

Without `ORCHESTRATOR_BASE_URL`, the web app uses a clearly identified,
deterministic development fallback. Secrets belong in an ignored `.env` file;
the required names are documented in `.env.example`.

## Orchestrator development

```bash
cd services/orchestrator
python -m venv .venv
.venv/Scripts/pip install -e ".[dev]"
.venv/Scripts/uvicorn newchapter.main:app --reload --port 8080
```

Vertex AI uses Application Default Credentials and the standard
`GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, and
`GOOGLE_GENAI_USE_VERTEXAI` environment variables. No model key is sent to the
browser.

## Verification

```bash
npm test
cd services/orchestrator
python -m unittest discover -s tests
```

Read [the production architecture](docs/ARCHITECTURE.md) and
[the safety boundaries](docs/SAFETY_AND_CLINICAL_BOUNDARIES.md) before changing
agent behavior.
