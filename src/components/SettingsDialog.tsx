import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useSettings } from '@/contexts/SettingsContext';
import type { AnalysisSettings } from '@/types';

export function SettingsDialog() {
  const { t } = useTranslation();
  const { settings, updateSettings, resetToDefaults } = useSettings();
  const [localSettings, setLocalSettings] = useState<AnalysisSettings>(settings);
  const [open, setOpen] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setLocalSettings(settings);
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    updateSettings(localSettings);
    setOpen(false);
  };

  const handleReset = () => {
    resetToDefaults();
    setLocalSettings({
      darkThreshold: 40,
      brightThreshold: 200,
      exposureSensitivity: 0.5,
      highlightClipThreshold: 0.05,
      shadowClipThreshold: 0.05,
      grayFlatThreshold: 15,
      pureBlackThreshold: 60,
      blurThreshold: 100,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h4 className="font-medium">{t('settings.brightnessThresholds')}</h4>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('settings.darkThreshold')}</span>
                <span className="text-muted-foreground">{localSettings.darkThreshold}</span>
              </div>
              <Slider
                value={[localSettings.darkThreshold]}
                min={10}
                max={100}
                step={5}
                onValueChange={([value]) =>
                  setLocalSettings((s) => ({ ...s, darkThreshold: value }))
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('settings.brightThreshold')}</span>
                <span className="text-muted-foreground">{localSettings.brightThreshold}</span>
              </div>
              <Slider
                value={[localSettings.brightThreshold]}
                min={150}
                max={245}
                step={5}
                onValueChange={([value]) =>
                  setLocalSettings((s) => ({ ...s, brightThreshold: value }))
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">{t('settings.exposureSensitivity')}</h4>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('settings.exposureSensitivity')}</span>
                <span className="text-muted-foreground">
                  {(localSettings.exposureSensitivity * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                value={[localSettings.exposureSensitivity]}
                min={0.1}
                max={1}
                step={0.1}
                onValueChange={([value]) =>
                  setLocalSettings((s) => ({ ...s, exposureSensitivity: value }))
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('settings.highlightClipThreshold')}</span>
                <span className="text-muted-foreground">
                  {(localSettings.highlightClipThreshold * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                value={[localSettings.highlightClipThreshold]}
                min={0.01}
                max={0.2}
                step={0.01}
                onValueChange={([value]) =>
                  setLocalSettings((s) => ({ ...s, highlightClipThreshold: value }))
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('settings.shadowClipThreshold')}</span>
                <span className="text-muted-foreground">
                  {(localSettings.shadowClipThreshold * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                value={[localSettings.shadowClipThreshold]}
                min={0.01}
                max={0.2}
                step={0.01}
                onValueChange={([value]) =>
                  setLocalSettings((s) => ({ ...s, shadowClipThreshold: value }))
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">{t('settings.qualityDetection')}</h4>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('settings.grayFlatThreshold')}</span>
                <span className="text-muted-foreground">{localSettings.grayFlatThreshold}%</span>
              </div>
              <Slider
                value={[localSettings.grayFlatThreshold]}
                min={0}
                max={50}
                step={1}
                onValueChange={([value]) =>
                  setLocalSettings((s) => ({ ...s, grayFlatThreshold: value }))
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('settings.pureBlackThreshold')}</span>
                <span className="text-muted-foreground">{localSettings.pureBlackThreshold}%</span>
              </div>
              <Slider
                value={[localSettings.pureBlackThreshold]}
                min={20}
                max={90}
                step={5}
                onValueChange={([value]) =>
                  setLocalSettings((s) => ({ ...s, pureBlackThreshold: value }))
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('settings.blurThreshold')}</span>
                <span className="text-muted-foreground">{localSettings.blurThreshold}</span>
              </div>
              <Slider
                value={[localSettings.blurThreshold]}
                min={10}
                max={500}
                step={10}
                onValueChange={([value]) =>
                  setLocalSettings((s) => ({ ...s, blurThreshold: value }))
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('settings.resetDefaults')}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('settings.cancel')}
            </Button>
            <Button onClick={handleSave}>{t('settings.save')}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
