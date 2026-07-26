import type { StoryPlan } from './story-plan-builder';
import type { OriginalityReport } from './story-originality-guard';
import type { StoryReferenceMode } from './story-reference-library';
import type { StoryImageReview } from './story-image-review-schema';

export const BOOK_TEMPLATE_IDS = [
  'space',
  'princess',
  'jungle',
  'hero',
  'unicorn',
] as const;

export const BOOK_OUTPUT_TYPES = [
  'story_coloring',
  'story_only',
  'coloring_only',
] as const;

export const COVER_STYLES = ['primary', 'gift', 'coloring'] as const;

export type BookTemplateId = (typeof BOOK_TEMPLATE_IDS)[number];
export type BookOutputType = (typeof BOOK_OUTPUT_TYPES)[number];
export type CoverStyle = (typeof COVER_STYLES)[number];
export type BookLanguage = 'ar' | 'en' | 'bilingual';
export type CharacterType = 'girl' | 'boy' | 'neutral';
export type BookStatus =
  | 'draft'
  | 'planning'
  | 'generating'
  | 'review_required'
  | 'ready'
  | 'failed';
export type BookPageType = 'story' | 'coloring' | 'opening' | 'ending';

export interface ChildProfile {
  name: string;
  age: number;
  language: BookLanguage;
  characterType: CharacterType;
  photoOriginal?: string;
  photoReference?: string;
}

export interface StorySettings {
  title?: string;
  template: BookTemplateId;
  themeLabel: string;
  heroName: string;
  helperCharacter?: string;
  /** Raw idea or draft written by the child. */
  childStory?: string;
  /**
   * Open-ended adventure description written by the user.
   * This is intentionally not an enum: suggestions in the UI are examples only.
   */
  adventure: string;
  moral?: string;
  tone: string;
  pageCount: 8 | 12 | 16;
  outputType: BookOutputType;
  specialNotes?: string;
  referenceMode?: StoryReferenceMode;
  selectedReferenceId?: string;
  recentReferenceIds?: string[];
}

export interface StoryAuthorship {
  creativeCredit: string;
  childIsPrimaryCreator: true;
  preservedChildIdeas: string[];
  editorAdditions: string[];
  minimumPreservationRatio: 0.5;
}

export interface StoryReferenceUsage {
  mode: StoryReferenceMode;
  referenceId: string | null;
  influence: 'none' | 'structure_moral_only';
  matchedTerms: string[];
  allowedInfluence: string[];
  forbiddenInfluence: string[];
}

export interface ParentStoryReview {
  required: true;
  approved: boolean;
  approvedAt?: string;
  reviewVersion: number;
  reviewedSceneCount: number;
  editedTitle: boolean;
  editedMoral: boolean;
  editedSceneNumbers: number[];
  guardianName?: string;
}

export interface BookCover {
  style: CoverStyle;
  title: string;
  subtitle: string;
  creativeCredit?: string;
  heroImage?: string;
  backgroundImage: string;
  logo: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
  };
}

export interface BookPage {
  pageNumber: number;
  type: BookPageType;
  beatType?: string;
  title?: string;
  text?: string;
  dialogue?: string[];
  image?: string;
  coloringImage?: string;
  matchingPageNumber?: number;
}

export interface BookPdfSettings {
  size: 'A4' | 'LETTER';
  dpi: 150 | 300;
  printReady: boolean;
  fileUrl?: string;
  coverImageUrl?: string;
  generatedAt?: string;
}

export interface ColorVerseBook {
  bookId: string;
  status: BookStatus;
  child: ChildProfile;
  authorship: StoryAuthorship;
  story: StorySettings & { title: string };
  referenceUsage: StoryReferenceUsage;
  storyPlan?: StoryPlan;
  originality?: OriginalityReport;
  parentReview: ParentStoryReview;
  imageReview?: StoryImageReview;
  cover: BookCover;
  pdf: BookPdfSettings;
  pages: BookPage[];
  createdAt: string;
  updatedAt: string;
}

export interface BookDraftInput {
  child: ChildProfile;
  story: StorySettings;
  coverStyle?: CoverStyle;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateBookDraft(input: BookDraftInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const childName = input.child.name.trim();
  const heroName = input.story.heroName.trim();
  const childStory = input.story.childStory?.trim() ?? '';
  const adventure = input.story.adventure.trim();

  if (childName.length < 2) {
    issues.push({ field: 'child.name', message: 'اسم الطفل قصير جدًا.' });
  }

  if (!Number.isInteger(input.child.age) || input.child.age < 3 || input.child.age > 12) {
    issues.push({ field: 'child.age', message: 'العمر يجب أن يكون بين 3 و12 سنة.' });
  }

  if (!BOOK_TEMPLATE_IDS.includes(input.story.template)) {
    issues.push({ field: 'story.template', message: 'قالب القصة غير مدعوم.' });
  }

  if (heroName.length < 2) {
    issues.push({ field: 'story.heroName', message: 'اسم بطل القصة مطلوب.' });
  }

  if (childStory.length < 4 && adventure.length < 8) {
    issues.push({
      field: 'story.childStory',
      message: 'اكتب فكرة الطفل أو وصفًا أوضح للمغامرة.',
    });
  }

  if (childStory.length > 1400) {
    issues.push({ field: 'story.childStory', message: 'قصة الطفل تتجاوز 1400 حرف.' });
  }

  if (adventure.length > 500) {
    issues.push({ field: 'story.adventure', message: 'وصف المغامرة يتجاوز 500 حرف.' });
  }

  if (![8, 12, 16].includes(input.story.pageCount)) {
    issues.push({ field: 'story.pageCount', message: 'عدد الصفحات غير مدعوم.' });
  }

  if (
    input.story.referenceMode === 'selected_reference' &&
    !input.story.selectedReferenceId
  ) {
    issues.push({
      field: 'story.selectedReferenceId',
      message: 'اختر قصة مرجعية أو غيّر طريقة بناء القصة.',
    });
  }

  return issues;
}

export function createBookId(now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const random = Math.random().toString(36).slice(2, 7);
  return `cv_${stamp}_${random}`;
}
