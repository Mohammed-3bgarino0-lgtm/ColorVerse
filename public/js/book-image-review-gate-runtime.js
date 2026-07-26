(() => {
  'use strict';

  const KEY = 'colorverse-book-draft-v3';
  let draft = {};
  try { draft = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}

  function approved() {
    return draft.imageReview?.approved === true && Boolean(draft.imageReview?.approvedAt);
  }

  function applyGate() {
    if (approved()) return;
    const finalButton = document.querySelector('#finalPdfBtn');
    const printButton = document.querySelector('#printBtn');
    if (finalButton) {
      finalButton.disabled = true;
      finalButton.title = 'يجب اعتماد الصور أولًا.';
    }
    if (printButton) {
      printButton.disabled = true;
      printButton.title = 'يجب اعتماد الصور أولًا.';
    }
    const readiness = document.querySelector('#readiness');
    if (readiness && !readiness.querySelector('[data-image-review-gate]')) {
      readiness.insertAdjacentHTML('afterbegin', `<div class="ready-card warning" data-image-review-gate><div><h2>اعتماد الصور مطلوب</h2><p>راجع شخصية البطل والغلاف وكل زوج من صور القصة والتلوين قبل فتح PDF النهائي.</p></div><div class="ready-stats"><a class="btn primary" href="image-review.html">فتح مراجعة الصور</a></div></div>`);
    }
  }

  document.addEventListener('click', (event) => {
    if (approved()) return;
    if (event.target?.closest?.('#finalPdfBtn,#printBtn')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.alert('راجع الصور واعتمدها قبل إنشاء PDF النهائي.');
    }
  }, true);

  window.addEventListener('storage', () => {
    try { draft = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
    applyGate();
  });

  window.setTimeout(applyGate, 0);
  new MutationObserver(applyGate).observe(document.body, { childList: true, subtree: true });
})();
