import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  Sun,
  Moon,
  AlertTriangle,
  Droplets,
  CircleOff,
  Focus,
  X,
  Star,
  RotateCcw,
  Sparkles,
  Maximize2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Photo, PhotoStatus } from '@/types';
import { cn } from '@/lib/utils';

interface PhotoThumbnailProps {
  photo: Photo;
  onSelect: (id: string) => void;
  onSetStatus: (id: string, status: PhotoStatus, reason?: string) => void;
  onOpenLightbox: (id: string) => void;
}

const STATUS_BORDER: Record<PhotoStatus, string> = {
  pending: 'border-muted-foreground/20',
  rejected_tech: 'border-destructive/70',
  rejected_ai: 'border-amber-500/70',
  rejected_pk: 'border-slate-400/70',
  finalist: 'border-emerald-500/80',
};

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

function PhotoThumbnailInner({
  photo,
  onSelect,
  onSetStatus,
  onOpenLightbox,
}: PhotoThumbnailProps) {
  const { t } = useTranslation();
  const { analysis, isSelected, status, rejectionReason } = photo;

  const isRejected =
    status === 'rejected_tech' || status === 'rejected_ai' || status === 'rejected_pk';

  return (
    <div
      className={cn(
        'relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer',
        STATUS_BORDER[status],
        isSelected && 'ring-2 ring-primary ring-offset-1',
        isRejected && 'opacity-60 hover:opacity-100',
      )}
      onClick={() => onSelect(photo.id)}
    >
      <div className="aspect-square bg-muted">
        <img
          src={photo.thumbnailUrl}
          alt={photo.name}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>

      {/* Selection checkbox */}
      <div
        className={cn(
          'absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
          isSelected
            ? 'bg-primary border-primary text-primary-foreground'
            : 'bg-background/80 border-muted-foreground/50 group-hover:border-primary',
        )}
      >
        {isSelected && <Check className="h-4 w-4" />}
      </div>

      {/* Status + reason + aesthetic score + cluster */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
        <Badge variant={STATUS_BADGE_VARIANT[status]} className="text-xs">
          {status === 'finalist' && <Star className="h-3 w-3 mr-1" />}
          {t(`status.${status}`)}
        </Badge>
        {photo.critique?.reasons && photo.critique.reasons.length > 0 ? (
          // LLM-derived short flaw labels take precedence over the generic reason.
          photo.critique.reasons.slice(0, 2).map((reason, idx) => (
            <Badge
              key={`${idx}:${reason}`}
              variant="outline"
              className="text-xs bg-background/80 max-w-[60%] truncate"
            >
              {reason}
            </Badge>
          ))
        ) : rejectionReason ? (
          <Badge variant="outline" className="text-xs bg-background/80">
            {t(`reason.${rejectionReason}`, { defaultValue: rejectionReason })}
          </Badge>
        ) : null}
        {photo.aestheticScore !== undefined && (
          <Badge variant="outline" className="text-xs bg-background/80 font-mono">
            <Sparkles className="h-3 w-3 mr-1" />
            {photo.aestheticScore.toFixed(2)}
          </Badge>
        )}
        {photo.clusterId !== undefined && (
          <Badge variant="outline" className="text-xs bg-background/80 font-mono">
            {t('pipeline.cluster')} {photo.clusterId}
          </Badge>
        )}
      </div>

      {/* Analysis detail badges (secondary, informational) */}
      <div className="absolute top-20 right-2 flex flex-col gap-1 items-end max-w-[60%]">
        {analysis && (
          <>
            {analysis.brightnessStatus === 'tooDark' && (
              <Badge variant="secondary" className="text-xs">
                <Moon className="h-3 w-3 mr-1" />
                {t('analysis.tooDark')}
              </Badge>
            )}
            {analysis.brightnessStatus === 'tooBright' && (
              <Badge variant="warning" className="text-xs">
                <Sun className="h-3 w-3 mr-1" />
                {t('analysis.tooBright')}
              </Badge>
            )}
            {analysis.hasClippedHighlights && (
              <Badge variant="outline" className="text-xs bg-background/80">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {t('analysis.clippedHighlights')}
              </Badge>
            )}
            {analysis.hasClippedShadows && (
              <Badge variant="outline" className="text-xs bg-background/80">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {t('analysis.clippedShadows')}
              </Badge>
            )}
            {analysis.isGrayFlat && (
              <Badge variant="outline" className="text-xs bg-background/80 text-gray-500">
                <Droplets className="h-3 w-3 mr-1" />
                {t('analysis.grayFlat')}
              </Badge>
            )}
            {analysis.isPureBlack && (
              <Badge variant="outline" className="text-xs bg-background/80 text-slate-700">
                <CircleOff className="h-3 w-3 mr-1" />
                {t('analysis.pureBlack')}
              </Badge>
            )}
            {analysis.isBlurry && (
              <Badge variant="outline" className="text-xs bg-background/80 text-purple-500">
                <Focus className="h-3 w-3 mr-1" />
                {t('analysis.blurry')}
              </Badge>
            )}
          </>
        )}
      </div>

      {/* Per-photo action buttons */}
      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8"
          title={t('actions.openLightbox')}
          onClick={(e) => {
            e.stopPropagation();
            onOpenLightbox(photo.id);
          }}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        {isRejected ? (
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8"
            title={t('actions.restore')}
            onClick={(e) => {
              e.stopPropagation();
              onSetStatus(photo.id, 'pending', undefined);
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8"
            title={t('actions.markRejected')}
            onClick={(e) => {
              e.stopPropagation();
              onSetStatus(photo.id, 'rejected_tech', 'manual');
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {status !== 'finalist' && (
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8"
            title={t('actions.markFinalist')}
            onClick={(e) => {
              e.stopPropagation();
              onSetStatus(photo.id, 'finalist', undefined);
            }}
          >
            <Star className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* File name */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pointer-events-none">
        <p className="text-xs text-white truncate">{photo.name}</p>
      </div>
    </div>
  );
}

export const PhotoThumbnail = memo(PhotoThumbnailInner);
