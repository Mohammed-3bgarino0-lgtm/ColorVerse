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

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new StoryCatalogError(`${field} must be an array of strings.`);
  }
  return value;
}

function parseReference(value: unknown, index: number): StoryReference {
  if (!isRecord(value)) {
    throw new StoryCatalogError(`references[${index}] must be an object.`);
  }

  const requiredStrings = ['id', 'title', 'language', 'moral', 'summary'] as const;
  for (const field of requiredStrings) {
    if (typeof value[field] !== 'string' || !value[field].trim()) {
      throw new StoryCatalogError(`references[${index}].${field} is required.`);
    }
  }

  if (!isRecord(value.ageRange)) {
    throw new StoryCatalogError(`references[${index}].ageRange is required.`);
  }

  const min = value.ageRange.min;
  const max = value.ageRange.max;
  if (!Number.isInteger(min) || !Number.isInteger(max) || Number(min) > Number(max)) {
    throw new StoryCatalogError(`references[${index}].ageRange is invalid.`);
  }

  if (!isRecord(value.styleFingerprint) || !isRecord(value.originalityRules)) {
    throw new StoryCatalogError(
      `references[${index}] requires styleFingerprint and originalityRules.`,
    );
  }

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
        `references[${index}].originalityRules.${field} must be false.`,
      );
    }
  }

  return {
    id: String(value.id),
    title: String(value.title),
    language: value.language as StoryReference['language'],
    ageRange: { min: Number(min), max: Number(max) },
    categories: stringArray(value.categories, `references[${index}].categories`),
    topics: stringArray(value.topics, `references[${index}].topics`),
    keywords: stringArray(value.keywords, `references[${index}].keywords`),
    moral: String(value.moral),
    summary: String(value.summary),
    structure: stringArray(value.structure, `references[${index}].structure`),
    styleFingerprint: {
      narration: String(value.styleFingerprint.narration ?? ''),
      dialogue: String(value.styleFingerprint.dialogue ?? ''),
      pacing: String(value.styleFingerprint.pacing ?? ''),
      illustrationRhythm: String(value.styleFingerprint.illustrationRhythm ?? ''),
      ending: String(value.styleFingerprint.ending ?? ''),
    },
    originalityRules: {
      reuseText: false,
      reuseNames: false,
      reuseSetting: false,
      reuseSceneSequence: false,
      reuseIllustrations: false,
      allowedInfluence: stringArray(
        rules.allowedInfluence,
        `references[${index}].originalityRules.allowedInfluence`,
      ),
    },
    sourceMetadata: isRecord(value.sourceMetadata)
      ? {
          sourceType: String(
            value.sourceMetadata.sourceType ?? 'manual',
          ) as NonNullable<StoryReference['sourceMetadata']>['sourceType'],
          pageCount: Number.isInteger(value.sourceMetadata.pageCount)
            ? Number(value.sourceMetadata.pageCount)
            : undefined,
          internalOnly: value.sourceMetadata.internalOnly === true,
        }
      : undefined,
  };
}

export function parseStoryReferenceCatalog(data: unknown): StoryReferenceCatalog {
  if (!isRecord(data)) throw new StoryCatalogError('Catalog must be an object.');
  if (!Number.isInteger(data.version)) {
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
    version: Number(data.version),
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
    usagePolicy: {
      purpose: String(data.usagePolicy.purpose ?? ''),
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
          recentReferenceHistoryLimit: Number.isInteger(
            data.selection.recentReferenceHistoryLimit,
          )
            ? Number(data.selection.recentReferenceHistoryLimit)
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
