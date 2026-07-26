import assert from 'node:assert/strict';
import type { GeneratedStoryDocument } from '../src/lib/generated-story-schema';
import { parseGeneratedStoryDocument } from '../src/lib/generated-story-schema';
import type {
  StoryProvider,
  StoryProviderRequest,
  StoryProviderResponse,
} from '../src/lib/gemini-story-provider';
import { parseStoryGenerationApiInput } from '../src/lib/story-api-contract';
import { generateProfessionalStory } from '../src/lib/story-generation-service';
import type { BuiltImagePrompt } from '../src/lib/story-image-prompt-builder';
import type { GeneratedImageBinary, StoryImageProvider } from '../src/lib/story-image-provider';
import { MemoryStoryImageStorage } from '../src/lib/story-image-storage';
import { parseStoryImageGenerationInput } from '../src/lib/story-image-contract';
import { generateStoryImageEditions } from '../src/lib/story-image-generation-service';
import { evaluateBookProductionReadiness } from '../src/lib/book-production-readiness';

const sceneTexts = [
  'ليان وجدت نجمة زرقاء قرب نافذة المرصد، فحملتها بلطف وفكرت في طريقة إعادتها إلى السماء.',
  'طلبت ليان من الروبوت المرح مساعدتها في تجهيز مركبة صغيرة تستطيع عبور الغبار الفضائي.',
  'انطلقت المركبة، لكن سحابة كثيفة أخفت الطريق وجعلت الخريطة غير واضحة.',
  'قسمت ليان العمل بينها وبين الروبوت، فراجع كل منهما جزءًا من الإشارات ثم جمعا النتائج.',
  'ظهر طريق سريع لكنه غير آمن، فاختارت ليان الأمانة وأخبرت صديقها بالحقيقة.',
  'جمعت ليان أضواء الكواكب في جسر مبتكر ساعد النجمة على الوصول إلى موطنها.',
  'عادت النجمة إلى مكانها وأضاءت الطريق للمسافرين، وشكرت ليان على تعاونها.',
  'رجعت ليان إلى المرصد وكتبت مغامرتها، ثم بدأت تتخيل العالم الذي ستزوره لاحقًا.',
];

function storyDocument(): GeneratedStoryDocument {
  return {
    title: 'ليان والنجمة الزرقاء',
    creativeCredit: 'فكرة وتأليف: ليان',
    preservedChildIdeas: ['ليان وجدت نجمة زرقاء', 'أرادت أن تعيدها إلى السماء'],
    moral: 'التعاون والأمانة يساعدان على اتخاذ القرار الصحيح.',
    referenceUsed: null,
    characters: ['ليان', 'روبوت مرح'],
    setting: 'مرصد صغير ورحلة أصلية بين الكواكب.',
    scenes: sceneTexts.map((storyText, index) => ({
      sceneNumber: index + 1,
      beatType: ['opening', 'goal', 'obstacle', 'helper', 'choice', 'climax', 'resolution', 'reflection'][index] as GeneratedStoryDocument['scenes'][number]['beatType'],
      title: `المشهد ${index + 1}`,
      storyText,
      dialogue: index === 3 ? ['قالت ليان: عندما نتعاون نرى الطريق بوضوح.'] : [],
      illustrationPrompt: `Original colorful children's story scene ${index + 1} with Layan and a friendly robot in space.`,
      coloringPrompt: `Matching clean black line art for scene ${index + 1}, no text or numbers.`,
    })),
    endingReflection: 'ما العالم الجديد الذي ستكتب عنه ليان؟',
  };
}

class LifecycleStoryProvider implements StoryProvider {
  async generate(request: StoryProviderRequest): Promise<StoryProviderResponse> {
    return {
      story: parseGeneratedStoryDocument(storyDocument(), request),
      model: 'lifecycle-fake-story-model',
      modelVersion: 'test',
      responseId: 'lifecycle-story-1',
    };
  }
}

class LifecycleImageProvider implements StoryImageProvider {
  readonly model = 'lifecycle-fake-image-model';
  readonly prompts: BuiltImagePrompt[] = [];

