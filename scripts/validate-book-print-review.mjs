import { readFile } from 'node:fs/promises';

const paths = {
  html: 'book-print-ai-review.html',
  runtime: 'public/js/book-print-v3-runtime.js',
  css: 'public/css/book-print-v3.css',
  editionCss: 'public/css/book-editions-v4.css',
  linkRuntime: 'public/js/story-pdf-link-runtime.js',
};
const files = Object.fromEntries(await Promise.all(
  Object.entries(paths).map(async ([key, path]) => [key, await readFile(path, 'utf8')]),
));

new Function(files.runtime);
new Function(files.linkRuntime);

for (const token of [
  'generatedStory',
  'parentReview?.approved',
  'buildStoryEdition',
  'buildColoringEdition',
  'productionReady',
  'PDF القصة النهائي',
  'PDF التلوين النهائي',
  "get('edition') === 'coloring'",
]) {
  if (!files.runtime.includes(token) && !files.html.includes(token)) {
    throw new Error(`Book print stage is missing required token: ${token}`);
  }
}

if (!files.html.includes('book-print-v3-runtime.js')) {
  throw new Error('Book print review page does not load its runtime.');
}
if (!files.html.includes('book-print-v3.css') || !files.html.includes('book-editions-v4.css')) {
  throw new Error('Book print review page does not load both print stylesheets.');
}
if (!files.css.includes('@page{size:A4 portrait')) {
  throw new Error('A4 print page rule is missing.');
}
if (!files.runtime.includes('if (!approved())')) {
  throw new Error('PDF generation is not blocked before parent approval.');
}
if (!files.runtime.includes("$('#finalPdfBtn').disabled = !state.finalReady")) {
  throw new Error('Edition-specific final PDF readiness gate is missing.');
}
if (!files.linkRuntime.includes('book-print-ai-review.html?edition=story')) {
  throw new Error('Default approved preview is not redirected to the story edition.');
}
if (!files.html.includes('?edition=story') || !files.html.includes('?edition=coloring')) {
  throw new Error('Book template does not expose both edition tabs.');
}
if (!files.editionCss.includes('.coloring-only-art')) {
  throw new Error('Text-free coloring edition layout is missing.');
}

console.log('Separate story and coloring book print validation passed.');
