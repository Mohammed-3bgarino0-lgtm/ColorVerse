import express, { Router } from 'express';
import {
  GoogleDriveClient,
  GoogleDriveNotConfiguredError,
  GoogleDriveRequestError,
} from '../lib/google-drive-client.js';
import {
  colorVerseDriveFolders,
  GoogleDriveBookArchive,
  isGoogleDriveStorageConfigured,
  type ColorVerseBookArtifactKind,
  type ColorVerseBookEdition,
} from '../lib/google-drive-storage.js';

const client = new GoogleDriveClient();
const folders = colorVerseDriveFolders();
const archive = new GoogleDriveBookArchive(client, folders);
const pdfBody = express.raw({ type: 'application/pdf', limit: '80mb' });

function edition(value: string): ColorVerseBookEdition | null {
  return value === 'story' || value === 'coloring' ? value : null;
}

function artifactKind(value: string): ColorVerseBookArtifactKind | null {
  return value === 'review' || value === 'final' || value === 'manifest' ? value : null;
}

function safeName(value: unknown, fallback: string): string {
  const cleaned = String(value || fallback)
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 150);
  return cleaned || fallback;
}

function driveReady(): boolean {
  return isGoogleDriveStorageConfigured(client, folders);
}

function allowedParentIds(): Set<string> {
  return new Set([
    folders.referenceLibraryFolderId,
    folders.generatedBooksRootFolderId,
    folders.storyEditionFolderId,
    folders.coloringEditionFolderId,
    folders.imageAssetsFolderId,
    folders.draftsAndReviewsFolderId,
    folders.indexesFolderId,
  ].filter(Boolean));
}

function errorResponse(error: unknown): { status: number; body: Record<string, unknown> } {
  if (error instanceof GoogleDriveNotConfiguredError) {
    return {
      status: 503,
      body: {
        ok: false,
        code: 'GOOGLE_DRIVE_NOT_CONFIGURED',
        error: 'تخزين Google Drive غير مضبوط على الخادم بعد.',
      },
    };
  }
  if (error instanceof GoogleDriveRequestError) {
    return {
      status: error.status >= 400 && error.status < 600 ? error.status : 502,
      body: {
        ok: false,
        code: 'GOOGLE_DRIVE_REQUEST_FAILED',
        error: 'تعذر تنفيذ عملية التخزين على Google Drive.',
      },
    };
  }
  return {
    status: 500,
    body: {
      ok: false,
      code: 'GOOGLE_DRIVE_INTERNAL_ERROR',
      error: 'حدث خطأ غير متوقع أثناء التخزين.',
    },
  };
}

export const googleDriveApiRouter = Router();

googleDriveApiRouter.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});

googleDriveApiRouter.get('/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'colorverse-google-drive-storage',
    configured: driveReady(),
    roots: {
      references: Boolean(folders.referenceLibraryFolderId),
      storyEdition: Boolean(folders.storyEditionFolderId),
      coloringEdition: Boolean(folders.coloringEditionFolderId),
      imageAssets: Boolean(folders.imageAssetsFolderId),
      drafts: Boolean(folders.draftsAndReviewsFolderId),
      indexes: Boolean(folders.indexesFolderId),
    },
  });
});

googleDriveApiRouter.get('/references/catalog', async (_request, response) => {
  try {
    const catalog = await archive.readReferenceCatalog();
    return response.json({
      ok: true,
      source: 'google-drive',
      folderId: folders.referenceLibraryFolderId,
      catalogFileId: folders.referenceCatalogFileId,
      catalog,
    });
  } catch (error) {
    const mapped = errorResponse(error);
    return response.status(mapped.status).json(mapped.body);
  }
});

