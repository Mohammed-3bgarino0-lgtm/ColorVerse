import type { GeneratedStoryDocument } from './generated-story-schema';

export type StoryImageAssetKind = 'hero' | 'cover' | 'story' | 'coloring';
export type StoryImageJobStatus =
  | 'queued'
  | 'building_character'
  | 'building_cover'
  | 'building_scenes'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ParentApprovalSnapshot {
  approved: true;
  approvedAt: string;
  reviewVersion: number;
  sceneCount: number;
}

export interface StoryImageGenerationInput {
  bookId: string;
  childName: string;
  childAge: number;
  heroName: string;
  template: 'space' | 'princess' | 'jungle' | 'hero' | 'unicorn';
  templateLabel: string;
  outputIncludesColoring: boolean;
  coverStyle?: string;
  childPhotoDataUrl?: string;
  photoConsent: boolean;
  story: GeneratedStoryDocument;
  parentReview: ParentApprovalSnapshot;
}

export interface StoredStoryImageAsset {
  kind: StoryImageAssetKind;
  sceneNumber?: number;
  url: string;
  storagePath: string;
  mimeType: string;
  width?: number;
  height?: number;
  promptHash: string;
  model: string;
  createdAt: string;
  productionReady: boolean;
}

export interface StoryImageGenerationResult {
  bookId: string;
  hero: StoredStoryImageAsset;
  cover: StoredStoryImageAsset;
  scenes: Record<string, {
    story: StoredStoryImageAsset;
    coloring?: StoredStoryImageAsset;
  }>;
  model: string;
  demo: boolean;
  completedAt: string;
}

export interface StoryImageJobSnapshot {
  jobId: string;
  bookId: string;
  status: StoryImageJobStatus;
  current: number;
  total: number;
  stageLabel: string;
  currentScene?: number;
  createdAt: string;
  updatedAt: string;
  result?: StoryImageGenerationResult;
  error?: { code: string; message: string };
}

export interface StoryImageValidationIssue {
  field: string;
  message: string;
}

export class StoryImageValidationError extends Error {
  readonly issues: StoryImageValidationIssue[];

  constructor(issues: StoryImageValidationIssue[]) {
    super(issues.map((issue) => `${issue.field}: ${issue.message}`).join(' | '));
    this.name = 'StoryImageValidationError';
    this.issues = issues;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function requiredString(
  value: unknown,
  field: string,
  issues: StoryImageValidationIssue[],
  minimum = 2,
  maximum = 200,
): string {
  const output = clean(value);
  if (output.length < minimum) issues.push({ field, message: 'القيمة أقصر من المطلوب.' });
  if (output.length > maximum) issues.push({ field, message: 'القيمة أطول من المسموح.' });
  return output;
}

function validatePhotoDataUrl(
  value: unknown,
  consent: boolean,
  issues: StoryImageValidationIssue[],
): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (!consent) {
    issues.push({ field: 'photoConsent', message: 'يلزم إذن ولي الأمر قبل استخدام صورة الطفل.' });
    return undefined;
  }
  if (typeof value !== 'string') {
    issues.push({ field: 'childPhotoDataUrl', message: 'صيغة صورة الطفل غير صحيحة.' });
    return undefined;
  }
  const match = value.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    issues.push({ field: 'childPhotoDataUrl', message: 'يسمح فقط بصور PNG أو JPEG أو WebP المرفوعة مباشرة.' });
    return undefined;
  }
  const estimatedBytes = Math.floor((match[2].length * 3) / 4);
  if (estimatedBytes > 5 * 1024 * 1024) {
    issues.push({ field: 'childPhotoDataUrl', message: 'صورة الطفل تتجاوز 5 MB.' });
  }
  return value;
}

export function parseStoryImageGenerationInput(value: unknown): StoryImageGenerationInput {
  const issues: StoryImageValidationIssue[] = [];
  if (!isRecord(value)) {
    throw new StoryImageValidationError([{ field: '$', message: 'الطلب يجب أن يكون كائن JSON.' }]);
  }

  const story = value.story;
  if (!isRecord(story) || !Array.isArray(story.scenes)) {
    issues.push({ field: 'story', message: 'القصة المعتمدة ومشاهدها مطلوبة.' });
  }
  const parentReview = value.parentReview;
  if (!isRecord(parentReview) || parentReview.approved !== true) {
    issues.push({ field: 'parentReview', message: 'يجب اعتماد القصة من ولي الأمر أولًا.' });
  }

  const template = clean(value.template);
  const templates = ['space', 'princess', 'jungle', 'hero', 'unicorn'] as const;
  if (!templates.includes(template as (typeof templates)[number])) {
    issues.push({ field: 'template', message: 'عالم القصة غير مدعوم.' });
  }

  const childAge = Number(value.childAge);
  if (!Number.isInteger(childAge) || childAge < 3 || childAge > 12) {
    issues.push({ field: 'childAge', message: 'العمر يجب أن يكون بين 3 و12 سنة.' });
  }

  const sceneCount = isRecord(story) && Array.isArray(story.scenes) ? story.scenes.length : 0;
  if (![8, 12, 16].includes(sceneCount)) {
    issues.push({ field: 'story.scenes', message: 'عدد المشاهد يجب أن يكون 8 أو 12 أو 16.' });
  }
  if (isRecord(parentReview) && Number(parentReview.sceneCount) !== sceneCount) {
    issues.push({ field: 'parentReview.sceneCount', message: 'عدد المشاهد المعتمدة لا يطابق القصة.' });
  }

  const photoConsent = value.photoConsent === true;
  const childPhotoDataUrl = validatePhotoDataUrl(value.childPhotoDataUrl, photoConsent, issues);

  if (issues.length) throw new StoryImageValidationError(issues);

  return {
    bookId: requiredString(value.bookId, 'bookId', issues, 4, 120),
    childName: requiredString(value.childName, 'childName', issues, 2, 40),
    childAge,
    heroName: requiredString(value.heroName, 'heroName', issues, 2, 40),
    template: template as StoryImageGenerationInput['template'],
    templateLabel: requiredString(value.templateLabel, 'templateLabel', issues, 2, 100),
    outputIncludesColoring: value.outputIncludesColoring !== false,
    coverStyle: clean(value.coverStyle) || undefined,
    childPhotoDataUrl,
    photoConsent,
    story: story as unknown as GeneratedStoryDocument,
    parentReview: {
      approved: true,
      approvedAt: requiredString(
        isRecord(parentReview) ? parentReview.approvedAt : '',
        'parentReview.approvedAt',
        issues,
        8,
        80,
      ),
      reviewVersion: Number(isRecord(parentReview) ? parentReview.reviewVersion : 1) || 1,
      sceneCount,
    },
  };
}
