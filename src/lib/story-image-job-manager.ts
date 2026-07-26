import { randomUUID } from 'node:crypto';
import type { StoryImageProvider } from './story-image-provider';
import type { StoryImageStorage } from './story-image-storage';
import {
  generateStoryImageEditions,
  type StoryImageProgress,
} from './story-image-generation-service';
import type {
  StoryImageGenerationInput,
  StoryImageJobSnapshot,
} from './story-image-contract';

interface InternalJob {
  snapshot: StoryImageJobSnapshot;
  input: StoryImageGenerationInput;
  controller: AbortController;
}

export interface StoryImageJobManagerOptions {
  provider: StoryImageProvider;
  storage: StoryImageStorage;
  concurrency?: number;
  retentionMs?: number;
  maxAttemptsPerAsset?: number;
}

function cloneSnapshot(snapshot: StoryImageJobSnapshot): StoryImageJobSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as StoryImageJobSnapshot;
}

export class StoryImageJobManager {
  private readonly provider: StoryImageProvider;
  private readonly storage: StoryImageStorage;
  private readonly concurrency: number;
  private readonly retentionMs: number;
  private readonly maxAttemptsPerAsset: number;
  private readonly jobs = new Map<string, InternalJob>();
  private readonly queue: string[] = [];
  private active = 0;

  constructor(options: StoryImageJobManagerOptions) {
    this.provider = options.provider;
    this.storage = options.storage;
    this.concurrency = Math.max(1, Math.min(3, Number(options.concurrency || 1)));
    this.retentionMs = Math.max(60_000, Number(options.retentionMs || 6 * 60 * 60 * 1000));
    this.maxAttemptsPerAsset = Math.max(1, Math.min(3, Number(options.maxAttemptsPerAsset || 2)));
  }

  start(input: StoryImageGenerationInput): StoryImageJobSnapshot {
    this.cleanup();
    const now = new Date().toISOString();
    const jobId = `img_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
    const total = 2 + input.story.scenes.length * 2;
    const job: InternalJob = {
      input,
      controller: new AbortController(),
      snapshot: {
        jobId,
        bookId: input.bookId,
        status: 'queued',
        current: 0,
        total,
        stageLabel: 'بانتظار بدء إنتاج النسختين',
        createdAt: now,
        updatedAt: now,
      },
    };
    this.jobs.set(jobId, job);
    this.queue.push(jobId);
    void this.drain();
    return cloneSnapshot(job.snapshot);
  }

  get(jobId: string): StoryImageJobSnapshot | null {
    this.cleanup();
    const job = this.jobs.get(jobId);
    return job ? cloneSnapshot(job.snapshot) : null;
  }

  cancel(jobId: string): StoryImageJobSnapshot | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    if (['completed', 'failed', 'cancelled'].includes(job.snapshot.status)) {
      return cloneSnapshot(job.snapshot);
    }
    job.controller.abort();
    job.snapshot.status = 'cancelled';
    job.snapshot.stageLabel = 'أُلغيت مهمة إنتاج الصور';
    job.snapshot.updatedAt = new Date().toISOString();
    const queuedIndex = this.queue.indexOf(jobId);
    if (queuedIndex >= 0) this.queue.splice(queuedIndex, 1);
    return cloneSnapshot(job.snapshot);
  }

  private update(job: InternalJob, progress: StoryImageProgress): void {
    if (job.snapshot.status === 'cancelled') return;
    job.snapshot.status = progress.status;
    job.snapshot.current = progress.current;
    job.snapshot.total = progress.total;
    job.snapshot.stageLabel = progress.stageLabel;
    job.snapshot.currentScene = progress.currentScene;
    job.snapshot.updatedAt = new Date().toISOString();
  }

  private async run(job: InternalJob): Promise<void> {
    if (job.snapshot.status === 'cancelled') return;
    try {
      const result = await generateStoryImageEditions(job.input, {
        provider: this.provider,
        storage: this.storage,
        signal: job.controller.signal,
        maxAttemptsPerAsset: this.maxAttemptsPerAsset,
        onProgress: (progress) => this.update(job, progress),
      });
      if (job.snapshot.status === 'cancelled') return;
      job.snapshot.result = result;
      job.snapshot.status = 'completed';
      job.snapshot.current = job.snapshot.total;
      job.snapshot.stageLabel = 'اكتملت نسخة القصة ونسخة التلوين';
      job.snapshot.updatedAt = new Date().toISOString();
    } catch (error) {
      if (job.snapshot.status === 'cancelled' || job.controller.signal.aborted) {
        job.snapshot.status = 'cancelled';
        job.snapshot.stageLabel = 'أُلغيت مهمة إنتاج الصور';
      } else {
        job.snapshot.status = 'failed';
        job.snapshot.stageLabel = 'تعذر إكمال إنتاج الصور';
        job.snapshot.error = {
          code: error && typeof error === 'object' && 'code' in error
            ? String((error as { code?: unknown }).code || 'IMAGE_GENERATION_FAILED')
            : 'IMAGE_GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'حدث خطأ غير متوقع.',
        };
      }
      job.snapshot.updatedAt = new Date().toISOString();
    }
  }

  private async drain(): Promise<void> {
    while (this.active < this.concurrency && this.queue.length) {
      const jobId = this.queue.shift();
      if (!jobId) return;
      const job = this.jobs.get(jobId);
      if (!job || job.snapshot.status === 'cancelled') continue;
      this.active += 1;
      void this.run(job).finally(() => {
        this.active -= 1;
        void this.drain();
      });
    }
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.retentionMs;
    for (const [jobId, job] of this.jobs.entries()) {
      if (!['completed', 'failed', 'cancelled'].includes(job.snapshot.status)) continue;
      if (Date.parse(job.snapshot.updatedAt) < cutoff) this.jobs.delete(jobId);
    }
  }
}
