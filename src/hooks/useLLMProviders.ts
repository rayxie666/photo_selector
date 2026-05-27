import { useEffect, useState } from 'react';
import { api, ApiError } from '@/services/api';
import type { LLMProviderInfo } from '@/services/types';

interface ProvidersState {
  status: 'loading' | 'ready' | 'unreachable';
  providers: LLMProviderInfo[];
  error?: string;
}

const initial: ProvidersState = { status: 'loading', providers: [] };

export function useLLMProviders(): ProvidersState {
  const [state, setState] = useState<ProvidersState>(initial);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const providers = await api.listProviders({ timeoutMs: 5_000 });
        if (cancelled) return;
        setState({ status: 'ready', providers });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof ApiError ? err.message : (err as Error).message;
        setState({ status: 'unreachable', providers: [], error: message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
