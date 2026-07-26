import {
  chooseStoryReference,
  type StoryReference,
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
  language: 'ar' | 'en' | 'bilingual';
  referenceMode: StoryReferenceMode;
  selectedReferenceId?: string;
}

export interface StoryGenerationContext {
  reference: StoryReference | null;
  prompt: string;
  creativeCredit: string;
}

function referenceSection(reference: StoryReference | null): string {
  if (!reference) {
    return [
      'REFERENCE MODE: No external story reference is required.',
      'Build the professional structure only from the child’s idea.',
    ].join('\n');
  }

  return [
    `REFERENCE TITLE: ${reference.title}`,
    `REFERENCE MORAL: ${reference.moral}`,
    `REFERENCE STRUCTURE: ${reference.structure.join(' | ')}`,
    `REFERENCE NARRATION: ${reference.styleFingerprint.narration}`,
    `REFERENCE PACING: ${reference.styleFingerprint.pacing}`,
    'REFERENCE USE LIMIT: Use only the macro structure, reading level, pacing, and moral clarity.',
    'DO NOT copy wording, names, setting, dialogue, distinctive incidents, scene order, ending, or illustrations.',
    'Create a new conflict, new setting, new supporting characters, new sequence of events, and a new ending.',
  ].join('\n');
}

export function buildProfessionalStoryContext(
  input: ProfessionalizeStoryInput,
  random: () => number = Math.random,
): StoryGenerationContext {
  const reference = chooseStoryReference(
    {
      mode: input.referenceMode,
      selectedReferenceId: input.selectedReferenceId,
      childAge: input.childAge,
      childStory: input.childStory,
      adventure: input.adventure,
      moral: input.moral,
    },
    random,
  );

  const creativeCredit = `فكرة وتأليف: ${input.childName}`;
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
    '- Preserve the child’s most distinctive ideas, objects, characters, goals, and emotional choices.',
    '- Do not replace the child’s imagination with a generic plot.',
    '- Improve sequence, clarity, dialogue, pacing, cause-and-effect, and ending while keeping the child’s creative fingerprint.',
    '- Credit the child as the idea creator and author.',
    '- Use warm, age-appropriate language and avoid heavy preaching.',
    '',
    referenceSection(reference),
    '',
    'ORIGINALITY RULES:',
    '- The output must be an original story, not a paraphrase or character-swap of any reference.',
    '- Never reproduce reference sentences, names, dialogue, locations, signature objects, or scene-by-scene progression.',
    '- When the requested topic is greed, generosity, loyalty, or friendship, use the moral arc only and invent a completely different situation and resolution.',
    '',
    'OUTPUT JSON ONLY:',
    '{',
    '  "title": "...",',
    `  "creativeCredit": "${creativeCredit}",`,
    '  "preservedChildIdeas": ["..."],',
    '  "moral": "...",',
    '  "referenceUsed": {"id": "...", "influence": "structure_moral_only"} | null,',
    '  "scenes": [',
    '    {',
    '      "sceneNumber": 1,',
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

  return { reference, prompt, creativeCredit };
}
