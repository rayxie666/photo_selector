## ADDED Requirements

### Requirement: System provides a local Python backend service
The system SHALL ship a FastAPI-based Python backend that runs on the user's machine and hosts all AI inference and LLM routing.

#### Scenario: Backend exposes a health endpoint
- **WHEN** the frontend issues `GET /api/health`
- **THEN** the backend responds 200 with `{version, gpuAvailable, models: {clip: ready|missing, aesthetic: ready|missing}}`

#### Scenario: Backend startup downloads missing model weights
- **WHEN** the backend starts and any required model weight (CLIP / aesthetic scorer) is missing locally
- **THEN** the backend begins downloading the weight and reports `missing` until download completes; the health endpoint reflects in-progress status

#### Scenario: Frontend reaches backend through Vite proxy
- **WHEN** the frontend in dev mode requests any `/api/*` URL
- **THEN** Vite transparently proxies the request to `http://localhost:8000`

### Requirement: Backend uses uv for dependency management
The system SHALL declare all Python dependencies in `backend/pyproject.toml` and use `uv` for environment management and locking.

#### Scenario: Reproducible install
- **WHEN** a new developer runs `uv sync` in the `backend/` directory
- **THEN** the exact same dependency versions are installed as those captured in `uv.lock`

### Requirement: Backend does not persist user images or credentials
The system SHALL process every image and API key in memory only, and SHALL NOT write either to disk beyond the immediate inference request.

#### Scenario: Image data is discarded after response
- **WHEN** the backend completes any inference request
- **THEN** the request's image bytes are released and not written to any cache or log

#### Scenario: API keys arrive per request and are not stored
- **WHEN** a request includes an `Authorization` header with an LLM API key
- **THEN** the key is used only for that request and is not stored to disk, environment, or in-process cache
