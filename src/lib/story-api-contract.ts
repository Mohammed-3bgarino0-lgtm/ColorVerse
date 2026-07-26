import type {
  ProfessionalizeStoryInput,
} from './story-professionalizer';
import type {
  StoryReferenceLanguage,
  StoryReferenceMode,
} from './story-reference-library';

export interface StoryApiValidationIssue {
  field: string;
  message: string;
}

export class StoryApiValidationError extends Error {
  readonly issues: StoryApiValidationIssue[];

  constructor(issues: StoryApiValidationIssue[]) {
    super(issues.map((issue) => `${issue.field}: ${issue.message}`).join(' | '));
    this.name = 'StoryApiValidationError';
    this.issues = issues;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(
  value: unknown,
  field: string,
  issues: StoryApiValidationIssue[],
  options: { minimum?: number; maximum?: number; required?: boolean } = {},
): string {
  if (value === undefined || value === null || value === '') {
    if (options.required) issues.push({ field, message: 'الحقل مطلوب.' });
    return '';
  }
  if (typeof value !== 'string') {
    issues.push({ field, message: 'يجب أن تكون القيمة نصًا.' });
    return '';
  }

  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (cleaned.length < (options.minimum ?? 0)) {
    issues.push({ field, message: 'النص أقصر من المطلوب.' });
  }
  if (cleaned.length > (options.maximum ?? 2_000)) {
    issues.push({ field, message: 'النص أطول من المسموح.' });
  }
  return cleaned;
}

export function parseStoryGenerationApiInput(
  value: unknown,
): ProfessionalizeStoryInput {
  const issues: StoryApiValidationIssue[] = [];
  if (!isRecord(value)) {
    throw new StoryApiValidationError([
      { field: '$', message: 'جسم الطلب يجب أن يكون JSON.' },
    ]);
  }

  const childName = text(value.childName, 'childName', issues, {
    required: true,
    minimum: 2,
    maximum: 30,
  });
  const childAge = Number(value.childAge);
  if (!Number.isInteger(childAge) || childAge < 3 || childAge > 12) {
    issues.push({ field: 'childAge', message: 'العمر يجب أن يكون بين 3 و12 سنة.' });
  }

  const heroName = text(value.heroName ?? childName, 'heroName', issues, {
    required: true,
    minimum: 2,
    maximum: 30,
  });
  const childStory = text(value.childStory, 'childStory', issues, {
    required: true,
    minimum: 8,
    maximum: 1_400,
  });
  const adventure = text(value.adventure, 'adventure', issues, { maximum: 500 });
  const moral = text(value.moral, 'moral', issues, { maximum: 120 });
  const helperCharacter = text(value.helperCharacter, 'helperCharacter', issues, {
    maximum: 80,
  });
  const templateLabel = text(value.templateLabel, 'templateLabel', issues, {
    required: true,
    minimum: 2,
    maximum: 80,
  });

  const pageCount = Number(value.pageCount);
  if (![8, 12, 16].includes(pageCount)) {
    issues.push({ field: 'pageCount', message: 'عدد الصفحات يجب أن يكون 8 أو 12 أو 16.' });
  }

  const languages: StoryReferenceLanguage[] = ['ar', 'en', 'bilingual'];
  const language = value.language as StoryReferenceLanguage;
  if (!languages.includes(language)) {
    issues.push({ field: 'language', message: 'لغة القصة غير مدعومة.' });
  }

  const modes: StoryReferenceMode[] = [
    'none',
    'child_story',
    'selected_reference',
    'auto_reference',
  ];
  const referenceMode = value.referenceMode as StoryReferenceMode;
  if (!modes.includes(referenceMode)) {
    issues.push({ field: 'referenceMode', message: 'طريقة استخدام المرجع غير مدعومة.' });
  }

  const selectedReferenceId = text(
    value.selectedReferenceId,
    'selectedReferenceId',
    issues,
    { maximum: 120 },
  );
  if (referenceMode === 'selected_reference' && !selectedReferenceId) {
    issues.push({
      field: 'selectedReferenceId',
      message: 'اختر مرجعًا عند استخدام وضع المرجع اليدوي.',
    });
  }

  let recentReferenceIds: string[] | undefined;
  if (value.recentReferenceIds !== undefined) {
    if (
      !Array.isArray(value.recentReferenceIds) ||
      value.recentReferenceIds.some((item) => typeof item !== 'string')
    ) {
      issues.push({
        field: 'recentReferenceIds',
        message: 'يجب أن تكون قائمة معرفات نصية.',
      });
    } else {
      recentReferenceIds = [...new Set(value.recentReferenceIds)]
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 5);
    }
  }

  if (issues.length) throw new StoryApiValidationError(issues);

  return {
    childName,
    childAge,
    heroName,
    childStory,
    adventure: adventure || undefined,
    moral: moral || undefined,
    helperCharacter: helperCharacter || undefined,
    templateLabel,
    pageCount: pageCount as 8 | 12 | 16,
    language,
    referenceMode,
    selectedReferenceId: selectedReferenceId || undefined,
    recentReferenceIds,
  };
}
