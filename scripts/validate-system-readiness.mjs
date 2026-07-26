import { readFile } from 'node:fs/promises';

const paths = {
  page: 'system-readiness.html',
  runtime: 'public/js/system-readiness-runtime.js',
  style: 'public/css/system-readiness.css',
  router: 'src/server/system-readiness-api-router.ts',
  server: 'server.ts',
  readiness: 'src/lib/book-production-readiness.ts',
};

const files = Object.fromEntries(await Promise.all(
  Object.entries(paths).map(async ([key, path]) => [key, await readFile(path, 'utf8')]),
));

new Function(files.runtime);

for (const token of [
  'جاهزية ColorVerse',
  'verifyDriveBtn',
  '/api/system/readiness',
  '/api/system/verify-drive',
]) {
  if (!files.page.includes(token) && !files.runtime.includes(token)) {
    throw new Error(`System readiness dashboard is missing: ${token}`);
  }
}

for (const token of [
  "get('/readiness'",
  "post('/verify-drive'",
  'GEMINI_API_KEY',
  'GOOGLE_DRIVE_REFERENCE_INDEX_FILE_ID',
  'production',
]) {
  if (!files.router.includes(token)) throw new Error(`System readiness API is missing: ${token}`);
}

if (!files.server.includes("app.use('/api/system', systemReadinessApiRouter)")) {
  throw new Error('System readiness API is not mounted on the Node server.');
}

for (const token of [
  'evaluateBookProductionReadiness',
  'IMAGE_REVIEW_REQUIRED',
  'STORY_IMAGES_INCOMPLETE',
  'COLORING_IMAGES_INCOMPLETE',
  'driveArchiveReady',
]) {
  if (!files.readiness.includes(token)) throw new Error(`Unified production gate is missing: ${token}`);
}

for (const forbidden of ['GOOGLE_DRIVE_PRIVATE_KEY=', 'GEMINI_API_KEY=']) {
  if (files.runtime.includes(forbidden) || files.page.includes(forbidden)) {
    throw new Error(`Browser readiness files expose a secret setting name/value pair: ${forbidden}`);
  }
}

if (!files.style.includes('.overall.good') || !files.style.includes('.mode-card.warning')) {
  throw new Error('Readiness dashboard success and warning states are missing.');
}

console.log('System readiness dashboard and unified production gate validation passed.');
