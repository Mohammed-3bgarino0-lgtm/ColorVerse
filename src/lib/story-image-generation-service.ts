import {
  buildColoringScenePrompt,
  buildCoverPrompt,
  buildHeroPrompt,
  buildStoryScenePrompt,
  type BuiltImagePrompt,
  type ImageReference,
} from './story-image-prompt-builder';
import type { StoryImageProvider, GeneratedImageBinary } from './story-image-provider';
import { StoryImageProviderError } from './story-image-provider';
import type { StoryImageStorage } from './story-image-storage';
import type {
  StoryImageGenerationInput,
  StoryImageGenerationResult,
  StoredStoryImageAsset,
  StoryImageJobStatus,
} from './story-image-contract';

export interface StoryImageProgress {
  status: StoryImageJobStatus;
  current: number;
  total: number;
  stageLabel: string;
  currentScene?: number;
}

export interface GenerateStoryImagesOptions {
  provider: StoryImageProvider;
  storage: StoryImageStorage;
  signal?: AbortSignal;
  maxAttemptsPerAsset?: number;
  onProgress?: (progress: StoryImageProgress) => void;
}

function asReference(image: GeneratedImageBinary): ImageReference {
  return { data: image.data.toString('base64'), mimeType: image.mimeType };
}

function boundedAttempts(value?: number): number {
  return Math.max(1, Math.min(3, Number(value || 2)));
}

async function generateWithRetry(
  provider: StoryImageProvider,
  prompt: BuiltImagePrompt,
  signal: AbortSignal | undefined,
  maxAttempts: number,
): Promise<GeneratedImageBinary> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (signal?.aborted) throw new DOMException('Image generation cancelled.', 'AbortError');
    try {
      return await provider.generate(prompt, signal);
    } catch (error) {
      lastError = error;
      if (!(error instanceof StoryImageProviderError) || !error.retryable || attempt === maxAttempts) {
        throw error;
      }
    }
  }
  throw lastError;
}

async function saveAsset(
  storage: StoryImageStorage,
  input: StoryImageGenerationInput,
  prompt: BuiltImagePrompt,
  image: GeneratedImageBinary,
): Promise<StoredStoryImageAsset> {
  return storage.save({
    bookId: input.bookId,
    kind: prompt.kind,
    sceneNumber: prompt.sceneNumber,
    image,
    promptHash: prompt.promptHash,
    productionReady: true,
  });
}

export async function generateStoryImageEditions(
  input: StoryImageGenerationInput,
  options: GenerateStoryImagesOptions,
): Promise<StoryImageGenerationResult> {
  const total = 2 + input.story.scenes.length * 2;
  const attempts = boundedAttempts(options.maxAttemptsPerAsset);
  let current = 0;
  const progress = (
    status: StoryImageJobStatus,
    stageLabel: string,
    currentScene?: number,
  ) => options.onProgress?.({ status, current, total, stageLabel, currentScene });

  progress('building_character', 'إنشاء مرجع شخصية البطل');
  const heroPrompt = buildHeroPrompt(input);
  const heroBinary = await generateWithRetry(options.provider, heroPrompt, options.signal, attempts);
  const hero = await saveAsset(options.storage, input, heroPrompt, heroBinary);
  current += 1;
  progress('building_character', 'اكتمل مرجع شخصية البطل');

  progress('building_cover', 'إنشاء غلاف نسخة القصة');
  const coverPrompt = buildCoverPrompt(input, asReference(heroBinary));
  const coverBinary = await generateWithRetry(options.provider, coverPrompt, options.signal, attempts);
  const cover = await saveAsset(options.storage, input, coverPrompt, coverBinary);
  current += 1;
  progress('building_cover', 'اكتمل الغلاف');

  const scenes: StoryImageGenerationResult['scenes'] = {};
  for (const scene of input.story.scenes) {
    progress('building_scenes', `إنشاء الصورة الملونة للمشهد ${scene.sceneNumber}`, scene.sceneNumber);
    const storyPrompt = buildStoryScenePrompt(input, scene, asReference(heroBinary));
    const storyBinary = await generateWithRetry(options.provider, storyPrompt, options.signal, attempts);
    const storyAsset = await saveAsset(options.storage, input, storyPrompt, storyBinary);
    current += 1;
    progress('building_scenes', `اكتملت صورة القصة للمشهد ${scene.sceneNumber}`, scene.sceneNumber);

    progress('building_scenes', `إنشاء رسمة التلوين الصافية للمشهد ${scene.sceneNumber}`, scene.sceneNumber);
    const coloringPrompt = buildColoringScenePrompt(input, scene, asReference(storyBinary));
    const coloringBinary = await generateWithRetry(
      options.provider,
      coloringPrompt,
      options.signal,
      attempts,
    );
    const coloringAsset = await saveAsset(options.storage, input, coloringPrompt, coloringBinary);
    current += 1;
    progress('building_scenes', `اكتملت صفحة التلوين للمشهد ${scene.sceneNumber}`, scene.sceneNumber);

    scenes[String(scene.sceneNumber)] = {
      story: storyAsset,
      coloring: coloringAsset,
    };
  }

  progress('completed', 'اكتملت نسختا القصة والتلوين');
  return {
    bookId: input.bookId,
    editions: {
      story: true,
      coloring: true,
      coloringHasNarrativeText: false,
    },
    hero,
    cover,
    scenes,
    model: options.provider.model,
    demo: false,
    completedAt: new Date().toISOString(),
  };
}
