(() => {
  'use strict';

  class ColorVerseImageJobError extends Error {
    constructor(message, options = {}) {
      super(message);
      this.name = 'ColorVerseImageJobError';
      this.code = options.code || 'IMAGE_JOB_ERROR';
      this.status = options.status || 0;
      this.details = options.details;
      this.retryAfterSeconds = options.retryAfterSeconds;
    }
  }

  const PHOTO_KEY = 'colorverse-child-photo';
  const CONSENT_KEY = 'colorverse-photo-consent-v1';

  const safeText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  function apiBase() {
    const configured = safeText(window.COLORVERSE_STORY_IMAGE_API_BASE_URL || '');
    return configured.replace(/\/$/, '');
  }

  function endpoint(path) {
    return `${apiBase()}${path}`;
  }

  function readPhoto() {
    try { return localStorage.getItem(PHOTO_KEY) || ''; } catch { return ''; }
  }

  function readConsent() {
    const checkbox = document.querySelector('#consent');
    if (checkbox?.checked) return true;
    try { return localStorage.getItem(CONSENT_KEY) === 'true'; } catch { return false; }
  }

  function ensureBookId(state) {
    if (safeText(state.bookId)) return state.bookId;
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    state.bookId = `cv_${stamp}_${Math.random().toString(36).slice(2, 7)}`;
    return state.bookId;
  }

  function payloadFromState(state) {
    const story = state.generatedStory;
    const parentReview = state.parentReview;
    if (!story?.scenes?.length) throw new ColorVerseImageJobError('لا توجد قصة معتمدة لإنتاج الصور.', { code: 'NO_APPROVED_STORY' });
    if (parentReview?.approved !== true) throw new ColorVerseImageJobError('موافقة ولي الأمر مطلوبة قبل إنتاج الصور.', { code: 'PARENT_REVIEW_REQUIRED' });

    const photo = readPhoto();
    const photoConsent = readConsent();
    return {
      bookId: ensureBookId(state),
      childName: safeText(state.childName),
      childAge: Number(state.age),
      heroName: safeText(state.heroName || state.childName),
      template: safeText(state.template),
      templateLabel: safeText(state.templateTitle),
      coverStyle: safeText(state.coverStyle),
      childPhotoDataUrl: photo && photoConsent ? photo : undefined,
      photoConsent: Boolean(photo && photoConsent),
      story,
      parentReview: {
        approved: true,
        approvedAt: parentReview.approvedAt,
        reviewVersion: Number(parentReview.reviewVersion || 1),
        sceneCount: Number(parentReview.sceneCount || parentReview.reviewedSceneCount || story.scenes.length),
      },
    };
  }

  function assetsFromState(state) {
    if (!state.generatedHero || !state.generatedCover || !state.generatedImages) {
      throw new ColorVerseImageJobError('أصول الصور الحالية غير مكتملة.', { code: 'IMAGE_ASSETS_MISSING' });
    }
    return {
      hero: state.generatedHero,
      cover: state.generatedCover,
      scenes: state.generatedImages,
    };
  }

  async function request(path, options = {}) {
    const response = await fetch(endpoint(path), {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
      credentials: 'same-origin',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new ColorVerseImageJobError(result.error || 'تعذر تنفيذ مهمة الصور.', {
        code: result.code,
        status: response.status,
        details: result.issues || result.job,
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }
    return result;
  }

  async function start(state) {
    return request('/api/story-images/jobs', {
      method: 'POST',
      body: JSON.stringify(payloadFromState(state)),
    });
  }

  async function regenerate(state, target) {
    const kind = safeText(target?.kind);
    if (!['hero', 'cover', 'story', 'coloring'].includes(kind)) {
      throw new ColorVerseImageJobError('نوع الصورة المطلوب غير صحيح.', { code: 'INVALID_IMAGE_TARGET' });
    }
    const sceneNumber = ['story', 'coloring'].includes(kind) ? Number(target?.sceneNumber) : undefined;
    if (['story', 'coloring'].includes(kind) && !Number.isInteger(sceneNumber)) {
      throw new ColorVerseImageJobError('رقم المشهد مطلوب.', { code: 'INVALID_SCENE_NUMBER' });
    }
    return request('/api/story-images/regenerate', {
      method: 'POST',
      body: JSON.stringify({
        input: payloadFromState(state),
        target: { kind, sceneNumber },
        assets: assetsFromState(state),
      }),
    });
  }

  async function get(jobId) {
    return request(`/api/story-images/jobs/${encodeURIComponent(jobId)}`);
  }

  async function cancel(jobId) {
    return request(`/api/story-images/jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE' });
  }

  async function wait(jobId, options = {}) {
    const intervalMs = Math.max(800, Number(options.intervalMs || 1800));
    const timeoutMs = Math.max(30_000, Number(options.timeoutMs || 30 * 60_000));
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const result = await get(jobId);
      options.onUpdate?.(result.job);
      if (result.job.status === 'completed') return result.job;
      if (['failed', 'cancelled'].includes(result.job.status)) {
        throw new ColorVerseImageJobError(
          result.job.error?.message || (result.job.status === 'cancelled' ? 'أُلغيت مهمة الصور.' : 'فشلت مهمة الصور.'),
          { code: result.job.error?.code || result.job.status.toUpperCase(), details: result.job },
        );
      }
      await delay(intervalMs);
    }
    throw new ColorVerseImageJobError('استغرقت مهمة الصور وقتًا أطول من المتوقع.', { code: 'IMAGE_JOB_TIMEOUT' });
  }

  window.ColorVerseStoryImages = Object.freeze({
    Error: ColorVerseImageJobError,
    payloadFromState,
    assetsFromState,
    start,
    regenerate,
    get,
    cancel,
    wait,
  });
})();
