"""Aesthetic scoring endpoint — Stage 2 of the pipeline."""

from __future__ import annotations

import asyncio
import logging
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.models.aesthetic import get_scorer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/aesthetic", tags=["aesthetic"])


class AestheticBatchItem(BaseModel):
    id: str
    score: float


class AestheticBatchResponse(BaseModel):
    items: list[AestheticBatchItem]
    elapsed_ms: int


@router.post("/batch", response_model=AestheticBatchResponse)
async def score_batch(
    images: Annotated[list[UploadFile], File()],
    ids: Annotated[list[str], Form()],
) -> AestheticBatchResponse:
    if len(images) != len(ids):
        raise HTTPException(
            status_code=400,
            detail=f"image count ({len(images)}) does not match id count ({len(ids)})",
        )
    if not images:
        return AestheticBatchResponse(items=[], elapsed_ms=0)

    raw_bytes = [await img.read() for img in images]

    # CLIP + MLP inference is CPU/GPU-bound — run in a worker thread so the event loop
    # can keep serving health checks while a big batch is being scored.
    loop = asyncio.get_running_loop()
    start = loop.time()
    scorer = await loop.run_in_executor(None, get_scorer)
    scores = await loop.run_in_executor(None, scorer.score_batch, raw_bytes)
    elapsed_ms = int((loop.time() - start) * 1000)

    items = [
        AestheticBatchItem(id=photo_id, score=score)
        for photo_id, score in zip(ids, scores, strict=True)
    ]
    return AestheticBatchResponse(items=items, elapsed_ms=elapsed_ms)
