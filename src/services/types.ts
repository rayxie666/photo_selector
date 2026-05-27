// Backend DTOs — mirror app/main.py Pydantic models.
// When the backend grows, switch this file to openapi-typescript codegen.

export type ModelStatus = 'ready' | 'missing' | 'downloading';
export type GpuKind = 'cuda' | 'mps' | 'none';
export type LLMProviderId = 'openai' | 'anthropic' | 'google' | 'claude-cli';

export interface ModelsStatus {
  clip: ModelStatus;
  aesthetic: ModelStatus;
}

export interface HealthResponse {
  version: string;
  gpu_available: boolean;
  gpu_kind: GpuKind;
  models: ModelsStatus;
  model_cache_dir: string;
}

export interface LLMProviderInfo {
  id: LLMProviderId;
  requires_api_key: boolean;
  available: boolean;
  reason?: string;
}

export interface AestheticBatchItem {
  id: string;
  score: number;
}

export interface AestheticBatchResponse {
  items: AestheticBatchItem[];
  elapsed_ms: number;
}

export interface ClusterItem {
  id: string;
  cluster_id: number;
}

export interface ClusterResponse {
  items: ClusterItem[];
  n_clusters: number;
  n_groups: number;
  elapsed_ms: number;
}

export interface CritiqueResult {
  score: number;
  composition: string;
  style: string;
  suggestion: string;
  reasons: string[];
}

export interface CritiqueResponse {
  item_id: string;
  provider: LLMProviderId;
  result: CritiqueResult;
}
