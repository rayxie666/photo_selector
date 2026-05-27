// Stage 2 — AI aesthetic ranking via backend LAION-Aesthetic-Predictor.
// Sends every `pending` photo's thumbnail to /api/aesthetic/batch, stores returned
// scores on the photo, and demotes the bottom slice to rejected_ai.

import { api } from '@/services/api';
import type { Photo, PhotoAction } from '@/types';

interface Stage2Progress {
  phase: 'preparing' | 'scoring' | 'finalizing' | 'done';
  message?: string;
}

interface Stage2Result {
  scored: number;
  rejected: number;
  elapsedMs: number;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return await response.blob();
}

export async function runStage2(
  pendingPhotos: Photo[],
  rejectionRatio: number,
  dispatch: React.Dispatch<PhotoAction>,
  onProgress?: (p: Stage2Progress) => void,
): Promise<Stage2Result> {
  if (pendingPhotos.length === 0) {
    return { scored: 0, rejected: 0, elapsedMs: 0 };
  }

  onProgress?.({ phase: 'preparing' });

  const inputs = await Promise.all(
    pendingPhotos.map(async (p) => ({
      id: p.id,
      blob: await dataUrlToBlob(p.thumbnailUrl),
      filename: p.name,
    })),
  );

  onProgress?.({ phase: 'scoring' });

  const response = await api.aestheticBatch(inputs);
  dispatch({ type: 'SET_AESTHETIC_SCORES', payload: response.items });

  onProgress?.({ phase: 'finalizing' });

  // Sort ascending; the worst-scoring `ratio` fraction is demoted.
  const sorted = [...response.items].sort((a, b) => a.score - b.score);
  const rejectCount = Math.floor(sorted.length * rejectionRatio);
  const toReject = sorted.slice(0, rejectCount);

  for (const { id } of toReject) {
    dispatch({
      type: 'SET_STATUS',
      payload: { id, status: 'rejected_ai', reason: 'low_aesthetic_score' },
    });
  }

  onProgress?.({ phase: 'done' });

  return {
    scored: response.items.length,
    rejected: toReject.length,
    elapsedMs: response.elapsed_ms,
  };
}
