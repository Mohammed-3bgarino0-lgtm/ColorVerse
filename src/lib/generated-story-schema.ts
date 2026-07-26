import type {
  GeneratedStoryCandidate,
  GeneratedStoryScene as OriginalityScene,
} from './story-originality-guard';

export const STORY_BEAT_TYPES = [
  'opening',
  'world',
  'goal',
  'inciting_event',
  'attempt',
  'helper',
  'consequence',
  'obstacle',
  'realization',
  'choice',
  'climax',
  'resolution',
  'reflection',
] as const;

export type StoryBeatType = (typeof STORY_BEAT_TYPES)[number];

export interface GeneratedStoryReferenceUsage {
  id: string;
  influence: 'structure_moral_only';
}

export interface GeneratedStoryScene {
  sceneNumber: number;
  beatType: StoryBeatType;
  title: string;
  storyText: string;
  dialogue: string[];
  illustrationPrompt: string;
  coloringPrompt: string;
}

export interface GeneratedStoryDocument {
  title: string;
  creativeCredit: string;
  preservedChildIdeas: string[];
  moral: string;
  referenceUsed: GeneratedStoryReferenceUsage | null;
  characters: string[];
  setting: string;
  scenes: GeneratedStoryScene[];
  endingReflection: string;
}

export interface GeneratedStoryValidationContext {
  pageCount: 8 | 12 | 16;
  creativeCredit: string;
  expectedReferenceId?: string | null;
}

export interface GeneratedStoryValidationIssue {
  field: string;
  message: string;
}

export class GeneratedStoryValidationError extends Error {
  readonly issues: GeneratedStoryValidationIssue[];

  constructor(issues: GeneratedStoryValidationIssue[]) {
    super(issues.map((issue) => `${issue.field}: ${issue.message}`).join(' | '));
    this.name = 'GeneratedStoryValidationError';
    this.issues = issues;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanString(
  value: unknown,
  field: string,
  issues: GeneratedStoryValidationIssue[],
  minimum = 1,
  maximum = 2_000,
): string {
  if (typeof value !== 'string') {
    issues.push({ field, message: 'يجب أن تكون القيمة نصًا.' });
    return '';
  }

  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (cleaned.length < minimum) {
    issues.push({ field, message: `النص أقصر من الحد الأدنى (${minimum}).` });
  }
  if (cleaned.length > maximum) {
    issues.push({ field, message: `النص أطول من الحد الأعلى (${maximum}).` });
  }
  if (/<\/?[a-z][\s\S]*>/i.test(cleaned)) {
    issues.push({ field, message: 'لا يسمح بإرجاع HTML.' });
  }
  return cleaned;
}

function cleanStringArray(
  value: unknown,
  field: string,
  issues: GeneratedStoryValidationIssue[],
  options: { minItems?: number; maxItems?: number; maxItemLength?: number } = {},
): string[] {
  if (!Array.isArray(value)) {
    issues.push({ field, message: 'يجب أن تكون القيمة قائمة نصوص.' });
    return [];
  }

  const output = value.map((item, index) =>
    cleanString(
      item,
      `${field}[${index}]`,
      issues,
      1,
      options.maxItemLength ?? 240,
    ),
  );

  if (output.length < (options.minItems ?? 0)) {
    issues.push({ field, message: 'عدد العناصر أقل من المطلوب.' });
  }
  if (output.length > (options.maxItems ?? Number.POSITIVE_INFINITY)) {
    issues.push({ field, message: 'عدد العناصر أكبر من المسموح.' });
  }

  return [...new Set(output.filter(Boolean))];
}

export function generatedStoryJsonSchema(pageCount: 8 | 12 | 16): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'title',
      'creativeCredit',
      'preservedChildIdeas',
      'moral',
      'referenceUsed',
      'characters',
      'setting',
      'scenes',
      'endingReflection',
    ],
    properties: {
      title: { type: 'string' },
      creativeCredit: { type: 'string' },
      preservedChildIdeas: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 8,
      },
      moral: { type: 'string' },
      referenceUsed: {
        anyOf: [
          { type: 'null' },
          {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'influence'],
            properties: {
              id: { type: 'string' },
              influence: { type: 'string', enum: ['structure_moral_only'] },
            },
          },
        ],
      },
      characters: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 8,
      },
      setting: { type: 'string' },
      scenes: {
        type: 'array',
        minItems: pageCount,
        maxItems: pageCount,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'sceneNumber',
            'beatType',
            'title',
            'storyText',
            'dialogue',
            'illustrationPrompt',
            'coloringPrompt',
          ],
          properties: {
            sceneNumber: { type: 'integer', minimum: 1, maximum: pageCount },
            beatType: { type: 'string', enum: [...STORY_BEAT_TYPES] },
            title: { type: 'string' },
            storyText: { type: 'string' },
            dialogue: {
              type: 'array',
              items: { type: 'string' },
              maxItems: 4,
            },
            illustrationPrompt: { type: 'string' },
            coloringPrompt: { type: 'string' },
          },
        },
      },
      endingReflection: { type: 'string' },
    },
  };
}

