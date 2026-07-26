import { readFile } from 'node:fs/promises';
import process from 'node:process';

const catalogPath = new URL('../public/data/story-references.json', import.meta.url);
const raw = await readFile(catalogPath, 'utf8');
const catalog = JSON.parse(raw);
const errors = [];
const warnings = [];

function requiredString(value, path) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${path} must be a non-empty string.`);
  }
}

function requiredStringArray(value, path, minimum = 1) {
  if (!Array.isArray(value) || value.length < minimum) {
    errors.push(`${path} must contain at least ${minimum} item(s).`);
    return;
  }

  value.forEach((item, index) => requiredString(item, `${path}[${index}]`));
}

if (!Number.isInteger(catalog.version) || catalog.version < 2) {
  errors.push('catalog.version must be an integer >= 2.');
}

if (!Array.isArray(catalog.references)) {
  errors.push('catalog.references must be an array.');
} else {
  const ids = new Set();

  catalog.references.forEach((reference, index) => {
    const base = `references[${index}]`;
    requiredString(reference.id, `${base}.id`);
    requiredString(reference.title, `${base}.title`);
    requiredString(reference.language, `${base}.language`);
    requiredString(reference.moral, `${base}.moral`);
    requiredString(reference.summary, `${base}.summary`);
    requiredStringArray(reference.categories, `${base}.categories`);
    requiredStringArray(reference.topics, `${base}.topics`, 2);
    requiredStringArray(reference.keywords, `${base}.keywords`, 2);
    requiredStringArray(reference.structure, `${base}.structure`, 5);

    if (ids.has(reference.id)) errors.push(`Duplicate reference id: ${reference.id}`);
    ids.add(reference.id);

    const min = reference.ageRange?.min;
    const max = reference.ageRange?.max;
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 3 || max > 14 || min > max) {
      errors.push(`${base}.ageRange must be a valid range between 3 and 14.`);
    }

    const style = reference.styleFingerprint ?? {};
    for (const field of ['narration', 'dialogue', 'pacing', 'illustrationRhythm', 'ending']) {
      requiredString(style[field], `${base}.styleFingerprint.${field}`);
    }

    const rules = reference.originalityRules ?? {};
    for (const field of [
      'reuseText',
      'reuseNames',
      'reuseSetting',
      'reuseSceneSequence',
      'reuseIllustrations',
    ]) {
      if (rules[field] !== false) {
        errors.push(`${base}.originalityRules.${field} must be false.`);
      }
    }
    requiredStringArray(rules.allowedInfluence, `${base}.originalityRules.allowedInfluence`);

    if (!reference.sourceMetadata?.internalOnly) {
      warnings.push(`${reference.id}: sourceMetadata.internalOnly is not true.`);
    }

    const normalizedTerms = [...reference.topics, ...reference.keywords].map((item) =>
      String(item).trim().toLowerCase(),
    );
    if (new Set(normalizedTerms).size !== normalizedTerms.length) {
      warnings.push(`${reference.id}: duplicate topic/keyword terms detected.`);
    }
  });
}

if (warnings.length) {
  console.warn('\nStory catalog warnings:');
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (errors.length) {
  console.error('\nStory catalog validation failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Story catalog valid: ${catalog.references.length} reference(s), schema version ${catalog.version}.`,
);
