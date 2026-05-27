import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X as CloseIcon, Trophy, SkipForward, Sparkles, Heart, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SyncedCanvas } from '@/components/SyncedCanvas';
import { useSyncedZoom } from '@/hooks/useSyncedZoom';
import { usePhotoContext } from '@/contexts/PhotoContext';
import type { Photo } from '@/types';

interface ComparisonPKProps {
  open: boolean;
  onClose: () => void;
}

interface PKState {
  clusters: Photo[][]; // each sub-array sorted by aestheticScore desc
  clusterIndex: number;
  champion: Photo | null;
  queue: Photo[];
  totalFinalists: number;
  totalLosers: number;
  done: boolean;
  history: PKHistoryEntry[];
}

// History entry: enough to reverse one user decision.
interface PKHistoryEntry {
  // Snapshot of everything except `history`, so we can rewind in one assignment.
  prevState: Omit<PKState, 'history'>;
  // Photo ids whose status was set away from `pending` by this decision.
  // On undo we restore each to `pending` with no reason.
  revertIds: string[];
}

function buildInitialState(clusters: Photo[][]): PKState {
  if (clusters.length === 0) {
    return {
      clusters,
      clusterIndex: 0,
      champion: null,
      queue: [],
      totalFinalists: 0,
      totalLosers: 0,
      done: true,
      history: [],
    };
  }
  const first = clusters[0];
  return {
    clusters,
    clusterIndex: 0,
    champion: first[0],
    queue: first.slice(1),
    totalFinalists: 0,
    totalLosers: 0,
    done: false,
    history: [],
  };
}

function snapshot(s: PKState): Omit<PKState, 'history'> {
  const { history: _h, ...rest } = s;
  return rest;
}

function objectUrlFor(photo: Photo): string {
  return URL.createObjectURL(photo.file);
}

