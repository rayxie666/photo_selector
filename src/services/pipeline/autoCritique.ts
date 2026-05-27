// Batch-critique helper. Walks a list of photos that don't yet have a critique,
// calls the LLM provider concurrently (bounded), and dispatches SET_CRITIQUE for
// each one as soon as it arrives. Skips photos that already have a critique.

import { api } from '@/services/api';
import type { LLMProviderId } from '@/services/types';
import type { Photo, PhotoAction, PhotoCritique } from '@/types';

export interface AutoCritiqueOptions {
  provider: LLMProviderId;
  apiKey?: string;
  language: string;
  concurrency?: number;
  onProgress?: (done: number, total: number) => void;
  onError?: (id: string, message: string) => void;
}

export interface AutoCritiqueResult {
  attempted: number;
  succeeded: number;
  failed: number;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return await response.blob();
}

async function critiqueOne(
  photo: Photo,
  options: AutoCritiqueOptions,
  dispatch: React.Dispatch<PhotoAction>,
): Promise<boolean> {
  const blob = await dataUrlToBlob(photo.thumbnailUrl);
  const response = await api.critique(
    { id: photo.id, blob, filename: photo.name },
    {
      llmProvider: options.provider,
      llmApiKey: options.provider === 'claude-cli' ? undefined : options.apiKey,
      acceptLanguage: options.language,
      timeoutMs: 120_000,
    },
  );
  const critique: PhotoCritique = {
    ...response.result,
    providerId: response.provider,
    fetchedAt: Date.now(),
  };
  dispatch({ type: 'SET_CRITIQUE', payload: { id: photo.id, critique } });
  return true;
}

export async function runAutoCritique(
  photos: Photo[],
  options: AutoCritiqueOptions,
  dispatch: React.Dispatch<PhotoAction>,
): Promise<AutoCritiqueResult> {
  const queue = photos.filter((p) => !p.critique);
  const total = queue.length;
  if (total === 0) return { attempted: 0, succeeded: 0, failed: 0 };

  const concurrency = Math.max(1, Math.min(options.concurrency ?? 3, 6));
  let succeeded = 0;
  let failed = 0;
  let cursor = 0;
  let done = 0;

  async function worker() {
    while (true) {
      const idx = cursor;
      cursor += 1;
      if (idx >= total) return;
      const photo = queue[idx];
      try {
        await critiqueOne(photo, options, dispatch);
        succeeded += 1;
      } catch (err) {
        failed += 1;
        const message = err instanceof Error ? err.message : String(err);
        options.onError?.(photo.id, message);
      }
      done += 1;
      options.onProgress?.(done, total);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { attempted: total, succeeded, failed };
}
