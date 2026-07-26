import { readFile } from 'node:fs/promises';

const paths = {
  editionMode: 'public/js/story-edition-mode-runtime.js',
  imageClient: 'public/js/story-image-client.js',
  productionRuntime: 'public/js/story-image-production-runtime.js',
  pdfRuntime: 'public/js/book-print-v3-runtime.js',
  reviewPage: 'create-ai-review.html',
  pdfPage: 'book-print-ai-review.html',
  editionCss: 'public/css/book-editions-v4.css',
  promptBuilder: 'src/lib/story-image-prompt-builder.ts',
  apiRouter: 'src/server/story-image-api-router.ts',
};
const files = Object.fromEntries(await Promise.all(
  Object.entries(paths).map(async ([key, path]) => [key, await readFile(path, 'utf8')]),
));

new Function(files.editionMode);
new Function(files.imageClient);
new Function(files.productionRuntime);
new Function(files.pdfRuntime);

for (const token of [
  'إنتاج نسختين منفصلتين',
  'نسختان منفصلتان دائمًا',
  'نسخة القصة',
  'نسخة التلوين',
  'coloringHasNarrativeText: false',
  'story-edition-mode-runtime.js',
  'story-image-client.js',
  'story-image-production-runtime.js',
]) {
  if (!Object.values(files).some((source) => source.includes(token))) {
    throw new Error(`Two-edition image stage is missing required token: ${token}`);
  }
}

const orderedReviewScripts = [
  'story-parent-review-runtime.js',
  'story-edition-mode-runtime.js',
  'story-image-client.js',
  'story-image-production-runtime.js',
  'story-pdf-link-runtime.js',
];
let previous = -1;
for (const script of orderedReviewScripts) {
  const index = files.reviewPage.indexOf(script);
  if (index < 0 || index <= previous) {
    throw new Error(`Review page does not load image runtimes in order: ${script}`);
  }
  previous = index;
}

if (!files.editionMode.includes('value="نسختان منفصلتان"')) {
  throw new Error('Legacy mixed output controls are not replaced with separate editions.');
}
if (!files.promptBuilder.includes('ABSOLUTELY NO story text')) {
  throw new Error('Coloring prompt does not explicitly prohibit narrative text.');
}
for (const forbiddenRequirement of ['speech bubble', 'letters', 'numbers', 'page number']) {
  if (!files.promptBuilder.includes(forbiddenRequirement)) {
    throw new Error(`Coloring prompt does not prohibit: ${forbiddenRequirement}`);
  }
}

const coloringStart = files.pdfRuntime.indexOf('function buildColoringEdition');
const coloringEnd = files.pdfRuntime.indexOf('function buildBook', coloringStart);
if (coloringStart < 0 || coloringEnd < 0) throw new Error('Coloring edition renderer is missing.');
const coloringRenderer = files.pdfRuntime.slice(coloringStart, coloringEnd);
for (const forbiddenToken of ['scene.title', 'scene.storyText', 'dialogueMarkup(', 'page-num', 'scene-chip']) {
  if (coloringRenderer.includes(forbiddenToken)) {
    throw new Error(`Coloring interior contains forbidden narrative UI token: ${forbiddenToken}`);
  }
}

if (!files.pdfRuntime.includes("get('edition') === 'coloring'")) {
  throw new Error('PDF runtime does not switch editions through the URL.');
}
if (!files.pdfRuntime.includes('productionReady')) {
  throw new Error('Final PDF is not gated by production-ready assets.');
}
if (!files.pdfPage.includes('?edition=story') || !files.pdfPage.includes('?edition=coloring')) {
  throw new Error('PDF page does not expose both edition tabs.');
}
if (!files.editionCss.includes('.coloring-only-art')) {
  throw new Error('Text-free coloring page layout is missing.');
}
for (const route of ["post('/jobs'", "get('/jobs/:jobId'", "delete('/jobs/:jobId'"]) {
  if (!files.apiRouter.includes(route)) throw new Error(`Image API route is missing: ${route}`);
}

console.log('Two-edition story image and text-free coloring runtime validation passed.');
