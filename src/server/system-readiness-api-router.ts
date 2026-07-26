import { Router } from 'express';
import { GoogleDriveClient } from '../lib/google-drive-client.js';
import { colorVerseDriveFolders } from '../lib/google-drive-storage.js';
import {
  isConfiguredEnvironmentValue,
  runtimeConfigurationSummary,
} from '../lib/runtime-configuration.js';

interface ReadinessCheck {
  id: string;
  label: string;
  ready: boolean;
  requiredFor: Array<'story' | 'images' | 'drive' | 'production'>;
  detail: string;
}

interface SmokeStep {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

function configured(value: unknown): boolean {
  return isConfiguredEnvironmentValue(value);
}

function staticChecks(): ReadinessCheck[] {
  const folders = colorVerseDriveFolders();
  const runtime = runtimeConfigurationSummary();
  return [
    {
      id: 'node-runtime',
      label: 'خادم Node',
      ready: Number(process.versions.node.split('.')[0]) >= 20,
      requiredFor: ['story', 'images', 'drive', 'production'],
      detail: `Node ${process.versions.node}`,
    },
    {
      id: 'runtime-mode',
      label: 'وضع التشغيل',
      ready: runtime.mode === 'production',
      requiredFor: ['production'],
      detail: runtime.mode === 'trial' ? 'تجريبي آمن — التكاليف والرفع مقفلان' : 'إنتاجي',
    },
    {
      id: 'live-ai-switch',
      label: 'مفتاح تشغيل الذكاء الاصطناعي',
      ready: runtime.liveAiEnabled,
      requiredFor: ['story', 'images', 'production'],
      detail: runtime.liveAiEnabled
        ? 'COLORVERSE_ENABLE_LIVE_AI=true'
        : 'مقفل أثناء التجربة؛ غيّره إلى true بعد إضافة المفتاح الحقيقي',
    },
    {
      id: 'gemini-key',
      label: 'مفتاح Gemini على الخادم',
      ready: runtime.geminiConfigured,
      requiredFor: ['story', 'images', 'production'],
      detail: runtime.geminiConfigured ? 'قيمة حقيقية مضبوطة' : 'فارغ أو قيمة تجريبية',
    },
    {
      id: 'story-model',
      label: 'نموذج كتابة القصص',
      ready: configured(process.env.GEMINI_STORY_MODEL),
      requiredFor: ['story', 'production'],
      detail: process.env.GEMINI_STORY_MODEL || 'غير محدد',
    },
    {
      id: 'image-model',
      label: 'نموذج إنتاج الصور',
      ready: configured(process.env.GEMINI_IMAGE_MODEL),
      requiredFor: ['images', 'production'],
      detail: process.env.GEMINI_IMAGE_MODEL || 'غير محدد',
    },
    {
      id: 'drive-write-switch',
      label: 'مفتاح الرفع إلى Drive',
      ready: runtime.driveWritesEnabled,
      requiredFor: ['drive', 'production'],
      detail: runtime.driveWritesEnabled
        ? 'COLORVERSE_ENABLE_DRIVE_WRITES=true'
        : 'مقفل أثناء التجربة؛ القراءة والفحص فقط متاحان',
    },
    {
      id: 'drive-credentials',
      label: 'بيانات اعتماد Google Drive',
      ready: runtime.driveCredentialsConfigured,
      requiredFor: ['drive', 'production'],
      detail: runtime.driveCredentialsConfigured ? 'حساب الخدمة مضبوط بقيم حقيقية' : 'فارغ أو قيم تجريبية',
    },
    {
      id: 'drive-reference-index',
      label: 'فهرس المراجع في Drive',
      ready: configured(process.env.GOOGLE_DRIVE_REFERENCE_INDEX_FILE_ID),
      requiredFor: ['story', 'drive', 'production'],
      detail: process.env.GOOGLE_DRIVE_REFERENCE_INDEX_FILE_ID || 'غير محدد',
    },
    {
      id: 'drive-story-folder',
      label: 'مجلد نسخة القصة',
      ready: configured(folders.storyEditionFolderId),
      requiredFor: ['drive', 'production'],
      detail: folders.storyEditionFolderId || 'غير محدد',
    },
    {
      id: 'drive-coloring-folder',
      label: 'مجلد نسخة التلوين',
      ready: configured(folders.coloringEditionFolderId),
      requiredFor: ['drive', 'production'],
      detail: folders.coloringEditionFolderId || 'غير محدد',
    },
    {
      id: 'drive-assets-folder',
      label: 'مجلد أصول الصور',
      ready: configured(folders.imageAssetsFolderId),
      requiredFor: ['images', 'drive', 'production'],
      detail: folders.imageAssetsFolderId || 'غير محدد',
    },
    {
      id: 'drive-indexes-folder',
      label: 'مجلد البيانات والفهارس',
      ready: configured(folders.indexesFolderId),
      requiredFor: ['drive', 'production'],
      detail: folders.indexesFolderId || 'غير محدد',
    },
  ];
}

function groupReady(checks: ReadinessCheck[], group: ReadinessCheck['requiredFor'][number]): boolean {
  return checks.filter((check) => check.requiredFor.includes(group)).every((check) => check.ready);
}

function smokeSteps(): SmokeStep[] {
  const demoScenes = Array.from({ length: 8 }, (_, index) => ({
    sceneNumber: index + 1,
    title: `المشهد ${index + 1}`,
    storyText: `نص تجريبي أصلي للمشهد ${index + 1}.`,
    dialogue: index % 2 ? ['حوار قصير مناسب للطفل.'] : [],
    illustrationPrompt: `Original story illustration ${index + 1}`,
    coloringPrompt: `Matching clean line art ${index + 1}`,
  }));
  const story = { title: 'رحلة النجمة الزرقاء', scenes: demoScenes };
  const generatedImages = Object.fromEntries(demoScenes.map((scene) => [String(scene.sceneNumber), {
    story: { url: `/demo/story-${scene.sceneNumber}.webp`, productionReady: false },
    coloring: { url: `/demo/coloring-${scene.sceneNumber}.webp`, productionReady: false },
  }]));
  const parentReview = { approved: true, reviewedSceneCount: 8 };
  const imageReview = { approved: false };

  return [
    { id: 'story-shape', label: 'بنية القصة', passed: story.scenes.length === 8 && story.scenes.every((scene) => scene.storyText && scene.illustrationPrompt && scene.coloringPrompt), detail: 'قصة تجريبية من 8 مشاهد بعقود النص والصورة والتلوين.' },
    { id: 'parent-gate', label: 'اعتماد ولي الأمر', passed: parentReview.approved && parentReview.reviewedSceneCount === story.scenes.length, detail: 'لا تنتقل القصة للصور قبل اعتماد النصوص.' },
    { id: 'two-editions', label: 'نسختان منفصلتان', passed: Object.values(generatedImages).every((pair) => pair.story.url && pair.coloring.url), detail: 'كل مشهد يملك صورة قصة ورسمة تلوين مستقلة.' },
    { id: 'coloring-policy', label: 'حماية نسخة التلوين', passed: story.scenes.every((scene) => !/نص القصة|حوار داخل الصورة|page number/i.test(scene.coloringPrompt)), detail: 'بيانات التلوين منفصلة ولا تضيف نص القصة إلى الصفحة.' },
    { id: 'image-gate', label: 'بوابة اعتماد الصور', passed: imageReview.approved === false, detail: 'PDF النهائي يبقى مغلقًا في الاختبار حتى اعتماد الأصول.' },
    { id: 'drive-separation', label: 'فصل مجلدات Drive', passed: colorVerseDriveFolders().storyEditionFolderId !== colorVerseDriveFolders().coloringEditionFolderId, detail: 'نسخة القصة ونسخة التلوين تستخدمان مجلدين مختلفين.' },
  ];
}

export const systemReadinessApiRouter = Router();

systemReadinessApiRouter.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});

