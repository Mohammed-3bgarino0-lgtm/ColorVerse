import type { StoryReference } from './story-reference-library';

export interface StoryReferenceCatalog {
  version: number;
  updatedAt?: string;
  usagePolicy: {
    purpose: string;
    allowed: string[];
    forbidden: string[];
  };
  selection?: {
    modes?: string[];
    autoReferenceStrategy?: string;
    recentReferenceHistoryLimit?: number;
  };
  references: StoryReference[];
}

export class StoryCatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoryCatalogError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new StoryCatalogError(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new StoryCatalogError(`${field} must be an array of strings.`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

function storyLanguage(value: unknown, field: string): StoryReference['language'] {
  if (value === 'ar' || value === 'en' || value === 'bilingual') return value;
  throw new StoryCatalogError(`${field} must be ar, en, or bilingual.`);
}

function sourceType(
  value: unknown,
): NonNullable<StoryReference['sourceMetadata']>['sourceType'] {
  if (value === 'pdf' || value === 'docx' || value === 'text' || value === 'manual') {
    return value;
  }
  return 'manual';
}

function parseReference(value: unknown, index: number): StoryReference {
  if (!isRecord(value)) {
    throw new StoryCatalogError(`references[${index}] must be an object.`);
  }

  const base = `references[${index}]`;
  const id = requiredString(value.id, `${base}.id`);
  const title = requiredString(value.title, `${base}.title`);
  const language = storyLanguage(value.language, `${base}.language`);
  const moral = requiredString(value.moral, `${base}.moral`);
  const summary = requiredString(value.summary, `${base}.summary`);

  if (!isRecord(value.ageRange)) {
    throw new StoryCatalogError(`${base}.ageRange is required.`);
  }

  const min = value.ageRange.min;
  const max = value.ageRange.max;
  if (!isInteger(min) || !isInteger(max) || min > max) {
    throw new StoryCatalogError(`${base}.ageRange is invalid.`);
  }

  if (!isRecord(value.styleFingerprint) || !isRecord(value.originalityRules)) {
    throw new StoryCatalogError(
      `${base} requires styleFingerprint and originalityRules.`,
    );
  }

  const style = value.styleFingerprint;
  const rules = value.originalityRules;
  for (const field of [
    'reuseText',
    'reuseNames',
    'reuseSetting',
    'reuseSceneSequence',
    'reuseIllustrations',
  ]) {
    if (rules[field] !== false) {
      throw new StoryCatalogError(
        `${base}.originalityRules.${field} must be false.`,
      );
    }
  }

  return {
    id,
    title,
    language,
    ageRange: { min, max },
    categories: stringArray(value.categories, `${base}.categories`),
    topics: stringArray(value.topics, `${base}.topics`),
    keywords: stringArray(value.keywords, `${base}.keywords`),
    moral,
    summary,
    structure: stringArray(value.structure, `${base}.structure`),
    styleFingerprint: {
      narration: requiredString(style.narration, `${base}.styleFingerprint.narration`),
      dialogue: requiredString(style.dialogue, `${base}.styleFingerprint.dialogue`),
      pacing: requiredString(style.pacing, `${base}.styleFingerprint.pacing`),
      illustrationRhythm: requiredString(
        style.illustrationRhythm,
        `${base}.styleFingerprint.illustrationRhythm`,
      ),
      ending: requiredString(style.ending, `${base}.styleFingerprint.ending`),
    },
    originalityRules: {
      reuseText: false,
      reuseNames: false,
      reuseSetting: false,
      reuseSceneSequence: false,
      reuseIllustrations: false,
      allowedInfluence: stringArray(
        rules.allowedInfluence,
        `${base}.originalityRules.allowedInfluence`,
      ),
    },
    sourceMetadata: isRecord(value.sourceMetadata)
      ? {
          sourceType: sourceType(value.sourceMetadata.sourceType),
          pageCount: isInteger(value.sourceMetadata.pageCount)
            ? value.sourceMetadata.pageCount
            : undefined,
          internalOnly: value.sourceMetadata.internalOnly === true,
        }
      : undefined,
  };
}

export function parseStoryReferenceCatalog(data: unknown): StoryReferenceCatalog {
  if (!isRecord(data)) throw new StoryCatalogError('Catalog must be an object.');
  if (!isInteger(data.version)) {
    throw new StoryCatalogError('Catalog version must be an integer.');
  }
  if (!isRecord(data.usagePolicy)) {
    throw new StoryCatalogError('Catalog usagePolicy is required.');
  }
  if (!Array.isArray(data.references)) {
    throw new StoryCatalogError('Catalog references must be an array.');
  }

  const references = data.references.map(parseReference);
  const ids = references.map((reference) => reference.id);
  if (new Set(ids).size !== ids.length) {
    throw new StoryCatalogError('Catalog contains duplicate reference IDs.');
  }

  return {
    version: data.version,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
    usagePolicy: {
      purpose: requiredString(data.usagePolicy.purpose, 'usagePolicy.purpose'),
      allowed: stringArray(data.usagePolicy.allowed, 'usagePolicy.allowed'),
      forbidden: stringArray(data.usagePolicy.forbidden, 'usagePolicy.forbidden'),
    },
    selection: isRecord(data.selection)
      ? {
          modes: Array.isArray(data.selection.modes)
            ? data.selection.modes.map(String)
            : undefined,
          autoReferenceStrategy:
            typeof data.selection.autoReferenceStrategy === 'string'
              ? data.selection.autoReferenceStrategy
              : undefined,
          recentReferenceHistoryLimit: isInteger(
            data.selection.recentReferenceHistoryLimit,
          )
            ? data.selection.recentReferenceHistoryLimit
            : undefined,
        }
      : undefined,
    references,
  };
}

export async function loadStoryReferenceCatalog(
  url = '/data/story-references.json',
  signal?: AbortSignal,
): Promise<StoryReferenceCatalog> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new StoryCatalogError(
      `Failed to load story catalog: ${response.status} ${response.statusText}`,
    );
  }

  return parseStoryReferenceCatalog(await response.json());
}