export function parseGeneratedStoryDocument(
  value: unknown,
  context: GeneratedStoryValidationContext,
): GeneratedStoryDocument {
  const issues: GeneratedStoryValidationIssue[] = [];
  if (!isRecord(value)) {
    throw new GeneratedStoryValidationError([
      { field: '$', message: 'الاستجابة ليست كائن JSON.' },
    ]);
  }

  const title = cleanString(value.title, 'title', issues, 3, 100);
  const creativeCredit = cleanString(
    value.creativeCredit,
    'creativeCredit',
    issues,
    3,
    100,
  );
  if (creativeCredit !== context.creativeCredit) {
    issues.push({
      field: 'creativeCredit',
      message: `يجب أن تساوي: ${context.creativeCredit}`,
    });
  }

  const preservedChildIdeas = cleanStringArray(
    value.preservedChildIdeas,
    'preservedChildIdeas',
    issues,
    { minItems: 1, maxItems: 8, maxItemLength: 260 },
  );
  const moral = cleanString(value.moral, 'moral', issues, 3, 240);
  const characters = cleanStringArray(value.characters, 'characters', issues, {
    minItems: 1,
    maxItems: 8,
    maxItemLength: 80,
  });
  const setting = cleanString(value.setting, 'setting', issues, 3, 240);
  const endingReflection = cleanString(
    value.endingReflection,
    'endingReflection',
    issues,
    5,
    260,
  );

  let referenceUsed: GeneratedStoryReferenceUsage | null = null;
  if (value.referenceUsed !== null) {
    if (!isRecord(value.referenceUsed)) {
      issues.push({ field: 'referenceUsed', message: 'صيغة المرجع غير صحيحة.' });
    } else {
      const id = cleanString(value.referenceUsed.id, 'referenceUsed.id', issues, 2, 120);
      const influence = value.referenceUsed.influence;
      if (influence !== 'structure_moral_only') {
        issues.push({
          field: 'referenceUsed.influence',
          message: 'التأثير المسموح هو البنية والقيمة فقط.',
        });
      }
      referenceUsed = { id, influence: 'structure_moral_only' };
    }
  }

  const expectedReferenceId = context.expectedReferenceId ?? null;
  if (expectedReferenceId && referenceUsed?.id !== expectedReferenceId) {
    issues.push({
      field: 'referenceUsed.id',
      message: 'المرجع المعاد لا يطابق المرجع المختار داخليًا.',
    });
  }
  if (!expectedReferenceId && referenceUsed !== null) {
    issues.push({
      field: 'referenceUsed',
      message: 'لا يجب إرجاع مرجع عند إنشاء القصة دون مرجع.',
    });
  }

  const scenes: GeneratedStoryScene[] = [];
  if (!Array.isArray(value.scenes)) {
    issues.push({ field: 'scenes', message: 'المشاهد يجب أن تكون قائمة.' });
  } else {
    if (value.scenes.length !== context.pageCount) {
      issues.push({
        field: 'scenes',
        message: `يجب إنتاج ${context.pageCount} مشهدًا بالضبط.`,
      });
    }

    value.scenes.forEach((sceneValue, index) => {
      const field = `scenes[${index}]`;
      if (!isRecord(sceneValue)) {
        issues.push({ field, message: 'المشهد يجب أن يكون كائنًا.' });
        return;
      }

      const sceneNumber = Number(sceneValue.sceneNumber);
      if (!Number.isInteger(sceneNumber) || sceneNumber !== index + 1) {
        issues.push({
          field: `${field}.sceneNumber`,
          message: `يجب أن يكون الرقم ${index + 1}.`,
        });
      }

      const beatType = sceneValue.beatType;
      if (!STORY_BEAT_TYPES.includes(beatType as StoryBeatType)) {
        issues.push({ field: `${field}.beatType`, message: 'نوع المرحلة غير مدعوم.' });
      }

      scenes.push({
        sceneNumber: Number.isInteger(sceneNumber) ? sceneNumber : index + 1,
        beatType: STORY_BEAT_TYPES.includes(beatType as StoryBeatType)
          ? (beatType as StoryBeatType)
          : 'attempt',
        title: cleanString(sceneValue.title, `${field}.title`, issues, 2, 90),
        storyText: cleanString(
          sceneValue.storyText,
          `${field}.storyText`,
          issues,
          25,
          1_000,
        ),
        dialogue: cleanStringArray(sceneValue.dialogue, `${field}.dialogue`, issues, {
          maxItems: 4,
          maxItemLength: 220,
        }),
        illustrationPrompt: cleanString(
          sceneValue.illustrationPrompt,
          `${field}.illustrationPrompt`,
          issues,
          15,
          1_200,
        ),
        coloringPrompt: cleanString(
          sceneValue.coloringPrompt,
          `${field}.coloringPrompt`,
          issues,
          15,
          1_200,
        ),
      });
    });
  }

  if (issues.length) throw new GeneratedStoryValidationError(issues);

  return {
    title,
    creativeCredit,
    preservedChildIdeas,
    moral,
    referenceUsed,
    characters,
    setting,
    scenes,
    endingReflection,
  };
}

export function toOriginalityCandidate(
  document: GeneratedStoryDocument,
): GeneratedStoryCandidate {
  const scenes: OriginalityScene[] = document.scenes.map((scene) => ({
    sceneNumber: scene.sceneNumber,
    title: scene.title,
    storyText: scene.storyText,
    dialogue: scene.dialogue,
  }));

  return {
    title: document.title,
    characters: document.characters,
    setting: document.setting,
    scenes,
  };
}
