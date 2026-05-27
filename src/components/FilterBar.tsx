import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Filter,
  XSquare,
  CheckSquare,
  FolderDown,
  XCircle,
  Star,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePhotoContext } from '@/contexts/PhotoContext';
import type { FilterMode, PhotoStatus } from '@/types';
import { cn } from '@/lib/utils';

const supportsFileSystemAccess =
  typeof window !== 'undefined' && 'showDirectoryPicker' in window;

const FILTER_MODES: readonly FilterMode[] = [
  'all',
  'pending',
  'rejected_tech',
  'rejected_ai',
  'rejected_pk',
  'finalist',
];

export function FilterBar() {
  const { t } = useTranslation();
  const { state, dispatch, counts, filteredPhotos } = usePhotoContext();
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

  const handleDeselectAll = () => dispatch({ type: 'DESELECT_ALL' });
  const handleSelectAllVisible = () => dispatch({ type: 'SELECT_ALL_VISIBLE' });

  const visibleSelectedCount = filteredPhotos.reduce(
    (n, p) => n + (p.isSelected ? 1 : 0),
    0,
  );
  const allVisibleSelected =
    filteredPhotos.length > 0 && visibleSelectedCount === filteredPhotos.length;

  const handleMarkSelectedRejected = () =>
    dispatch({
      type: 'SET_STATUS_FOR_SELECTED',
      payload: { status: 'rejected_tech', reason: 'manual' },
    });

  const handleMarkSelectedFinalist = () =>
    dispatch({
      type: 'SET_STATUS_FOR_SELECTED',
      payload: { status: 'finalist' },
    });

  const handleRestoreCurrentFilter = () => {
    // Only meaningful when filter is one of the rejected_* states.
    if (state.filterMode === 'all' || state.filterMode === 'pending' || state.filterMode === 'finalist') {
      return;
    }
    dispatch({
      type: 'RESTORE_BY_STATUS',
      payload: { from: state.filterMode as PhotoStatus },
    });
  };

  const handleSaveSelected = async () => {
    if (!supportsFileSystemAccess) return;

    const selectedPhotos = state.photos.filter((p) => p.isSelected);
    if (selectedPhotos.length === 0) return;

    let dirHandle: FileSystemDirectoryHandle;
    try {
      dirHandle = await (window as Window &
        typeof globalThis & {
          showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
        }).showDirectoryPicker();
    } catch {
      return;
    }

    let savedCount = 0;
    let errorCount = 0;
    const showProgress = selectedPhotos.length >= 10;

    for (const photo of selectedPhotos) {
      if (showProgress) {
        showStatus(
          t('actions.savingProgress', {
            current: savedCount + 1,
            total: selectedPhotos.length,
          }),
        );
      }
      try {
        const fileHandle = await dirHandle.getFileHandle(photo.name, {
          create: true,
        });
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

  const filterCount = (mode: FilterMode): number =>
    mode === 'all' ? counts.total : counts[mode];

  const restoreVisible =
    state.filterMode === 'rejected_tech' ||
    state.filterMode === 'rejected_ai' ||
    state.filterMode === 'rejected_pk';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-4 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1 flex-wrap">
            {FILTER_MODES.map((mode) => (
              <Button
                key={mode}
                variant={state.filterMode === mode ? 'default' : 'outline'}
                size="sm"
                onClick={() => dispatch({ type: 'SET_FILTER', payload: mode })}
                className={cn(state.filterMode === mode && 'pointer-events-none')}
              >
                {mode === 'all' ? t('filter.all') : t(`filter.${mode}`)}
                <span className="ml-1 text-xs opacity-70">({filterCount(mode)})</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {restoreVisible && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestoreCurrentFilter}
              disabled={filterCount(state.filterMode) === 0}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t(
                state.filterMode === 'rejected_tech'
                  ? 'actions.restoreAllTech'
                  : state.filterMode === 'rejected_ai'
                    ? 'actions.restoreAllAi'
                    : 'actions.restoreAllPk',
              )}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkSelectedFinalist}
            disabled={counts.selected === 0}
          >
            <Star className="h-4 w-4 mr-2" />
            {t('actions.markFinalist')} ({counts.selected})
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkSelectedRejected}
            disabled={counts.selected === 0}
          >
            <XCircle className="h-4 w-4 mr-2" />
            {t('actions.markRejected')} ({counts.selected})
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAllVisible}
            disabled={filteredPhotos.length === 0 || allVisibleSelected}
            title={
              allVisibleSelected
                ? t('actions.allAlreadySelected')
                : t('actions.selectAllHint')
            }
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            {t('actions.selectAll')} ({filteredPhotos.length})
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            disabled={counts.selected === 0}
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
              disabled={counts.selected === 0 || !supportsFileSystemAccess}
            >
              <FolderDown className="h-4 w-4 mr-2" />
              {t('actions.saveSelected')} ({counts.selected})
            </Button>
          </div>
        </div>
      </div>

      {saveStatus && (
        <p className="text-sm text-muted-foreground text-right px-1">{saveStatus}</p>
      )}
    </div>
  );
}