googleDriveApiRouter.get('/files/:fileId/content', async (request, response) => {
  try {
    if (!driveReady()) throw new GoogleDriveNotConfiguredError();
    const metadata = await client.getFileMetadata(request.params.fileId);
    const allowed = (metadata.parents || []).some((parent) => allowedParentIds().has(parent));
    if (!allowed) {
      return response.status(403).json({
        ok: false,
        code: 'DRIVE_FILE_NOT_ALLOWED',
        error: 'هذا الملف ليس ضمن مجلدات ColorVerse المعتمدة.',
      });
    }
    const downloaded = await client.downloadFile(metadata.id);
    response.setHeader('Content-Type', downloaded.metadata.mimeType || 'application/octet-stream');
    response.setHeader('Content-Length', String(downloaded.data.length));
    response.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(downloaded.metadata.name)}`);
    response.setHeader('Cache-Control', 'private, max-age=3600');
    return response.send(downloaded.data);
  } catch (error) {
    const mapped = errorResponse(error);
    return response.status(mapped.status).json(mapped.body);
  }
});

googleDriveApiRouter.post(
  '/books/:bookId/:edition/:kind',
  pdfBody,
  async (request, response) => {
    const selectedEdition = edition(request.params.edition);
    const selectedKind = artifactKind(request.params.kind);
    if (!selectedEdition || !selectedKind || selectedKind === 'manifest') {
      return response.status(400).json({
        ok: false,
        code: 'INVALID_DRIVE_ARTIFACT_ROUTE',
        error: 'نوع نسخة الكتاب أو الملف غير صحيح.',
      });
    }
    if (!Buffer.isBuffer(request.body) || request.body.length < 100) {
      return response.status(400).json({
        ok: false,
        code: 'EMPTY_PDF_FILE',
        error: 'ملف PDF فارغ أو غير صالح.',
      });
    }
    if (request.headers['x-colorverse-parent-approved'] !== 'true') {
      return response.status(403).json({
        ok: false,
        code: 'PARENT_APPROVAL_REQUIRED',
        error: 'لا يمكن أرشفة الكتاب قبل اعتماد ولي الأمر.',
      });
    }
    if (selectedKind === 'final' && request.headers['x-colorverse-image-approved'] !== 'true') {
      return response.status(403).json({
        ok: false,
        code: 'IMAGE_APPROVAL_REQUIRED',
        error: 'لا يمكن أرشفة النسخة النهائية قبل اعتماد جميع الصور.',
      });
    }

    try {
      const fallback = `ColorVerse-${request.params.bookId}-${selectedEdition}-${selectedKind}.pdf`;
      const fileName = safeName(request.query.fileName, fallback).replace(/\.pdf$/i, '') + '.pdf';
      const stored = await archive.saveArtifact({
        bookId: request.params.bookId,
        edition: selectedEdition,
        kind: selectedKind,
        fileName,
        mimeType: 'application/pdf',
        data: request.body,
      });
      return response.status(201).json({
        ok: true,
        file: {
          id: stored.id,
          name: stored.name,
          url: stored.webViewLink,
          parents: stored.parents,
        },
      });
    } catch (error) {
      const mapped = errorResponse(error);
      return response.status(mapped.status).json(mapped.body);
    }
  },
);

googleDriveApiRouter.post('/books/:bookId/manifest', async (request, response) => {
  try {
    if (!request.body || typeof request.body !== 'object') {
      return response.status(400).json({
        ok: false,
        code: 'INVALID_BOOK_MANIFEST',
        error: 'بيانات فهرس الكتاب غير صحيحة.',
      });
    }
    const editionValue = edition(String(request.body.edition || 'story')) || 'story';
    const fileName = `${safeName(request.params.bookId, 'book')}-manifest.json`;
    const stored = await archive.saveArtifact({
      bookId: request.params.bookId,
      edition: editionValue,
      kind: 'manifest',
      fileName,
      mimeType: 'application/json',
      data: Buffer.from(JSON.stringify(request.body, null, 2), 'utf8'),
    });
    return response.status(201).json({
      ok: true,
      file: { id: stored.id, name: stored.name, url: stored.webViewLink },
    });
  } catch (error) {
    const mapped = errorResponse(error);
    return response.status(mapped.status).json(mapped.body);
  }
});
