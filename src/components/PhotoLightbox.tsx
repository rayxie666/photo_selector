import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  X as CloseIcon,
  X,
  Star,
  RotateCcw,
  Check,
  Sparkles,
  HelpCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Photo, PhotoCritique, PhotoStatus } from '@/types';
import { useSettings } from '@/contexts/SettingsContext';
import { api, ApiError } from '@/services/api';

interface PhotoLightboxProps {
  photos: Photo[];
  openPhotoId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onSetStatus: (id: string, status: PhotoStatus, reason?: string) => void;
  onNavigate: (id: string) => void;
  onSetCritique: (id: string, critique: PhotoCritique) => void;
}

const STATUS_BADGE_VARIANT: Record<
  PhotoStatus,
  'default' | 'destructive' | 'secondary' | 'outline' | 'success' | 'warning'
> = {
  pending: 'outline',
  rejected_tech: 'destructive',
  rejected_ai: 'warning',
  rejected_pk: 'secondary',
  finalist: 'success',
};

interface CritiqueState {
  loading: boolean;
  error?: string;
}

export function PhotoLightbox({
  photos,
  openPhotoId,
  onClose,
  onSelect,
  onSetStatus,
  onNavigate,
  onSetCritique,
}: PhotoLightboxProps) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();

  const currentIndex = useMemo(
    () => photos.findIndex((p) => p.id === openPhotoId),
    [photos, openPhotoId],
  );
  const photo = currentIndex >= 0 ? photos[currentIndex] : null;

  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const [critiqueState, setCritiqueState] = useState<CritiqueState>({ loading: false });

  useEffect(() => {
    if (!photo) {
      setFullUrl(null);
      return;
    }
    const url = URL.createObjectURL(photo.file);
    setFullUrl(url);
    setCritiqueState({ loading: false });
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [photo]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(photos[currentIndex - 1].id);
  }, [currentIndex, photos, onNavigate]);

  const goNext = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < photos.length - 1) {
      onNavigate(photos[currentIndex + 1].id);
    }
  }, [currentIndex, photos, onNavigate]);

  useEffect(() => {
    if (!photo) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [photo, onClose, goPrev, goNext]);

  const requestCritique = useCallback(async () => {
    if (!photo) return;
    const provider = settings.llmProviderId;
    const apiKey = settings.llmApiKey;
    if (provider !== 'claude-cli' && !apiKey) {
      setCritiqueState({ loading: false, error: t('critique.apiKeyMissing') });
      return;
    }
    setCritiqueState({ loading: true });
    try {
      const response = await fetch(photo.thumbnailUrl);
      const blob = await response.blob();
      const result = await api.critique(
        { id: photo.id, blob, filename: photo.name },
        {
          llmProvider: provider,
          llmApiKey: provider === 'claude-cli' ? undefined : apiKey,
          acceptLanguage: i18n.language,
          timeoutMs: 120_000,
        },
      );
      const critique: PhotoCritique = {
        ...result.result,
        providerId: result.provider,
        fetchedAt: Date.now(),
      };
      onSetCritique(photo.id, critique);
      setCritiqueState({ loading: false });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? typeof err.body === 'object' && err.body !== null && 'detail' in err.body
            ? JSON.stringify((err.body as { detail: unknown }).detail)
            : err.message
          : (err as Error).message;
      setCritiqueState({ loading: false, error: message });
    }
  }, [photo, settings.llmProviderId, settings.llmApiKey, i18n.language, onSetCritique, t]);

  if (!photo) return null;

  const isRejected =
    photo.status === 'rejected_tech' ||
    photo.status === 'rejected_ai' ||
    photo.status === 'rejected_pk';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 flex items-center justify-center p-12" onClick={onClose}>
        {fullUrl && (
          <img
            src={fullUrl}
            alt={photo.name}
            className="max-h-full max-w-full object-contain select-none"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        )}
      </div>

      <div
        className="absolute top-0 inset-x-0 p-4 flex items-start justify-between gap-4 text-white pointer-events-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={STATUS_BADGE_VARIANT[photo.status]}>
              {photo.status === 'finalist' && <Star className="h-3 w-3 mr-1" />}
              {t(`status.${photo.status}`)}
            </Badge>
            {photo.rejectionReason && (
              <Badge variant="outline" className="bg-white/10">
                {t(`reason.${photo.rejectionReason}`, { defaultValue: photo.rejectionReason })}
              </Badge>
            )}
            {photo.aestheticScore !== undefined && (
              <Badge variant="outline" className="bg-white/10 font-mono">
                <Sparkles className="h-3 w-3 mr-1" />
                {photo.aestheticScore.toFixed(2)}
              </Badge>
            )}
            {photo.clusterId !== undefined && (
              <Badge variant="outline" className="bg-white/10 font-mono">
                {t('pipeline.cluster')} {photo.clusterId}
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium break-all max-w-[80vw]">{photo.name}</p>
          <p className="text-xs text-white/60">
            {currentIndex + 1} / {photos.length}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <CloseIcon className="h-5 w-5" />
        </Button>
      </div>

      {(photo.critique || critiqueState.loading || critiqueState.error) && (
        <div
          className="absolute left-4 right-4 md:left-auto md:right-4 md:max-w-md top-32 z-10 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-black/80 backdrop-blur rounded-lg p-4 text-white text-sm space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {t('critique.title')}
              </h4>
              {photo.critique && (
                <Badge variant="outline" className="bg-white/10 font-mono">
                  {photo.critique.score.toFixed(1)} / 10
                </Badge>
              )}
            </div>
            {critiqueState.loading && (
              <div className="flex items-center gap-2 text-white/70">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('critique.loading')}</span>
              </div>
            )}
            {critiqueState.error && (
              <div className="flex items-start gap-2 text-red-300">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="break-words">{critiqueState.error}</span>
              </div>
            )}
            {photo.critique && (
              <>
                <CritiqueField label={t('critique.composition')} value={photo.critique.composition} />
                <CritiqueField label={t('critique.style')} value={photo.critique.style} />
                <CritiqueField
                  label={t('critique.suggestion')}
                  value={photo.critique.suggestion}
                  emphasize
                />
                <p className="text-xs text-white/40">
                  {t('critique.viaProvider', { provider: photo.critique.providerId })}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <div
        className="absolute bottom-0 inset-x-0 p-4 flex items-center justify-center gap-2 pointer-events-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-2 bg-black/70 backdrop-blur rounded-full p-2 pointer-events-auto flex-wrap justify-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              requestCritique();
            }}
            disabled={critiqueState.loading}
          >
            {critiqueState.loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <HelpCircle className="h-4 w-4 mr-2" />
            )}
            {photo.critique ? t('critique.regenerate') : t('critique.askWhy')}
          </Button>
          <Button
            variant={photo.isSelected ? 'default' : 'secondary'}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(photo.id);
            }}
          >
            <Check className="h-4 w-4 mr-2" />
            {photo.isSelected ? t('gallery.selected') : t('actions.selectOne')}
          </Button>
          {isRejected ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSetStatus(photo.id, 'pending');
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('actions.restore')}
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSetStatus(photo.id, 'rejected_tech', 'manual');
              }}
            >
              <X className="h-4 w-4 mr-2" />
              {t('actions.markRejected')}
            </Button>
          )}
          {photo.status !== 'finalist' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSetStatus(photo.id, 'finalist');
              }}
            >
              <Star className="h-4 w-4 mr-2" />
              {t('actions.markFinalist')}
            </Button>
          )}
        </div>
      </div>

      {currentIndex > 0 && (
        <button
          type="button"
          aria-label="previous"
          className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {currentIndex < photos.length - 1 && (
        <button
          type="button"
          aria-label="next"
          className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}

function CritiqueField({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-white/60 uppercase tracking-wide">{label}</div>
      <p className={emphasize ? 'text-amber-200 mt-0.5' : 'mt-0.5'}>{value}</p>
    </div>
  );
}
