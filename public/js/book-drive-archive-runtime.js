(() => {
  'use strict';

  const DRAFT_KEY = 'colorverse-book-draft-v3';
  const params = new URLSearchParams(window.location.search);
  const edition = params.get('edition') === 'coloring' ? 'coloring' : 'story';
  const $ = (selector) => document.querySelector(selector);
  const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

  function draft() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') || {}; } catch { return {}; }
  }

  function safeFilePart(value, fallback) {
    return clean(value || fallback)
      .normalize('NFKC')
      .replace(/[^\p{L}\p{N}_-]+/gu, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 70) || fallback;
  }

  function bookId(value) {
    if (value.bookId) return safeFilePart(value.bookId, `cv-${Date.now()}`);
    const child = safeFilePart(value.childName, 'child');
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    return `cv-${child}-${stamp}`;
  }

  function pdfFileName(value) {
    const child = safeFilePart(value.childName, 'child');
    const title = safeFilePart(value.generatedStory?.title || value.customTitle, 'book');
    return `ColorVerse-${child}-${title}-${edition}-final.pdf`;
  }

  function createButton() {
    const actions = $('.toolbar-group.actions');
    if (!actions || $('#driveArchiveBtn')) return;
    const button = document.createElement('button');
    button.className = 'btn secondary';
    button.id = 'driveArchiveBtn';
    button.type = 'button';
    button.disabled = true;
    button.textContent = 'حفظ في Drive';
    actions.appendChild(button);

    const status = document.createElement('span');
    status.id = 'driveArchiveStatus';
    status.className = 'drive-archive-status';
    status.setAttribute('aria-live', 'polite');
    actions.appendChild(status);

    const style = document.createElement('style');
    style.textContent = '.drive-archive-status{font-size:11px;color:#68738d;max-width:230px}.drive-archive-status a{color:#5f31bd;font-weight:900}';
    document.head.appendChild(style);
  }

  function syncReadiness() {
    const archiveButton = $('#driveArchiveBtn');
    const finalButton = $('#finalPdfBtn');
    if (!archiveButton || !finalButton) return;
    archiveButton.disabled = finalButton.disabled;
    archiveButton.title = finalButton.disabled
      ? 'يجب اكتمال الأصول الإنتاجية قبل الحفظ في Drive.'
      : 'يحفظ PDF النهائي في مجلد ColorVerse المخصص.';
  }

  async function pdfBlob(fileName) {
    if (!window.html2pdf) throw new Error('مكتبة PDF غير متاحة.');
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all([...document.images].map(async (image) => {
      if (image.complete) return;
      try { await image.decode(); } catch {}
    }));
    document.body.classList.add('production-hidden');
    try {
      return await window.html2pdf().set({
        margin: 0,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
        pagebreak: { mode: ['css', 'legacy'] },
      }).from($('#book')).outputPdf('blob');
    } finally {
      document.body.classList.remove('production-hidden');
    }
  }

  async function archiveManifest(value, resolvedBookId, storedFile) {
    const payload = {
      schemaVersion: 1,
      bookId: resolvedBookId,
      edition,
      childName: value.childName,
      heroName: value.heroName || value.childName,
      title: value.generatedStory?.title || value.customTitle,
      moral: value.generatedStory?.moral || value.moral,
      sceneCount: value.generatedStory?.scenes?.length || 0,
      parentReview: value.parentReview,
      imageGeneration: value.imageGeneration,
      driveFile: storedFile,
      archivedAt: new Date().toISOString(),
    };
    const response = await fetch(`/api/drive/books/${encodeURIComponent(resolvedBookId)}/manifest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('تم حفظ PDF لكن تعذر حفظ فهرس الكتاب.');
  }

  async function archive() {
    const button = $('#driveArchiveBtn');
    const status = $('#driveArchiveStatus');
    const finalButton = $('#finalPdfBtn');
    if (!button || !status || finalButton?.disabled) return;
    const value = draft();
    if (value.parentReview?.approved !== true) {
      status.textContent = 'موافقة ولي الأمر مطلوبة.';
      return;
    }

    const resolvedBookId = bookId(value);
    const fileName = pdfFileName(value);
    button.disabled = true;
    button.textContent = 'جارٍ الحفظ…';
    status.textContent = 'إنشاء PDF ثم رفعه إلى Drive…';

    try {
      const blob = await pdfBlob(fileName);
      const response = await fetch(
        `/api/drive/books/${encodeURIComponent(resolvedBookId)}/${edition}/final?fileName=${encodeURIComponent(fileName)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/pdf',
            Accept: 'application/json',
            'X-ColorVerse-Parent-Approved': 'true',
          },
          body: blob,
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        const error = new Error(result.error || 'تعذر حفظ الكتاب في Google Drive.');
        error.code = result.code;
        throw error;
      }
      await archiveManifest(value, resolvedBookId, result.file);
      const saved = {
        ...(value.driveArchive || {}),
        [edition]: {
          fileId: result.file.id,
          fileName: result.file.name,
          url: result.file.url,
          archivedAt: new Date().toISOString(),
        },
      };
      value.bookId = resolvedBookId;
      value.driveArchive = saved;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
      status.innerHTML = result.file.url
        ? `تم الحفظ ✓ <a href="${result.file.url}" target="_blank" rel="noopener">فتح الملف</a>`
        : 'تم الحفظ في Drive ✓';
    } catch (error) {
      status.textContent = error?.code === 'GOOGLE_DRIVE_NOT_CONFIGURED'
        ? 'الخادم غير مربوط بحساب Drive بعد.'
        : error?.message || 'تعذر حفظ الكتاب في Drive.';
    } finally {
      button.textContent = 'حفظ في Drive';
      syncReadiness();
    }
  }

  createButton();
  $('#driveArchiveBtn')?.addEventListener('click', archive);
  new MutationObserver(syncReadiness).observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: ['disabled'],
  });
  window.setTimeout(syncReadiness, 0);
  window.ColorVerseDriveArchive = { archive, syncReadiness };
})();
