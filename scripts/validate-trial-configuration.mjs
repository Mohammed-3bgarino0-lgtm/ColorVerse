import { readFile } from 'node:fs/promises';

const paths = {
  env: '.env.example',
  package: 'package.json',
  runtimeConfig: 'src/lib/runtime-configuration.ts',
  guard: 'src/server/trial-mode-guard.ts',
  server: 'server.ts',
  readinessPage: 'system-readiness.html',
  readinessRuntime: 'public/js/system-readiness-runtime.js',
  trialDraft: 'public/data/colorverse-trial-draft.json',
};

const files = Object.fromEntries(await Promise.all(
  Object.entries(paths).map(async ([key, path]) => [key, await readFile(path, 'utf8')]),
));

new Function(files.readinessRuntime);
const packageJson = JSON.parse(files.package);
const trialDraft = JSON.parse(files.trialDraft);

for (const token of [
  'COLORVERSE_RUNTIME_MODE=trial',
  'COLORVERSE_ENABLE_LIVE_AI=false',
  'COLORVERSE_ENABLE_DRIVE_WRITES=false',
  'GEMINI_API_KEY=',
  'GOOGLE_DRIVE_CLIENT_EMAIL=',
  'GOOGLE_DRIVE_PRIVATE_KEY=',
  'GOOGLE_DRIVE_ROOT_FOLDER_ID=1YuDr40M0bUeIiscayhIfPLWvuJ8uYdlO',
]) {
  if (!files.env.includes(token)) throw new Error(`Trial environment token is missing: ${token}`);
}

for (const forbidden of [
  /GEMINI_API_KEY=\S{8,}/,
  /GOOGLE_DRIVE_PRIVATE_KEY=.+BEGIN PRIVATE KEY/,
  /GOOGLE_DRIVE_CLIENT_EMAIL=.+@.+\.iam\.gserviceaccount\.com/,
]) {
  if (forbidden.test(files.env)) throw new Error('A real credential appears to be present in .env.example.');
}

for (const token of [
  'isConfiguredEnvironmentValue',
  'liveAiEnabled',
  'driveWritesEnabled',
  'CHANGE_AFTER_TRIAL',
]) {
  if (!files.runtimeConfig.includes(token)) throw new Error(`Runtime configuration protection is missing: ${token}`);
}

for (const token of ['LIVE_AI_DISABLED_FOR_TRIAL', 'DRIVE_WRITES_DISABLED_FOR_TRIAL']) {
  if (!files.guard.includes(token)) throw new Error(`Trial guard is missing: ${token}`);
}
for (const token of [
  "app.use('/api/stories/generate', liveAiTrialGuard)",
  "app.use('/api/story-images/jobs', liveAiTrialGuard)",
  "app.use('/api/story-images/regenerate', liveAiTrialGuard)",
  "app.use('/api/drive/books', driveWriteTrialGuard)",
]) {
  if (!files.server.includes(token)) throw new Error(`Server trial guard is not mounted: ${token}`);
}

if (trialDraft.trialData !== true || trialDraft.generatedStory?.scenes?.length !== 8) {
  throw new Error('Trial draft must contain exactly eight safe demo scenes.');
}
if (trialDraft.imageGeneration?.productionReady !== false || trialDraft.imageReview?.approved !== false) {
  throw new Error('Trial draft must not be production-ready or visually approved.');
}
for (const pair of Object.values(trialDraft.generatedImages || {})) {
  if (pair.story?.productionReady !== false || pair.coloring?.productionReady !== false) {
    throw new Error('Every trial image must remain non-production-ready.');
  }
}

for (const token of ['loadTrialBtn', 'تحميل بيانات التجربة']) {
  if (!files.readinessPage.includes(token) && !files.readinessRuntime.includes(token)) {
    throw new Error(`Trial dashboard control is missing: ${token}`);
  }
}
if (!files.readinessRuntime.includes('colorverse-trial-draft.json')) {
  throw new Error('Trial data loader does not use the prepared draft.');
}

for (const script of ['setup:trial', 'start:trial', 'validate:trial-config']) {
  if (!packageJson.scripts?.[script]) throw new Error(`Package script is missing: ${script}`);
}

console.log('Safe trial profile, editable environment, prepared draft, and production guards validation passed.');
