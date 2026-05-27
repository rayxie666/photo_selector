"""Similarity clustering — Stage 3 entry point.

Pipeline: image bytes -> CLIP ViT-B/32 embeddings -> DBSCAN(cosine).
Photos with no neighbors above the threshold receive a unique cluster id.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Annotated

import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sklearn.cluster import DBSCAN

from app.models.clip_embedder import get_embedder

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/similarity", tags=["similarity"])


class ClusterItem(BaseModel):
    id: str
    cluster_id: int = Field(description="Stable cluster id; singletons receive a unique value.")


class ClusterResponse(BaseModel):
    items: list[ClusterItem]
    n_clusters: int = Field(description="Total cluster count including singletons.")
    n_groups: int = Field(description="Cluster count excluding singletons (PK-eligible).")
    elapsed_ms: int


def _cluster(embeddings: np.ndarray, eps: float) -> list[int]:
    """Return cluster id per row. DBSCAN noise points (-1) get unique singleton ids."""
    if embeddings.shape[0] == 0:
        return []
    db = DBSCAN(eps=eps, min_samples=2, metric="cosine").fit(embeddings)
    labels = db.labels_.tolist()
    # Promote noise (-1) to its own singleton id, continuing past existing clusters.
    next_singleton = (max(labels) + 1) if any(label != -1 for label in labels) else 0
    out: list[int] = []
    for label in labels:
        if label == -1:
            out.append(next_singleton)
            next_singleton += 1
        else:
            out.append(label)
    return out


@router.post("/cluster", response_model=ClusterResponse)
async def cluster(
    images: Annotated[list[UploadFile], File()],
    ids: Annotated[list[str], Form()],
    eps: Annotated[float, Form()] = 0.15,
) -> ClusterResponse:
    if len(images) != len(ids):
        raise HTTPException(
            status_code=400,
            detail=f"image count ({len(images)}) does not match id count ({len(ids)})",
        )
    if not images:
        return ClusterResponse(items=[], n_clusters=0, n_groups=0, elapsed_ms=0)

    raw_bytes = [await img.read() for img in images]

    loop = asyncio.get_running_loop()
    start = loop.time()
    embedder = await loop.run_in_executor(None, get_embedder)
    embeddings = await loop.run_in_executor(None, embedder.embed_batch, raw_bytes)
    cluster_ids = await loop.run_in_executor(None, _cluster, embeddings, eps)
    elapsed_ms = int((loop.time() - start) * 1000)

    counts: dict[int, int] = {}
    for cid in cluster_ids:
        counts[cid] = counts.get(cid, 0) + 1
    n_groups = sum(1 for v in counts.values() if v >= 2)

    items = [
        ClusterItem(id=photo_id, cluster_id=cid)
        for photo_id, cid in zip(ids, cluster_ids, strict=True)
    ]
    return ClusterResponse(
        items=items,
        n_clusters=len(counts),
        n_groups=n_groups,
        elapsed_ms=elapsed_ms,
    )