  async generate(prompt: BuiltImagePrompt): Promise<GeneratedImageBinary> {
    this.prompts.push(prompt);
    return {
      data: Buffer.from(`lifecycle-${prompt.kind}-${prompt.sceneNumber || 0}`),
      mimeType: 'image/png',
      model: this.model,
      width: 768,
      height: 1024,
    };
  }
}

const storyInput = parseStoryGenerationApiInput({
  childName: 'ليان',
  childAge: 8,
  heroName: 'ليان',
  childStory: 'ليان وجدت نجمة زرقاء وأرادت أن تعيدها إلى السماء.',
  adventure: 'رحلة فضائية عن التعاون والأمانة.',
  moral: 'التعاون والأمانة',
  helperCharacter: 'روبوت مرح',
  templateLabel: 'الفضاء',
  pageCount: 8,
  language: 'ar',
  referenceMode: 'none',
});

const generated = await generateProfessionalStory(storyInput, {
  provider: new LifecycleStoryProvider(),
  maxAttempts: 1,
  random: () => 0,
});
assert.equal(generated.review.accepted, true);
assert.equal(generated.story.scenes.length, 8);
assert.equal(generated.story.creativeCredit, 'فكرة وتأليف: ليان');

const imageInput = parseStoryImageGenerationInput({
  bookId: 'cv_lifecycle_acceptance',
  childName: 'ليان',
  childAge: 8,
  heroName: 'ليان',
  template: 'space',
  templateLabel: 'الفضاء',
  coverStyle: 'primary',
  photoConsent: false,
  story: generated.story,
  parentReview: {
    approved: true,
    approvedAt: new Date().toISOString(),
    reviewVersion: 1,
    sceneCount: 8,
  },
});

const imageProvider = new LifecycleImageProvider();
const memoryStorage = new MemoryStoryImageStorage();
const images = await generateStoryImageEditions(imageInput, {
  provider: imageProvider,
  storage: memoryStorage,
  maxAttemptsPerAsset: 1,
});

assert.equal(imageProvider.prompts.length, 18);
assert.equal(memoryStorage.assets.size, 18);
assert.equal(Object.keys(images.scenes).length, 8);
assert.equal(images.editions.coloringHasNarrativeText, false);

const beforeImageApproval = evaluateBookProductionReadiness({
  expectedSceneCount: 8,
  actualSceneCount: generated.story.scenes.length,
  parentApproved: true,
  imageReviewApproved: false,
  hero: images.hero,
  cover: images.cover,
  scenes: images.scenes,
});
assert.equal(beforeImageApproval.storyFinalReady, false);
assert.equal(beforeImageApproval.coloringFinalReady, false);
assert.ok(beforeImageApproval.blockers.includes('IMAGE_REVIEW_REQUIRED'));

const fullyApproved = evaluateBookProductionReadiness({
  expectedSceneCount: 8,
  actualSceneCount: generated.story.scenes.length,
  parentApproved: true,
  imageReviewApproved: true,
  hero: images.hero,
  cover: images.cover,
  scenes: images.scenes,
});
assert.equal(fullyApproved.storyAssetsReady, 8);
assert.equal(fullyApproved.coloringAssetsReady, 8);
assert.equal(fullyApproved.storyFinalReady, true);
assert.equal(fullyApproved.coloringFinalReady, true);
assert.equal(fullyApproved.driveArchiveReady, true);
assert.deepEqual(fullyApproved.blockers, []);

const fourthScene = images.scenes['4'];
assert.ok(fourthScene, 'The fourth scene pair must exist.');
const missingColoring = {
  ...images.scenes,
  '4': {
    ...fourthScene,
    coloring: { ...fourthScene.coloring, productionReady: false },
  },
};
const incomplete = evaluateBookProductionReadiness({
  expectedSceneCount: 8,
  actualSceneCount: 8,
  parentApproved: true,
  imageReviewApproved: true,
  hero: images.hero,
  cover: images.cover,
  scenes: missingColoring,
});
assert.equal(incomplete.storyFinalReady, true);
assert.equal(incomplete.coloringFinalReady, false);
assert.equal(incomplete.driveArchiveReady, false);
assert.ok(incomplete.blockers.includes('COLORING_IMAGES_INCOMPLETE'));

console.log('Full ColorVerse book lifecycle acceptance test passed: story, parent review, 18 assets, image approval, two editions, and Drive gate.');
