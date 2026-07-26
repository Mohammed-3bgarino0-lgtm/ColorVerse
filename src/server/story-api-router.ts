import { Router, type Request } from 'express';
import {
  GeminiStoryProvider,
  StoryProviderError,
} from '../lib/gemini-story-provider.js';
import {
  StoryGenerationExhaustedError,
  StoryGenerationRejectedError,
  generateProfessionalStory,
} from '../lib/story-generation-service.js';
import {
  StoryApiValidationError,
  parseStoryGenerationApiInput,
} from '../lib/story-api-contract.js';

interface RateWindow {
  count: number;
  resetAt: number;
}

const windows = new Map<string, RateWindow>();
const windowMs = Math.max(
  60_000,
  Number(process.env.STORY_RATE_LIMIT_WINDOW_MS || 10 * 60_000),
);
const maximumRequests = Math.max(
  1,
  Number(process.env.STORY_RATE_LIMIT_MAX || 6),
);

function clientKey(request: Request): string {
  return request.ip || request.socket.remoteAddress || 'unknown';
}

function takeRateLimit(request: Request): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const key = clientKey(request);
  const current = windows.get(key);
  const active = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current;

  active.count += 1;
  windows.set(key, active);

  if (windows.size > 2_000) {
    for (const [entryKey, entry] of windows) {
      if (entry.resetAt <= now) windows.delete(entryKey);
    }
  }

  return {
    allowed: active.count <= maximumRequests,
    remaining: Math.max(0, maximumRequests - active.count),
    retryAfterSeconds: Math.max(1, Math.ceil((active.resetAt - now) / 1_000)),
  };
}

function safeAttempts(
  attempts: Array<{
    attempt: number;
    outcome: string;
    providerCode?: string;
    originalityIssues?: string[];
  }>,
): Array<Record<string, unknown>> {
  return attempts.map((attempt) => ({
    attempt: attempt.attempt,
    outcome: attempt.outcome,
    providerCode: attempt.providerCode,
    originalityIssues: attempt.originalityIssues,
  }));
}

let provider: GeminiStoryProvider | undefined;
function storyProvider(): GeminiStoryProvider {
  provider ??= new GeminiStoryProvider();
  return provider;
}

export const storyApiRouter = Router();

storyApiRouter.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});

storyApiRouter.get('/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'colorverse-story-ai',
    configured: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_STORY_MODEL || 'gemini-2.5-flash',
  });
});

storyApiRouter.post('/generate', async (request, response) => {
  const rate = takeRateLimit(request);
  response.setHeader('X-RateLimit-Limit', String(maximumRequests));
  response.setHeader('X-RateLimit-Remaining', String(rate.remaining));

  if (!rate.allowed) {
    response.setHeader('Retry-After', String(rate.retryAfterSeconds));
    return response.status(429).json({
      ok: false,
      code: 'RATE_LIMITED',
      error: 'تم الوصول إلى الحد المؤقت لإنشاء القصص. حاول لاحقًا.',
      retryAfterSeconds: rate.retryAfterSeconds,
    });
  }

  try {
    const input = parseStoryGenerationApiInput(request.body);
    const result = await generateProfessionalStory(input, {
      provider: storyProvider(),
    });

    return response.status(201).json({
      ok: true,
      requestId: result.requestId,
      story: result.story,
      originality: result.review.report,
      attempts: safeAttempts(result.attempts),
      provider: result.provider,
      metadata: result.metadata,
    });
  } catch (error) {
    if (error instanceof StoryApiValidationError) {
      return response.status(400).json({
        ok: false,
        code: 'INVALID_STORY_REQUEST',
        error: 'بيانات القصة غير مكتملة أو غير صحيحة.',
        issues: error.issues,
      });
    }

    if (error instanceof StoryGenerationRejectedError) {
      return response.status(422).json({
        ok: false,
        code: 'ORIGINALITY_REJECTED',
        error: error.message,
        requestId: error.requestId,
        attempts: safeAttempts(error.attempts),
        originality: error.lastReview?.report,
      });
    }

    if (error instanceof StoryGenerationExhaustedError) {
      const providerError =
        error.lastError instanceof StoryProviderError ? error.lastError : null;
      const status = providerError?.code === 'NOT_CONFIGURED' ? 503 : 502;
      return response.status(status).json({
        ok: false,
        code: providerError?.code || 'GENERATION_EXHAUSTED',
        error:
          providerError?.code === 'NOT_CONFIGURED'
            ? 'محرك القصص غير مضبوط على الخادم بعد.'
            : 'تعذر إنشاء القصة حاليًا بعد عدة محاولات.',
        requestId: error.requestId,
        attempts: safeAttempts(error.attempts),
      });
    }

    if (error instanceof StoryProviderError) {
      const status = error.code === 'NOT_CONFIGURED' ? 503 : 502;
      return response.status(status).json({
        ok: false,
        code: error.code,
        error:
          error.code === 'NOT_CONFIGURED'
            ? 'محرك القصص غير مضبوط على الخادم بعد.'
            : 'تعذر الاتصال بمحرك القصص حاليًا.',
      });
    }

    console.error('[stories/generate]', error);
    return response.status(500).json({
      ok: false,
      code: 'INTERNAL_ERROR',
      error: 'حدث خطأ غير متوقع أثناء إنشاء القصة.',
    });
  }
});
