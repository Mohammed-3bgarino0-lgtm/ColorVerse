import { readFile } from 'node:fs/promises';

const paths = {
  env: '.env.example',
  client: 'src/lib/google-drive-client.ts',
  storage: 'src/lib/google-drive-storage.ts',
  factory: 'src/lib/story-image-storage-factory.ts',
  router: 'src/server/google-drive-api-router.ts',
  server: 'server.ts',
  browser: 'public/js/book-drive-archive-runtime.js',
  page: 'book-print-ai-review.html',
};

const files = Object.fromEntries(await Promise.all(
  Object.entries(paths).map(async ([key, path]) => [key, await readFile(path, 'utf8')]),
));

new Function(files.browser);

const requiredEnv = [
  'GOOGLE_DRIVE_ROOT_FOLDER_ID=1YuDr40M0bUeIiscayhIfPLWvuJ8uYdlO',
  'GOOGLE_DRIVE_REFERENCE_LIBRARY_FOLDER_ID=1rTIbIYwA9JtI0Ls8q9am-pag6Ca8PfCu',
  'GOOGLE_DRIVE_REFERENCE_CATALOG_FILE_ID=1D-fWm8J_X0RETu-KgatsoAVUOOkOXLSK',
  'GOOGLE_DRIVE_STORY_EDITION_FOLDER_ID=107zjrQY0tgrCMUMAH8c2onaZEMMaTd_y',
  'GOOGLE_DRIVE_COLORING_EDITION_FOLDER_ID=15TQ-A6BfjiN1eKyRg2r_tWU2ltZWwYIc',
  'GOOGLE_DRIVE_IMAGE_ASSETS_FOLDER_ID=1FHD5BQAixH2cIhlsIC54uBI-aLYwy0vm',
  'GOOGLE_DRIVE_DRAFTS_FOLDER_ID=1SAFqnb0vGIb-nlz1a2wgUQR8-iyNbDg0',
  'GOOGLE_DRIVE_INDEXES_FOLDER_ID=1hcd7BP2Vz_eCCs9S7tBg6K2z8Vu5q3KA',
  'GOOGLE_DRIVE_CONFIG_FILE_ID=1BpxVV3rqTgSw3DyrZ8phd8wdleNV46jY',
];
for (const token of requiredEnv) {
  if (!files.env.includes(token)) throw new Error(`Drive environment mapping is missing: ${token}`);
}

const storyId = /GOOGLE_DRIVE_STORY_EDITION_FOLDER_ID=([^\n]+)/.exec(files.env)?.[1]?.trim();
const coloringId = /GOOGLE_DRIVE_COLORING_EDITION_FOLDER_ID=([^\n]+)/.exec(files.env)?.[1]?.trim();
if (!storyId || !coloringId || storyId === coloringId) {
  throw new Error('Story and coloring editions must use two distinct Google Drive folders.');
}

for (const token of [
  'class GoogleDriveClient',
  'uploadFile(',
  'downloadFile(',
  'readJsonFile',
  'GOOGLE_DRIVE_CLIENT_EMAIL',
  'GOOGLE_DRIVE_PRIVATE_KEY',
]) {
  if (!files.client.includes(token)) throw new Error(`Google Drive client is missing: ${token}`);
}

for (const token of [
  'GoogleDriveStoryImageStorage',
  'GoogleDriveBookArchive',
  'storyEditionFolderId',
  'coloringEditionFolderId',
  'referenceCatalogFileId',
]) {
  if (!files.storage.includes(token)) throw new Error(`Google Drive storage adapter is missing: ${token}`);
}

if (!files.factory.includes("type: 'google-drive'")) {
  throw new Error('Image storage does not switch to Google Drive when configured.');
}
for (const route of [
  "get('/references/catalog'",
  "get('/files/:fileId/content'",
  "'/books/:bookId/:edition/:kind'",
  "post('/books/:bookId/manifest'",
]) {
  if (!files.router.includes(route)) throw new Error(`Google Drive API route is missing: ${route}`);
}
if (!files.server.includes("app.use('/api/drive', googleDriveApiRouter)")) {
  throw new Error('Google Drive API router is not mounted on the server.');
}
for (const token of [
  'حفظ في Drive',
  'X-ColorVerse-Parent-Approved',
  '/api/drive/books/',
  '/manifest',
]) {
  if (!files.browser.includes(token)) throw new Error(`Drive archive browser runtime is missing: ${token}`);
}
if (!files.page.includes('book-drive-archive-runtime.js')) {
  throw new Error('Book preview does not load the Google Drive archive runtime.');
}

console.log('Google Drive reference, image, and two-edition book storage validation passed.');
