import { readFile } from 'node:fs/promises';

const files = {
  runtime: 'public/js/story-parent-review-runtime.js',
  client: 'public/js/story-ai-client.js',
  reviewPage: 'create-ai-review.html',
  integration: 'scripts/apply-story-studio-integration.mjs',
};

const entries = await Promise.all(
  Object.entries(files).map(async ([key, path]) => [key, await readFile(path, 'utf8')]),
);
const source = Object.fromEntries(entries);

// Parse browser scripts without executing them or contacting a provider.
new Function(source.runtime);
new Function(source.client);

const requiredRuntimeTokens = [
  'بناء القصة بالذكاء الاصطناعي',
  'مراجعة ولي الأمر',
  'cvParentApproval',
  'generatedStory',
  'originalityReport',
  'demoResult',
  'COLORVERSE_STORY_API_BASE_URL',
  'renderApprovedPreview',
];
for (const token of requiredRuntimeTokens) {
  if (!source.runtime.includes(token)) {
    throw new Error(`Parent review runtime is missing required token: ${token}`);
  }
}

const orderedScripts = [
  'public/js/story-studio-runtime.js',
  'public/js/story-ai-client.js',
  'public/js/story-parent-review-runtime.js',
];
let lastIndex = -1;
for (const script of orderedScripts) {
  const index = source.reviewPage.indexOf(script);
  if (index < 0) throw new Error(`Review page does not load: ${script}`);
  if (index <= lastIndex) throw new Error(`Review scripts are not loaded in the required order: ${script}`);
  lastIndex = index;
  if (!source.integration.includes(script)) {
    throw new Error(`Integration script does not connect: ${script}`);
  }
}

if (!source.runtime.includes("state.parentReview =")) {
  throw new Error('Parent approval metadata is not stored in the book draft.');
}
if (!source.runtime.includes('story.scenes.map')) {
  throw new Error('Generated scenes are not transferred to the editable book plan.');
}
if (!source.runtime.includes("mode === 'auto'")) {
  throw new Error('Automatic live-to-demo fallback is missing.');
}

console.log('Parent review runtime validation passed.');
