import { Router, type Request } from 'express';
import { GeminiStoryImageProvider, StoryImageProviderError } from '../lib/story-image-provider.js';
import { FileStoryImageStorage } from '../lib/story-image-storage.js';
import { StoryImageJobManager } from '../lib/story-image-job-manager.js';
import {
  parseStoryImageGenerationInput,
  StoryImageValidationError,
} from '../lib/story-image-contract.js';

interface RateBucket {
  count: number;
  resetAt: number;
}

const windowMs = Math.max(60_000, Number(process.env.IMAGE_RATE_LIMIT_WINDOW_MS || 30 * 60_000));
const maximumJobs = Math.max(1, Number(process.env.IMAGE_RATE_LIMIT_MAX || 2));
const rateBuckets = new Map<string, RateBucket>();

function requestKey(request: Request): string {
  return request.ip || request.socket.remoteAddress || 'unknown';
}

function takeRateLimit(request: Request): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const key = requestKey(request);
  let bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    rateBuckets.set(key, bucket);
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= maximumJobs,
    remaining: Math.max(0, maximumJobs - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

const provider = new GeminiStoryImageProvider();
const storage = new FileStoryImageStorage();
const jobs = new StoryImageJobManager({
  provider,
  storage,
  concurrency: Number(process.env.IMAGE_JOB_CONCURRENCY || 1),
  maxAttemptsPerAsset: Number(process.env.GEMINI_IMAGE_MAX_ATTEMPTS || 2),
});

export const storyImageApiRouter = Router();

storyImageApiRouter.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});

storyImageApiRouter.get('/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'colorverse-story-images',
    configured: Boolean(process.env.GEMINI_API_KEY),
    model: provider.model,
    editions: {
      story: 'full-color-with-narrative',
      coloring: 'line-art-only-without-narrative-text',
    },
    storage: 'server-filesystem',
  });
});

storyImageApiRouter.post('/jobs', (request, response) => {
  if (!process.env.GEMINI_API_KEY) {
    return response.status(503).json({
      ok: false,
      code: 'IMAGE_PROVIDER_NOT_CONFIGURED',
      error: 'محرك الصور غير مضبوط على الخادم بعد.',
    });
  }

  const rate = takeRateLimit(request);
  response.setHeader('X-RateLimit-Limit', String(maximumJobs));
  response.setHeader('X-RateLimit-Remaining', String(rate.remaining));
  if (!rate.allowed) {
    response.setHeader('Retry-After', String(rate.retryAfterSeconds));
    return response.status(429).json({
      ok: false,
      code: 'IMAGE_RATE_LIMITED',
      error: 'تم الوصول إلى الحد المؤقت لإنتاج الكتب المصورة.',
      retryAfterSeconds: rate.retryAfterSeconds,
    });
  }

  try {
    const input = parseStoryImageGenerationInput(request.body);
    const job = jobs.start(input);
    return response.status(202).json({ ok: true, job });
  } catch (error) {
    if (error instanceof StoryImageValidationError) {
      return response.status(400).json({
        ok: false,
        code: 'INVALID_IMAGE_JOB',
        error: 'بيانات إنتاج الصور غير مكتملة أو غير صحيحة.',
        issues: error.issues,
      });
    }
    if (error instanceof StoryImageProviderError) {
      return response.status(error.code === 'NOT_CONFIGURED' ? 503 : 502).json({
        ok: false,
        code: error.code,
        error: 'تعذر بدء محرك الصور.',
      });
    }
    console.error('[story-images/jobs]', error);
    return response.status(500).json({
      ok: false,
      code: 'IMAGE_JOB_START_FAILED',
      error: 'حدث خطأ أثناء بدء إنتاج الصور.',
    });
  }
});

storyImageApiRouter.get('/jobs/:jobId', (request, response) => {
  const job = jobs.get(request.params.jobId);
  if (!job) {
    return response.status(404).json({
      ok: false,
      code: 'IMAGE_JOB_NOT_FOUND',
      error: 'مهمة الصور غير موجودة أو انتهت مدة الاحتفاظ بها.',
    });
  }
  return response.json({ ok: true, job });
});

storyImageApiRouter.delete('/jobs/:jobId', (request, response) => {
  const job = jobs.cancel(request.params.jobId);
  if (!job) {
    return response.status(404).json({
      ok: false,
      code: 'IMAGE_JOB_NOT_FOUND',
      error: 'مهمة الصور غير موجودة.',
    });
  }
  return response.json({ ok: true, job });
});
