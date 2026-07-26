import type { StoryImageStorage, StoreStoryImageInput } from './story-image-storage';
import type { StoredStoryImageAsset } from './story-image-contract';
import { GoogleDriveClient, GoogleDriveNotConfiguredError } from './google-drive-client';

export type ColorVerseBookEdition = 'story' | 'coloring';
export type ColorVerseBookArtifactKind = 'review' | 'final' | 'manifest';

export interface ColorVerseDriveFolderConfig {
  rootFolderId: string;
  referenceLibraryFolderId: string;
  referenceCatalogFileId: string;
  referenceSemanticIndexFileId: string;
  generatedBooksRootFolderId: string;
  storyEditionFolderId: string;
  coloringEditionFolderId: string;
  imageAssetsFolderId: string;
  draftsAndReviewsFolderId: string;
  indexesFolderId: string;
}

export function colorVerseDriveFolders(): ColorVerseDriveFolderConfig {
  return {
    rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '',
    referenceLibraryFolderId: process.env.GOOGLE_DRIVE_REFERENCE_LIBRARY_FOLDER_ID || '',
    referenceCatalogFileId: process.env.GOOGLE_DRIVE_REFERENCE_CATALOG_FILE_ID || '',
    referenceSemanticIndexFileId: process.env.GOOGLE_DRIVE_REFERENCE_INDEX_FILE_ID || '',
    generatedBooksRootFolderId: process.env.GOOGLE_DRIVE_GENERATED_BOOKS_ROOT_ID || '',
    storyEditionFolderId: process.env.GOOGLE_DRIVE_STORY_EDITION_FOLDER_ID || '',
    coloringEditionFolderId: process.env.GOOGLE_DRIVE_COLORING_EDITION_FOLDER_ID || '',
    imageAssetsFolderId: process.env.GOOGLE_DRIVE_IMAGE_ASSETS_FOLDER_ID || '',
    draftsAndReviewsFolderId: process.env.GOOGLE_DRIVE_DRAFTS_FOLDER_ID || '',
    indexesFolderId: process.env.GOOGLE_DRIVE_INDEXES_FOLDER_ID || '',
  };
}

function extension(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'application/json') return 'json';
  return 'png';
}

function safeFileSegment(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'colorverse';
}

export function isGoogleDriveStorageConfigured(
  client: GoogleDriveClient = new GoogleDriveClient(),
  folders: ColorVerseDriveFolderConfig = colorVerseDriveFolders(),
): boolean {
  return client.configured && Boolean(
    folders.referenceLibraryFolderId
    && folders.referenceSemanticIndexFileId
    && folders.storyEditionFolderId
    && folders.coloringEditionFolderId
    && folders.imageAssetsFolderId
    && folders.draftsAndReviewsFolderId
    && folders.indexesFolderId,
  );
}

export class GoogleDriveStoryImageStorage implements StoryImageStorage {
  readonly client: GoogleDriveClient;
  readonly folderId: string;

  constructor(
    client: GoogleDriveClient = new GoogleDriveClient(),
    folderId: string = colorVerseDriveFolders().imageAssetsFolderId,
  ) {
    this.client = client;
    this.folderId = folderId;
  }

  async save(input: StoreStoryImageInput): Promise<StoredStoryImageAsset> {
    if (!this.client.configured || !this.folderId) throw new GoogleDriveNotConfiguredError();
    const scene = input.sceneNumber ? `scene-${String(input.sceneNumber).padStart(2, '0')}` : 'book';
    const fileName = [
      safeFileSegment(input.bookId),
      safeFileSegment(input.kind),
      scene,
      input.promptHash,
    ].join('-').replace(/-+/g, '-');
    const uploaded = await this.client.uploadFile({
      name: `${fileName}.${extension(input.image.mimeType)}`,
      mimeType: input.image.mimeType,
      parentId: this.folderId,
      data: input.image.data,
      appProperties: {
        colorverseBookId: input.bookId,
        colorverseAssetKind: input.kind,
        colorverseSceneNumber: String(input.sceneNumber ?? 0),
        colorversePromptHash: input.promptHash,
      },
    });

    return {
      kind: input.kind,
      sceneNumber: input.sceneNumber,
      url: `/api/drive/files/${uploaded.id}/content`,
      storagePath: `drive:${uploaded.id}`,
      mimeType: input.image.mimeType,
      width: input.image.width,
      height: input.image.height,
      promptHash: input.promptHash,
      model: input.image.model,
      createdAt: uploaded.createdTime || new Date().toISOString(),
      productionReady: input.productionReady ?? true,
    };
  }
}

export class GoogleDriveBookArchive {
  readonly client: GoogleDriveClient;
  readonly folders: ColorVerseDriveFolderConfig;

  constructor(
    client: GoogleDriveClient = new GoogleDriveClient(),
    folders: ColorVerseDriveFolderConfig = colorVerseDriveFolders(),
  ) {
    this.client = client;
    this.folders = folders;
  }

  private folderFor(edition: ColorVerseBookEdition, kind: ColorVerseBookArtifactKind): string {
    if (kind === 'manifest') return this.folders.indexesFolderId;
    if (kind === 'review') return this.folders.draftsAndReviewsFolderId;
    return edition === 'story'
      ? this.folders.storyEditionFolderId
      : this.folders.coloringEditionFolderId;
  }

  async saveArtifact(input: {
    bookId: string;
    edition: ColorVerseBookEdition;
    kind: ColorVerseBookArtifactKind;
    fileName: string;
    mimeType: string;
    data: Buffer | Uint8Array;
  }) {
    const parentId = this.folderFor(input.edition, input.kind);
    if (!this.client.configured || !parentId) throw new GoogleDriveNotConfiguredError();
    return this.client.uploadFile({
      name: safeFileSegment(input.fileName.replace(/\.[^.]+$/, '')) + `.${extension(input.mimeType)}`,
      mimeType: input.mimeType,
      parentId,
      data: input.data,
      appProperties: {
        colorverseBookId: input.bookId,
        colorverseEdition: input.edition,
        colorverseArtifactKind: input.kind,
      },
    });
  }

  async readReferenceCatalog<T = unknown>(): Promise<T> {
    if (!this.client.configured || !this.folders.referenceSemanticIndexFileId) {
      throw new GoogleDriveNotConfiguredError();
    }
    return this.client.readJsonFile<T>(this.folders.referenceSemanticIndexFileId);
  }

  async readReferenceSourceCatalog<T = unknown>(): Promise<T> {
    if (!this.client.configured || !this.folders.referenceCatalogFileId) {
      throw new GoogleDriveNotConfiguredError();
    }
    return this.client.readJsonFile<T>(this.folders.referenceCatalogFileId);
  }
}
