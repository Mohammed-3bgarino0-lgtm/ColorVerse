import type { StoryReference, StoryReferenceMode } from './story-reference-library';

export type StoryBeatType =
  | 'opening'
  | 'goal'
  | 'obstacle'
  | 'escalation'
  | 'choice'
  | 'climax'
  | 'resolution'
  | 'reflection';

export interface StoryPlanInput {
  childName: string;
  childAge: number;
  heroName: string;
  childStory: string;
  adventure?: string;
  moral?: string;
  helperCharacter?: string;
  world: string;
  pageCount: 8 | 12 | 16;
  referenceMode: StoryReferenceMode;
  reference: StoryReference | null;
}

export interface StoryBeat {
  beatNumber: number;
  type: StoryBeatType;
  purpose: string;
  childIdeaToPreserve?: string;
  professionalAddition: string;
  referenceInfluence?: string;
  targetPages: number[];
}

export interface StoryPlan {
  creativeCredit: string;
  workingTitle: string;
  heroName: string;
  world: string;
  moral: string;
  preservedChildIdeas: string[];
  editorAdditions: string[];
  referenceUsage: {
    mode: StoryReferenceMode;
    referenceId: string | null;
    allowedInfluence: string[];
    forbiddenInfluence: string[];
  };
  beats: StoryBeat[];
  endingReflection: string;
}

const STOP_WORDS = new Set([
  'كان',
  'كانت',
  'هذا',
  'هذه',
  'هناك',
  'الذي',
  'التي',
  'الى',
  'إلى',
  'على',
  'في',
  'من',
  'عن',
  'مع',
  'ثم',
  'لكن',
  'وهو',
  'وهي',
  'كل',
  'بعد',
  'قبل',
  'جدا',
  'جدًا',
]);

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function splitIdeas(value: string): string[] {
  return clean(value)
    .split(/[.!؟?،؛\n]+/)
    .map(clean)
    .filter((part) => part.length >= 4);
}

