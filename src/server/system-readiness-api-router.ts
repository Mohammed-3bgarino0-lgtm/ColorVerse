import { Router } from 'express';
import { GoogleDriveClient } from '../lib/google-drive-client.js';
import { colorVerseDriveFolders } from '../lib/google-drive-storage.js';

interface ReadinessCheck {
  id: string;
  label: string;
  ready: boolean;
  requiredFor: Array<'story' | 'images' | 'drive' | 'production'>;
  detail: string;
}

function has(value: string | undefined): boolean {
  return Boolean(String(value || '').trim());
}

function staticChecks(): ReadinessCheck[] {
  const folders = colorVerseDriveFolders();
  const driveClient = new GoogleDriveClient();
  return [
    {
      id: 'node-runtime',
      label: 'خادم Node',
      ready: Number(process.versions.node.split('.')[0]) >= 20,
      requiredFor: ['story', 'images', 'drive', 'production'],
      detail: `Node ${process.versions.node}`,
    },
    {
      id: 'gemini-key',
      label: 'مفتاح Gemini على الخادم',
      ready: has(process.env.GEMINI_API_KEY),
      requiredFor: ['story', 'images', 'production'],
      detail: has(process.env.GEMINI_API_KEY) ? 'مضبوط في بيئة الخادم' : 'غير مضبوط',
    },
    {
      id: 'story-model',
      label: 'نموذج كتابة القصص',
      ready: has(process.env.GEMINI_STORY_MODEL),
      requiredFor: ['story', 'production'],
      detail: process.env.GEMINI_STORY_MODEL || 'غير محدد',
    },
    {
      id: 'image-model',
      label: 'نموذج إنتاج الصور',
      ready: has(process.env.GEMINI_IMAGE_MODEL),
      requiredFor: ['images', 'production'],
      detail: process.env.GEMINI_IMAGE_MODEL || 'غير محدد',
    },
    {
      id: 'drive-credentials',
      label: 'بيانات اعتماد Google Drive',
      ready: driveClient.configured,
      requiredFor: ['drive', 'production'],
      detail: driveClient.configured ? 'حساب الخدمة مضبوط' : 'البريد والمفتاح الخاص غير مضبوطين',
    },
    {
      id: 'drive-reference-index',
      label: 'فهرس المراجع في Drive',
      ready: has(process.env.GOOGLE_DRIVE_REFERENCE_INDEX_FILE_ID),
      requiredFor: ['story', 'drive', 'production'],
      detail: process.env.GOOGLE_DRIVE_REFERENCE_INDEX_FILE_ID || 'غير محدد',
    },
    {
      id: 'drive-story-folder',
      label: 'مجلد نسخة القصة',
      ready: has(folders.storyEditionFolderId),
      requiredFor: ['drive', 'production'],
      detail: folders.storyEditionFolderId || 'غير محدد',
    },
    {
      id: 'drive-coloring-folder',
      label: 'مجلد نسخة التلوين',
      ready: has(folders.coloringEditionFolderId),
      requiredFor: ['drive', 'production'],
      detail: folders.coloringEditionFolderId || 'غير محدد',
    },
    {
      id: 'drive-assets-folder',
      label: 'مجلد أصول الصور',
      ready: has(folders.imageAssetsFolderId),
      requiredFor: ['images', 'drive', 'production'],
      detail: folders.imageAssetsFolderId || 'غير محدد',
    },
    {
      id: 'drive-indexes-folder',
      label: 'مجلد البيانات والفهارس',
      ready: has(folders.indexesFolderId),
      requiredFor: ['drive', 'production'],
      detail: folders.indexesFolderId || 'غير محدد',
    },
  ];
}

function groupReady(checks: ReadinessCheck[], group: ReadinessCheck['requiredFor'][number]): boolean {
  return checks.filter((check) => check.requiredFor.includes(group)).every((check) => check.ready);
}

export const systemReadinessApiRouter = Router();

systemReadinessApiRouter.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});

systemReadinessApiRouter.get('/readiness', (_request, response) => {
  const checks = staticChecks();
  response.json({
    ok: true,
    service: 'colorverse-system-readiness',
    checkedAt: new Date().toISOString(),
    modes: {
      demo: true,
      liveStory: groupReady(checks, 'story'),
      liveImages: groupReady(checks, 'images'),
      googleDrive: groupReady(checks, 'drive'),
      production: groupReady(checks, 'production'),
    },
    checks,
    notes: [
      'الوضع التجريبي لا يستهلك Gemini ولا يرفع ملفات إلى Drive.',
      'التشغيل الإنتاجي يحتاج خادم Node؛ GitHub Pages وحده لا يشغّل واجهات API.',
      'لا تُعرض المفاتيح أو بيانات الاعتماد في هذه الاستجابة.',
    ],
  });
});

systemReadinessApiRouter.post('/verify-drive', async (_request, response) => {
  const client = new GoogleDriveClient();
  const folders = colorVerseDriveFolders();
  if (!client.configured) {
    return response.status(503).json({
      ok: false,
      code: 'GOOGLE_DRIVE_NOT_CONFIGURED',
      error: 'بيانات اعتماد Google Drive غير مضبوطة على الخادم.',
    });
  }

  const targets = [
    ['root', folders.rootFolderId],
    ['references', folders.referenceLibraryFolderId],
    ['storyEdition', folders.storyEditionFolderId],
    ['coloringEdition', folders.coloringEditionFolderId],
    ['imageAssets', folders.imageAssetsFolderId],
    ['drafts', folders.draftsAndReviewsFolderId],
    ['indexes', folders.indexesFolderId],
  ] as const;

  try {
    const results = await Promise.all(targets.map(async ([key, id]) => {
      if (!id) return { key, id: '', ready: false, name: null };
      const metadata = await client.getFileMetadata(id);
      return { key, id, ready: true, name: metadata.name };
    }));
    return response.json({ ok: true, checkedAt: new Date().toISOString(), results });
  } catch (error) {
    console.error('[system/verify-drive]', error);
    return response.status(502).json({
      ok: false,
      code: 'GOOGLE_DRIVE_VERIFY_FAILED',
      error: 'تعذر التحقق المباشر من مجلدات Google Drive.',
    });
  }
});
