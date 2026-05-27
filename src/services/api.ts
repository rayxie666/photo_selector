import type {
  AestheticBatchResponse,
  ClusterResponse,
  CritiqueResponse,
  HealthResponse,
  LLMProviderId,
  LLMProviderInfo,
} from './types';

const DEFAULT_TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  readonly status: number;
  readonly body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export interface ApiCallOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  llmProvider?: LLMProviderId;
  llmApiKey?: string;
  acceptLanguage?: string;
}

async function request<T>(
  path: string,
  init: RequestInit,
  options: ApiCallOptions = {},
): Promise<T> {
  const { signal, timeoutMs = DEFAULT_TIMEOUT_MS, llmProvider, llmApiKey, acceptLanguage } = options;
  const headers = new Headers(init.headers);
  if (llmProvider) headers.set('X-LLM-Provider', llmProvider);
  if (llmApiKey) headers.set('Authorization', `Bearer ${llmApiKey}`);
  if (acceptLanguage) headers.set('Accept-Language', acceptLanguage);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
  const composedSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;

  try {
    const response = await fetch(path, { ...init, headers, signal: composedSignal });
    if (!response.ok) {
      const body = await safeParseError(response);
      throw new ApiError(
        `${init.method ?? 'GET'} ${path} failed with ${response.status}`,
        response.status,
        body,
      );
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function safeParseError(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return await response.text().catch(() => undefined);
  }
}

export const api = {
  health(options?: ApiCallOptions): Promise<HealthResponse> {
    return request<HealthResponse>('/api/health', { method: 'GET' }, options);
  },

  // Will be implemented in chapter 6 (LLM routing).
  listProviders(options?: ApiCallOptions): Promise<LLMProviderInfo[]> {
    return request<LLMProviderInfo[]>('/api/llm/providers', { method: 'GET' }, options);
  },

  aestheticBatch(
    inputs: Array<{ id: string; blob: Blob; filename: string }>,
    options?: ApiCallOptions,
  ): Promise<AestheticBatchResponse> {
    const formData = new FormData();
    for (const { id, blob, filename } of inputs) {
      formData.append('ids', id);
      formData.append('images', blob, filename);
    }
    const effectiveOptions: ApiCallOptions = {
      timeoutMs: 5 * 60_000,
      ...options,
    };
    return request<AestheticBatchResponse>(
      '/api/aesthetic/batch',
      { method: 'POST', body: formData },
      effectiveOptions,
    );
  },

  similarityCluster(
    inputs: Array<{ id: string; blob: Blob; filename: string }>,
    eps?: number,
    options?: ApiCallOptions,
  ): Promise<ClusterResponse> {
    const formData = new FormData();
    for (const { id, blob, filename } of inputs) {
      formData.append('ids', id);
      formData.append('images', blob, filename);
    }
    if (eps !== undefined) formData.append('eps', String(eps));
    const effectiveOptions: ApiCallOptions = {
      timeoutMs: 5 * 60_000,
      ...options,
    };
    return request<ClusterResponse>(
      '/api/similarity/cluster',
      { method: 'POST', body: formData },
      effectiveOptions,
    );
  },

  critique(
    input: { id: string; blob: Blob; filename: string },
    options?: ApiCallOptions,
  ): Promise<CritiqueResponse> {
    const formData = new FormData();
    formData.append('item_id', input.id);
    formData.append('image', input.blob, input.filename);
    const effectiveOptions: ApiCallOptions = {
      timeoutMs: 90_000,
      ...options,
    };
    return request<CritiqueResponse>(
      '/api/llm/critique',
      { method: 'POST', body: formData },
      effectiveOptions,
    );
  },
};
