(() => {
  'use strict';

  class ColorVerseStoryAiError extends Error {
    constructor(message, options = {}) {
      super(message);
      this.name = 'ColorVerseStoryAiError';
      this.code = options.code || 'STORY_AI_ERROR';
      this.status = options.status || 0;
      this.details = options.details;
      this.retryAfterSeconds = options.retryAfterSeconds;
    }
  }

  const modeMap = {
    free: 'none',
    none: 'none',
    child_story: 'child_story',
    selected_reference: 'selected_reference',
    auto_reference: 'auto_reference',
  };

  const languageMap = {
    العربية: 'ar',
    Arabic: 'ar',
    ar: 'ar',
    English: 'en',
    en: 'en',
    'ثنائي اللغة': 'bilingual',
    bilingual: 'bilingual',
  };

  function readRecentReferences() {
    try {
      const value = JSON.parse(
        localStorage.getItem('colorverse-recent-story-references-v1') || '[]',
      );
      return Array.isArray(value)
        ? value.filter((item) => typeof item === 'string').slice(0, 5)
        : [];
    } catch {
      return [];
    }
  }

  function payloadFromState(state) {
    const creationMode = modeMap[state.creationMode] || 'none';
    return {
      childName: String(state.childName || '').trim(),
      childAge: Number(state.age || state.childAge),
      heroName: String(state.heroName || state.childName || '').trim(),
      childStory: String(state.childStory || state.adventure || '').trim(),
      adventure: String(state.adventure || '').trim(),
      moral: String(state.moral || '').trim(),
      helperCharacter: String(state.helper || state.helperCharacter || '').trim(),
      templateLabel: String(state.templateTitle || state.templateLabel || '').trim(),
      pageCount: Number(state.pages || state.pageCount || 8),
      language: languageMap[state.language] || 'ar',
      referenceMode: creationMode,
      selectedReferenceId:
        creationMode === 'selected_reference'
          ? String(state.referenceId || '').trim()
          : undefined,
      recentReferenceIds: readRecentReferences(),
    };
  }

  async function generateStory(state, options = {}) {
    const endpoint = options.endpoint || '/api/stories/generate';
    const timeoutMs = Number(options.timeoutMs || 120000);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payloadFromState(state)),
        signal: controller.signal,
        credentials: 'same-origin',
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new ColorVerseStoryAiError(
          result.error || 'تعذر إنشاء القصة حاليًا.',
          {
            code: result.code,
            status: response.status,
            details: result.issues || result.originality || result.attempts,
            retryAfterSeconds: result.retryAfterSeconds,
          },
        );
      }

      return result;
    } catch (error) {
      if (error instanceof ColorVerseStoryAiError) throw error;
      if (error?.name === 'AbortError') {
        throw new ColorVerseStoryAiError('استغرق إنشاء القصة وقتًا أطول من المتوقع.', {
          code: 'CLIENT_TIMEOUT',
        });
      }
      throw new ColorVerseStoryAiError('تعذر الوصول إلى خادم إنشاء القصص.', {
        code: 'NETWORK_ERROR',
        details: error,
      });
    } finally {
      window.clearTimeout(timer);
    }
  }

  window.ColorVerseStoryAI = Object.freeze({
    generateStory,
    payloadFromState,
    Error: ColorVerseStoryAiError,
  });
})();
