const DEFAULT_STORAGE_KEY = 'colorverse-recent-story-references';
const DEFAULT_LIMIT = 5;

export interface StoryReferenceHistoryOptions {
  storageKey?: string;
  limit?: number;
}

function safeStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getRecentReferenceIds(
  options: StoryReferenceHistoryOptions = {},
): string[] {
  const storage = safeStorage();
  if (!storage) return [];

  const key = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const limit = options.limit ?? DEFAULT_LIMIT;

  try {
    return normalizeIds(JSON.parse(storage.getItem(key) ?? '[]')).slice(0, limit);
  } catch {
    return [];
  }
}

export function rememberStoryReference(
  referenceId: string,
  options: StoryReferenceHistoryOptions = {},
): string[] {
  const id = referenceId.trim();
  if (!id) return getRecentReferenceIds(options);

  const storage = safeStorage();
  const key = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const limit = Math.max(1, options.limit ?? DEFAULT_LIMIT);
  const updated = [id, ...getRecentReferenceIds({ ...options, limit })]
    .filter((value, index, items) => items.indexOf(value) === index)
    .slice(0, limit);

  if (storage) {
    try {
      storage.setItem(key, JSON.stringify(updated));
    } catch {
      // The story flow must keep working when storage is blocked or full.
    }
  }

  return updated;
}

export function clearStoryReferenceHistory(
  options: StoryReferenceHistoryOptions = {},
): void {
  const storage = safeStorage();
  if (!storage) return;

  try {
    storage.removeItem(options.storageKey ?? DEFAULT_STORAGE_KEY);
  } catch {
    // Ignore storage restrictions.
  }
}
