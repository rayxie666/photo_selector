"""CLIP ViT-B/32 embedder for similarity clustering (Stage 3)."""

from __future__ import annotations

import io
import logging
import threading

import numpy as np
import open_clip
import torch
from PIL import Image

from app.config import settings

logger = logging.getLogger(__name__)

_CLIP_MODEL = "ViT-B-32"
_CLIP_PRETRAINED = "openai"


def _pick_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


class CLIPEmbedder:
    def __init__(self) -> None:
        self.device = _pick_device()
        logger.info("Loading CLIP %s for similarity on %s", _CLIP_MODEL, self.device)
        self.model, _, self.preprocess = open_clip.create_model_and_transforms(
            _CLIP_MODEL,
            pretrained=_CLIP_PRETRAINED,
            cache_dir=str(settings.model_cache_dir),
        )
        self.model = self.model.to(self.device).eval()

    @torch.inference_mode()
    def embed_batch(self, images: list[bytes]) -> np.ndarray:
        if not images:
            return np.zeros((0, 512), dtype=np.float32)
        tensors = []
        for raw in images:
            img = Image.open(io.BytesIO(raw)).convert("RGB")
            tensors.append(self.preprocess(img))
        batch = torch.stack(tensors).to(self.device)
        features = self.model.encode_image(batch)
        features = features / features.norm(dim=-1, keepdim=True)
        return features.float().cpu().numpy()


_embedder: CLIPEmbedder | None = None
_lock = threading.Lock()


def get_embedder() -> CLIPEmbedder:
    global _embedder
    if _embedder is None:
        with _lock:
            if _embedder is None:
                _embedder = CLIPEmbedder()
    return _embedder


def is_embedder_ready() -> bool:
    return _embedder is not None
