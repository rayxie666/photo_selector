from __future__ import annotations

import importlib.metadata
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.config import settings
from app.models.aesthetic import is_scorer_ready
from app.models.clip_embedder import is_embedder_ready
from app.routes import aesthetic as aesthetic_routes
from app.routes import llm as llm_routes
from app.routes import similarity as similarity_routes

app = FastAPI(title="Photo Selector Backend", version="0.1.0")
app.include_router(aesthetic_routes.router)
app.include_router(llm_routes.router)
app.include_router(similarity_routes.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


ModelStatus = Literal["ready", "missing", "downloading"]


class ModelsStatus(BaseModel):
    clip: ModelStatus
    aesthetic: ModelStatus


class HealthResponse(BaseModel):
    version: str
    gpu_available: bool
    gpu_kind: Literal["cuda", "mps", "none"]
    models: ModelsStatus
    model_cache_dir: str


def _detect_gpu() -> tuple[bool, Literal["cuda", "mps", "none"]]:
    # torch is not yet a dependency (added in chapter 5). Probe lazily and degrade silently.
    try:
        import torch  # type: ignore[import-not-found]
    except ModuleNotFoundError:
        return False, "none"
    if torch.cuda.is_available():
        return True, "cuda"
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return True, "mps"
    return False, "none"


def _model_status(name: str) -> ModelStatus:
    if name == "aesthetic":
        return "ready" if is_scorer_ready() else "missing"
    if name == "clip":
        return "ready" if is_embedder_ready() else "missing"
    candidate = settings.model_cache_dir / name
    return "ready" if candidate.exists() else "missing"


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    try:
        version = importlib.metadata.version("photo-selector-backend")
    except importlib.metadata.PackageNotFoundError:
        version = "0.1.0"
    gpu_available, gpu_kind = _detect_gpu()
    return HealthResponse(
        version=version,
        gpu_available=gpu_available,
        gpu_kind=gpu_kind,
        models=ModelsStatus(
            clip=_model_status("clip"),
            aesthetic=_model_status("aesthetic"),
        ),
        model_cache_dir=str(settings.model_cache_dir),
    )
