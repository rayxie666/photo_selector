export type ExposureStatus = 'correct' | 'overexposed' | 'underexposed';
export type BrightnessStatus = 'correct' | 'tooDark' | 'tooBright';
export type FilterMode = 'all' | 'flagged' | 'good';

export interface AnalysisResult {
  exposureStatus: ExposureStatus;
  brightnessStatus: BrightnessStatus;
  meanLuminosity: number;
  hasClippedHighlights: boolean;
  hasClippedShadows: boolean;
  isGrayFlat: boolean;
  isPureBlack: boolean;
  isBlurry: boolean;
  isFlagged: boolean;
}

export interface Photo {
  id: string;
  file: File;
  name: string;
  thumbnailUrl: string;
  analysis: AnalysisResult | null;
  isSelected: boolean;
  isManuallyFlagged: boolean;
}

export interface AnalysisSettings {
  darkThreshold: number;
  brightThreshold: number;
  exposureSensitivity: number;
  highlightClipThreshold: number;
  shadowClipThreshold: number;
  grayFlatThreshold: number;
  pureBlackThreshold: number;
  blurThreshold: number;
}

export interface AppState {
  photos: Photo[];
  filterMode: FilterMode;
}

export type PhotoAction =
  | { type: 'ADD_PHOTO'; payload: Photo }
  | { type: 'REMOVE_PHOTO'; payload: string }
  | { type: 'REMOVE_SELECTED' }
  | { type: 'UPDATE_ANALYSIS'; payload: { id: string; analysis: AnalysisResult } }
  | { type: 'TOGGLE_SELECT'; payload: string }
  | { type: 'SELECT_ALL_FLAGGED' }
  | { type: 'DESELECT_ALL' }
  | { type: 'TOGGLE_MANUAL_FLAG'; payload: string }
  | { type: 'SET_FILTER'; payload: FilterMode };
