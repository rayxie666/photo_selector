import { useEffect, useState } from 'react';
import { api, ApiError } from '@/services/api';
import type { GpuKind, HealthResponse, ModelStatus } from '@/services/types';

const POLL_INTERVAL_MS = 5_000;
const POLL_INTERVAL_WHEN_DISCONNECTED_MS = 2_000;

export interface BackendHealth {
  status: 'connecting' | 'ready' | 'unreachable';
  version?: string;
  gpu: { available: boolean; kind: GpuKind } | null;
  missingModels: Array<'clip' | 'aesthetic'>;
  raw: HealthResponse | null;
  error?: string;
}

const initial: BackendHealth = {
  status: 'connecting',
  gpu: null,
  missingModels: [],
  raw: null,
};

function summarize(raw: HealthResponse): BackendHealth {
  const missing: Array<'clip' | 'aesthetic'> = [];
  (Object.entries(raw.models) as Array<[keyof typeof raw.models, ModelStatus]>).forEach(([k, v]) => {
    if (v !== 'ready') missing.push(k);
  });
  return {
    status: 'ready',
    version: raw.version,
    gpu: { available: raw.gpu_available, kind: raw.gpu_kind },
    missingModels: missing,
    raw,
  };
}

export function useBackendHealth(): BackendHealth {
  const [health, setHealth] = useState<BackendHealth>(initial);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const raw = await api.health({ timeoutMs: 3_000 });
        if (cancelled) return;
        setHealth(summarize(raw));
        timer = setTimeout(tick, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof ApiError ? err.message : (err as Error).message;
        setHealth((prev) => ({
          ...prev,
          status: 'unreachable',
          error: message,
        }));
        timer = setTimeout(tick, POLL_INTERVAL_WHEN_DISCONNECTED_MS);
      }
    };

    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return health;
}