systemReadinessApiRouter.get('/readiness', (_request, response) => {
  const checks = staticChecks();
  const runtime = runtimeConfigurationSummary();
  response.json({
    ok: true,
    service: 'colorverse-system-readiness',
    checkedAt: new Date().toISOString(),
    runtime,
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
      'القيم CHANGE_AFTER_TRIAL وCHANGE_ME وREPLACE_ME لا تُعامل كبيانات اعتماد حقيقية.',
      'التشغيل الإنتاجي يحتاج خادم Node؛ GitHub Pages وحده لا يشغّل واجهات API.',
      'لا تُعرض المفاتيح أو بيانات الاعتماد في هذه الاستجابة.',
    ],
  });
});

systemReadinessApiRouter.post('/smoke-test', (_request, response) => {
  const steps = smokeSteps();
  const passed = steps.filter((step) => step.passed).length;
  response.json({
    ok: passed === steps.length,
    mode: 'safe-local-contract-test',
    externalCalls: false,
    geminiConsumed: false,
    driveWrites: false,
    passed,
    total: steps.length,
    steps,
    checkedAt: new Date().toISOString(),
  });
});

systemReadinessApiRouter.post('/verify-drive', async (_request, response) => {
  const client = new GoogleDriveClient();
  const folders = colorVerseDriveFolders();
  if (!client.configured) {
    return response.status(503).json({ ok: false, code: 'GOOGLE_DRIVE_NOT_CONFIGURED', error: 'بيانات اعتماد Google Drive غير مضبوطة بقيم حقيقية على الخادم.' });
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
    return response.status(502).json({ ok: false, code: 'GOOGLE_DRIVE_VERIFY_FAILED', error: 'تعذر التحقق المباشر من مجلدات Google Drive.' });
  }
});
