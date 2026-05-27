// Tiny worker pool with FIFO queueing. Each job pins one worker until it answers.
// Caller is responsible for the request/response message shape — see AnalysisJob in
// src/workers/analysis.worker.ts.

interface PendingJob<I, O> {
  payload: I;
  jobId: string;
  resolve: (o: O) => void;
  reject: (err: Error) => void;
  transfer?: Transferable[];
}

export interface JobWithId {
  jobId: string;
}

export class WorkerPool<I extends JobWithId, O extends JobWithId> {
  private readonly workers: Worker[];
  private readonly idle: Worker[];
  private readonly queue: PendingJob<I, O>[] = [];
  private readonly inflight = new Map<string, PendingJob<I, O>>();

  constructor(factory: () => Worker, size: number) {
    this.workers = Array.from({ length: size }, () => {
      const worker = factory();
      worker.addEventListener('message', (e: MessageEvent<O>) => this.handleMessage(worker, e.data));
      worker.addEventListener('error', (e) => this.handleError(worker, e));
      return worker;
    });
    this.idle = [...this.workers];
  }

  run(payload: I, transfer?: Transferable[]): Promise<O> {
    return new Promise<O>((resolve, reject) => {
      this.queue.push({ payload, jobId: payload.jobId, resolve, reject, transfer });
      this.tick();
    });
  }

  destroy(): void {
    for (const w of this.workers) w.terminate();
    this.workers.length = 0;
    this.idle.length = 0;
    this.queue.length = 0;
    this.inflight.clear();
  }

  private tick(): void {
    while (this.idle.length > 0 && this.queue.length > 0) {
      const worker = this.idle.shift()!;
      const job = this.queue.shift()!;
      this.inflight.set(job.jobId, job);
      try {
        if (job.transfer && job.transfer.length > 0) {
          worker.postMessage(job.payload, job.transfer);
        } else {
          worker.postMessage(job.payload);
        }
      } catch (err) {
        this.inflight.delete(job.jobId);
        this.idle.push(worker);
        job.reject(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  private handleMessage(worker: Worker, data: O): void {
    const job = this.inflight.get(data.jobId);
    if (!job) return; // stale / orphaned message
    this.inflight.delete(data.jobId);
    this.idle.push(worker);
    job.resolve(data);
    this.tick();
  }

  private handleError(worker: Worker, event: ErrorEvent): void {
    // Worker hit an uncaught error; reject every job it was holding then return it to idle.
    for (const [jobId, job] of this.inflight.entries()) {
      this.inflight.delete(jobId);
      job.reject(new Error(event.message || 'worker error'));
    }
    if (!this.idle.includes(worker)) this.idle.push(worker);
    this.tick();
  }
}
