import type { StoryReference } from './story-reference-library';

export interface GeneratedStoryScene {
  sceneNumber: number;
  title: string;
  storyText: string;
  dialogue?: string[];
}

export interface GeneratedStoryCandidate {
  title: string;
  characters: string[];
  setting: string;
  scenes: GeneratedStoryScene[];
}

export interface OriginalityInput {
  candidate: GeneratedStoryCandidate;
  reference: StoryReference | null;
  referenceText?: string;
  referenceNames?: string[];
  referenceSceneLabels?: string[];
  childIdeas: string[];
}

export type OriginalityIssueCode =
  | 'TEXT_TOO_SIMILAR'
  | 'REFERENCE_NAME_REUSED'
  | 'SETTING_TOO_CLOSE'
  | 'SCENE_SEQUENCE_TOO_CLOSE'
  | 'CHILD_IDEAS_NOT_PRESERVED';

export interface OriginalityIssue {
  code: OriginalityIssueCode;
  message: string;
  score?: number;
}

export interface OriginalityReport {
  approved: boolean;
  textSimilarity: number;
  sceneSequenceSimilarity: number;
  preservedChildIdeasRatio: number;
  reusedReferenceNames: string[];
  issues: OriginalityIssue[];
}

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const NON_WORDS = /[^\p{L}\p{N}\s]/gu;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(NON_WORDS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(value: string): Set<string> {
  return new Set(normalize(value).split(' ').filter((token) => token.length >= 3));
}

function ngrams(value: string, size = 4): Set<string> {
  const tokens = normalize(value).split(' ').filter(Boolean);
  const output = new Set<string>();
  for (let index = 0; index <= tokens.length - size; index += 1) {
    output.add(tokens.slice(index, index + size).join(' '));
  }
  return output;
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function storyText(candidate: GeneratedStoryCandidate): string {
  return [
    candidate.title,
    candidate.setting,
    ...candidate.characters,
    ...candidate.scenes.flatMap((scene) => [
      scene.title,
      scene.storyText,
      ...(scene.dialogue ?? []),
    ]),
  ].join(' ');
}

function sequenceSimilarity(
  scenes: GeneratedStoryScene[],
  referenceSceneLabels: string[],
): number {
  if (!scenes.length || !referenceSceneLabels.length) return 0;
  const candidateLabels = scenes.map((scene) => tokenSet(`${scene.title} ${scene.storyText}`));
  const referenceLabels = referenceSceneLabels.map(tokenSet);
  const compareLength = Math.min(candidateLabels.length, referenceLabels.length);
  if (!compareLength) return 0;

  let total = 0;
  for (let index = 0; index < compareLength; index += 1) {
    total += jaccard(candidateLabels[index], referenceLabels[index]);
  }
  return total / compareLength;
}

function preservedIdeasRatio(candidateText: string, childIdeas: string[]): number {
  const ideas = childIdeas.map(normalize).filter((idea) => idea.length >= 2);
  if (!ideas.length) return 1;
  const normalizedCandidate = normalize(candidateText);
  const preserved = ideas.filter((idea) => normalizedCandidate.includes(idea));
  return preserved.length / ideas.length;
}

export function evaluateStoryOriginality(input: OriginalityInput): OriginalityReport {
  const candidateText = storyText(input.candidate);
  const textSimilarity = input.referenceText
    ? jaccard(ngrams(candidateText), ngrams(input.referenceText))
    : 0;

  const normalizedCandidateNames = input.candidate.characters.map(normalize);
  const reusedReferenceNames = (input.referenceNames ?? []).filter((name) =>
    normalizedCandidateNames.includes(normalize(name)),
  );

  const sceneSequenceSimilarity = sequenceSimilarity(
    input.candidate.scenes,
    input.referenceSceneLabels ?? input.reference?.structure ?? [],
  );

  const preservedChildIdeasRatio = preservedIdeasRatio(candidateText, input.childIdeas);
  const issues: OriginalityIssue[] = [];

  if (textSimilarity > 0.18) {
    issues.push({
      code: 'TEXT_TOO_SIMILAR',
      message: 'النص قريب أكثر من المسموح من المرجع ويجب إعادة توليده.',
      score: textSimilarity,
    });
  }

  if (reusedReferenceNames.length) {
    issues.push({
      code: 'REFERENCE_NAME_REUSED',
      message: `أعيد استخدام أسماء من المرجع: ${reusedReferenceNames.join('، ')}.`,
    });
  }

  if (
    input.reference?.originalityRules.reuseSetting === false &&
    input.reference.summary &&
    jaccard(tokenSet(input.candidate.setting), tokenSet(input.reference.summary)) > 0.45
  ) {
    issues.push({
      code: 'SETTING_TOO_CLOSE',
      message: 'المكان قريب جدًا من المرجع ويجب ابتكار بيئة مختلفة.',
    });
  }

  if (sceneSequenceSimilarity > 0.52) {
    issues.push({
      code: 'SCENE_SEQUENCE_TOO_CLOSE',
      message: 'ترتيب المشاهد قريب من المرجع ويجب تغيير مسار الأحداث.',
      score: sceneSequenceSimilarity,
    });
  }

  if (preservedChildIdeasRatio < 0.5) {
    issues.push({
      code: 'CHILD_IDEAS_NOT_PRESERVED',
      message: 'القصة لم تحافظ على قدر كافٍ من أفكار الطفل الأصلية.',
      score: preservedChildIdeasRatio,
    });
  }

  return {
    approved: issues.length === 0,
    textSimilarity,
    sceneSequenceSimilarity,
    preservedChildIdeasRatio,
    reusedReferenceNames,
    issues,
  };
}

export function originalityRetryInstruction(report: OriginalityReport): string {
  if (report.approved) return 'ORIGINALITY CHECK PASSED.';

  return [
    'ORIGINALITY CHECK FAILED. Regenerate the story while applying every correction below:',
    ...report.issues.map((issue, index) => `${index + 1}. ${issue.message}`),
    'Preserve the child’s own distinctive ideas, but create a different setting, conflict, scene order, dialogue, and resolution from the reference.',
  ].join('\n');
}
