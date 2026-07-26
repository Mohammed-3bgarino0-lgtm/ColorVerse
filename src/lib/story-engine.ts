import {
  buildProfessionalStoryContext,
  type ProfessionalizeStoryInput,
  type StoryGenerationContext,
} from './story-professionalizer';
import {
  evaluateStoryOriginality,
  originalityRetryInstruction,
  type GeneratedStoryCandidate,
  type OriginalityReport,
} from './story-originality-guard';
import { rememberStoryReference } from './story-reference-history';

export interface PreparedStoryGeneration {
  context: StoryGenerationContext;
  requestId: string;
  createdAt: string;
}

export interface StoryReviewInput {
  prepared: PreparedStoryGeneration;
  candidate: GeneratedStoryCandidate;
  referenceText?: string;
  referenceNames?: string[];
  referenceSceneLabels?: string[];
}

export interface StoryReviewResult {
  accepted: boolean;
  report: OriginalityReport;
  retryPrompt?: string;
}

function requestId(now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8);
  return `story_${stamp}_${random}`;
}

export function prepareStoryGeneration(
  input: ProfessionalizeStoryInput,
  random: () => number = Math.random,
): PreparedStoryGeneration {
  const context = buildProfessionalStoryContext(input, random);

  if (context.reference) {
    rememberStoryReference(context.reference.id);
  }

  return {
    context,
    requestId: requestId(),
    createdAt: new Date().toISOString(),
  };
}

export function reviewGeneratedStory(input: StoryReviewInput): StoryReviewResult {
  const report = evaluateStoryOriginality({
    candidate: input.candidate,
    reference: input.prepared.context.reference,
    referenceText: input.referenceText,
    referenceNames: input.referenceNames,
    referenceSceneLabels: input.referenceSceneLabels,
    childIdeas: input.prepared.context.plan.preservedChildIdeas,
  });

  return {
    accepted: report.approved,
    report,
    retryPrompt: report.approved ? undefined : originalityRetryInstruction(report),
  };
}

export function buildAiRequestPayload(prepared: PreparedStoryGeneration): {
  requestId: string;
  prompt: string;
  metadata: Record<string, unknown>;
} {
  const { context } = prepared;

  return {
    requestId: prepared.requestId,
    prompt: context.prompt,
    metadata: {
      creativeCredit: context.creativeCredit,
      referenceId: context.reference?.id ?? null,
      referenceScore: context.referenceScore,
      preservedChildIdeas: context.plan.preservedChildIdeas,
      storyPlan: context.plan,
      createdAt: prepared.createdAt,
    },
  };
}
