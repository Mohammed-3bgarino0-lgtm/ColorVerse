import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ImageReference } from './story-image-prompt-builder';
import type { StoredStoryImageAsset } from './story-image-contract';
import { GoogleDriveClient } from './google-drive-client';

export class StoryImageAssetReadError extends Error {
  readonly code: 'ASSET_NOT_FOUND' | 'ASSET_NOT_ALLOWED' | 'ASSET_READ_FAILED';

  constructor(
    code: StoryImageAssetReadError['code'],
    message: string,
    readonly causeValue?: unknown,
  ) {
    super(message);
    this.name = 'StoryImageAssetReadError';
    this.code = code;
  }
}

function generatedAssetDirectory(): string {
  return process.env.GENERATED_ASSET_DIR
    ? path.resolve(process.env.GENERATED_ASSET_DIR)
    : path.join(process.cwd(), 'generated-assets');
}

function safeLocalPath(storagePath: string): string {
  const root = generatedAssetDirectory();
  const normalized = storagePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const resolved = path.resolve(root, ...normalized.split('/'));
  const relative = path.relative(root, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new StoryImageAssetReadError('ASSET_NOT_ALLOWED', 'مسار الصورة خارج مجلد أصول ColorVerse.');
  }
  return resolved;
}

function dataUrlReference(url: string): ImageReference | null {
  const match = url.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  return match ? { mimeType: match[1], data: match[2] } : null;
}

export async function readStoryImageAsset(
  asset: StoredStoryImageAsset,
  driveClient: GoogleDriveClient = new GoogleDriveClient(),
): Promise<ImageReference> {
  const inline = dataUrlReference(asset.url || '');
  if (inline) return inline;

  try {
    if (asset.storagePath.startsWith('drive:')) {
      if (!driveClient.configured) {
        throw new StoryImageAssetReadError('ASSET_READ_FAILED', 'Google Drive غير مضبوط على الخادم.');
      }
      const fileId = asset.storagePath.slice('drive:'.length).trim();
      if (!fileId) throw new StoryImageAssetReadError('ASSET_NOT_FOUND', 'معرّف ملف Drive مفقود.');
      const metadata = await driveClient.getFileMetadata(fileId);
      const allowedFolderId = process.env.GOOGLE_DRIVE_IMAGE_ASSETS_FOLDER_ID || '';
      if (!allowedFolderId || !(metadata.parents || []).includes(allowedFolderId)) {
        throw new StoryImageAssetReadError('ASSET_NOT_ALLOWED', 'ملف Drive ليس ضمن مجلد أصول صور ColorVerse.');
      }
      if (!metadata.mimeType.startsWith('image/')) {
        throw new StoryImageAssetReadError('ASSET_NOT_ALLOWED', 'الملف المحدد ليس صورة معتمدة.');
      }
      const downloaded = await driveClient.downloadFile(fileId);
      return {
        data: downloaded.data.toString('base64'),
        mimeType: downloaded.metadata.mimeType || asset.mimeType || 'image/png',
      };
    }

    if (!asset.storagePath || asset.storagePath.startsWith('memory:')) {
      throw new StoryImageAssetReadError('ASSET_NOT_FOUND', 'الأصل البصري غير متاح لإعادة التوليد.');
    }

    const data = await readFile(safeLocalPath(asset.storagePath));
    return { data: data.toString('base64'), mimeType: asset.mimeType || 'image/png' };
  } catch (error) {
    if (error instanceof StoryImageAssetReadError) throw error;
    const code = error && typeof error === 'object' && 'code' in error && String(error.code) === 'ENOENT'
      ? 'ASSET_NOT_FOUND'
      : 'ASSET_READ_FAILED';
    throw new StoryImageAssetReadError(code, 'تعذر قراءة الأصل البصري لإعادة التوليد.', error);
  }
}
