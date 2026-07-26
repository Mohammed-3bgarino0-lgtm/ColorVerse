export type StoryReferenceMode =
  | 'none'
  | 'child_story'
  | 'selected_reference'
  | 'auto_reference';

export type StoryReferenceLanguage = 'ar' | 'en' | 'bilingual';

export interface StoryReference {
  id: string;
  title: string;
  language: StoryReferenceLanguage;
  ageRange: { min: number; max: number };
  categories: string[];
  topics: string[];
  keywords: string[];
  moral: string;
  summary: string;
  structure: string[];
  styleFingerprint: {
    narration: string;
    dialogue: string;
    pacing: string;
    illustrationRhythm: string;
    ending: string;
  };
  originalityRules: {
    reuseText: false;
    reuseNames: false;
    reuseSetting: false;
    reuseSceneSequence: false;
    reuseIllustrations: false;
    allowedInfluence: string[];
  };
  sourceMetadata?: {
    sourceType: 'pdf' | 'docx' | 'text' | 'manual';
    pageCount?: number;
    internalOnly: boolean;
  };
}

export const STORY_REFERENCES: StoryReference[] = [
  {
    id: 'ref-friendship-generosity-001',
    title: 'الصديق البخيل',
    language: 'ar',
    ageRange: { min: 6, max: 10 },
    categories: ['القيم والسلوك', 'الصداقة'],
    topics: ['البخل', 'الكرم', 'المشاركة', 'الصداقة', 'وفاء الأصدقاء'],
    keywords: [
      'بخيل',
      'أناني',
      'لا يشارك',
      'يحتفظ لنفسه',
      'وفي',
      'يساعد صديقه',
      'الصديق الحقيقي',
    ],
    moral: 'الأنانية تضعف الصداقة، والمشاركة والوفاء يبنيان الثقة.',
    summary:
      'مرجع تربوي عن أثر البخل في علاقة الصداقة، وتصاعد المشكلة حتى لحظة إدراك الخطأ وتغيير السلوك.',
    structure: [
      'تقديم علاقة صداقة واضحة',
      'ظهور سلوك أناني متكرر',
      'تفاقم أثر السلوك على العلاقة',
      'اختبار حقيقي للصداقة',
      'لحظة إدراك الخطأ',
      'اختيار سلوك جديد',
      'نتيجة تربوية واضحة',
    ],
    styleFingerprint: {
      narration: 'لغة عربية مبسطة وسرد خطي واضح',
      dialogue: 'حوارات قصيرة تخدم الحدث',
      pacing: 'مواقف متصاعدة ثم نتيجة أخلاقية',
      illustrationRhythm: 'تناوب بين السرد واللوحات المصورة',
      ending: 'نهاية مباشرة تظهر أثر السلوك',
    },
    originalityRules: {
      reuseText: false,
      reuseNames: false,
      reuseSetting: false,
      reuseSceneSequence: false,
      reuseIllustrations: false,
      allowedInfluence: [
        'البنية الكلية',
        'القيمة التربوية',
        'مستوى القراءة',
        'الإيقاع',
      ],
    },
    sourceMetadata: {
      sourceType: 'pdf',
      pageCount: 18,
      internalOnly: true,
    },
  },
];

export interface ReferenceSelectionInput {
  mode: StoryReferenceMode;
  selectedReferenceId?: string;
  childAge: number;
  childStory: string;
  adventure?: string;
  moral?: string;
  language?: StoryReferenceLanguage;
  recentReferenceIds?: string[];
}

export interface ReferenceScoreBreakdown {
  total: number;
  topic: number;
  keyword: number;
  moral: number;
  age: number;
  language: number;
  repetitionPenalty: number;
  matchedTerms: string[];
}

export interface RankedStoryReference {
  reference: StoryReference;
  score: ReferenceScoreBreakdown;
}

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const NON_WORDS = /[^\p{L}\p{N}\s]/gu;

