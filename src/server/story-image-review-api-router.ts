import { Router, type Request } from 'express';
import { GeminiStoryImageProvider, StoryImageProviderError } from '../lib/story-image-provider.js';
import { createStoryImageStorage } from '../lib/story-image-storage-factory.js';
import {
  parseStoryImageGenerationInput,
  StoryImageValidationError,
  type StoredStoryImageAsset,
  type StoryImageGenerationResult,
} from '../lib/story-image-contract.js';
import {
  regenerateStoryImageAsset,
  type StoryImageRegenerationKind,
} from '../lib/story-image-regeneration-service.js';
import { StoryImageAssetReadError } from '../lib/story-image-asset-reader.js';

interface RateBucket { count: number; resetAt: number }
const windowMs = Math.max(60_000, Number(process.env.IMAGE_REGEN_RATE_LIMIT_WINDOW_MS || 30 * 60_000));
const maximum = Math.max(1, Number(process.env.IMAGE_REGEN_RATE_LIMIT_MAX || 12));
const buckets = new Map<string, RateBucket>();
const provider = new GeminiStoryImageProvider();
const storageSelection = createStoryImageStorage();

function requestKey(request: Request): string {
  return `regen:${request.ip || request.socket.remoteAddress || 'unknown'}`;
}

function takeLimit(request: Request) {
  const now = Date.now();
  const key = requestKey(request);
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= maximum,
    remaining: Math.max(0, maximum - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

function targetKind(value: unknown): StoryImageRegenerationKind | null {
  return ['hero', 'cover', 'story', 'coloring'].includes(String(value))
    ? String(value) as StoryImageRegenerationKind
    : null;
}

function storedAsset(value: unknown): value is StoredStoryImageAsset {
  if (!value || typeof value !== 'object') return false;
  const asset = value as Record<string, unknown>;
  return typeof asset.kind === 'string'
    && typeof asset.url === 'string'
    && typeof asset.storagePath === 'string'
    && typeof asset.mimeType === 'string'
    && typeof asset.promptHash === 'string';
}

function parseAssets(value: unknown): Pick<StoryImageGenerationResult, 'hero' | 'cover' | 'scenes'> {
  if (!value || typeof value !== 'object') throw new Error('بيانات الصور الحالية مطلوبة.');
  const record = value as Record<string, unknown>;
  if (!storedAsset(record.hero) || !storedAsset(record.cover)) {
    throw new Error('مرجع البطل والغلاف الحاليان مطلوبان.');
  }
  const scenesValue = record.scenes;
  if (!scenesValue || typeof scenesValue !== 'object' || Array.isArray(scenesValue)) {
    throw new Error('صور المشاهد الحالية مطلوبة.');
  }
  const scenes: StoryImageGenerationResult['scenes'] = {};
  for (const [key, raw] of Object.entries(scenesValue)) {
    if (!raw || typeof raw !== 'object') continue;
    const pair = raw as Record<string, unknown>;
    if (!storedAsset(pair.story) || !storedAsset(pair.coloring)) continue;
    scenes[key] = { story: pair.story, coloring: pair.coloring };
  }
  return { hero: record.hero, cover: record.cover, scenes };
}

export const storyImageReviewApiRouter = Router();

storyImageReviewApiRouter.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});

storyImageReviewApiRouter.post('/regenerate', async (request, response) => {
  if (!process.env.GEMINI_API_KEY) {
    return response.status(503).json({
      ok: false,
      code: 'IMAGE_PROVIDER_NOT_CONFIGURED',
      error: 'محرك الصور غير مضبوط على الخادم بعد.',
    });
  }

  const rate = takeLimit(request);
  response.setHeader('X-RateLimit-Limit', String(maximum));
  response.setHeader('X-RateLimit-Remaining', String(rate.remaining));
  if (!rate.allowed) {
    response.setHeader('Retry-After', String(rate.retryAfterSeconds));
    return response.status(429).json({
      ok: false,
      code: 'IMAGE_REGEN_RATE_LIMITED',
      error: 'تم الوصول إلى الحد المؤقت لإعادة توليد الصور.',
      retryAfterSeconds: rate.retryAfterSeconds,
    });
  }

  try {
    const input = parseStoryImageGenerationInput(request.body?.input);
    const kind = targetKind(request.body?.target?.kind);
    if (!kind) {
      return response.status(400).json({ ok: false, code: 'INVALID_IMAGE_TARGET', error: 'نوع الصورة المطلوب غير صحيح.' });
    }
    const sceneNumber = request.body?.target?.sceneNumber === undefined
      ? undefined
      : Number(request.body.target.sceneNumber);
    if (['story', 'coloring'].includes(kind) && !Number.isInteger(sceneNumber)) {
      return response.status(400).json({ ok: false, code: 'INVALID_SCENE_NUMBER', error: 'رقم المشهد مطلوب.' });
    }

    const result = await regenerateStoryImageAsset({
      input,
      target: { kind, sceneNumber },
      assets: parseAssets(request.body?.assets),
    }, {
      provider,
      storage: storageSelection.storage,
      maxAttempts: Number(process.env.GEMINI_IMAGE_MAX_ATTEMPTS || 2),
    });

    return response.status(201).json({
      ok: true,
      target: { kind, sceneNumber },
      storage: storageSelection.type,
      ...result,
    });
  } catch (error) {
    if (error instanceof StoryImageValidationError) {
      return response.status(400).json({
        ok: false,
        code: 'INVALID_IMAGE_REGENERATION_INPUT',
        error: 'بيانات القصة المعتمدة غير مكتملة.',
        issues: error.issues,
      });
    }
    if (error instanceof StoryImageAssetReadError) {
      return response.status(error.code === 'ASSET_NOT_FOUND' ? 404 : 422).json({
        ok: false,
        code: error.code,
        error: error.message,
      });
    }
    if (error instanceof StoryImageProviderError) {
      return response.status(error.code === 'NOT_CONFIGURED' ? 503 : 502).json({
        ok: false,
        code: error.code,
        error: 'تعذر إعادة توليد الصورة من مزود الصور.',
      });
    }
    console.error('[story-images/regenerate]', error);
    return response.status(500).json({
      ok: false,
      code: 'IMAGE_REGENERATION_FAILED',
      error: error instanceof Error ? error.message : 'تعذر إعادة توليد الصورة.',
    });
  }
});
