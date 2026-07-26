import { createHash } from 'node:crypto';
import type { GeneratedStoryScene } from './generated-story-schema';
import type { StoryImageGenerationInput } from './story-image-contract';

export interface ImageReference {
  data: string;
  mimeType: string;
}

export interface ImageInputBlock {
  type: 'text' | 'image';
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface BuiltImagePrompt {
  kind: 'hero' | 'cover' | 'story' | 'coloring';
  sceneNumber?: number;
  aspectRatio: '1:1' | '3:4';
  imageSize: '1K' | '2K';
  blocks: ImageInputBlock[];
  promptHash: string;
}

function normalized(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function dataUrlReference(dataUrl?: string): ImageReference | null {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function text(value: string): ImageInputBlock {
  return { type: 'text', text: value };
}

function image(reference: ImageReference): ImageInputBlock {
  return { type: 'image', data: reference.data, mimeType: reference.mimeType };
}

function promptHash(blocks: ImageInputBlock[]): string {
  const hash = createHash('sha256');
  for (const block of blocks) {
    hash.update(block.type);
    if (block.text) hash.update(block.text);
    if (block.mimeType) hash.update(block.mimeType);
    if (block.data) hash.update(createHash('sha256').update(block.data).digest('hex'));
  }
  return hash.digest('hex').slice(0, 24);
}

function finish(
  kind: BuiltImagePrompt['kind'],
  blocks: ImageInputBlock[],
  options: Pick<BuiltImagePrompt, 'aspectRatio' | 'imageSize'> & { sceneNumber?: number },
): BuiltImagePrompt {
  return {
    kind,
    blocks,
    aspectRatio: options.aspectRatio,
    imageSize: options.imageSize,
    sceneNumber: options.sceneNumber,
    promptHash: promptHash(blocks),
  };
}

function styleBible(input: StoryImageGenerationInput): string {
  return [
    'ORIGINAL CHILDREN STORYBOOK ART DIRECTION:',
    '- Premium hand-painted digital storybook illustration with warm cinematic light.',
    '- Friendly, joyful, age-appropriate, expressive, visually clear, and easy to understand.',
    '- Original visual language only; do not imitate any named studio, film, artist, or copyrighted character.',
    '- No logos, watermarks, written words, labels, captions, speech bubbles, page numbers, or decorative letters inside generated art.',
    '- Keep face shape, skin tone, hairstyle, clothing design, clothing colors, signature accessories, and body proportions consistent across every image.',
    `- Reader age: ${input.childAge}. Avoid frightening, violent, unsafe, or visually intense imagery.`,
    `- Story world: ${input.templateLabel}.`,
  ].join('\n');
}

function identityBible(input: StoryImageGenerationInput): string {
  return [
    'HERO CONSISTENCY BIBLE:',
    `- Hero name: ${input.heroName}.`,
    '- Create one original illustrated child hero, not a photorealistic portrait.',
    input.childPhotoDataUrl
      ? '- The child photo is an identity reference only. Preserve recognizable general facial features, age, skin tone, hair shape, and friendly expression while converting the child into an original storybook character.'
      : '- No child photo is available. Create a welcoming original child hero suited to the chosen story world.',
    '- The exact hero design produced in the character sheet is the master reference for the cover and every story scene.',
    '- Do not change the hero identity, outfit, hairstyle, colors, or accessories between scenes.',
  ].join('\n');
}

function storyContext(input: StoryImageGenerationInput): string {
  return [
    `STORY TITLE: ${input.story.title}`,
    `MORAL: ${input.story.moral}`,
    `SETTING: ${input.story.setting}`,
    `CHARACTERS: ${input.story.characters.join(' | ')}`,
  ].join('\n');
}

export function buildHeroPrompt(input: StoryImageGenerationInput): BuiltImagePrompt {
  const childPhoto = dataUrlReference(input.childPhotoDataUrl);
  const blocks: ImageInputBlock[] = [
    text([
      styleBible(input),
      identityBible(input),
      storyContext(input),
      '',
      'TASK: Create the master character sheet for the child hero.',
      '- One clean full-body front three-quarter pose, friendly natural smile, relaxed stance.',
      '- Simple softly lit neutral background with no scene elements.',
      '- Show the complete outfit and signature accessory clearly.',
      '- Center the hero with generous margins so this image can be reused as a character reference.',
      '- Output image only. Absolutely no text anywhere in the image.',
    ].join('\n')),
  ];
  if (childPhoto) blocks.push(image(childPhoto));
  return finish('hero', blocks, { aspectRatio: '3:4', imageSize: '1K' });
}

export function buildCoverPrompt(
  input: StoryImageGenerationInput,
  heroReference: ImageReference,
): BuiltImagePrompt {
  const blocks = [
    text([
      styleBible(input),
      identityBible(input),
      storyContext(input),
      '',
      'TASK: Create a premium vertical book-cover illustration using the attached master hero reference.',
      `- Cover style: ${input.coverStyle || 'primary storybook cover'}.`,
      '- Show the same hero in a confident, inviting pose inside the story world.',
      '- Include important atmosphere and supporting characters without overcrowding.',
      '- Leave clean visual space in the upper and lower thirds for HTML title overlays, but do not render any text yourself.',
      '- Keep the hero fully recognizable and identical to the attached character sheet.',
      '- Output image only. No title, letters, numbers, logo, caption, watermark, or border.',
    ].join('\n')),
    image(heroReference),
  ];
  return finish('cover', blocks, { aspectRatio: '3:4', imageSize: '2K' });
}

export function buildStoryScenePrompt(
  input: StoryImageGenerationInput,
  scene: GeneratedStoryScene,
  heroReference: ImageReference,
): BuiltImagePrompt {
  const blocks = [
    text([
      styleBible(input),
      identityBible(input),
      storyContext(input),
      '',
      `SCENE NUMBER: ${scene.sceneNumber}`,
      `SCENE TITLE FOR CONTEXT ONLY: ${normalized(scene.title)}`,
      `STORY ACTION: ${normalized(scene.storyText)}`,
      `APPROVED VISUAL BRIEF: ${normalized(scene.illustrationPrompt)}`,
      scene.dialogue.length ? `DIALOGUE EMOTION FOR ACTING ONLY: ${scene.dialogue.join(' | ')}` : '',
      '',
      'TASK: Create one full-page color illustration for the STORY EDITION.',
      '- Use the attached master hero as the exact character identity reference.',
      '- Communicate the action visually through pose, facial expression, staging, and environment.',
      '- Match the emotional tone and story continuity while making this composition distinct from other scenes.',
      '- Do not draw the narrative text, dialogue, speech bubbles, labels, page number, title, logo, or watermark.',
      '- Output image only.',
    ].filter(Boolean).join('\n')),
    image(heroReference),
  ];
  return finish('story', blocks, {
    aspectRatio: '3:4',
    imageSize: '1K',
    sceneNumber: scene.sceneNumber,
  });
}

export function buildColoringScenePrompt(
  input: StoryImageGenerationInput,
  scene: GeneratedStoryScene,
  storySceneReference: ImageReference,
): BuiltImagePrompt {
  const blocks = [
    text([
      'TASK: Convert the attached approved story illustration into the matching page for a separate CHILDREN COLORING EDITION.',
      '- Preserve the exact same characters, identities, pose, action, objects, camera angle, and composition.',
      '- Clean black line art on a pure white background.',
      '- Thick, smooth, closed outlines with large colorable areas suitable for children.',
      '- Remove color, gradients, shadows, gray fills, hatching, texture noise, and tiny details.',
      '- Keep faces friendly and recognizable.',
      '- The coloring page must contain artwork only.',
      '- ABSOLUTELY NO story text, explanation, title, caption, dialogue, speech bubble, label, letters, numbers, page number, logo, watermark, frame text, or instructions.',
      `- Scene ${scene.sceneNumber} visual continuity must match the attached image exactly.`,
      '- Output image only.',
    ].join('\n')),
    image(storySceneReference),
  ];
  return finish('coloring', blocks, {
    aspectRatio: '3:4',
    imageSize: '1K',
    sceneNumber: scene.sceneNumber,
  });
}
