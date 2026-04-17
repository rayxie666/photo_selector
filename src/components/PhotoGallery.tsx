import { useTranslation } from 'react-i18next';
import { ImageOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PhotoThumbnail } from '@/components/PhotoThumbnail';
import { usePhotoContext } from '@/contexts/PhotoContext';

export function PhotoGallery() {
  const { t } = useTranslation();
  const { state, dispatch, filteredPhotos, flaggedCount, selectedCount } = usePhotoContext();

  const handleSelect = (id: string) => {
    dispatch({ type: 'TOGGLE_SELECT', payload: id });
  };

  const handleToggleFlag = (id: string) => {
    dispatch({ type: 'TOGGLE_MANUAL_FLAG', payload: id });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>{t('gallery.title')}</CardTitle>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-destructive">{flaggedCount}</span>
            {' '}{t('gallery.flagged')} / {' '}
            <span className="font-medium">{state.photos.length}</span>
            {' '}{t('gallery.total')}
            {selectedCount > 0 && (
              <>
                {' '} · {' '}
                <span className="font-medium text-primary">{selectedCount}</span>
                {' '}{t('gallery.selected')}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredPhotos.map((photo) => (
              <PhotoThumbnail
                key={photo.id}
                photo={photo}
                onSelect={() => handleSelect(photo.id)}
                onToggleFlag={() => handleToggleFlag(photo.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
