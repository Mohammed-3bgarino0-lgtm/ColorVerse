import {
  GeneratedStoryValidationError,
  toOriginalityCandidate,
  type GeneratedStoryDocument,
} from './generated-story-schema';
import {
  StoryProviderError,
  type StoryProvider,
  type StoryProviderResponse,
} from './gemini-story-provider';
import {
  prepareStoryGeneration,
  reviewGeneratedStory,
  type PreparedStoryGeneration,
  type StoryReviewResult,
} from './story-engine';
import type { ProfessionalizeStoryInput } from './story-professionalizer';

export interface ReferenceOriginalityMaterial {
  text?: string;
  names?: string[];
  sceneLabels?: string[];
}

export interface GenerateStoryOptions {
  provider: StoryProvider;
  maxAttempts?: number;
  referenceMaterial?: ReferenceOriginalityMaterial;
  random?: () => number;
}

export interface StoryGenerationAttempt {
  attempt: number;
  outcome:
    | 'provider_error'
    | 'schema_error'
    | 'originality_rejected'
    | 'accepted';
  message?: string;
  providerCode?: string;
  originalityIssues?: string[];
}

export interface GeneratedStoryResult {
  requestId: string;
  story: GeneratedStoryDocument;
  review: StoryReviewResult;
  attempts: StoryGenerationAttempt[];
  provider: {
    model: string;
    modelVersion?: string;
    responseId?: string;
    usage?: StoryProviderResponse['usage'];
  };
  metadata: {
    creativeCredit: string;
    referenceId: string | null;
    referenceTitle: string | null;
    preservedChildIdeas: string[];
    createdAt: string;
  };
}

export class StoryGenerationRejectedError extends Error {
  readonly requestId: string;
  readonly attempts: StoryGenerationAttempt[];
  readonly lastStory?: GeneratedStoryDocument;
  readonly lastReview?: StoryReviewResult;

  constructor(options: {
    requestId: string;
    attempts: StoryGenerationAttempt[];
    lastStory?: GeneratedStoryDocument;
    lastReview?: StoryReviewResult;
  }) {
    super('لم تجتز القصة فحص الأصالة بعد محاولات التصحيح.');
    this.name = 'StoryGenerationRejectedError';
    this.requestId = options.requestId;
    this.attempts = options.attempts;
    this.lastStory = options.lastStory;
    this.lastReview = options.lastReview;
  }
}

export class StoryGenerationExhaustedError extends Error {
  readonly requestId: string;
  readonly attempts: StoryGenerationAttempt[];
  readonly lastError: unknown;

  constructor(options: {
    requestId: string;
    attempts: StoryGenerationAttempt[];
    lastError: unknown;
  }) {
    super('تعذر إنتاج قصة صالحة بعد عدة محاولات.');
    this.name = 'StoryGenerationExhaustedError';
    this.requestId = options.requestId;
    this.attempts = options.attempts;
    this.lastError = options.lastError;
  }
}

function boundedAttempts(value: number | undefined): number {
  const configured = value ?? Number(process.env.GEMINI_STORY_MAX_ATTEMPTS || 2);
  if (!Number.isInteger(configured)) return 2;
  return Math.min(3, Math.max(1, configured));
}

function schemaRetryInstruction(error: GeneratedStoryValidationError): string {
  return [
    'THE PREVIOUS JSON FAILED VALIDATION.',
    'Return a complete corrected JSON document and fix every item:',
    ...error.issues.map(
      (issue, index) => `${index + 1}. ${issue.field}: ${issue.message}`,
    ),
    'Keep the same child-authorship and originality rules.',
  ].join('\n');
}

function providerRetryInstruction(error: StoryProviderError): string {
  return [
    'THE PREVIOUS GENERATION DID NOT PRODUCE A VALID COMPLETE RESULT.',
    `Provider issue: ${error.code}.`,
    'Generate the entire JSON again and follow the response schema exactly.',
  ].join('\n');
}

function reviewStory(
  prepared: PreparedStoryGeneration,
  story: GeneratedStoryDocument,
  material: ReferenceOriginalityMaterial | undefined,
): StoryReviewResult {
  return reviewGeneratedStory({
    prepared,
    candidate: toOriginalityCandidate(story),
    referenceText: material?.text,
    referenceNames: material?.names,
    referenceSceneLabels: material?.sceneLabels,
  });
}

export async function generateProfessionalStory(
  input: ProfessionalizeStoryInput,
  options: GenerateStoryOptions,
): Promise<GeneratedStoryResult> {
  const prepared = prepareStoryGeneration(input, options.random);
  const maxAttempts = boundedAttempts(options.maxAttempts);
  const attempts: StoryGenerationAttempt[] = [];
  let retryInstruction: string | undefined;
  let lastError: unknown;
  let lastStory: GeneratedStoryDocument | undefined;
  let lastReview: StoryReviewResult | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const providerResult = await options.provider.generate({
        requestId: prepared.requestId,
        prompt: prepared.context.prompt,
        pageCount: input.pageCount,
        creativeCredit: prepared.context.creativeCredit,
        expectedReferenceId: prepared.context.reference?.id ?? null,
        retryInstruction,
      });

      const review = reviewStory(
        prepared,
        providerResult.story,
        options.referenceMaterial,
      );
      lastStory = providerResult.story;
      lastReview = review;

      if (!review.accepted) {
        attempts.push({
          attempt,
          outcome: 'originality_rejected',
          originalityIssues: review.report.issues.map((issue) => issue.code),
          message: review.retryPrompt,
        });
        retryInstruction = review.retryPrompt;
        continue;
      }

      attempts.push({ attempt, outcome: 'accepted' });
      return {
        requestId: prepared.requestId,
        story: providerResult.story,
        review,
        attempts,
        provider: {
          model: providerResult.model,
          modelVersion: providerResult.modelVersion,
          responseId: providerResult.responseId,
          usage: providerResult.usage,
        },
        metadata: {
          creativeCredit: prepared.context.creativeCredit,
          referenceId: prepared.context.reference?.id ?? null,
          referenceTitle: prepared.context.reference?.title ?? null,
          preservedChildIdeas: prepared.context.plan.preservedChildIdeas,
          createdAt: prepared.createdAt,
        },
      };
    } catch (error) {
      lastError = error;

      if (error instanceof GeneratedStoryValidationError) {
        attempts.push({
          attempt,
          outcome: 'schema_error',
          message: error.message,
        });
        retryInstruction = schemaRetryInstruction(error);
        continue;
      }

      if (error instanceof StoryProviderError) {
        attempts.push({
          attempt,
          outcome: 'provider_error',
          providerCode: error.code,
          message: error.message,
        });
        if (error.retryable) {
          retryInstruction = providerRetryInstruction(error);
          continue;
        }
      }

      throw error;
    }
  }

  if (lastReview && lastStory) {
    throw new StoryGenerationRejectedError({
      requestId: prepared.requestId,
      attempts,
      lastStory,
      lastReview,
    });
  }

  throw new StoryGenerationExhaustedError({
    requestId: prepared.requestId,
    attempts,
    lastError,
  });
}
