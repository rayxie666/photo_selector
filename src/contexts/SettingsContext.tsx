import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { AnalysisSettings } from '@/types';

const DEFAULT_SETTINGS: AnalysisSettings = {
  darkThreshold: 40,
  brightThreshold: 200,
  exposureSensitivity: 0.5,
  highlightClipThreshold: 0.05,
  shadowClipThreshold: 0.05,
  grayFlatThreshold: 15,
  pureBlackThreshold: 60,
  blurThreshold: 100,
};

const STORAGE_KEY = 'photo-selector-settings';

interface SettingsContextType {
  settings: AnalysisSettings;
  updateSettings: (settings: Partial<AnalysisSettings>) => void;
  resetToDefaults: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

function loadSettings(): AnalysisSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: AnalysisSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AnalysisSettings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateSettings = (newSettings: Partial<AnalysisSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetToDefaults }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
