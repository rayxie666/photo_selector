/// <reference lib="webworker" />
import { analyzeImageData } from '@/utils/imageAnalysis';
import type { AnalysisResult, AnalysisSettings } from '@/types';

export interface AnalysisJob {
  jobId: string;
  imageData: ImageData;
  settings: AnalysisSettings;
}

export interface AnalysisJobResult {
  jobId: string;
  result?: AnalysisResult;
  error?: string;
}

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener('message', (event: MessageEvent<AnalysisJob>) => {
  const { jobId, imageData, settings } = event.data;
  try {
    const result = analyzeImageData(imageData, settings);
    const response: AnalysisJobResult = { jobId, result };
    ctx.postMessage(response);
  } catch (err) {
    const response: AnalysisJobResult = {
      jobId,
      error: err instanceof Error ? err.message : String(err),
    };
    ctx.postMessage(response);
  }
});
