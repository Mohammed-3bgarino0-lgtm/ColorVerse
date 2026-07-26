import assert from 'node:assert/strict';
import type { BuiltImagePrompt } from '../src/lib/story-image-prompt-builder';
import type {
  GeneratedImageBinary,
  StoryImageProvider,
} from '../src/lib/story-image-provider';
import { MemoryStoryImageStorage } from '../src/lib/story-image-storage';
import { generateStoryImageEditions } from '../src/lib/story-image-generation-service';
import {
  parseStoryImageGenerationInput,
  StoryImageValidationError,
} from '../src/lib/story-image-contract';

const scenes = Array.from({ length: 8 }, (_, index) => ({
  sceneNumber: index + 1,
  beatType: ['opening', 'goal', 'obstacle', 'helper', 'choice', 'climax', 'resolution', 'reflection'][index],
  title: `المشهد ${index + 1}`,
  storyText: `تتحرك ليان في المشهد ${index + 1} وتستخدم فكرتها مع الروبوت للوصول إلى حل مناسب.`.repeat(2),
  dialogue: index % 2 ? ['قالت ليان: لنجرب الفكرة معًا.'] : [],
  illustrationPrompt: `Original colorful story scene ${index + 1} with Layan and the robot.`,
  coloringPrompt: `Matching clean line art scene ${index + 1}.`,
}));

const rawInput = {
  bookId: 'cv_test_image_editions',
  childName: 'ليان',
  childAge: 8,
  heroName: 'ليان',
  template: 'space',
  templateLabel: 'الفضاء',
  coverStyle: 'أساسي',
  photoConsent: false,
  story: {
    title: 'ليان والنجمة الزرقاء',
    creativeCredit: 'فكرة وتأليف: ليان',
    preservedChildIdeas: ['نجمة زرقاء', 'إعادتها إلى السماء'],
    moral: 'التعاون والأمانة',
    referenceUsed: null,
    characters: ['ليان', 'روبوت مرح'],
    setting: 'رحلة أصلية بين الكواكب',
    scenes,
    endingReflection: 'ما الكوكب الذي ستكتبه ليان في المغامرة القادمة؟',
  },
  parentReview: {
    approved: true,
    approvedAt: new Date().toISOString(),
    reviewVersion: 1,
    sceneCount: 8,
  },
};

class FakeImageProvider implements StoryImageProvider {
  readonly model = 'fake-image-model';
  readonly prompts: BuiltImagePrompt[] = [];

  async generate(prompt: BuiltImagePrompt): Promise<GeneratedImageBinary> {
    this.prompts.push(prompt);
    return {
      data: Buffer.from(`fake-${prompt.kind}-${prompt.sceneNumber || 0}`),
      mimeType: 'image/png',
      model: this.model,
    };
  }
}

const input = parseStoryImageGenerationInput(rawInput);
const provider = new FakeImageProvider();
const storage = new MemoryStoryImageStorage();
const progress: number[] = [];
const result = await generateStoryImageEditions(input, {
  provider,
  storage,
  maxAttemptsPerAsset: 1,
  onProgress: (item) => progress.push(item.current),
});

assert.equal(result.editions.story, true);
assert.equal(result.editions.coloring, true);
assert.equal(result.editions.coloringHasNarrativeText, false);
assert.equal(Object.keys(result.scenes).length, 8);
assert.equal(provider.prompts.length, 18, 'hero + cover + 8 story + 8 coloring images');
assert.equal(storage.assets.size, 18);
assert.equal(result.scenes['1'].story.productionReady, true);
assert.equal(result.scenes['1'].coloring.productionReady, true);

const storyPrompts = provider.prompts.filter((prompt) => prompt.kind === 'story');
const coloringPrompts = provider.prompts.filter((prompt) => prompt.kind === 'coloring');
assert.equal(storyPrompts.length, 8);
assert.equal(coloringPrompts.length, 8);

for (const prompt of coloringPrompts) {
  const instruction = prompt.blocks.find((block) => block.type === 'text')?.text || '';
  assert.match(instruction, /ABSOLUTELY NO story text/i);
  assert.match(instruction, /NO[\s\S]*title[\s\S]*caption[\s\S]*dialogue[\s\S]*letters[\s\S]*numbers/i);
  assert.equal(prompt.blocks.filter((block) => block.type === 'image').length, 1);
  assert.equal(prompt.aspectRatio, '3:4');
}

const failedInput = {
  ...rawInput,
  parentReview: { ...rawInput.parentReview, approved: false },
};
assert.throws(() => parseStoryImageGenerationInput(failedInput), StoryImageValidationError);
assert.ok(progress.includes(18));

console.log('Separate story and text-free coloring image edition tests passed.');
