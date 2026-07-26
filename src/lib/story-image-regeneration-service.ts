import {
  buildColoringScenePrompt,
  buildCoverPrompt,
  buildHeroPrompt,
  buildStoryScenePrompt,
  type BuiltImagePrompt,
} from './story-image-prompt-builder';
import type { StoryImageProvider } from './story-image-provider';
import { StoryImageProviderError } from './story-image-provider';
import type { StoryImageStorage } from './story-image-storage';
import type {
  StoredStoryImageAsset,
  StoryImageGenerationInput,
  StoryImageGenerationResult,
} from './story-image-contract';
import { readStoryImageAsset } from './story-image-asset-reader';

export type StoryImageRegenerationKind = 'hero' | 'cover' | 'story' | 'coloring';

export interface StoryImageRegenerationTarget {
  kind: StoryImageRegenerationKind;
  sceneNumber?: number;
}

export interface StoryImageRegenerationRequest {
  input: StoryImageGenerationInput;
  target: StoryImageRegenerationTarget;
  assets: Pick<StoryImageGenerationResult, 'hero' | 'cover' | 'scenes'>;
}

export interface StoryImageRegenerationResult {
  asset: StoredStoryImageAsset;
  invalidatedApprovalKeys: string[];
  generatedAt: string;
}

export interface RegenerateStoryImageOptions {
  provider: StoryImageProvider;
  storage: StoryImageStorage;
  signal?: AbortSignal;
  maxAttempts?: number;
}

function boundedAttempts(value?: number): number {
  return Math.max(1, Math.min(3, Number(value || 2)));
}

async function generateWithRetry(
  provider: StoryImageProvider,
  prompt: BuiltImagePrompt,
  signal: AbortSignal | undefined,
  maxAttempts: number,
) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (signal?.aborted) throw new DOMException('Image regeneration cancelled.', 'AbortError');
    try {
      return await provider.generate(prompt, signal);
    } catch (error) {
      lastError = error;
      if (!(error instanceof StoryImageProviderError) || !error.retryable || attempt === maxAttempts) throw error;
    }
  }
  throw lastError;
}

function findScene(input: StoryImageGenerationInput, sceneNumber: number | undefined) {
  if (!Number.isInteger(sceneNumber) || Number(sceneNumber) < 1) {
    throw new Error('رقم المشهد مطلوب لإعادة توليد صورة المشهد.');
  }
  const scene = input.story.scenes.find((item) => item.sceneNumber === Number(sceneNumber));
  if (!scene) throw new Error('المشهد المطلوب غير موجود في القصة المعتمدة.');
  return scene;
}

function invalidatedKeys(target: StoryImageRegenerationTarget): string[] {
  if (target.kind === 'hero') return ['hero', 'cover', 'all-story-scenes', 'all-coloring-scenes'];
  if (target.kind === 'cover') return ['cover'];
  if (target.kind === 'story') return [`story:${target.sceneNumber}`, `coloring:${target.sceneNumber}`, `pair:${target.sceneNumber}`];
  return [`coloring:${target.sceneNumber}`, `pair:${target.sceneNumber}`];
}

export async function regenerateStoryImageAsset(
  request: StoryImageRegenerationRequest,
  options: RegenerateStoryImageOptions,
): Promise<StoryImageRegenerationResult> {
  const attempts = boundedAttempts(options.maxAttempts);
  let prompt: BuiltImagePrompt;

  if (request.target.kind === 'hero') {
    prompt = buildHeroPrompt(request.input);
  } else if (request.target.kind === 'cover') {
    const heroReference = await readStoryImageAsset(request.assets.hero);
    prompt = buildCoverPrompt(request.input, heroReference);
  } else if (request.target.kind === 'story') {
    const scene = findScene(request.input, request.target.sceneNumber);
    const heroReference = await readStoryImageAsset(request.assets.hero);
    prompt = buildStoryScenePrompt(request.input, scene, heroReference);
  } else {
    const scene = findScene(request.input, request.target.sceneNumber);
    const sceneAssets = request.assets.scenes[String(scene.sceneNumber)];
    if (!sceneAssets?.story) throw new Error('صورة القصة الملونة مطلوبة قبل إعادة توليد صفحة التلوين.');
    const storyReference = await readStoryImageAsset(sceneAssets.story);
    prompt = buildColoringScenePrompt(request.input, scene, storyReference);
  }

  const image = await generateWithRetry(options.provider, prompt, options.signal, attempts);
  const asset = await options.storage.save({
    bookId: request.input.bookId,
    kind: prompt.kind,
    sceneNumber: prompt.sceneNumber,
    image,
    promptHash: prompt.promptHash,
    productionReady: true,
  });

  return {
    asset,
    invalidatedApprovalKeys: invalidatedKeys(request.target),
    generatedAt: new Date().toISOString(),
  };
}
