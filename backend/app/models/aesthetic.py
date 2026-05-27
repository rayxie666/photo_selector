"""LAION-Aesthetic-Predictor V2 — CLIP ViT-L/14 features + 5-layer MLP.

Score range is roughly [1, 10] (trained against AVA / SAC / LOGOS aesthetic ratings).
"""

from __future__ import annotations

import io
import logging
import threading
import urllib.request
from pathlib import Path

import numpy as np
import open_clip
import torch
import torch.nn as nn
from PIL import Image

from app.config import settings

logger = logging.getLogger(__name__)

# Canonical source: https://github.com/christophschuhmann/improved-aesthetic-predictor
_MLP_WEIGHTS_URL = (
    "https://github.com/christophschuhmann/improved-aesthetic-predictor/"
    "raw/main/sac%2Blogos%2Bava1-l14-linearMSE.pth"
)
_MLP_WEIGHTS_FILENAME = "sac+logos+ava1-l14-linearMSE.pth"
_CLIP_MODEL = "ViT-L-14"
_CLIP_PRETRAINED = "openai"


def _pick_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


class _AestheticMLP(nn.Module):
    """MLP head matching christophschuhmann/improved-aesthetic-predictor weights."""

    def __init__(self, input_dim: int = 768) -> None:
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(input_dim, 1024),
            nn.Dropout(0.2),
            nn.Linear(1024, 128),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.Dropout(0.1),
            nn.Linear(64, 16),
            nn.Linear(16, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.layers(x)


class AestheticScorer:
    """Singleton-ish scorer. Construct via `get_scorer()`."""

    def __init__(self) -> None:
        self.device = _pick_device()
        logger.info("Loading CLIP %s on %s", _CLIP_MODEL, self.device)
        self.clip_model, _, self.clip_preprocess = open_clip.create_model_and_transforms(
            _CLIP_MODEL,
            pretrained=_CLIP_PRETRAINED,
            cache_dir=str(settings.model_cache_dir),
        )
        self.clip_model = self.clip_model.to(self.device).eval()

        weights_path = self._ensure_mlp_weights()
        logger.info("Loading aesthetic MLP from %s", weights_path)
        self.mlp = _AestheticMLP(input_dim=768).to(self.device).eval()
        state = torch.load(weights_path, map_location=self.device, weights_only=True)
        self.mlp.load_state_dict(state)

    @staticmethod
    def _ensure_mlp_weights() -> Path:
        target = settings.model_cache_dir / _MLP_WEIGHTS_FILENAME
        if target.exists():
            return target
        logger.info("Downloading aesthetic MLP weights to %s", target)
        target.parent.mkdir(parents=True, exist_ok=True)
        tmp = target.with_suffix(target.suffix + ".part")
        urllib.request.urlretrieve(_MLP_WEIGHTS_URL, tmp)  # noqa: S310 (trusted URL)
        tmp.rename(target)
        return target

    @torch.inference_mode()
    def score(self, image_bytes: bytes) -> float:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        tensor = self.clip_preprocess(img).unsqueeze(0).to(self.device)
        features = self.clip_model.encode_image(tensor)
        features = features / features.norm(dim=-1, keepdim=True)
        if features.dtype != torch.float32:
            features = features.float()
        score = self.mlp(features).squeeze().item()
        return float(score)

    @torch.inference_mode()
    def score_batch(self, images: list[bytes]) -> list[float]:
        if not images:
            return []
        tensors = []
        for raw in images:
            img = Image.open(io.BytesIO(raw)).convert("RGB")
            tensors.append(self.clip_preprocess(img))
        batch = torch.stack(tensors).to(self.device)
        features = self.clip_model.encode_image(batch)
        features = features / features.norm(dim=-1, keepdim=True)
        if features.dtype != torch.float32:
            features = features.float()
        scores = self.mlp(features).squeeze(-1).cpu().numpy()
        scores = np.atleast_1d(scores)
        return [float(s) for s in scores]


_scorer: AestheticScorer | None = None
_scorer_lock = threading.Lock()


def get_scorer() -> AestheticScorer:
    """Lazy-load the scorer on first call. Thread-safe."""
    global _scorer
    if _scorer is None:
        with _scorer_lock:
            if _scorer is None:
                _scorer = AestheticScorer()
    return _scorer


def is_scorer_ready() -> bool:
    return _scorer is not None
