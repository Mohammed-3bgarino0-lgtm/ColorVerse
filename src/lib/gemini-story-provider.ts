import { GoogleGenAI } from '@google/genai';
import {
  GeneratedStoryValidationError,
  generatedStoryJsonSchema,
  parseGeneratedStoryDocument,
  type GeneratedStoryDocument,
  type GeneratedStoryValidationContext,
} from './generated-story-schema';

export type StoryProviderErrorCode =
  | 'NOT_CONFIGURED'
  | 'TIMEOUT'
  | 'EMPTY_RESPONSE'
  | 'INVALID_JSON'
  | 'PROVIDER_ERROR';

export class StoryProviderError extends Error {
  readonly code: StoryProviderErrorCode;
  readonly retryable: boolean;
  readonly causeValue?: unknown;

  constructor(
    code: StoryProviderErrorCode,
    message: string,
    options: { retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message);
    this.name = 'StoryProviderError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.causeValue = options.cause;
  }
}

export interface StoryProviderRequest extends GeneratedStoryValidationContext {
  prompt: string;
  requestId: string;
  retryInstruction?: string;
}

export interface StoryProviderResponse {
  story: GeneratedStoryDocument;
  model: string;
  modelVersion?: string;
  responseId?: string;
  usage?: {
    promptTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface StoryProvider {
  generate(request: StoryProviderRequest): Promise<StoryProviderResponse>;
}

export interface GeminiStoryProviderOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  temperature?: number;
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
}

function stripJsonFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  requestId: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(
        new StoryProviderError(
          'TIMEOUT',
          `انتهت مهلة توليد القصة للطلب ${requestId}.`,
          { retryable: true },
        ),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class GeminiStoryProvider implements StoryProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly temperature: number;
  private readonly client: GoogleGenAI | null;

  constructor(options: GeminiStoryProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.GEMINI_API_KEY ?? '';
    this.model =
      options.model ?? process.env.GEMINI_STORY_MODEL ?? 'gemini-2.5-flash';
    this.timeoutMs =
      options.timeoutMs ?? Number(process.env.GEMINI_STORY_TIMEOUT_MS || 90_000);
    this.temperature = options.temperature ?? 0.8;
    this.client = this.apiKey ? new GoogleGenAI({ apiKey: this.apiKey }) : null;
  }

  async generate(request: StoryProviderRequest): Promise<StoryProviderResponse> {
    if (!this.client) {
      throw new StoryProviderError(
        'NOT_CONFIGURED',
        'GEMINI_API_KEY غير مضبوط على الخادم.',
      );
    }

    const contents = request.retryInstruction
      ? [
          request.prompt,
          '',
          'REGENERATION INSTRUCTION:',
          request.retryInstruction,
          '',
          'Return the complete corrected JSON document, not a patch.',
        ].join('\n')
      : request.prompt;

    try {
      const response = await withTimeout(
        this.client.models.generateContent({
          model: this.model,
          contents,
          config: {
            candidateCount: 1,
            temperature: this.temperature,
            responseMimeType: 'application/json',
            responseJsonSchema: generatedStoryJsonSchema(request.pageCount),
          },
        }),
        this.timeoutMs,
        request.requestId,
      );

      const text = response.text?.trim();
      if (!text) {
        throw new StoryProviderError(
          'EMPTY_RESPONSE',
          'لم يُرجع مزود الذكاء الاصطناعي نصًا.',
          { retryable: true },
        );
      }

      let decoded: unknown;
      try {
        decoded = JSON.parse(stripJsonFence(text));
      } catch (error) {
        throw new StoryProviderError(
          'INVALID_JSON',
          'أعاد مزود الذكاء الاصطناعي JSON غير صالح.',
          { retryable: true, cause: error },
        );
      }

      const story = parseGeneratedStoryDocument(decoded, request);
      const usage = response.usageMetadata;

      return {
        story,
        model: this.model,
        modelVersion: response.modelVersion,
        responseId: response.responseId,
        usage: usage
          ? {
              promptTokens: positiveInteger(usage.promptTokenCount),
              outputTokens: positiveInteger(usage.candidatesTokenCount),
              totalTokens: positiveInteger(usage.totalTokenCount),
            }
          : undefined,
      };
    } catch (error) {
      if (
        error instanceof StoryProviderError ||
        error instanceof GeneratedStoryValidationError
      ) {
        throw error;
      }

      throw new StoryProviderError(
        'PROVIDER_ERROR',
        'تعذر الاتصال بمزود الذكاء الاصطناعي.',
        { retryable: true, cause: error },
      );
    }
  }
}
