import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, CheckSquare, XSquare, Trash2, FolderDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePhotoContext } from '@/contexts/PhotoContext';
import type { FilterMode } from '@/types';
import { cn } from '@/lib/utils';

const supportsFileSystemAccess = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export function FilterBar() {
  const { t } = useTranslation();
  const { state, dispatch, selectedCount } = usePhotoContext();
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, []);

  const showStatus = (msg: string) => {
    setSaveStatus(msg);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setSaveStatus(null), 4000);
  };

  const filters: { mode: FilterMode; label: string }[] = [
    { mode: 'all', label: t('filter.all') },
    { mode: 'flagged', label: t('filter.flagged') },
    { mode: 'good', label: t('filter.good') },
  ];

  const handleSelectAllFlagged = () => {
    dispatch({ type: 'SELECT_ALL_FLAGGED' });
  };

  const handleDeselectAll = () => {
    dispatch({ type: 'DESELECT_ALL' });
  };

  const handleDeleteSelected = () => {
    dispatch({ type: 'REMOVE_SELECTED' });
  };

  const handleSaveSelected = async () => {
    if (!supportsFileSystemAccess) return;

    const selectedPhotos = state.photos.filter((p) => p.isSelected);
    if (selectedPhotos.length === 0) return;

    let dirHandle: FileSystemDirectoryHandle;
    try {
      dirHandle = await (window as Window & typeof globalThis & { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
    } catch {
      // User cancelled the picker — no error shown
      return;
    }

    let savedCount = 0;
    let errorCount = 0;
    const showProgress = selectedPhotos.length >= 10;

    for (const photo of selectedPhotos) {
      if (showProgress) {
        showStatus(t('actions.savingProgress', { current: savedCount + 1, total: selectedPhotos.length }));
      }
      try {
        const fileHandle = await dirHandle.getFileHandle(photo.name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(photo.file);
        await writable.close();
        savedCount++;
      } catch {
        errorCount++;
      }
    }

    if (errorCount > 0) {
      showStatus(t('errors.saveFolder', { saved: savedCount, failed: errorCount }));
    } else {
      showStatus(t('actions.saveSuccess', { count: savedCount }));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-4 py-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1">
            {filters.map(({ mode, label }) => (
              <Button
                key={mode}
                variant={state.filterMode === mode ? 'default' : 'outline'}
                size="sm"
                onClick={() => dispatch({ type: 'SET_FILTER', payload: mode })}
                className={cn(
                  state.filterMode === mode && 'pointer-events-none'
                )}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAllFlagged}
            disabled={state.photos.length === 0}
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            {t('actions.selectAllFlagged')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            disabled={selectedCount === 0}
          >
            <XSquare className="h-4 w-4 mr-2" />
            {t('actions.deselectAll')}
          </Button>

          <div
            title={!supportsFileSystemAccess ? t('info.browserNotSupported') : undefined}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveSelected}
              disabled={selectedCount === 0 || !supportsFileSystemAccess}
            >
              <FolderDown className="h-4 w-4 mr-2" />
              {t('actions.saveSelected')} ({selectedCount})
            </Button>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={selectedCount === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('actions.deleteSelected')} ({selectedCount})
          </Button>
        </div>
      </div>

      {saveStatus && (
        <p className="text-sm text-muted-foreground text-right px-1">{saveStatus}</p>
      )}
    </div>
  );
}
