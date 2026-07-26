(() => {
  'use strict';
  const TARGET = 'image-review.html';

  function updateLinks() {
    document.querySelectorAll('a[href*="book-print-v2.html"], a[href*="book-print.html"], a[href*="book-print-ai-review.html"]').forEach((link) => {
      link.setAttribute('href', TARGET);
      if (/PDF|كتاب|نسخة/.test(link.textContent || '')) link.textContent = 'مراجعة الصور قبل PDF';
    });
    const direct = document.querySelector('#pdfLink');
    if (direct) {
      direct.setAttribute('href', TARGET);
      direct.textContent = 'مراجعة الصور قبل PDF';
    }
  }

  updateLinks();
  new MutationObserver(updateLinks).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('storage', updateLinks);
})();
