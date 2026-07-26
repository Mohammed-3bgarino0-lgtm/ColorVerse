(() => {
  'use strict';
  const TARGET = 'book-print-ai-review.html?edition=story';

  function updateLinks() {
    document.querySelectorAll('a[href*="book-print-v2.html"], a[href*="book-print.html"]').forEach((link) => {
      link.setAttribute('href', TARGET);
      if (/PDF/.test(link.textContent || '')) link.textContent = 'فتح نسخة القصة';
    });
    const direct = document.querySelector('#pdfLink');
    if (direct) {
      direct.setAttribute('href', TARGET);
      direct.textContent = 'فتح نسخة القصة';
    }
  }

  updateLinks();
  new MutationObserver(updateLinks).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('storage', updateLinks);
})();
