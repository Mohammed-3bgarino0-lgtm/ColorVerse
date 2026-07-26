export type StoryReferenceMode =
  | 'none'
  | 'child_story'
  | 'selected_reference'
  | 'auto_reference';

export interface StoryReference {
  id: string;
  title: string;
  language: 'ar' | 'en';
  ageRange: { min: number; max: number };
  topics: string[];
  moral: string;
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
}

export const STORY_REFERENCES: StoryReference[] = [
  {
    id: 'ref-friendship-generosity-001',
    title: 'الصديق البخيل',
    language: 'ar',
    ageRange: { min: 6, max: 10 },
    topics: ['البخل', 'الكرم', 'المشاركة', 'الصداقة', 'وفاء الأصدقاء'],
    moral: 'الأنانية تضعف الصداقة، والمشاركة والوفاء يبنيان الثقة.',
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
      allowedInfluence: ['البنية الكلية', 'القيمة', 'مستوى القراءة', 'الإيقاع'],
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
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function scoreStoryReference(
  reference: StoryReference,
  input: ReferenceSelectionInput,
): number {
  const text = normalize(
    `${input.childStory} ${input.adventure ?? ''} ${input.moral ?? ''}`,
  );

  const topicScore = reference.topics.reduce(
    (score, topic) => score + (text.includes(topic) ? 3 : 0),
    0,
  );

  const ageScore =
    input.childAge >= reference.ageRange.min &&
    input.childAge <= reference.ageRange.max
      ? 2
      : 0;

  return topicScore + ageScore;
}

export function chooseStoryReference(
  input: ReferenceSelectionInput,
  random: () => number = Math.random,
): StoryReference | null {
  if (input.mode === 'none' || input.mode === 'child_story') return null;

  if (input.mode === 'selected_reference') {
    return (
      STORY_REFERENCES.find(
        (reference) => reference.id === input.selectedReferenceId,
      ) ?? null
    );
  }

  const ranked = STORY_REFERENCES
    .map((reference) => ({
      reference,
      score: scoreStoryReference(reference, input),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) return null;

  const bestScore = ranked[0].score;
  const candidates = ranked
    .filter((item) => item.score >= Math.max(1, bestScore - 2))
    .slice(0, 3);
  const index = Math.floor(random() * candidates.length);

  return candidates[index]?.reference ?? candidates[0].reference;
}
