import { readFile } from 'node:fs/promises';

const paths = {
  page: 'image-review.html',
  runtime: 'public/js/story-image-review-runtime.js',
  css: 'public/css/image-review.css',
  client: 'public/js/story-image-client.js',
  production: 'public/js/story-image-production-runtime.js',
  pdfGate: 'public/js/book-image-review-gate-runtime.js',
  pdfPage: 'book-print-ai-review.html',
  driveBrowser: 'public/js/book-drive-archive-runtime.js',
  driveRouter: 'src/server/google-drive-api-router.ts',
  reviewRouter: 'src/server/story-image-review-api-router.ts',
  regeneration: 'src/lib/story-image-regeneration-service.ts',
  schema: 'src/lib/story-image-review-schema.ts',
};

const files = Object.fromEntries(await Promise.all(
  Object.entries(paths).map(async ([key, path]) => [key, await readFile(path, 'utf8')]),
));

for (const source of [files.runtime, files.client, files.production, files.pdfGate, files.driveBrowser]) {
  new Function(source);
}

for (const token of [
  'مراجعة صور الكتاب',
  'approveAll',
  'pairMatched',
  'إعادة توليد البطل',
  'إعادة توليد الغلاف',
  'إعادة توليد الصورة الملونة',
  'إعادة توليد صفحة التلوين',
]) {
  if (!files.page.includes(token) && !files.runtime.includes(token)) {
    throw new Error(`Visual review stage is missing required token: ${token}`);
  }
}

if (!files.client.includes("request('/api/story-images/regenerate'")) {
  throw new Error('Browser client does not call the single-asset regeneration endpoint.');
}
if (!files.reviewRouter.includes("post('/regenerate'")) {
  throw new Error('Single-asset regeneration API route is missing.');
}
for (const key of ['all-story-scenes', 'all-coloring-scenes', 'pair:']) {
  if (!files.regeneration.includes(key)) {
    throw new Error(`Regeneration approval invalidation is missing: ${key}`);
  }
}
if (!files.production.includes('image-review.html')) {
  throw new Error('Completed image production does not lead to visual review.');
}
if (!files.pdfPage.includes('book-image-review-gate-runtime.js')) {
  throw new Error('Book PDF page does not load the visual approval gate.');
}
for (const token of ['imageReview?.approved', 'اعتماد الصور مطلوب']) {
  if (!files.pdfGate.includes(token)) throw new Error(`PDF visual gate is missing: ${token}`);
}
for (const token of ['X-ColorVerse-Image-Approved', 'imageReview: value.imageReview']) {
  if (!files.driveBrowser.includes(token)) throw new Error(`Drive browser approval requirement is missing: ${token}`);
}
if (!files.driveRouter.includes("x-colorverse-image-approved")) {
  throw new Error('Drive server does not require visual approval for final PDFs.');
}
if (!files.schema.includes('isStoryImageReviewComplete')) {
  throw new Error('Visual review completion schema helper is missing.');
}
if (!files.css.includes('.scene-pair') || !files.css.includes('.approval-bar')) {
  throw new Error('Visual comparison layout styles are missing.');
}

console.log('Visual image review, single-asset regeneration, PDF gate, and Drive gate validation passed.');
