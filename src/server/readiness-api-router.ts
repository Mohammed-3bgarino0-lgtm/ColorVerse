import { Router } from 'express';
import { GoogleDriveClient } from '../lib/google-drive-client.js';
import { colorVerseDriveFolders } from '../lib/google-drive-storage.js';

export type ReadinessState = 'ready' | 'warning' | 'blocked';

interface ReadinessCheck {
  id: string;
  label: string;
  state: ReadinessState;
  message: string;
  requiredFor: Array<'story' | 'images' | 'drive' | 'pdf'>;
}

function bool(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function foldersConfigured(): { ok: boolean; missing: string[] } {
  const folders = colorVerseDriveFolders();
  const entries: Array<[string, string]> = [
    ['referenceLibraryFolderId', folders.referenceLibraryFolderId],
    ['referenceCatalogFileId', folders.referenceCatalogFileId],
    ['generatedBooksRootFolderId', folders.generatedBooksRootFolderId],
    ['storyEditionFolderId', folders.storyEditionFolderId],
    ['coloringEditionFolderId', folders.coloringEditionFolderId],
    ['imageAssetsFolderId', folders.imageAssetsFolderId],
    ['draftsAndReviewsFolderId', folders.draftsAndReviewsFolderId],
    ['indexesFolderId', folders.indexesFolderId],
  ];
  const missing = entries.filter(([, value]) => !value).map(([key]) => key);
  return { ok: missing.length === 0, missing };
}

export const readinessApiRouter = Router();

readinessApiRouter.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});

readinessApiRouter.get('/', (_request, response) => {
  const driveClient = new GoogleDriveClient();
  const driveFolders = foldersConfigured();
  const storyConfigured = bool(process.env.GEMINI_API_KEY) && bool(process.env.GEMINI_STORY_MODEL);
  const imagesConfigured = bool(process.env.GEMINI_API_KEY) && bool(process.env.GEMINI_IMAGE_MODEL);
  const driveCredentialsConfigured = driveClient.configured;

  const checks: ReadinessCheck[] = [
    {
      id: 'story-provider',
      label: 'محرك كتابة القصة',
      state: storyConfigured ? 'ready' : 'blocked',
      message: storyConfigured ? 'Gemini مضبوط لتوليد القصة.' : 'أضف GEMINI_API_KEY وGEMINI_STORY_MODEL على الخادم.',
      requiredFor: ['story'],
    },
    {
      id: 'image-provider',
      label: 'محرك الصور',
      state: imagesConfigured ? 'ready' : 'blocked',
      message: imagesConfigured ? 'Gemini مضبوط لإنتاج الصور الملونة والتلوين.' : 'أضف GEMINI_API_KEY وGEMINI_IMAGE_MODEL على الخادم.',
      requiredFor: ['images'],
    },
    {
      id: 'drive-credentials',
      label: 'اعتماد Google Drive',
      state: driveCredentialsConfigured ? 'ready' : 'warning',
      message: driveCredentialsConfigured ? 'بيانات حساب الخدمة موجودة.' : 'التخزين المحلي سيعمل، لكن الرفع التلقائي إلى Drive غير متاح.',
      requiredFor: ['drive'],
    },
    {
      id: 'drive-folders',
      label: 'مجلدات ColorVerse',
      state: driveFolders.ok ? 'ready' : 'blocked',
      message: driveFolders.ok ? 'كل معرّفات مجلدات ColorVerse موجودة.' : `معرّفات ناقصة: ${driveFolders.missing.join(', ')}`,
      requiredFor: ['drive'],
    },
    {
      id: 'parent-review',
      label: 'بوابة مراجعة ولي الأمر',
      state: 'ready',
      message: 'القصة لا تعتمد قبل مراجعة ولي الأمر.',
      requiredFor: ['story', 'pdf'],
    },
    {
      id: 'image-review',
      label: 'بوابة مراجعة الصور',
      state: 'ready',
      message: 'PDF النهائي وDrive مغلقان حتى اعتماد كل الأصول.',
      requiredFor: ['images', 'pdf', 'drive'],
    },
  ];

  const blocking = checks.filter((check) => check.state === 'blocked');
  const warnings = checks.filter((check) => check.state === 'warning');
  const productionReady = blocking.length === 0 && warnings.length === 0;
  const demoReady = checks.some((check) => check.id === 'parent-review' && check.state === 'ready');

  response.json({
    ok: true,
    service: 'colorverse-readiness',
    productionReady,
    demoReady,
    summary: productionReady
      ? 'جاهز للتجربة الإنتاجية الكاملة.'
      : blocking.length
        ? 'توجد إعدادات أساسية تمنع التشغيل الإنتاجي.'
        : 'جاهز للتجربة مع تنبيهات.',
    checks,
    counts: {
      ready: checks.filter((check) => check.state === 'ready').length,
      warning: warnings.length,
      blocked: blocking.length,
    },
    secretsExposed: false,
    timestamp: new Date().toISOString(),
  });
});
