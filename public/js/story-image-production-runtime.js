(() => {
  'use strict';

  const MODE_KEY = 'colorverse-image-ai-mode-v1';
  const CONSENT_KEY = 'colorverse-photo-consent-v1';
  const STORY_URL = 'book-print-ai-review.html?edition=story';
  const COLORING_URL = 'book-print-ai-review.html?edition=coloring';
  let activeJobId = '';
  let running = false;

  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));
  const text = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  function mode() {
    try {
      const value = text(window.COLORVERSE_STORY_IMAGE_MODE || localStorage.getItem(MODE_KEY) || 'auto');
      return ['auto', 'live', 'demo'].includes(value) ? value : 'auto';
    } catch { return 'auto'; }
  }

  function saveDraft() {
    if (typeof save === 'function') save();
    else {
      try { localStorage.setItem('colorverse-book-draft-v3', JSON.stringify(state)); } catch {}
    }
  }

  function demoAsset(kind, url, sceneNumber) {
    return {
      kind,
      sceneNumber,
      url,
      storagePath: `demo/${kind}/${sceneNumber || 0}`,
      mimeType: 'image/webp',
      promptHash: 'demo-not-production-ready',
      model: 'local-demo',
      createdAt: new Date().toISOString(),
      productionReady: false,
    };
  }

  function demoResult() {
    const photo = (() => { try { return localStorage.getItem('colorverse-child-photo') || ''; } catch { return ''; } })();
    const story = state.generatedStory;
    const scenes = {};
    story.scenes.forEach((scene) => {
      scenes[String(scene.sceneNumber)] = {
        story: demoAsset('story', 'public/marketing/hero-story-page.webp', scene.sceneNumber),
        coloring: demoAsset('coloring', 'public/marketing/hero-coloring-page.webp', scene.sceneNumber),
      };
    });
    return {
      bookId: state.bookId || `demo_${Date.now()}`,
      editions: { story: true, coloring: true, coloringHasNarrativeText: false },
      hero: demoAsset('hero', photo, undefined),
      cover: demoAsset('cover', state.cover || 'public/marketing/cover-space.webp', undefined),
      scenes,
      model: 'local-demo',
      demo: true,
      completedAt: new Date().toISOString(),
    };
  }

  function applyResult(result, job) {
    state.generatedHero = result.hero;
    state.generatedCover = result.cover;
    state.generatedImages = result.scenes;
    state.imageEditions = result.editions;
    state.imageGeneration = {
      status: 'completed',
      jobId: job?.jobId || null,
      model: result.model,
      demo: Boolean(result.demo),
      completedAt: result.completedAt,
      productionReady: !result.demo,
    };
    saveDraft();
  }

  function styles() {
    if (document.querySelector('#cv-image-production-styles')) return;
    const style = document.createElement('style');
    style.id = 'cv-image-production-styles';
    style.textContent = `
      .cv-image-production{margin-top:18px;padding:18px;border:1px solid #e6dff0;border-radius:20px;background:#fff}.cv-image-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.cv-image-head h3{margin:0 0 5px}.cv-image-head p{margin:0;color:#717b90;line-height:1.7}.cv-editions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px}.cv-edition{padding:15px;border-radius:17px;background:#faf7ff;border:1px solid #e8e0f3}.cv-edition b{display:block;margin-bottom:5px}.cv-edition p{margin:0;color:#747e91;font-size:13px;line-height:1.7}.cv-edition.coloring{background:#fff;border-color:#d9d9df}.cv-image-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:15px}.cv-image-progress{margin-top:15px}.cv-image-track{height:10px;border-radius:999px;background:#ece8f2;overflow:hidden}.cv-image-bar{height:100%;width:0;background:linear-gradient(90deg,#7437ea,#ef4f9a,#ff7a18);transition:width .35s}.cv-image-status{display:flex;justify-content:space-between;gap:12px;margin-top:8px;font-size:13px;color:#68738b}.cv-image-note{margin-top:12px;padding:11px 13px;border-radius:13px;background:#fff6e4;color:#875900;border:1px solid #f0dfb9;line-height:1.7}.cv-image-ready{margin-top:13px;padding:12px 14px;border-radius:14px;background:#eafaf3;color:#08784f;border:1px solid #cdeede}.cv-image-error{margin-top:12px;padding:11px 13px;border-radius:13px;background:#fff0f0;color:#a12626}.cv-image-actions a[aria-disabled=true]{pointer-events:none;opacity:.48}@media(max-width:680px){.cv-editions{grid-template-columns:1fr}.cv-image-head{display:grid}}
    `;
    document.head.appendChild(style);
  }

  function panel() {
    let node = document.querySelector('#cvImageProduction');
    if (node) return node;
    const preview = document.querySelector('#previewContent');
    if (!preview || state.parentReview?.approved !== true) return null;
    node = document.createElement('section');
    node.id = 'cvImageProduction';
    node.className = 'cv-image-production';
    preview.appendChild(node);
    return node;
  }

  function linksMarkup(enabled = true) {
    return `<a class="btn btn-primary" href="${STORY_URL}" ${enabled ? '' : 'aria-disabled="true"'}>فتح نسخة القصة</a><a class="btn btn-secondary" href="${COLORING_URL}" ${enabled ? '' : 'aria-disabled="true"'}>فتح نسخة التلوين</a>`;
  }

  function renderIdle() {
    const node = panel();
    if (!node || running) return;
    const completed = state.imageGeneration?.status === 'completed' && state.generatedImages;
    if (completed) { renderComplete(); return; }
    node.innerHTML = `<div class="cv-image-head"><div><h3>إنتاج نسختين منفصلتين</h3><p>ينشئ المحرك صور القصة الملونة، ثم يحول كل مشهد إلى رسمة تلوين مطابقة بلا أي كتابة.</p></div><span class="cv-ai-mode ${mode() === 'demo' ? 'demo' : ''}">${mode() === 'live' ? 'خادم مباشر' : mode() === 'demo' ? 'تجريبي' : 'تلقائي'}</span></div><div class="cv-editions"><div class="cv-edition"><b>نسخة القصة</b><p>غلاف وصور ملونة مع نص القصة والحوارات المعتمدة.</p></div><div class="cv-edition coloring"><b>نسخة التلوين</b><p>رسومات خطية فقط. لا نص قصة، لا حوار، لا شرح، ولا أرقام داخل الصفحات.</p></div></div><div class="cv-image-actions"><button class="btn btn-primary" id="cvGenerateImages">إنتاج النسختين الآن</button>${linksMarkup(false)}</div>`;
    node.querySelector('#cvGenerateImages')?.addEventListener('click', start);
  }

  function renderProgress(job) {
    const node = panel();
    if (!node) return;
    const percent = Math.max(0, Math.min(100, Math.round((Number(job.current || 0) / Math.max(1, Number(job.total || 1))) * 100)));
    node.innerHTML = `<div class="cv-image-head"><div><h3>جارٍ إنتاج النسختين</h3><p>${safe(job.stageLabel || 'تجهيز الصور')}</p></div><b>${percent}%</b></div><div class="cv-image-progress"><div class="cv-image-track"><div class="cv-image-bar" style="width:${percent}%"></div></div><div class="cv-image-status"><span>${Number(job.current || 0)} من ${Number(job.total || 0)} أصل بصري</span><span>${job.currentScene ? `المشهد ${job.currentScene}` : ''}</span></div></div><div class="cv-image-actions"><button class="btn btn-secondary" id="cvCancelImages">إلغاء المهمة</button></div>`;
    node.querySelector('#cvCancelImages')?.addEventListener('click', cancel);
  }

  function renderComplete() {
    const node = panel();
    if (!node) return;
    const demo = Boolean(state.imageGeneration?.demo);
    node.innerHTML = `<div class="cv-image-head"><div><h3>${demo ? 'اكتملت المعاينة التجريبية' : 'اكتملت نسختا الكتاب'}</h3><p>يمكن فتح كل نسخة ومراجعتها بصورة مستقلة.</p></div><span class="cv-ai-mode ${demo ? 'demo' : 'live'}">${demo ? 'صور تجريبية' : 'صور إنتاجية'}</span></div>${demo ? '<div class="cv-image-note">الصور الحالية عناصر تجريبية متكررة، لذلك يبقى PDF النهائي معطلًا. استخدمها لمراجعة توزيع الصفحات فقط.</div>' : '<div class="cv-image-ready">✓ اكتملت الصور الملونة ورسومات التلوين الصافية لكل المشاهد.</div>'}<div class="cv-editions"><div class="cv-edition"><b>نسخة القصة</b><p>النص والحوارات مع الصور الملونة.</p></div><div class="cv-edition coloring"><b>نسخة التلوين</b><p>الرسومات فقط دون كتابة أو شرح للقصة.</p></div></div><div class="cv-image-actions">${linksMarkup(true)}<button class="btn btn-secondary" id="cvRegenerateImages">إعادة إنتاج الصور</button></div>`;
    node.querySelector('#cvRegenerateImages')?.addEventListener('click', start);
  }

  function renderError(error) {
    const node = panel();
    if (!node) return;
    node.innerHTML = `<div class="cv-image-head"><div><h3>تعذر إنتاج الصور</h3><p>لم تتغير القصة المعتمدة ويمكن المحاولة من جديد.</p></div></div><div class="cv-image-error">${safe(error?.message || 'حدث خطأ أثناء إنتاج الصور.')}</div><div class="cv-image-actions"><button class="btn btn-primary" id="cvRetryImages">إعادة المحاولة</button><button class="btn btn-secondary" id="cvDemoImages">استخدام معاينة تجريبية</button></div>`;
    node.querySelector('#cvRetryImages')?.addEventListener('click', start);
    node.querySelector('#cvDemoImages')?.addEventListener('click', async () => {
      try { localStorage.setItem(MODE_KEY, 'demo'); } catch {}
      await start();
    });
  }

  async function runDemo() {
    const total = 2 + state.generatedStory.scenes.length * 2;
    for (let current = 0; current <= total; current += Math.max(1, Math.floor(total / 8))) {
      renderProgress({ current: Math.min(current, total), total, stageLabel: current < 2 ? 'تجهيز شخصية البطل والغلاف' : 'تجهيز صور نموذجية للنسختين' });
      await wait(160);
    }
    const result = demoResult();
    applyResult(result, { jobId: null });
  }

  async function start() {
    if (running) return;
    if (state.parentReview?.approved !== true || !state.generatedStory?.scenes?.length) {
      renderError(new Error('اعتمد القصة من ولي الأمر قبل إنتاج الصور.'));
      return;
    }
    running = true;
    try {
      if (mode() === 'demo') {
        await runDemo();
      } else {
        const client = window.ColorVerseStoryImages;
        if (!client) throw new Error('عميل الصور غير محمل.');
        const started = await client.start(state);
        activeJobId = started.job.jobId;
        renderProgress(started.job);
        const completed = await client.wait(activeJobId, { onUpdate: renderProgress });
        applyResult(completed.result, completed);
      }
      renderComplete();
    } catch (error) {
      const fallback = mode() === 'auto' && ['IMAGE_PROVIDER_NOT_CONFIGURED', 'NETWORK_ERROR', 'NOT_CONFIGURED'].includes(error?.code);
      if (fallback) {
        await runDemo();
        renderComplete();
      } else renderError(error);
    } finally {
      activeJobId = '';
      running = false;
    }
  }

  async function cancel() {
    if (!activeJobId || !window.ColorVerseStoryImages) return;
    try { await window.ColorVerseStoryImages.cancel(activeJobId); } catch {}
    activeJobId = '';
    running = false;
    renderIdle();
  }

  function bindConsent() {
    const checkbox = document.querySelector('#consent');
    checkbox?.addEventListener('change', () => {
      try { localStorage.setItem(CONSENT_KEY, String(checkbox.checked)); } catch {}
    });
  }

  styles();
  bindConsent();
  const observer = new MutationObserver(() => renderIdle());
  observer.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(renderIdle, 0);
  window.ColorVerseImageProduction = { start, cancel, render: renderIdle };
})();
