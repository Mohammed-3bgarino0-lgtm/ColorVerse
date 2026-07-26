(() => {
  'use strict';

  const DRAFT_KEY = 'colorverse-book-draft-v3';
  const IMAGE_MODE_KEY = 'colorverse-image-ai-mode-v1';
  const STORY_MODE_KEY = 'colorverse-story-ai-mode-v1';
  const TRIAL_DATA_URL = 'public/data/colorverse-trial-draft.json';
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));
  const labels = {
    demo: 'الوضع التجريبي',
    liveStory: 'توليد القصص',
    liveImages: 'توليد الصور',
    googleDrive: 'Google Drive',
    production: 'التشغيل الإنتاجي',
  };
  const groupLabels = {
    story: 'القصص',
    images: 'الصور',
    drive: 'Drive',
    production: 'الإنتاج',
  };

  function render(data) {
    const modes = Object.entries(data.modes || {});
    const readyCount = modes.filter(([, ready]) => ready).length;
    const percent = modes.length ? Math.round((readyCount / modes.length) * 100) : 0;
    const productionReady = data.modes?.production === true;
    const runtimeMode = data.runtime?.mode === 'production' ? 'إنتاجي' : 'تجريبي آمن';
    $('#overall').className = `overall ${productionReady ? 'good' : 'warning'}`;
    $('#overall').innerHTML = `<b>${percent}%</b><span>${productionReady ? 'جاهز للإنتاج' : runtimeMode}</span>`;
    $('#checkedAt').textContent = `آخر فحص: ${new Date(data.checkedAt).toLocaleString('ar-SA')} • ${runtimeMode}`;

    $('#modes').innerHTML = modes.map(([key, ready]) => `
      <article class="mode-card ${ready ? 'good' : 'warning'}">
        <span>${esc(labels[key] || key)}</span>
        <b>${ready ? 'جاهز ✓' : 'غير مكتمل'}</b>
      </article>
    `).join('');

    $('#checks').innerHTML = (data.checks || []).map((check) => `
      <article class="check-card">
        <span class="status-dot ${check.ready ? 'good' : ''}" aria-hidden="true"></span>
        <div>
          <b>${esc(check.label)} — ${check.ready ? 'جاهز' : 'مطلوب'}</b>
          <small>${esc(check.detail)}</small>
          <div class="tags">${(check.requiredFor || []).map((group) => `<span class="tag">${esc(groupLabels[group] || group)}</span>`).join('')}</div>
        </div>
      </article>
    `).join('');
  }

  async function load() {
    $('#refreshBtn').disabled = true;
    try {
      const response = await fetch('/api/system/readiness', { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || 'تعذر قراءة حالة الخادم.');
      render(data);
    } catch (error) {
      $('#overall').className = 'overall warning';
      $('#overall').innerHTML = '<b>—</b><span>الخادم غير متاح</span>';
      $('#modes').innerHTML = `<div class="error">${esc(error.message || error)} افتح هذه الصفحة من خادم Node، وليس كملف ثابت فقط.</div>`;
      $('#checks').innerHTML = '';
      $('#checkedAt').textContent = 'تعذر الاتصال بواجهة الجاهزية';
    } finally {
      $('#refreshBtn').disabled = false;
    }
  }

  async function runSmokeTest() {
    const button = $('#smokeTestBtn');
    const result = $('#smokeResult');
    button.disabled = true;
    button.textContent = 'جارٍ الاختبار…';
    result.innerHTML = '';
    try {
      const response = await fetch('/api/system/smoke-test', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر تشغيل الاختبار الآمن.');
      result.innerHTML = `<div class="drive-list">${(data.steps || []).map((step) => `
        <div class="drive-item ${step.passed ? 'good' : ''}"><span>${esc(step.label)}</span><b>${step.passed ? 'ناجح ✓' : 'فشل'}</b><small>${esc(step.detail)}</small></div>
      `).join('')}</div><div class="${data.ok ? 'success' : 'error'}">${data.passed}/${data.total} خطوات ناجحة — لا استهلاك Gemini ولا كتابة على Drive.</div>`;
    } catch (error) {
      result.innerHTML = `<div class="error">${esc(error.message || error)}</div>`;
    } finally {
      button.disabled = false;
      button.textContent = 'تشغيل الاختبار الآمن';
    }
  }

  async function loadTrialDraft() {
    const button = $('#loadTrialBtn');
    const result = $('#trialResult');
    button.disabled = true;
    button.textContent = 'جارٍ التحميل…';
    result.innerHTML = '';
    try {
      const response = await fetch(TRIAL_DATA_URL, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const draft = await response.json();
      if (!response.ok || draft.trialData !== true || draft.generatedStory?.scenes?.length !== 8) {
        throw new Error('ملف بيانات التجربة غير صالح.');
      }
      draft.loadedAt = new Date().toISOString();
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      localStorage.setItem(IMAGE_MODE_KEY, 'demo');
      localStorage.setItem(STORY_MODE_KEY, 'demo');
      result.innerHTML = '<div class="success">تم تحميل كتاب «نور والنجمة الزرقاء» داخل هذا المتصفح فقط. الصور تجريبية وسيبقى PDF النهائي مغلقًا.</div><div class="drive-list"><a class="btn secondary" href="create-ai-review.html">فتح مراجعة القصة</a><a class="btn secondary" href="image-review.html">فتح مراجعة الصور</a><a class="btn secondary" href="book-print-ai-review.html?edition=story">معاينة نسخة القصة</a><a class="btn secondary" href="book-print-ai-review.html?edition=coloring">معاينة نسخة التلوين</a></div>';
    } catch (error) {
      result.innerHTML = `<div class="error">${esc(error.message || error)}</div>`;
    } finally {
      button.disabled = false;
      button.textContent = 'تحميل بيانات التجربة';
    }
  }

  async function verifyDrive() {
    const button = $('#verifyDriveBtn');
    const result = $('#driveResult');
    button.disabled = true;
    button.textContent = 'جارٍ الفحص…';
    result.textContent = '';
    try {
      const response = await fetch('/api/system/verify-drive', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || 'تعذر فحص Drive.');
      result.innerHTML = `<div class="drive-list">${(data.results || []).map((item) => `
        <div class="drive-item ${item.ready ? 'good' : ''}"><span>${esc(item.key)}</span><b>${item.ready ? esc(item.name || 'متاح') : 'غير متاح'}</b></div>
      `).join('')}</div>`;
    } catch (error) {
      result.innerHTML = `<div class="error">${esc(error.message || error)}</div>`;
    } finally {
      button.disabled = false;
      button.textContent = 'فحص مجلدات Drive';
    }
  }

  $('#refreshBtn')?.addEventListener('click', load);
  $('#smokeTestBtn')?.addEventListener('click', runSmokeTest);
  $('#loadTrialBtn')?.addEventListener('click', loadTrialDraft);
  $('#verifyDriveBtn')?.addEventListener('click', verifyDrive);
  load();
})();
