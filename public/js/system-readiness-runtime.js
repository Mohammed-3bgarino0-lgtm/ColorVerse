(() => {
  'use strict';

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
    $('#overall').className = `overall ${productionReady ? 'good' : 'warning'}`;
    $('#overall').innerHTML = `<b>${percent}%</b><span>${productionReady ? 'جاهز للإنتاج' : 'يحتاج إعدادًا'}</span>`;
    $('#checkedAt').textContent = `آخر فحص: ${new Date(data.checkedAt).toLocaleString('ar-SA')}`;

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
  $('#verifyDriveBtn')?.addEventListener('click', verifyDrive);
  load();
})();
