(() => {
  'use strict';

  const ENDPOINT = '/api/drive/references/catalog';
  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));

  function studio() {
    return window.ColorVerseStoryStudio;
  }

  function sourceBadge(status, label) {
    const head = document.querySelector('#step3 .panel-head');
    if (!head) return;
    let badge = head.querySelector('#cvReferenceSource');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'cvReferenceSource';
      badge.style.cssText = 'display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;font-size:11px;font-weight:900;background:#eef8ff;color:#17628d;border:1px solid #d1e9f7';
      head.appendChild(badge);
    }
    badge.dataset.status = status;
    badge.textContent = label;
  }

  function updateReferenceSelect(references) {
    const select = document.querySelector('#referenceId');
    if (!select) return;
    const previous = select.value || window.state?.referenceId || '';
    select.innerHTML = references.map((reference) =>
      `<option value="${safe(reference.id)}">${safe(reference.title)} — ${safe(reference.moral || '')}</option>`,
    ).join('');
    if (previous && references.some((reference) => reference.id === previous)) {
      select.value = previous;
    }
    if (window.state) window.state.referenceId = select.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function applyCatalog(loaded) {
    const api = studio();
    const current = api?.getCatalog?.();
    if (!current || !loaded || !Array.isArray(loaded.references)) return false;
    current.version = loaded.version;
    current.updatedAt = loaded.updatedAt;
    current.usagePolicy = loaded.usagePolicy;
    current.selection = loaded.selection;
    current.references.splice(0, current.references.length, ...loaded.references);
    updateReferenceSelect(current.references);
    document.querySelector('#age')?.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  async function sync() {
    sourceBadge('loading', 'المراجع: جارٍ الاتصال بـDrive');
    try {
      const response = await fetch(ENDPOINT, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok || !applyCatalog(result.catalog)) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }
      sourceBadge('drive', `المراجع: Google Drive (${result.catalog.references.length})`);
      return result.catalog;
    } catch (error) {
      console.warn('[ColorVerse] Google Drive reference index unavailable; keeping local catalog.', error);
      sourceBadge('fallback', 'المراجع: نسخة محلية احتياطية');
      return studio()?.getCatalog?.() || { references: [] };
    }
  }

  const waitForStudio = window.setInterval(() => {
    if (!studio()?.getCatalog) return;
    window.clearInterval(waitForStudio);
    sync();
  }, 50);
  window.setTimeout(() => window.clearInterval(waitForStudio), 5000);

  window.ColorVerseDriveReferences = { sync };
})();
