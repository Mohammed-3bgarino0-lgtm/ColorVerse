import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { BuiltImagePrompt } from '../src/lib/story-image-prompt-builder';
import type { GeneratedImageBinary, StoryImageProvider } from '../src/lib/story-image-provider';
import { FileStoryImageStorage } from '../src/lib/story-image-storage';
import { generateStoryImageEditions } from '../src/lib/story-image-generation-service';
import { regenerateStoryImageAsset } from '../src/lib/story-image-regeneration-service';
import { parseStoryImageGenerationInput } from '../src/lib/story-image-contract';

const directory = await mkdtemp(path.join(os.tmpdir(), 'colorverse-image-review-'));
process.env.GENERATED_ASSET_DIR = directory;

const scenes = Array.from({ length: 8 }, (_, index) => ({
  sceneNumber: index + 1,
  beatType: ['opening', 'goal', 'obstacle', 'helper', 'choice', 'climax', 'resolution', 'reflection'][index],
  title: `المشهد ${index + 1}`,
  storyText: `تستخدم ليان فكرتها في المشهد ${index + 1} وتتعاون مع الروبوت للوصول إلى حل مناسب.`.repeat(2),
  dialogue: index % 2 ? ['قالت ليان: لنجرب الفكرة معًا.'] : [],
  illustrationPrompt: `Original colorful scene ${index + 1}.`,
  coloringPrompt: `Matching clean line art ${index + 1}.`,
}));

const input = parseStoryImageGenerationInput({
  bookId: 'cv_review_regeneration_test',
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
    endingReflection: 'ما الفكرة الجديدة للمغامرة القادمة؟',
  },
  parentReview: {
    approved: true,
    approvedAt: new Date().toISOString(),
    reviewVersion: 1,
    sceneCount: 8,
  },
});

class FakeProvider implements StoryImageProvider {
  readonly model = 'fake-review-image-model';
  readonly prompts: BuiltImagePrompt[] = [];

  async generate(prompt: BuiltImagePrompt): Promise<GeneratedImageBinary> {
    this.prompts.push(prompt);
    return {
      data: Buffer.from(`generated-${this.prompts.length}-${prompt.kind}-${prompt.sceneNumber || 0}`),
      mimeType: 'image/png',
      model: this.model,
    };
  }
}

const provider = new FakeProvider();
const storage = new FileStoryImageStorage({ directory, publicBaseUrl: '/generated-assets' });

try {
  const initial = await generateStoryImageEditions(input, {
    provider,
    storage,
    maxAttemptsPerAsset: 1,
  });
  assert.equal(provider.prompts.length, 18);

  const storyResult = await regenerateStoryImageAsset({
    input,
    target: { kind: 'story', sceneNumber: 2 },
    assets: initial,
  }, { provider, storage, maxAttempts: 1 });
  assert.equal(storyResult.asset.kind, 'story');
  assert.equal(storyResult.asset.sceneNumber, 2);
  assert.deepEqual(storyResult.invalidatedApprovalKeys, ['story:2', 'coloring:2', 'pair:2']);

  initial.scenes['2'].story = storyResult.asset;
  const coloringResult = await regenerateStoryImageAsset({
    input,
    target: { kind: 'coloring', sceneNumber: 2 },
    assets: initial,
  }, { provider, storage, maxAttempts: 1 });
  assert.equal(coloringResult.asset.kind, 'coloring');
  assert.deepEqual(coloringResult.invalidatedApprovalKeys, ['coloring:2', 'pair:2']);

  const heroResult = await regenerateStoryImageAsset({
    input,
    target: { kind: 'hero' },
    assets: initial,
  }, { provider, storage, maxAttempts: 1 });
  assert.deepEqual(heroResult.invalidatedApprovalKeys, ['hero', 'cover', 'all-story-scenes', 'all-coloring-scenes']);
  assert.equal(provider.prompts.length, 21);

  console.log('Single-asset image regeneration and approval invalidation tests passed.');
} finally {
  await rm(directory, { recursive: true, force: true });
}
