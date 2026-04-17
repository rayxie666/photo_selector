import { useTranslation } from 'react-i18next';
import { Check, Flag, Sun, Moon, AlertTriangle, Droplets, CircleOff, Focus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Photo } from '@/types';
import { cn } from '@/lib/utils';

interface PhotoThumbnailProps {
  photo: Photo;
  onSelect: () => void;
  onToggleFlag: () => void;
}

export function PhotoThumbnail({ photo, onSelect, onToggleFlag }: PhotoThumbnailProps) {
  const { t } = useTranslation();
  const { analysis, isSelected, isManuallyFlagged } = photo;

  const isFlagged = analysis?.isFlagged || isManuallyFlagged;

  return (
    <div
      className={cn(
        'relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer',
        isSelected ? 'border-primary ring-2 ring-primary/50' : 'border-transparent hover:border-muted-foreground/30'
      )}
      onClick={onSelect}
    >
      <div className="aspect-square bg-muted">
        <img
          src={photo.thumbnailUrl}
          alt={photo.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Selection checkbox */}
      <div
        className={cn(
          'absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
          isSelected
            ? 'bg-primary border-primary text-primary-foreground'
            : 'bg-background/80 border-muted-foreground/50 group-hover:border-primary'
        )}
      >
        {isSelected && <Check className="h-4 w-4" />}
      </div>

      {/* Status badges */}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        {analysis && (
          <>
            {/* Exposure badge */}
            {analysis.exposureStatus === 'overexposed' && (
              <Badge variant="destructive" className="text-xs">
                {t('analysis.overexposed')}
              </Badge>
            )}
            {analysis.exposureStatus === 'underexposed' && (
              <Badge className="text-xs bg-blue-500 hover:bg-blue-500/80">
                {t('analysis.underexposed')}
              </Badge>
            )}
            {analysis.exposureStatus === 'correct' && !isFlagged && (
              <Badge variant="success" className="text-xs">
                <Check className="h-3 w-3 mr-1" />
                {t('analysis.correct')}
              </Badge>
            )}

            {/* Brightness badge */}
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

            {/* Clipping indicators */}
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

            {/* Quality defect indicators */}
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

        {isManuallyFlagged && (
          <Badge variant="outline" className="text-xs bg-background/80">
            <Flag className="h-3 w-3 mr-1" />
            {t('actions.flag')}
          </Badge>
        )}
      </div>

      {/* Flag button on hover */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFlag();
          }}
        >
          <Flag className={cn('h-4 w-4', isManuallyFlagged && 'fill-current')} />
        </Button>
      </div>

      {/* File name */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        <p className="text-xs text-white truncate">{photo.name}</p>
      </div>
    </div>
  );
}
