import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { GeneratedImageBinary } from './story-image-provider';
import type { StoredStoryImageAsset, StoryImageAssetKind } from './story-image-contract';

export interface StoreStoryImageInput {
  bookId: string;
  kind: StoryImageAssetKind;
  sceneNumber?: number;
  image: GeneratedImageBinary;
  promptHash: string;
  productionReady?: boolean;
}

export interface StoryImageStorage {
  save(input: StoreStoryImageInput): Promise<StoredStoryImageAsset>;
}

function safeSegment(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
  return cleaned.slice(0, 100) || 'asset';
}

function extension(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  return 'png';
}

export interface FileStoryImageStorageOptions {
  directory?: string;
  publicBaseUrl?: string;
}

export class FileStoryImageStorage implements StoryImageStorage {
  readonly directory: string;
  readonly publicBaseUrl: string;

  constructor(options: FileStoryImageStorageOptions = {}) {
    this.directory = options.directory
      ?? process.env.GENERATED_ASSET_DIR
      ?? path.join(process.cwd(), 'generated-assets');
    this.publicBaseUrl = (options.publicBaseUrl
      ?? process.env.GENERATED_ASSET_PUBLIC_BASE_URL
      ?? '/generated-assets').replace(/\/$/, '');
  }

  async save(input: StoreStoryImageInput): Promise<StoredStoryImageAsset> {
    const book = safeSegment(input.bookId);
    const suffix = input.sceneNumber ? `-${String(input.sceneNumber).padStart(2, '0')}` : '';
    const fileName = `${safeSegment(input.kind)}${suffix}-${input.promptHash}.${extension(input.image.mimeType)}`;
    const relativePath = path.posix.join('story-images', book, fileName);
    const filePath = path.join(this.directory, ...relativePath.split('/'));

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, input.image.data);

    return {
      kind: input.kind,
      sceneNumber: input.sceneNumber,
      url: `${this.publicBaseUrl}/${relativePath}`,
      storagePath: relativePath,
      mimeType: input.image.mimeType,
      width: input.image.width,
      height: input.image.height,
      promptHash: input.promptHash,
      model: input.image.model,
      createdAt: new Date().toISOString(),
      productionReady: input.productionReady ?? true,
    };
  }
}

export class MemoryStoryImageStorage implements StoryImageStorage {
  readonly assets = new Map<string, Buffer>();

  async save(input: StoreStoryImageInput): Promise<StoredStoryImageAsset> {
    const key = `${safeSegment(input.bookId)}/${input.kind}/${input.sceneNumber ?? 0}/${input.promptHash}`;
    this.assets.set(key, Buffer.from(input.image.data));
    return {
      kind: input.kind,
      sceneNumber: input.sceneNumber,
      url: `memory://${key}`,
      storagePath: key,
      mimeType: input.image.mimeType,
      width: input.image.width,
      height: input.image.height,
      promptHash: input.promptHash,
      model: input.image.model,
      createdAt: new Date().toISOString(),
      productionReady: input.productionReady ?? true,
    };
  }
}
