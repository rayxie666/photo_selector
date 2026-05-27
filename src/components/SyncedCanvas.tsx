import { useEffect, useRef, useState } from 'react';
import type { ZoomTransform, SyncedZoomHandlers } from '@/hooks/useSyncedZoom';

interface SyncedCanvasProps {
  /** Object URL pointing at the photo's full-resolution image. */
  imageUrl: string;
  transform: ZoomTransform;
  handlers: SyncedZoomHandlers;
  /**
   * Native wheel handler from `useSyncedZoom`. We attach this with `{ passive: false }`
   * so it can call `preventDefault()` to stop the browser's pinch-to-zoom.
   */
  onNativeWheel: (e: WheelEvent) => void;
}

export function SyncedCanvas({
  imageUrl,
  transform,
  handlers,
  onNativeWheel,
}: SyncedCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);

  useEffect(() => {
    let cancelled = false;
    let owned: ImageBitmap | null = null;
    (async () => {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const bm = await createImageBitmap(blob);
        if (cancelled) {
          bm.close();
        } else {
          owned = bm;
          setBitmap(bm);
        }
      } catch {
        // ignore — canvas just stays blank
      }
    })();
    return () => {
      cancelled = true;
      if (owned) owned.close();
      setBitmap(null);
    };
  }, [imageUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !bitmap) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const baseScale = Math.min(rect.width / bitmap.width, rect.height / bitmap.height);
    const drawScale = baseScale * transform.scale;
    const drawW = bitmap.width * drawScale;
    const drawH = bitmap.height * drawScale;
    const cx = rect.width / 2 + transform.offsetX;
    const cy = rect.height / 2 + transform.offsetY;

    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
  }, [bitmap, transform]);

  // Native non-passive wheel listener so preventDefault() actually stops browser zoom.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onNativeWheel);
    };
  }, [onNativeWheel]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black/40 overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing"
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onPointerCancel={handlers.onPointerUp}
      onDoubleClick={handlers.onDoubleClick}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
      {!bitmap && (
        <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">
          loading…
        </div>
      )}
    </div>
  );
}
