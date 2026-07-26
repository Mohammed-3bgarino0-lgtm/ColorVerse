import { readFile } from 'node:fs/promises';

const paths = {
  html: 'book-print-ai-review.html',
  runtime: 'public/js/book-print-v3-runtime.js',
  css: 'public/css/book-print-v3.css',
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
  'illustrationPrompt',
  'coloringPrompt',
  'PDF النهائي',
  'PDF للمراجعة',
  'missingStoryImages',
  'missingColoringImages',
]) {
  if (!files.runtime.includes(token) && !files.html.includes(token)) {
    throw new Error(`Book print stage is missing required token: ${token}`);
  }
}

if (!files.html.includes('book-print-v3-runtime.js')) {
  throw new Error('Book print review page does not load its runtime.');
}
if (!files.html.includes('book-print-v3.css')) {
  throw new Error('Book print review page does not load its stylesheet.');
}
if (!files.css.includes('@page{size:A4 portrait')) {
  throw new Error('A4 print page rule is missing.');
}
if (!files.runtime.includes("if (!isParentApproved())")) {
  throw new Error('PDF generation is not blocked before parent approval.');
}
if (!files.runtime.includes("$('#finalPdfBtn').disabled = !readiness.finalReady")) {
  throw new Error('Final PDF readiness gate is missing.');
}
if (!files.linkRuntime.includes('book-print-ai-review.html')) {
  throw new Error('Approved preview is not redirected to the reviewed book template.');
}

console.log('Book print review validation passed.');
