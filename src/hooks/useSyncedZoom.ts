import { useCallback, useRef, useState } from 'react';

export interface ZoomTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const INITIAL: ZoomTransform = { scale: 1, offsetX: 0, offsetY: 0 };
const MIN_SCALE = 0.5;
const MAX_SCALE = 8;

// onWheel is intentionally NOT in this set — wheel events must be attached as
// native non-passive listeners so we can preventDefault() and stop browser zoom.
// Consumers should call `handleNativeWheel` via addEventListener('wheel', ..., { passive: false }).
export interface SyncedZoomHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDoubleClick: () => void;
}

export function useSyncedZoom(): {
  transform: ZoomTransform;
  reset: () => void;
  handlers: SyncedZoomHandlers;
  /**
   * Attach this to the target element via `addEventListener('wheel', fn, { passive: false })`.
   * Zoom is gated on Ctrl/⌘ being held (or pinch trackpad, which the browser synthesizes as ctrlKey).
   * Plain wheel events fall through so the page can scroll / browser keeps default behavior.
   */
  handleNativeWheel: (e: WheelEvent) => void;
} {
  const [transform, setTransform] = useState<ZoomTransform>(INITIAL);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    baseOffsetX: number;
    baseOffsetY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    baseOffsetX: 0,
    baseOffsetY: 0,
  });

  const reset = useCallback(() => setTransform(INITIAL), []);

  const handleNativeWheel = useCallback((e: WheelEvent) => {
    // Gate on modifier: Ctrl/⌘ + wheel, or pinch trackpad (browser synthesizes ctrlKey).
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const target = e.currentTarget as HTMLElement | null;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const dx = e.clientX - rect.left - rect.width / 2;
    const dy = e.clientY - rect.top - rect.height / 2;
    const factor = Math.exp(-e.deltaY * 0.0015);
    setTransform((prev) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
      const ratio = newScale / prev.scale;
      return {
        scale: newScale,
        offsetX: dx * (1 - ratio) + prev.offsetX * ratio,
        offsetY: dy * (1 - ratio) + prev.offsetY * ratio,
      };
    });
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      baseOffsetX: 0,
      baseOffsetY: 0,
    };
    setTransform((prev) => {
      dragRef.current.baseOffsetX = prev.offsetX;
      dragRef.current.baseOffsetY = prev.offsetY;
      return prev;
    });
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setTransform((prev) => ({
      ...prev,
      offsetX: dragRef.current.baseOffsetX + dx,
      offsetY: dragRef.current.baseOffsetY + dy,
    }));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  return {
    transform,
    reset,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onDoubleClick: reset },
    handleNativeWheel,
  };
}
