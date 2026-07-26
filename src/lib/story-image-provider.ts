import type { BuiltImagePrompt } from './story-image-prompt-builder';

export type StoryImageProviderErrorCode =
  | 'NOT_CONFIGURED'
  | 'TIMEOUT'
  | 'EMPTY_IMAGE'
  | 'INVALID_RESPONSE'
  | 'PROVIDER_ERROR';

export class StoryImageProviderError extends Error {
  readonly code: StoryImageProviderErrorCode;
  readonly retryable: boolean;
  readonly status?: number;
  readonly causeValue?: unknown;

  constructor(
    code: StoryImageProviderErrorCode,
    message: string,
    options: { retryable?: boolean; status?: number; cause?: unknown } = {},
  ) {
    super(message);
    this.name = 'StoryImageProviderError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.status = options.status;
    this.causeValue = options.cause;
  }
}

export interface GeneratedImageBinary {
  data: Buffer;
  mimeType: string;
  model: string;
  responseId?: string;
  width?: number;
  height?: number;
}

export interface StoryImageProvider {
  readonly model: string;
  generate(prompt: BuiltImagePrompt, signal?: AbortSignal): Promise<GeneratedImageBinary>;
}

export interface GeminiImageProviderOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  endpoint?: string;
}

interface ImageResponseBlock {
  data?: unknown;
  mime_type?: unknown;
  mimeType?: unknown;
  type?: unknown;
}

function findImageBlock(value: unknown): ImageResponseBlock | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const direct = record.output_image;
  if (direct && typeof direct === 'object') return direct as ImageResponseBlock;

  const steps = Array.isArray(record.steps) ? record.steps : [];
  for (const step of steps) {
    if (!step || typeof step !== 'object') continue;
    const content = Array.isArray((step as Record<string, unknown>).content)
      ? ((step as Record<string, unknown>).content as unknown[])
      : [];
    for (const block of content) {
      if (!block || typeof block !== 'object') continue;
      const candidate = block as ImageResponseBlock;
      if (candidate.type === 'image' && typeof candidate.data === 'string') return candidate;
    }
  }
  return null;
}

function combineSignals(signals: Array<AbortSignal | undefined>): AbortSignal {
  const controller = new AbortController();
  const abort = () => controller.abort();
  for (const signal of signals) {
    if (!signal) continue;
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', abort, { once: true });
  }
  return controller.signal;
}

export class GeminiStoryImageProvider implements StoryImageProvider {
  readonly model: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly endpoint: string;

  constructor(options: GeminiImageProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.GEMINI_API_KEY ?? '';
    this.model = options.model ?? process.env.GEMINI_IMAGE_MODEL ?? 'gemini-3.1-flash-image';
    this.timeoutMs = options.timeoutMs ?? Number(process.env.GEMINI_IMAGE_TIMEOUT_MS || 120_000);
    this.endpoint = options.endpoint ?? 'https://generativelanguage.googleapis.com/v1beta/interactions';
  }

  async generate(prompt: BuiltImagePrompt, signal?: AbortSignal): Promise<GeneratedImageBinary> {
    if (!this.apiKey) {
      throw new StoryImageProviderError(
        'NOT_CONFIGURED',
        'GEMINI_API_KEY غير مضبوط على الخادم.',
      );
    }

    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), this.timeoutMs);
    const requestSignal = combineSignals([signal, timeoutController.signal]);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        signal: requestSignal,
        body: JSON.stringify({
          model: this.model,
          input: prompt.blocks.map((block) => block.type === 'text'
            ? { type: 'text', text: block.text }
            : { type: 'image', mime_type: block.mimeType, data: block.data }),
          response_format: {
            type: 'image',
            mime_type: 'image/png',
            aspect_ratio: prompt.aspectRatio,
            image_size: prompt.imageSize,
          },
        }),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new StoryImageProviderError(
          'PROVIDER_ERROR',
          'رفض مزود الصور الطلب.',
          { retryable: response.status >= 429 || response.status >= 500, status: response.status, cause: body },
        );
      }

      const imageBlock = findImageBlock(body);
      if (!imageBlock || typeof imageBlock.data !== 'string') {
        throw new StoryImageProviderError(
          'EMPTY_IMAGE',
          'لم يُرجع مزود الصور صورة قابلة للاستخدام.',
          { retryable: true, cause: body },
        );
      }

      let data: Buffer;
      try {
        data = Buffer.from(imageBlock.data, 'base64');
      } catch (error) {
        throw new StoryImageProviderError(
          'INVALID_RESPONSE',
          'أعاد مزود الصور بيانات صورة غير صالحة.',
          { retryable: true, cause: error },
        );
      }
      if (!data.length) {
        throw new StoryImageProviderError('EMPTY_IMAGE', 'الصورة الناتجة فارغة.', { retryable: true });
      }

      const record = body && typeof body === 'object' ? body as Record<string, unknown> : {};
      return {
        data,
        mimeType: typeof imageBlock.mime_type === 'string'
          ? imageBlock.mime_type
          : typeof imageBlock.mimeType === 'string'
            ? imageBlock.mimeType
            : 'image/png',
        model: this.model,
        responseId: typeof record.id === 'string'
          ? record.id
          : typeof record.response_id === 'string'
            ? record.response_id
            : undefined,
      };
    } catch (error) {
      if (error instanceof StoryImageProviderError) throw error;
      if (requestSignal.aborted) {
        throw new StoryImageProviderError(
          'TIMEOUT',
          'انتهت مهلة إنشاء الصورة أو أُلغيت المهمة.',
          { retryable: !signal?.aborted, cause: error },
        );
      }
      throw new StoryImageProviderError(
        'PROVIDER_ERROR',
        'تعذر الاتصال بمحرك الصور.',
        { retryable: true, cause: error },
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
