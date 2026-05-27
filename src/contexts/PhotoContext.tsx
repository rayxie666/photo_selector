import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import type {
  AnalysisResult,
  AppState,
  Photo,
  PhotoAction,
  PhotoStatus,
} from '@/types';

const initialState: AppState = {
  photos: [],
  filterMode: 'all',
};

const ALL_STATUSES: readonly PhotoStatus[] = [
  'pending',
  'rejected_tech',
  'rejected_ai',
  'rejected_pk',
  'finalist',
] as const;

function deriveTechRejectionReason(a: AnalysisResult): string | undefined {
  if (!a.isFlagged) return undefined;
  if (a.exposureStatus === 'overexposed') return 'overexposed';
  if (a.exposureStatus === 'underexposed') return 'underexposed';
  if (a.brightnessStatus === 'tooDark') return 'too_dark';
  if (a.brightnessStatus === 'tooBright') return 'too_bright';
  if (a.isBlurry) return 'blurry';
  if (a.isPureBlack) return 'pure_black';
  if (a.isGrayFlat) return 'gray_flat';
  if (a.hasClippedHighlights) return 'clipped_highlights';
  if (a.hasClippedShadows) return 'clipped_shadows';
  return 'technical';
}

function photoReducer(state: AppState, action: PhotoAction): AppState {
  switch (action.type) {
    case 'ADD_PHOTO':
      return { ...state, photos: [...state.photos, action.payload] };

    case 'ADD_PHOTOS':
      return { ...state, photos: [...state.photos, ...action.payload] };

    case 'REMOVE_PHOTO':
      return {
        ...state,
        photos: state.photos.filter((p) => p.id !== action.payload),
      };

    case 'UPDATE_ANALYSIS': {
      const { id, analysis } = action.payload;
      return {
        ...state,
        photos: state.photos.map((p) => {
          if (p.id !== id) return p;
          // Only auto-transition a still-pending photo. Manual status moves are not overridden.
          if (p.status === 'pending' && analysis.isFlagged) {
            return {
              ...p,
              analysis,
              status: 'rejected_tech' as PhotoStatus,
              rejectionReason: deriveTechRejectionReason(analysis),
            };
          }
          return { ...p, analysis };
        }),
      };
    }

    case 'SET_AESTHETIC_SCORES': {
      const byId = new Map(action.payload.map((x) => [x.id, x.score]));
      return {
        ...state,
        photos: state.photos.map((p) =>
          byId.has(p.id) ? { ...p, aestheticScore: byId.get(p.id) } : p,
        ),
      };
    }

    case 'SET_CLUSTERS': {
      const byId = new Map(action.payload.map((x) => [x.id, x.clusterId]));
      return {
        ...state,
        photos: state.photos.map((p) =>
          byId.has(p.id) ? { ...p, clusterId: byId.get(p.id) } : p,
        ),
      };
    }

    case 'SET_CRITIQUE': {
      const { id, critique } = action.payload;
      return {
        ...state,
        photos: state.photos.map((p) => (p.id === id ? { ...p, critique } : p)),
      };
    }

    case 'TOGGLE_SELECT':
      return {
        ...state,
        photos: state.photos.map((p) =>
          p.id === action.payload ? { ...p, isSelected: !p.isSelected } : p,
        ),
      };

    case 'DESELECT_ALL':
      return {
        ...state,
        photos: state.photos.map((p) =>
          p.isSelected ? { ...p, isSelected: false } : p,
        ),
      };

    case 'SELECT_ALL_VISIBLE':
      return {
        ...state,
        photos: state.photos.map((p) => {
          const inView = state.filterMode === 'all' || p.status === state.filterMode;
          return inView && !p.isSelected ? { ...p, isSelected: true } : p;
        }),
      };

    case 'SET_STATUS': {
      const { id, status, reason } = action.payload;
      return {
        ...state,
        photos: state.photos.map((p) =>
          p.id === id ? { ...p, status, rejectionReason: reason } : p,
        ),
      };
    }

    case 'SET_STATUS_FOR_SELECTED': {
      const { status, reason } = action.payload;
      return {
        ...state,
        photos: state.photos.map((p) =>
          p.isSelected ? { ...p, status, rejectionReason: reason, isSelected: false } : p,
        ),
      };
    }

    case 'RESTORE_BY_STATUS': {
      const { from, to = 'pending' } = action.payload;
      return {
        ...state,
        photos: state.photos.map((p) =>
          p.status === from ? { ...p, status: to, rejectionReason: undefined } : p,
        ),
      };
    }

    case 'SET_FILTER':
      return { ...state, filterMode: action.payload };

    default:
      return state;
  }
}

interface PhotoContextType {
  state: AppState;
  dispatch: React.Dispatch<PhotoAction>;
  filteredPhotos: Photo[];
  counts: Record<PhotoStatus | 'total' | 'selected', number>;
  getByStatus: (s: PhotoStatus) => Photo[];
}

const PhotoContext = createContext<PhotoContextType | null>(null);

export function PhotoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(photoReducer, initialState);

  const { filteredPhotos, counts, getByStatus } = useMemo(() => {
    const filtered =
      state.filterMode === 'all'
        ? state.photos
        : state.photos.filter((p) => p.status === state.filterMode);

    const byStatus: Record<PhotoStatus, Photo[]> = {
      pending: [],
      rejected_tech: [],
      rejected_ai: [],
      rejected_pk: [],
      finalist: [],
    };
    for (const p of state.photos) byStatus[p.status].push(p);

    const countMap = {
      total: state.photos.length,
      selected: state.photos.reduce((n, p) => n + (p.isSelected ? 1 : 0), 0),
    } as Record<PhotoStatus | 'total' | 'selected', number>;
    for (const s of ALL_STATUSES) countMap[s] = byStatus[s].length;

    return {
      filteredPhotos: filtered,
      counts: countMap,
      getByStatus: (s: PhotoStatus) => byStatus[s],
    };
  }, [state.photos, state.filterMode]);

  return (
    <PhotoContext.Provider
      value={{ state, dispatch, filteredPhotos, counts, getByStatus }}
    >
      {children}
    </PhotoContext.Provider>
  );
}

export function usePhotoContext() {
  const context = useContext(PhotoContext);
  if (!context) {
    throw new Error('usePhotoContext must be used within a PhotoProvider');
  }
  return context;
}
