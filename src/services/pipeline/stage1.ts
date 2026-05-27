// Stage 1 — pure technical filter, runs in a Web Worker pool.
// Main thread decodes + downscales (createImageBitmap + OffscreenCanvas), then ships
// the ImageData (transferable) to a worker, which runs the Laplacian + histogram pipeline.

import { processImageFile } from '@/utils/imageProcessor';
import { WorkerPool } from '@/utils/workerPool';
import type {
  AnalysisJob,
  AnalysisJobResult,
} from '@/workers/analysis.worker';
import AnalysisWorker from '@/workers/analysis.worker?worker';
import type { AnalysisResult, AnalysisSettings, PhotoStatus } from '@/types';

export interface Stage1Outcome {
  thumbnailUrl: string;
  analysis: AnalysisResult;
  status: PhotoStatus;
  rejectionReason?: string;
}

function deriveTechRejectionReason(a: AnalysisResult): string {
  if (a.exposureStatus === 'overexposed') return 'overexposed';
  if (a.exposureStatus === 'underexposed') return 'underexposed';
  if (a.brightnessStatus === 'tooDark') return 'too_dark';
  if (a.brightnessStatus === 'tooBright') return 'too_bright';
  if (a.isBlurry) return 'blurry';
  if (a.isPureBlack) return 'pure_black';
  if (a.isGrayFlat) return 'gray_flat';
  if (a.hasClippedHighlights) return 'clipped_highlights';
  if (a.hasClippedShadows) return 'clipped_shadows';
  return 'technical';
}

const POOL_SIZE = (() => {
  const hw = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  return Math.max(2, Math.min(6, Math.floor(hw / 2)));
})();

let _pool: WorkerPool<AnalysisJob, AnalysisJobResult> | null = null;

function getPool(): WorkerPool<AnalysisJob, AnalysisJobResult> {
  if (_pool === null) {
    _pool = new WorkerPool<AnalysisJob, AnalysisJobResult>(
      () => new AnalysisWorker(),
      POOL_SIZE,
    );
  }
  return _pool;
}

let _jobCounter = 0;
function nextJobId(): string {
  _jobCounter += 1;
  return `j${_jobCounter}`;
}

export async function runStage1ForFile(
  file: File,
  settings: AnalysisSettings,
): Promise<Stage1Outcome> {
  const { thumbnailUrl, imageData } = await processImageFile(file);
  const jobId = nextJobId();
  const response = await getPool().run(
    { jobId, imageData, settings },
    [imageData.data.buffer],
  );
  if (response.error || !response.result) {
    URL.revokeObjectURL(thumbnailUrl);
    throw new Error(response.error ?? 'analysis worker returned no result');
  }
  const analysis = response.result;
  if (analysis.isFlagged) {
    return {
      thumbnailUrl,
      analysis,
      status: 'rejected_tech',
      rejectionReason: deriveTechRejectionReason(analysis),
    };
  }
  return { thumbnailUrl, analysis, status: 'pending' };
}