export function ComparisonPK({ open, onClose }: ComparisonPKProps) {
  const { t } = useTranslation();
  const { state, dispatch } = usePhotoContext();
  const { transform, reset, handlers, handleNativeWheel } = useSyncedZoom();

  const clusters = useMemo(() => {
    if (!open) return [];
    const groups = new Map<number, Photo[]>();
    for (const photo of state.photos) {
      if (
        photo.status === 'pending' &&
        photo.clusterId !== undefined
      ) {
        const arr = groups.get(photo.clusterId);
        if (arr) arr.push(photo);
        else groups.set(photo.clusterId, [photo]);
      }
    }
    const multi: Photo[][] = [];
    for (const arr of groups.values()) {
      if (arr.length >= 2) {
        const sorted = [...arr].sort((a, b) => {
          const sa = a.aestheticScore ?? -Infinity;
          const sb = b.aestheticScore ?? -Infinity;
          return sb - sa;
        });
        multi.push(sorted);
      }
    }
    return multi;
    // Re-compute only when modal opens; further clusters in the same session aren't re-evaluated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const [pk, setPk] = useState<PKState>(() => buildInitialState(clusters));

  // Rebuild state when modal opens with a fresh cluster snapshot.
  useEffect(() => {
    if (open) {
      setPk(buildInitialState(clusters));
      reset();
    }
  }, [open, clusters, reset]);

  // Object URLs for the current pair — recreated on each round.
  const [leftUrl, setLeftUrl] = useState<string | null>(null);
  const [rightUrl, setRightUrl] = useState<string | null>(null);

  const challenger: Photo | null = pk.queue.length > 0 ? pk.queue[0] : null;

  useEffect(() => {
    if (!open || pk.done) {
      setLeftUrl(null);
      setRightUrl(null);
      return;
    }
    const lu = pk.champion ? objectUrlFor(pk.champion) : null;
    const ru = challenger ? objectUrlFor(challenger) : null;
    setLeftUrl(lu);
    setRightUrl(ru);
    reset();
    return () => {
      if (lu) URL.revokeObjectURL(lu);
      if (ru) URL.revokeObjectURL(ru);
    };
  }, [open, pk.champion, challenger, pk.done, reset]);

  const advance = useCallback(
    (winner: Photo, loser: Photo) => {
      setPk((prev) => {
        const histEntry: PKHistoryEntry = { prevState: snapshot(prev), revertIds: [loser.id] };
        const isLastInCluster = prev.queue.length <= 1;

        dispatch({
          type: 'SET_STATUS',
          payload: { id: loser.id, status: 'rejected_pk', reason: `lost_pk_to:${winner.id}` },
        });

        if (isLastInCluster) {
          dispatch({ type: 'SET_STATUS', payload: { id: winner.id, status: 'finalist' } });
          histEntry.revertIds.push(winner.id);

          const nextClusterIndex = prev.clusterIndex + 1;
          const totalFinalists = prev.totalFinalists + 1;
          const totalLosers = prev.totalLosers + 1;
          if (nextClusterIndex >= prev.clusters.length) {
            return {
              ...prev,
              history: [...prev.history, histEntry],
              champion: null,
              queue: [],
              clusterIndex: nextClusterIndex,
              totalFinalists,
              totalLosers,
              done: true,
            };
          }
          const next = prev.clusters[nextClusterIndex];
          return {
            ...prev,
            history: [...prev.history, histEntry],
            champion: next[0],
            queue: next.slice(1),
            clusterIndex: nextClusterIndex,
            totalFinalists,
            totalLosers,
          };
        }

        return {
          ...prev,
          history: [...prev.history, histEntry],
          champion: winner,
          queue: prev.queue.slice(1),
          totalLosers: prev.totalLosers + 1,
        };
      });
    },
    [dispatch],
  );

  // Both photos go to `finalist`. New champion pulled from the next queue item.
  // If only a single photo remains after that, it is auto-promoted (uncontested).
  const keepBoth = useCallback(() => {
    setPk((prev) => {
      const left = prev.champion;
      const right = prev.queue[0];
      if (!left || !right) return prev;

      const revertIds = [left.id, right.id];
      dispatch({ type: 'SET_STATUS', payload: { id: left.id, status: 'finalist' } });
      dispatch({ type: 'SET_STATUS', payload: { id: right.id, status: 'finalist' } });

      const remainingQueue = prev.queue.slice(1);
      let addedFinalists = 2;

      const finishCluster = () => {
        const nextClusterIndex = prev.clusterIndex + 1;
        const totalFinalists = prev.totalFinalists + addedFinalists;
        const histEntry: PKHistoryEntry = { prevState: snapshot(prev), revertIds };
        if (nextClusterIndex >= prev.clusters.length) {
          return {
            ...prev,
            history: [...prev.history, histEntry],
            champion: null,
            queue: [],
            clusterIndex: nextClusterIndex,
            totalFinalists,
            done: true,
          };
        }
        const next = prev.clusters[nextClusterIndex];
        return {
          ...prev,
          history: [...prev.history, histEntry],
          champion: next[0],
          queue: next.slice(1),
          clusterIndex: nextClusterIndex,
          totalFinalists,
        };
      };

      if (remainingQueue.length === 0) {
        return finishCluster();
      }

      if (remainingQueue.length === 1) {
        // Uncontested leftover — auto-promote.
        const leftover = remainingQueue[0];
        dispatch({ type: 'SET_STATUS', payload: { id: leftover.id, status: 'finalist' } });
        revertIds.push(leftover.id);
        addedFinalists += 1;
        return finishCluster();
      }

      const newChampion = remainingQueue[0];
      const newQueue = remainingQueue.slice(1);
      const histEntry: PKHistoryEntry = { prevState: snapshot(prev), revertIds };
      return {
        ...prev,
        history: [...prev.history, histEntry],
        champion: newChampion,
        queue: newQueue,
        totalFinalists: prev.totalFinalists + 2,
      };
    });
  }, [dispatch]);

  const undo = useCallback(() => {
    setPk((prev) => {
      if (prev.history.length === 0) return prev;
      const last = prev.history[prev.history.length - 1];
      for (const id of last.revertIds) {
        dispatch({
          type: 'SET_STATUS',
          payload: { id, status: 'pending', reason: undefined },
        });
      }
      return { ...last.prevState, history: prev.history.slice(0, -1) };
    });
  }, [dispatch]);

  const pickLeft = useCallback(() => {
    if (!pk.champion || !challenger) return;
    advance(pk.champion, challenger);
  }, [pk.champion, challenger, advance]);

  const pickRight = useCallback(() => {
    if (!pk.champion || !challenger) return;
    advance(challenger, pk.champion);
  }, [pk.champion, challenger, advance]);

  const skip = useCallback(() => {
    if (!pk.champion || !challenger) return;
    const championScore = pk.champion.aestheticScore ?? 0;
    const challengerScore = challenger.aestheticScore ?? 0;
    if (challengerScore > championScore) advance(challenger, pk.champion);
    else advance(pk.champion, challenger);
  }, [pk.champion, challenger, advance]);

  // Keyboard shortcuts.
  useEffect(() => {
    if (!open || pk.done) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') pickLeft();
      else if (e.key === 'ArrowRight') pickRight();
      else if (e.key === 'k' || e.key === 'K') keepBoth();
      else if (e.key === 'z' || e.key === 'Z') undo();
      else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        skip();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, pk.done, onClose, pickLeft, pickRight, skip, keepBoth, undo]);

  if (!open) return null;

  if (clusters.length === 0) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
        role="dialog"
        aria-modal="true"
      >
        <div className="bg-background rounded-lg p-6 text-center space-y-4 max-w-md">
          <p className="text-sm text-muted-foreground">{t('pk.noClusters')}</p>
          <Button onClick={onClose}>{t('pk.exit')}</Button>
        </div>
      </div>
    );
  }

  if (pk.done) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
        role="dialog"
        aria-modal="true"
      >
        <div className="bg-background rounded-lg p-8 text-center space-y-4 max-w-md">
          <Trophy className="h-12 w-12 mx-auto text-emerald-500" />
          <h3 className="text-xl font-semibold">{t('pk.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('pk.done', {
              finalists: pk.totalFinalists,
              losers: pk.totalLosers,
            })}
          </p>
          <Button onClick={onClose}>{t('pk.exit')}</Button>
        </div>
      </div>
    );
  }

  const totalRoundsInCluster = pk.clusters[pk.clusterIndex].length - 1;
  const completedRoundsInCluster = totalRoundsInCluster - pk.queue.length;
  const currentRound = completedRoundsInCluster + 1;

  const championScore = pk.champion?.aestheticScore;
  const challengerScore = challenger?.aestheticScore;
  let aiSide: 'left' | 'right' | null = null;
  if (championScore !== undefined && challengerScore !== undefined) {
    if (championScore > challengerScore) aiSide = 'left';
    else if (challengerScore > championScore) aiSide = 'right';
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" role="dialog" aria-modal="true">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white">
        <div className="flex items-center gap-3 text-sm">
          <Badge variant="outline" className="bg-white/10">
            {t('pk.clusterProgress', {
              current: pk.clusterIndex + 1,
              total: pk.clusters.length,
            })}
          </Badge>
          <Badge variant="outline" className="bg-white/10">
            {t('pk.roundProgress', { round: currentRound, max: totalRoundsInCluster })}
          </Badge>
          <span className="text-white/60 text-xs hidden md:inline">{t('pk.zoomHint')}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={onClose}
        >
          <CloseIcon className="h-5 w-5" />
        </Button>
      </div>

      {/* Twin canvases */}
      <div className="flex-1 grid grid-cols-2 gap-px bg-white/10 min-h-0">
        <div className="relative h-full">
          {leftUrl && (
            <SyncedCanvas
              imageUrl={leftUrl}
              transform={transform}
              handlers={handlers}
              onNativeWheel={handleNativeWheel}
            />
          )}
          <CanvasLabel side="left" photo={pk.champion} aiPicked={aiSide === 'left'} />
        </div>
        <div className="relative h-full">
          {rightUrl && (
            <SyncedCanvas
              imageUrl={rightUrl}
              transform={transform}
              handlers={handlers}
              onNativeWheel={handleNativeWheel}
            />
          )}
          <CanvasLabel side="right" photo={challenger} aiPicked={aiSide === 'right'} />
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-center gap-3 px-4 py-4 bg-black/80 flex-wrap">
        <Button
          variant="ghost"
          size="lg"
          onClick={undo}
          disabled={pk.history.length === 0}
          className="text-white hover:bg-white/10"
        >
          <Undo2 className="h-4 w-4 mr-2" />
          {t('pk.undo')}
          <ShortcutKey label="Z" />
        </Button>
        <Button variant="default" size="lg" onClick={pickLeft}>
          {t('pk.pickLeft')}
          <ShortcutKey label="←" />
        </Button>
        <Button variant="secondary" size="lg" onClick={keepBoth}>
          <Heart className="h-4 w-4 mr-2" />
          {t('pk.keepBoth')}
          <ShortcutKey label="K" />
        </Button>
        <Button variant="outline" size="lg" onClick={skip}>
          <SkipForward className="h-4 w-4 mr-2" />
          {t('pk.skipUseAi')}
          <ShortcutKey label="Space" />
        </Button>
        <Button variant="default" size="lg" onClick={pickRight}>
          {t('pk.pickRight')}
          <ShortcutKey label="→" />
        </Button>
      </div>
    </div>
  );
}

