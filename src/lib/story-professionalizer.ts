import { buildStoryPlan, type StoryPlan } from './story-plan-builder';
import {
  chooseStoryReference,
  scoreStoryReference,
  type ReferenceScoreBreakdown,
  type StoryReference,
  type StoryReferenceLanguage,
  type StoryReferenceMode,
} from './story-reference-library';

export interface ProfessionalizeStoryInput {
  childName: string;
  childAge: number;
  heroName: string;
  childStory: string;
  adventure?: string;
  moral?: string;
  helperCharacter?: string;
  templateLabel: string;
  pageCount: 8 | 12 | 16;
  language: StoryReferenceLanguage;
  referenceMode: StoryReferenceMode;
  selectedReferenceId?: string;
  recentReferenceIds?: string[];
}

export interface StoryGenerationContext {
  reference: StoryReference | null;
  referenceScore: ReferenceScoreBreakdown | null;
  plan: StoryPlan;
  prompt: string;
  creativeCredit: string;
}

function referenceSection(
  reference: StoryReference | null,
  score: ReferenceScoreBreakdown | null,
): string {
  if (!reference) {
    return [
      'REFERENCE MODE: No external story reference is required.',
      'Build the professional structure only from the child’s idea and the approved story plan.',
    ].join('\n');
  }

  return [
    `REFERENCE ID: ${reference.id}`,
    `REFERENCE TITLE: ${reference.title}`,
    `REFERENCE MATCHED TERMS: ${score?.matchedTerms.join(' | ') || 'manual selection'}`,
    `REFERENCE MORAL: ${reference.moral}`,
    `REFERENCE STRUCTURE: ${reference.structure.join(' | ')}`,
    `REFERENCE NARRATION: ${reference.styleFingerprint.narration}`,
    `REFERENCE DIALOGUE: ${reference.styleFingerprint.dialogue}`,
    `REFERENCE PACING: ${reference.styleFingerprint.pacing}`,
    `ALLOWED INFLUENCE: ${reference.originalityRules.allowedInfluence.join(' | ')}`,
    'REFERENCE USE LIMIT: Use only macro structure, reading level, pacing, and moral clarity.',
    'DO NOT copy wording, names, setting, dialogue, distinctive incidents, scene order, ending, or illustrations.',
    'Create a new conflict, new setting, new supporting characters, new sequence of events, and a new ending.',
  ].join('\n');
}

function planSection(plan: StoryPlan): string {
  return [
    `WORKING TITLE: ${plan.workingTitle}`,
    `CREATIVE CREDIT: ${plan.creativeCredit}`,
    `PRESERVED CHILD IDEAS: ${plan.preservedChildIdeas.join(' | ')}`,
    `MORAL: ${plan.moral}`,
    'APPROVED STORY BEATS:',
    ...plan.beats.map(
      (beat) =>
        `${beat.beatNumber}. ${beat.type.toUpperCase()} | pages ${beat.targetPages.join(',')} | purpose: ${beat.purpose} | preserve: ${beat.childIdeaToPreserve ?? 'none'} | editor addition: ${beat.professionalAddition}`,
    ),
    `ENDING REFLECTION: ${plan.endingReflection}`,
  ].join('\n');
}

export function buildProfessionalStoryContext(
  input: ProfessionalizeStoryInput,
  random: () => number = Math.random,
): StoryGenerationContext {
  const selectionInput = {
    mode: input.referenceMode,
    selectedReferenceId: input.selectedReferenceId,
    childAge: input.childAge,
    childStory: input.childStory,
    adventure: input.adventure,
    moral: input.moral,
    language: input.language,
    recentReferenceIds: input.recentReferenceIds,
  };

  const reference = chooseStoryReference(selectionInput, random);
  const referenceScore = reference
    ? scoreStoryReference(reference, selectionInput)
    : null;

  const plan = buildStoryPlan({
    childName: input.childName,
    childAge: input.childAge,
    heroName: input.heroName,
    childStory: input.childStory,
    adventure: input.adventure,
    moral: input.moral,
    helperCharacter: input.helperCharacter,
    world: input.templateLabel,
    pageCount: input.pageCount,
    referenceMode: input.referenceMode,
    reference,
  });

  const creativeCredit = plan.creativeCredit;
  const prompt = [
    'ROLE: You are an expert Arabic children’s story editor and educational storyteller.',
    'PRIMARY GOAL: Help the child feel that the finished book is genuinely their creation.',
    `CHILD AUTHOR: ${input.childName}`,
    `CHILD AGE: ${input.childAge}`,
    `HERO NAME: ${input.heroName || input.childName}`,
    `WORLD: ${input.templateLabel}`,
    `HELPER CHARACTER: ${input.helperCharacter ?? 'none'}`,
    `TARGET PAGES: ${input.pageCount}`,
    `LANGUAGE: ${input.language}`,
    `CHILD'S ORIGINAL STORY OR IDEA: ${input.childStory}`,
    `ADVENTURE BRIEF: ${input.adventure ?? ''}`,
    `DESIRED MORAL: ${input.moral ?? ''}`,
    '',
    'CHILD-AUTHORSHIP RULES:',
    '- Preserve the child’s most distinctive ideas, objects, characters, goals, emotional choices, and unusual details.',
    '- Do not replace the child’s imagination with a generic plot.',
    '- Improve sequence, clarity, dialogue, pacing, cause-and-effect, and ending while keeping the child’s creative fingerprint.',
    '- At least half of the preservedChildIdeas must appear clearly in the final story.',
    '- Credit the child as the idea creator and author.',
    '- Use warm, age-appropriate language and avoid heavy preaching.',
    '',
    planSection(plan),
    '',
    referenceSection(reference, referenceScore),
    '',
    'ORIGINALITY RULES:',
    '- The output must be an original story, not a paraphrase or character-swap of any reference.',
    '- Never reproduce reference sentences, names, dialogue, locations, signature objects, or scene-by-scene progression.',
    '- When the requested topic is greed, generosity, loyalty, or friendship, use the moral arc only and invent a completely different situation and resolution.',
    '- The final setting, conflict, supporting cast, climax, and ending must differ from the reference.',
    '',
    'OUTPUT JSON ONLY:',
    '{',
    '  "title": "...",',
    `  "creativeCredit": "${creativeCredit}",`,
    '  "preservedChildIdeas": ["..."],',
    '  "moral": "...",',
    '  "referenceUsed": {"id": "...", "influence": "structure_moral_only"} | null,',
    '  "characters": ["..."],',
    '  "setting": "...",',
    '  "scenes": [',
    '    {',
    '      "sceneNumber": 1,',
    '      "beatType": "opening",',
    '      "title": "...",',
    '      "storyText": "...",',
    '      "dialogue": ["..."],',
    '      "illustrationPrompt": "...",',
    '      "coloringPrompt": "same scene as clean black line art..."',
    '    }',
    '  ],',
    '  "endingReflection": "one gentle question that invites the child to think or write more"',
    '}',
  ].join('\n');

  return { reference, referenceScore, plan, prompt, creativeCredit };
}