function meaningfulWords(value: string): string[] {
  return clean(value)
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

function preserveChildIdeas(input: StoryPlanInput): string[] {
  const directIdeas = splitIdeas(input.childStory);
  const adventureIdeas = splitIdeas(input.adventure ?? '');
  const combined = [...directIdeas, ...adventureIdeas];

  if (combined.length) return [...new Set(combined)].slice(0, 8);

  const words = meaningfulWords(`${input.childStory} ${input.adventure ?? ''}`);
  return [...new Set(words)].slice(0, 6);
}

function pagesForBeat(
  beatIndex: number,
  beatCount: number,
  pageCount: number,
): number[] {
  const start = Math.floor((beatIndex * pageCount) / beatCount) + 1;
  const end = Math.max(start, Math.floor(((beatIndex + 1) * pageCount) / beatCount));
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function defaultMoral(input: StoryPlanInput): string {
  if (clean(input.moral ?? '')) return clean(input.moral ?? '');
  if (input.reference) return input.reference.moral;
  return 'التفكير والتعاون يساعدان البطل على اتخاذ قرار أفضل.';
}

function workingTitle(input: StoryPlanInput): string {
  const hero = clean(input.heroName) || clean(input.childName) || 'البطل الصغير';
  const idea = clean(input.adventure ?? input.childStory);

  if (/بخل|اناني|أناني|مشارك/.test(idea)) return `${hero} وسر المشاركة`;
  if (/وفا|صديق|صداقة/.test(idea)) return `${hero} ووعد الصديق الوفي`;
  if (/كنز/.test(idea)) return `${hero} والكنز الذي لا يُشترى`;
  if (/فضاء|كوكب|نجوم/.test(idea)) return `${hero} ورحلة النجمة البعيدة`;
  return `${hero} في مغامرة من الخيال`;
}

function buildBeatDefinitions(input: StoryPlanInput): Array<{
  type: StoryBeatType;
  purpose: string;
  addition: string;
}> {
  const hero = clean(input.heroName) || clean(input.childName) || 'البطل';
  const helper = clean(input.helperCharacter ?? '') || 'شخصية مساعدة جديدة';

  return [
    {
      type: 'opening',
      purpose: 'تقديم البطل والعالم وإظهار شيء مميز من خيال الطفل.',
      addition: `افتتاح بصري قصير يعرّف ${hero} ويجعل الطفل يدخل القصة بسرعة.`,
    },
    {
      type: 'goal',
      purpose: 'توضيح ما يريده البطل ولماذا يهمه.',
      addition: 'تحويل الفكرة إلى هدف واضح يمكن للطفل متابعته وفهمه.',
    },
    {
      type: 'obstacle',
      purpose: 'ظهور مشكلة أولى مرتبطة بالموضوع التربوي.',
      addition: 'إضافة عائق جديد لا ينسخ أحداث المرجع ويولد سؤالًا مشوقًا.',
    },
    {
      type: 'escalation',
      purpose: 'زيادة أثر المشكلة على البطل أو أصدقائه.',
      addition: `إدخال ${helper} في موقف يكشف نتيجة الاختيار بطريقة طبيعية.`,
    },
    {
      type: 'choice',
      purpose: 'منح البطل فرصة لاتخاذ قرار بدل تلقي درس مباشر.',
      addition: 'إظهار صراع بسيط بين اختيار سهل واختيار أفضل أخلاقيًا.',
    },
    {
      type: 'climax',
      purpose: 'اختبار القرار في اللحظة الأهم من القصة.',
      addition: 'حل يعتمد على فعل البطل وفكرته، وليس على صدفة أو وعظ خارجي.',
    },
    {
      type: 'resolution',
      purpose: 'إظهار نتيجة القرار وتغير العلاقة أو المكان.',
      addition: 'نهاية دافئة توضّح أثر السلوك دون مبالغة في الشرح.',
    },
    {
      type: 'reflection',
      purpose: 'دعوة الطفل للتفكير أو إضافة فكرة جديدة بعد القراءة.',
      addition: 'سؤال ختامي قصير يعزز شعور الطفل بأنه مؤلف ومبدع.',
    },
  ];
}

export function buildStoryPlan(input: StoryPlanInput): StoryPlan {
  const preservedChildIdeas = preserveChildIdeas(input);
  const definitions = buildBeatDefinitions(input);
  const referenceStructure = input.reference?.structure ?? [];

  const beats: StoryBeat[] = definitions.map((definition, index) => ({
    beatNumber: index + 1,
    type: definition.type,
    purpose: definition.purpose,
    childIdeaToPreserve:
      preservedChildIdeas[index % Math.max(1, preservedChildIdeas.length)],
    professionalAddition: definition.addition,
    referenceInfluence: input.reference
      ? referenceStructure[index % referenceStructure.length]
      : undefined,
    targetPages: pagesForBeat(index, definitions.length, input.pageCount),
  }));

  return {
    creativeCredit: `فكرة وتأليف: ${clean(input.childName)}`,
    workingTitle: workingTitle(input),
    heroName: clean(input.heroName) || clean(input.childName),
    world: clean(input.world),
    moral: defaultMoral(input),
    preservedChildIdeas,
    editorAdditions: [
      'ترتيب السبب والنتيجة',
      'تحسين الإيقاع حسب عمر الطفل',
      'إضافة حوار قصير يخدم الحدث',
      'بناء نهاية ناتجة عن قرار البطل',
    ],
    referenceUsage: {
      mode: input.referenceMode,
      referenceId: input.reference?.id ?? null,
      allowedInfluence:
        input.reference?.originalityRules.allowedInfluence ?? ['مستوى القراءة فقط'],
      forbiddenInfluence: [
        'النص الأصلي',
        'أسماء شخصيات المرجع',
        'مكان المرجع',
        'الحوار الأصلي',
        'تسلسل المشاهد نفسه',
        'النهاية نفسها',
        'الرسومات الأصلية',
      ],
    },
    beats,
    endingReflection: `ما الفكرة الجديدة التي يرغب ${clean(input.childName)} في إضافتها إلى المغامرة القادمة؟`,
  };
}
