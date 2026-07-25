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
export type BookStatus = 'draft' | 'generating' | 'ready' | 'failed';
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
  /**
   * Open-ended adventure description written by the user.
   * This is intentionally not an enum: suggestions in the UI are examples only.
   */
  adventure: string;
  tone: string;
  pageCount: 8 | 12 | 16;
  outputType: BookOutputType;
  specialNotes?: string;
}

export interface BookCover {
  style: CoverStyle;
  title: string;
  subtitle: string;
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
  title?: string;
  text?: string;
  image?: string;
  matchingPageNumber?: number;
}

export interface BookPdfSettings {
  size: 'A4' | 'LETTER';
  dpi: 150 | 300;
  printReady: boolean;
  fileUrl?: string;
}

export interface ColorVerseBook {
  bookId: string;
  status: BookStatus;
  child: ChildProfile;
  story: StorySettings & { title: string };
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

  // Adventure is open-ended. Only sensible length and safety limits are enforced.
  if (adventure.length < 8) {
    issues.push({ field: 'story.adventure', message: 'اكتب وصفًا أوضح للمغامرة.' });
  }

  if (adventure.length > 500) {
    issues.push({ field: 'story.adventure', message: 'وصف المغامرة يتجاوز 500 حرف.' });
  }

  if (![8, 12, 16].includes(input.story.pageCount)) {
    issues.push({ field: 'story.pageCount', message: 'عدد الصفحات غير مدعوم.' });
  }

  return issues;
}

export function createBookId(now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const random = Math.random().toString(36).slice(2, 7);
  return `cv_${stamp}_${random}`;
}
