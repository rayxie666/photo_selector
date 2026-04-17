import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { AppState, Photo, PhotoAction } from '@/types';

const initialState: AppState = {
  photos: [],
  filterMode: 'all',
};

function photoReducer(state: AppState, action: PhotoAction): AppState {
  switch (action.type) {
    case 'ADD_PHOTO':
      return {
        ...state,
        photos: [...state.photos, action.payload],
      };

    case 'REMOVE_PHOTO':
      return {
        ...state,
        photos: state.photos.filter((p) => p.id !== action.payload),
      };

    case 'REMOVE_SELECTED':
      return {
        ...state,
        photos: state.photos.filter((p) => !p.isSelected),
      };

    case 'UPDATE_ANALYSIS':
      return {
        ...state,
        photos: state.photos.map((p) =>
          p.id === action.payload.id
            ? { ...p, analysis: action.payload.analysis }
            : p
        ),
      };

    case 'TOGGLE_SELECT':
      return {
        ...state,
        photos: state.photos.map((p) =>
          p.id === action.payload ? { ...p, isSelected: !p.isSelected } : p
        ),
      };

    case 'SELECT_ALL_FLAGGED':
      return {
        ...state,
        photos: state.photos.map((p) => ({
          ...p,
          isSelected: p.analysis?.isFlagged || p.isManuallyFlagged || p.isSelected,
        })),
      };

    case 'DESELECT_ALL':
      return {
        ...state,
        photos: state.photos.map((p) => ({ ...p, isSelected: false })),
      };

    case 'TOGGLE_MANUAL_FLAG':
      return {
        ...state,
        photos: state.photos.map((p) =>
          p.id === action.payload
            ? { ...p, isManuallyFlagged: !p.isManuallyFlagged }
            : p
        ),
      };

    case 'SET_FILTER':
      return {
        ...state,
        filterMode: action.payload,
      };

    default:
      return state;
  }
}

interface PhotoContextType {
  state: AppState;
  dispatch: React.Dispatch<PhotoAction>;
  filteredPhotos: Photo[];
  flaggedCount: number;
  selectedCount: number;
}

const PhotoContext = createContext<PhotoContextType | null>(null);

export function PhotoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(photoReducer, initialState);

  const filteredPhotos = state.photos.filter((photo) => {
    const isFlagged = photo.analysis?.isFlagged || photo.isManuallyFlagged;

    switch (state.filterMode) {
      case 'flagged':
        return isFlagged;
      case 'good':
        return !isFlagged;
      default:
        return true;
    }
  });

  const flaggedCount = state.photos.filter(
    (p) => p.analysis?.isFlagged || p.isManuallyFlagged
  ).length;

  const selectedCount = state.photos.filter((p) => p.isSelected).length;

  return (
    <PhotoContext.Provider
      value={{ state, dispatch, filteredPhotos, flaggedCount, selectedCount }}
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