const TOPIC_SYNONYMS: Record<string, string[]> = {
  البخل: ['بخيل', 'أناني', 'يحتفظ لنفسه', 'لا يعطي', 'لا يشارك'],
  الكرم: ['كريم', 'يعطي', 'تقاسم', 'يتقاسم', 'يساعد'],
  المشاركة: ['يشارك', 'نتعاون', 'معا', 'معًا', 'تقاسم'],
  الصداقة: ['صديق', 'صديقه', 'صديقتها', 'رفيق', 'أصدقاء'],
  'وفاء الأصدقاء': ['وفي', 'الوفاء', 'لم يترك صديقه', 'وقف معه', 'ساعد صديقه'],
};

function normalizeArabic(value: string): string {
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

function containsTerm(text: string, term: string): boolean {
  const normalizedTerm = normalizeArabic(term);
  return normalizedTerm.length > 1 && text.includes(normalizedTerm);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function scoreAge(age: number, range: StoryReference['ageRange']): number {
  if (!Number.isFinite(age)) return 0;
  if (age >= range.min && age <= range.max) return 4;

  const distance = age < range.min ? range.min - age : age - range.max;
  if (distance === 1) return 2;
  if (distance === 2) return 1;
  return -2;
}

export function scoreStoryReference(
  reference: StoryReference,
  input: ReferenceSelectionInput,
): ReferenceScoreBreakdown {
  const text = normalizeArabic(
    `${input.childStory} ${input.adventure ?? ''} ${input.moral ?? ''}`,
  );

  const matchedTopics = reference.topics.filter((topic) => {
    if (containsTerm(text, topic)) return true;
    return (TOPIC_SYNONYMS[topic] ?? []).some((term) => containsTerm(text, term));
  });

  const matchedKeywords = reference.keywords.filter((keyword) =>
    containsTerm(text, keyword),
  );

  const moralTerms = normalizeArabic(reference.moral)
    .split(' ')
    .filter((term) => term.length >= 4);
  const matchedMoralTerms = moralTerms.filter((term) => text.includes(term));

  const topic = matchedTopics.length * 5;
  const keyword = matchedKeywords.length * 2;
  const moral = Math.min(5, matchedMoralTerms.length);
  const age = scoreAge(input.childAge, reference.ageRange);
  const language =
    !input.language ||
    input.language === reference.language ||
    input.language === 'bilingual' ||
    reference.language === 'bilingual'
      ? 2
      : -3;
  const repetitionPenalty = input.recentReferenceIds?.includes(reference.id) ? -6 : 0;

  return {
    total: topic + keyword + moral + age + language + repetitionPenalty,
    topic,
    keyword,
    moral,
    age,
    language,
    repetitionPenalty,
    matchedTerms: unique([...matchedTopics, ...matchedKeywords, ...matchedMoralTerms]),
  };
}

export function rankStoryReferences(
  input: ReferenceSelectionInput,
  references: StoryReference[] = STORY_REFERENCES,
): RankedStoryReference[] {
  return references
    .map((reference) => ({
      reference,
      score: scoreStoryReference(reference, input),
    }))
    .sort((a, b) => {
      if (b.score.total !== a.score.total) return b.score.total - a.score.total;
      return a.reference.id.localeCompare(b.reference.id);
    });
}

function weightedPick<T extends { weight: number }>(
  items: T[],
  random: () => number,
): T | null {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (total <= 0) return items[0] ?? null;

  let cursor = random() * total;
  for (const item of items) {
    cursor -= Math.max(0, item.weight);
    if (cursor <= 0) return item;
  }
  return items.at(-1) ?? null;
}

export function chooseStoryReference(
  input: ReferenceSelectionInput,
  random: () => number = Math.random,
  references: StoryReference[] = STORY_REFERENCES,
): StoryReference | null {
  if (input.mode === 'none' || input.mode === 'child_story') return null;

  if (input.mode === 'selected_reference') {
    return (
      references.find((reference) => reference.id === input.selectedReferenceId) ??
      null
    );
  }

  const ranked = rankStoryReferences(input, references);
  if (!ranked.length) return null;

  const bestScore = ranked[0].score.total;
  const candidates = ranked
    .filter((item) => item.score.total >= Math.max(1, bestScore - 5))
    .slice(0, 5)
    .map((item) => ({
      reference: item.reference,
      weight: Math.max(1, item.score.total - Math.max(0, bestScore - 6)),
    }));

  return weightedPick(candidates, random)?.reference ?? ranked[0].reference;
}
