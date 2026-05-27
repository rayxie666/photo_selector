export type ExposureStatus = 'correct' | 'overexposed' | 'underexposed';
export type BrightnessStatus = 'correct' | 'tooDark' | 'tooBright';

export type PhotoStatus =
  | 'pending'
  | 'rejected_tech'
  | 'rejected_ai'
  | 'rejected_pk'
  | 'finalist';

export type FilterMode = 'all' | PhotoStatus;

// rejectionReason taxonomy:
//   technical defects: 'overexposed' | 'underexposed' | 'too_dark' | 'too_bright' |
//                      'clipped_highlights' | 'clipped_shadows' |
//                      'gray_flat' | 'pure_black' | 'blurry'
//   manual: 'manual'
//   stage 2: 'low_aesthetic_score'
//   stage 3: `lost_pk_to:<photoId>`
export interface AnalysisResult {
  exposureStatus: ExposureStatus;
  brightnessStatus: BrightnessStatus;
  meanLuminosity: number;
  hasClippedHighlights: boolean;
  hasClippedShadows: boolean;
  isGrayFlat: boolean;
  isPureBlack: boolean;
  isBlurry: boolean;
  // Computed convenience: true iff any technical defect is detected.
  isFlagged: boolean;
}

export interface PhotoCritique {
  score: number;
  composition: string;
  style: string;
  suggestion: string;
  reasons: string[];
  providerId: string;
  fetchedAt: number;
}

export interface Photo {
  id: string;
  file: File;
  name: string;
  thumbnailUrl: string;
  analysis: AnalysisResult | null;
  aestheticScore?: number;
  clusterId?: number;
  critique?: PhotoCritique;
  status: PhotoStatus;
  rejectionReason?: string;
  isSelected: boolean;
}

// Provider id mirrors the backend's literal type (services/types.ts has the same union).
export type LLMProviderIdSetting = 'openai' | 'anthropic' | 'google' | 'claude-cli';

export interface AnalysisSettings {
  darkThreshold: number;
  brightThreshold: number;
  exposureSensitivity: number;
  highlightClipThreshold: number;
  shadowClipThreshold: number;
  grayFlatThreshold: number;
  pureBlackThreshold: number;
  blurThreshold: number;
  // Stage 2: fraction of Stage-1-passing photos to reject by aesthetic score.
  stage2RejectionRatio: number;
  // Stage 3: DBSCAN cosine-distance epsilon for similarity grouping.
  stage3ClusterEps: number;
  // LLM provider for on-demand critique (defaults to claude-cli — zero-config).
  llmProviderId: LLMProviderIdSetting;
  // Cloud-provider API key. Stored in localStorage; backend never persists it.
  llmApiKey?: string;
}

export interface AppState {
  photos: Photo[];
  filterMode: FilterMode;
}

export type PhotoAction =
  | { type: 'ADD_PHOTO'; payload: Photo }
  | { type: 'ADD_PHOTOS'; payload: Photo[] }
  | { type: 'REMOVE_PHOTO'; payload: string }
  | { type: 'UPDATE_ANALYSIS'; payload: { id: string; analysis: AnalysisResult } }
  | { type: 'SET_AESTHETIC_SCORES'; payload: Array<{ id: string; score: number }> }
  | { type: 'SET_CLUSTERS'; payload: Array<{ id: string; clusterId: number }> }
  | { type: 'SET_CRITIQUE'; payload: { id: string; critique: PhotoCritique } }
  | { type: 'TOGGLE_SELECT'; payload: string }
  | { type: 'SELECT_ALL_VISIBLE' }
  | { type: 'DESELECT_ALL' }
  | { type: 'SET_STATUS'; payload: { id: string; status: PhotoStatus; reason?: string } }
  | { type: 'SET_STATUS_FOR_SELECTED'; payload: { status: PhotoStatus; reason?: string } }
  | { type: 'RESTORE_BY_STATUS'; payload: { from: PhotoStatus; to?: PhotoStatus } }
  | { type: 'SET_FILTER'; payload: FilterMode };
