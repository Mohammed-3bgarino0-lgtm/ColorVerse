import { readFile } from 'node:fs/promises';

const runtimePath = 'public/js/story-studio-runtime.js';
const catalogPath = 'public/data/story-references.json';

const [runtime, catalogText] = await Promise.all([
  readFile(runtimePath, 'utf8'),
  readFile(catalogPath, 'utf8'),
]);

const requiredRuntimeTokens = [
  'CATALOG_URL',
  'rankedReferences',
  'chooseDynamicReference',
  'preservedChildIdeas',
  'editorContributions',
  'originalityPolicy',
  'ColorVerseStoryStudio',
];

for (const token of requiredRuntimeTokens) {
  if (!runtime.includes(token)) {
    throw new Error(`Story studio runtime is missing required token: ${token}`);
  }
}

const catalog = JSON.parse(catalogText);
if (!Array.isArray(catalog.references) || catalog.references.length === 0) {
  throw new Error('Story reference catalog must contain at least one reference.');
}

for (const reference of catalog.references) {
  if (!reference.id || !reference.title || !reference.moral) {
    throw new Error('Every story reference requires id, title, and moral.');
  }
  if (reference.originalityRules?.reuseText !== false ||
      reference.originalityRules?.reuseNames !== false ||
      reference.originalityRules?.reuseSceneSequence !== false) {
    throw new Error(`Reference ${reference.id} violates originality policy.`);
  }
}

console.log(`[ColorVerse] Story studio runtime is valid. References: ${catalog.references.length}`);
