(() => {
  'use strict';

  function enforceSeparateEditions() {
    const outputRadio = document.querySelector('input[name="output"]');
    if (!outputRadio) return;
    const field = outputRadio.closest('.field');
    if (!field || field.dataset.separateEditions === 'true') return;
    field.dataset.separateEditions = 'true';
    field.innerHTML = `
      <label>ناتج الكتاب</label>
      <input type="radio" name="output" value="نسختان منفصلتان" checked hidden>
      <div class="reference-card">
        <b>نسختان منفصلتان دائمًا</b>
        <p><strong>نسخة القصة:</strong> صور ملونة مع النص والحوارات.</p>
        <p><strong>نسخة التلوين:</strong> رسومات خطية فقط، بلا كتابة أو شرح أو حوار داخل الصفحات.</p>
      </div>`;
    if (typeof state === 'object' && state) {
      state.output = 'نسختان منفصلتان';
      state.imageEditions = {
        story: true,
        coloring: true,
        coloringHasNarrativeText: false,
      };
    }
    if (typeof scheduleSave === 'function') scheduleSave();
  }

  enforceSeparateEditions();
  new MutationObserver(enforceSeparateEditions).observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
