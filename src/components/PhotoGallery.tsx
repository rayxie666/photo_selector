import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PhotoThumbnail } from '@/components/PhotoThumbnail';
import { PhotoLightbox } from '@/components/PhotoLightbox';
import { usePhotoContext } from '@/contexts/PhotoContext';
import type { PhotoCritique, PhotoStatus } from '@/types';

const INITIAL_LIMIT = 60;
const PAGE_SIZE = 60;

export function PhotoGallery() {
  const { t } = useTranslation();
  const { state, dispatch, filteredPhotos, counts } = usePhotoContext();

  const [displayLimit, setDisplayLimit] = useState(INITIAL_LIMIT);
  const [openPhotoId, setOpenPhotoId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset paging when the filter changes (filtered list identity changes).
  useEffect(() => {
    setDisplayLimit(INITIAL_LIMIT);
  }, [state.filterMode]);

  // Sentinel observer — bump displayLimit when sentinel scrolls into view.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    if (filteredPhotos.length <= displayLimit) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setDisplayLimit((prev) => prev + PAGE_SIZE);
          }
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [filteredPhotos.length, displayLimit]);

  const handleSelect = useCallback(
    (id: string) => dispatch({ type: 'TOGGLE_SELECT', payload: id }),
    [dispatch],
  );

  const handleSetStatus = useCallback(
    (id: string, status: PhotoStatus, reason?: string) =>
      dispatch({ type: 'SET_STATUS', payload: { id, status, reason } }),
    [dispatch],
  );

  const handleOpenLightbox = useCallback((id: string) => setOpenPhotoId(id), []);
  const handleCloseLightbox = useCallback(() => setOpenPhotoId(null), []);
  const handleNavigateLightbox = useCallback((id: string) => setOpenPhotoId(id), []);
  const handleSetCritique = useCallback(
    (id: string, critique: PhotoCritique) =>
      dispatch({ type: 'SET_CRITIQUE', payload: { id, critique } }),
    [dispatch],
  );

  const rejectedTotal = counts.rejected_tech + counts.rejected_ai + counts.rejected_pk;
  const visible = filteredPhotos.slice(0, displayLimit);
  const hasMore = filteredPhotos.length > displayLimit;

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>{t('gallery.title')}</CardTitle>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{counts.total}</span> {t('gallery.total')}
              {' · '}
              <span className="font-medium text-emerald-600">{counts.finalist}</span>{' '}
              {t('gallery.finalists')}
              {' · '}
              <span className="font-medium text-destructive">{rejectedTotal}</span>{' '}
              {t('gallery.flagged')}
              {counts.selected > 0 && (
                <>
                  {' · '}
                  <span className="font-medium text-primary">{counts.selected}</span>{' '}
                  {t('gallery.selected')}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ImageOff className="h-12 w-12 mb-4" />
              <p>{t('gallery.empty')}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {visible.map((photo) => (
                  <PhotoThumbnail
                    key={photo.id}
                    photo={photo}
                    onSelect={handleSelect}
                    onSetStatus={handleSetStatus}
                    onOpenLightbox={handleOpenLightbox}
                  />
                ))}
              </div>
              {hasMore && (
                <div
                  ref={sentinelRef}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  {t('gallery.loadingMore', {
                    shown: visible.length,
                    total: filteredPhotos.length,
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <PhotoLightbox
        photos={filteredPhotos}
        openPhotoId={openPhotoId}
        onClose={handleCloseLightbox}
        onSelect={handleSelect}
        onSetStatus={handleSetStatus}
        onNavigate={handleNavigateLightbox}
        onSetCritique={handleSetCritique}
      />
    </>
  );
}