function ShortcutKey({ label }: { label: string }) {
  return (
    <kbd className="ml-2 inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1 rounded border border-current/30 bg-black/20 font-mono text-[10px] opacity-80">
      {label}
    </kbd>
  );
}

interface CanvasLabelProps {
  side: 'left' | 'right';
  photo: Photo | null;
  aiPicked: boolean;
}

function CanvasLabel({ side, photo, aiPicked }: CanvasLabelProps) {
  const { t } = useTranslation();
  if (!photo) return null;
  return (
    <div
      className={`absolute top-2 ${side === 'left' ? 'left-2' : 'right-2'} flex flex-col gap-1 items-${
        side === 'left' ? 'start' : 'end'
      } pointer-events-none`}
    >
      <Badge variant="outline" className="bg-black/70 text-white border-white/20 max-w-[40vw]">
        <span className="truncate">{photo.name}</span>
      </Badge>
      {photo.aestheticScore !== undefined && (
        <Badge variant="outline" className="bg-black/70 text-white border-white/20 font-mono">
          <Sparkles className="h-3 w-3 mr-1" />
          {photo.aestheticScore.toFixed(2)}
        </Badge>
      )}
      {aiPicked && (
        <Badge className="bg-emerald-500/90 text-white border-0">
          ✨ {t('pk.aiSuggests')}
        </Badge>
      )}
    </div>
  );
}
