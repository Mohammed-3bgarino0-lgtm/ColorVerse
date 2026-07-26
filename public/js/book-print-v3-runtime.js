(() => {
  'use strict';

  const DRAFT_KEY = 'colorverse-book-draft-v3';
  const PHOTO_KEY = 'colorverse-child-photo';
  const BOOK_VERSION = 4;
  const edition = new URLSearchParams(window.location.search).get('edition') === 'coloring'
    ? 'coloring'
    : 'story';
  const templates = {
    space: { cover: 'public/marketing/cover-space.webp', label: 'الفضاء' },
    princess: { cover: 'public/marketing/cover-princess.webp', label: 'عالم الأميرات' },
    jungle: { cover: 'public/marketing/cover-jungle.webp', label: 'الغابة' },
    hero: { cover: 'public/marketing/cover-hero.webp', label: 'عالم الأبطال' },
    unicorn: { cover: 'public/marketing/cover-unicorn.webp', label: 'اليونيكورن' },
  };

  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));
  const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

  function loadJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
  }

  const draft = loadJson(DRAFT_KEY, {});
  let photo = '';
  try { photo = localStorage.getItem(PHOTO_KEY) || ''; } catch {}

  function theme() { return templates[draft.template] || templates.space; }
  function story() {
    const value = draft.generatedStory;
    return value && Array.isArray(value.scenes) ? value : null;
  }
  function approved() { return draft.parentReview?.approved === true; }

  function asset(value, fallback = '') {
    if (value && typeof value === 'object') {
      return {
        url: clean(value.url || value.downloadUrl || value.publicUrl || ''),
        productionReady: value.productionReady === true,
      };
    }
    const url = clean(value || fallback);
    return {
      url,
      productionReady: url.includes('/generated-assets/'),
    };
  }

  function generatedScene(scene) {
    return draft.generatedImages?.[scene.sceneNumber]
      || draft.generatedImages?.[String(scene.sceneNumber)]
      || {};
  }

  function storyAsset(scene) {
    const generated = generatedScene(scene);
    return asset(
      scene.imageAsset || scene.imageUrl || scene.image || scene.illustrationUrl
      || generated.story || generated.illustration,
    );
  }

  function coloringAsset(scene) {
    const generated = generatedScene(scene);
    return asset(
      scene.coloringAsset || scene.coloringImageUrl || scene.coloringImage || scene.lineArtUrl
      || generated.coloring || generated.lineArt,
    );
  }

  function coverAsset() {
    return asset(draft.generatedCover, draft.cover || theme().cover);
  }

  function heroAsset() {
    return asset(draft.generatedHero, photo);
  }

  function readiness(value) {
    const scenes = value?.scenes || [];
    const expected = Number(draft.pages || scenes.length || 0);
    const cover = coverAsset();
    const sceneAssets = scenes.map((scene) => edition === 'story' ? storyAsset(scene) : coloringAsset(scene));
    const completeAssets = sceneAssets.filter((item) => item.url && item.productionReady).length;
    const previewAssets = sceneAssets.filter((item) => item.url).length;
    const sceneCountValid = [8, 12, 16].includes(expected) && scenes.length === expected;
    return {
      expected,
      scenes,
      sceneCountValid,
      approvalValid: approved(),
      coverReady: Boolean(cover.url && cover.productionReady),
      completeAssets,
      previewAssets,
      requiredAssets: scenes.length,
      finalReady: approved()
        && sceneCountValid
        && Boolean(cover.url && cover.productionReady)
        && completeAssets === scenes.length
        && scenes.length > 0,
    };
  }

  function sheet(content, className = '') {
    return `<section class="sheet ${className}">${content}</section>`;
  }

  function emptyState(title, message, actions = '') {
    $('#book').innerHTML = `<div class="empty"><div class="empty-card"><h1>${esc(title)}</h1><p>${esc(message)}</p><div class="empty-actions">${actions}</div></div></div>`;
    $('#bookStatus').textContent = title;
    $('#reviewPdfBtn').disabled = true;
    $('#finalPdfBtn').disabled = true;
    $('#printBtn').disabled = true;
  }

  function setEditionUi() {
    document.body.classList.add(`edition-${edition}`);
    $('#storyEditionTab')?.classList.toggle('active', edition === 'story');
    $('#coloringEditionTab')?.classList.toggle('active', edition === 'coloring');
    $('#editionTitle').textContent = edition === 'story' ? 'نسخة القصة' : 'نسخة التلوين';
    $('#productionToggle').style.display = edition === 'story' ? '' : 'none';
    $('#reviewPdfBtn').textContent = edition === 'story' ? 'PDF قصة للمراجعة' : 'PDF تلوين للمراجعة';
    $('#finalPdfBtn').textContent = edition === 'story' ? 'PDF القصة النهائي' : 'PDF التلوين النهائي';
  }

  function renderReadiness(state) {
    const mode = !state.approvalValid || !state.sceneCountValid
      ? 'error'
      : state.finalReady
        ? 'good'
        : 'warning';
    const editionName = edition === 'story' ? 'نسخة القصة' : 'نسخة التلوين';
    const title = mode === 'good'
      ? `${editionName} جاهزة للـPDF النهائي`
      : mode === 'warning'
        ? `${editionName} متاحة للمراجعة فقط`
        : `${editionName} غير جاهزة`;
    const message = mode === 'good'
      ? edition === 'story'
        ? 'اكتملت صور القصة الملونة وتم اعتماد النص.'
        : 'اكتملت جميع رسومات التلوين الصافية دون نصوص داخل الصفحات.'
      : mode === 'warning'
        ? 'يمكن تنزيل PDF للمراجعة، لكن التصدير النهائي ينتظر الأصول الإنتاجية الكاملة.'
        : 'أكمل اعتماد ولي الأمر وعدد المشاهد المطلوب أولًا.';
    $('#readiness').innerHTML = `<div class="ready-card ${mode}"><div><h2>${esc(title)}</h2><p>${esc(message)}</p></div><div class="ready-stats"><span class="edition-name">${esc(editionName)}</span><span>${state.scenes.length}/${state.expected} مشاهد</span><span>${state.completeAssets}/${state.requiredAssets} أصول إنتاجية</span><span>${state.previewAssets}/${state.requiredAssets} معاينات</span></div></div>`;
  }

  function dialogueMarkup(dialogue) {
    if (!Array.isArray(dialogue) || !dialogue.length) return '';
    return `<div class="dialogues">${dialogue.slice(0, 4).map((line) => `<div class="dialogue">${esc(line)}</div>`).join('')}</div>`;
  }

  function storyVisual(scene) {
    const image = storyAsset(scene);
    if (image.url) return `<img src="${esc(image.url)}" alt="${esc(scene.title)}" crossorigin="anonymous">`;
    return '<div class="visual-placeholder"><div><b>صورة المشهد قيد الإنتاج</b><p>تظهر هذه المساحة في نسخة المراجعة فقط.</p></div></div>';
  }

  function coloringVisual(scene) {
    const image = coloringAsset(scene);
    if (image.url) return `<img src="${esc(image.url)}" alt="" crossorigin="anonymous">`;
    return '<div class="coloring-only-placeholder" aria-hidden="true"></div>';
  }

  function buildStoryEdition(value, state) {
    const selectedTheme = theme();
    const title = clean(value.title || draft.customTitle || 'قصة من إبداع الطفل');
    const hero = clean(draft.heroName || draft.childName || 'البطل الصغير');
    const cover = coverAsset();
    const heroArt = heroAsset();
    const pages = [];

    pages.push(sheet(`
      <img class="cover-bg" src="${esc(cover.url || selectedTheme.cover)}" alt="غلاف الكتاب" crossorigin="anonymous">
      <div class="shade"></div>
      <div class="cover-top"><img class="logo" src="public/brand/colorverse-logo-full.webp" alt="ColorVerse"><span class="chip">نسخة القصة</span></div>
      <div class="hero-photo ${heroArt.url ? '' : 'placeholder'}">${heroArt.url ? `<img src="${esc(heroArt.url)}" alt="البطل" crossorigin="anonymous">` : '<span>صورة البطل<br>قيد الإنتاج</span>'}</div>
      <div class="cover-copy"><h1>${esc(title)}</h1><p>${esc(value.creativeCredit || `فكرة وتأليف: ${draft.childName}`)}</p><small>بطولة ${esc(hero)} • ${esc(selectedTheme.label)}</small></div>
    `, 'cover'));

    const approvedAt = draft.parentReview?.approvedAt
      ? new Date(draft.parentReview.approvedAt).toLocaleString('ar-SA')
      : 'معتمد';
    pages.push(sheet(`
      <div class="center-page">
        <img class="logo" src="public/brand/colorverse-logo-full.webp" alt="ColorVerse">
        <h2>${esc(title)}</h2>
        <p>صُنعت هذه القصة من خيال ${esc(draft.childName)}، ثم روجعت نصوصها مشهدًا مشهدًا قبل إعداد نسخة القراءة.</p>
        <div class="credit">✍️ ${esc(value.creativeCredit || `فكرة وتأليف: ${draft.childName}`)}</div>
        <div class="meta"><div><span>اسم البطل</span><b>${esc(hero)}</b></div><div><span>العمر</span><b>${esc(draft.age)} سنوات</b></div><div><span>القيمة التربوية</span><b>${esc(value.moral || draft.moral)}</b></div><div><span>عدد المشاهد</span><b>${value.scenes.length}</b></div></div>
        <div class="approval-stamp">✓ تمت مراجعة ولي الأمر واعتماد النسخة بتاريخ ${esc(approvedAt)}</div>
      </div>
    `, 'opening'));

    value.scenes.forEach((scene) => {
      pages.push(sheet(`
        <div class="page-inner">
          <div class="page-head"><img class="mini-logo" src="public/brand/colorverse-logo-full.webp" alt="ColorVerse"><span class="scene-chip">المشهد ${scene.sceneNumber}</span></div>
          <div class="scene-visual">${storyVisual(scene)}</div>
          <div class="story-box"><h3>${esc(scene.title)}</h3><p>${esc(scene.storyText)}</p>${dialogueMarkup(scene.dialogue)}</div>
          <div class="production-note"><b>وصف الصورة:</b> ${esc(scene.illustrationPrompt || 'غير متوفر')}</div>
          <span class="page-num">${pages.length + 1}</span>
        </div>
      `, 'story-page'));
    });

    pages.push(sheet(`
      <div class="center-page ending"><img class="logo" src="public/brand/colorverse-logo-full.webp" alt="ColorVerse"><h2>أحسنت يا ${esc(draft.childName)}!</h2><p>أنت صاحب الفكرة ومؤلف هذه القصة. القراءة والكتابة تجعل الخيال أكبر في كل مغامرة جديدة.</p><div class="reflection">${esc(value.endingReflection || 'ما الفكرة التي ستضيفها إلى قصتك القادمة؟')}</div><div class="signature"><span>توقيع المؤلف الصغير</span><strong>${esc(draft.childName)}</strong></div></div>
    `, 'ending'));
    return pages;
  }

  function buildColoringEdition(value) {
    const selectedTheme = theme();
    const title = clean(value.title || draft.customTitle || 'كتاب التلوين');
    const cover = coverAsset();
    const pages = [];

    pages.push(sheet(`
      <img class="cover-bg" src="${esc(cover.url || selectedTheme.cover)}" alt="غلاف كتاب التلوين" crossorigin="anonymous">
      <div class="shade"></div>
      <div class="cover-top"><img class="logo" src="public/brand/colorverse-logo-full.webp" alt="ColorVerse"><span class="chip">نسخة التلوين</span></div>
      <div class="cover-copy"><h1>${esc(title)}</h1><p>كتاب تلوين ${esc(draft.childName)}</p><small>${esc(selectedTheme.label)} • رسومات مطابقة للقصة</small></div>
    `, 'cover coloring-cover'));

    value.scenes.forEach((scene) => {
      pages.push(sheet(`<div class="coloring-only-art">${coloringVisual(scene)}</div>`, 'coloring-only-page'));
    });
    return pages;
  }

  function buildBook() {
    setEditionUi();
    const value = story();
    if (!draft.childName || !draft.template || !value) {
      emptyState('لا توجد قصة معتمدة', 'ارجع إلى الاستوديو وأنشئ القصة ثم اعتمدها قبل فتح نسختي الكتاب.', '<a class="btn primary" href="create-ai-review.html">فتح مراجعة القصة</a>');
      return;
    }
    if (!approved()) {
      emptyState('موافقة ولي الأمر مطلوبة', 'لن ينشئ ColorVerse أي نسخة PDF قبل مراجعة ولي الأمر للنصوص.', '<a class="btn primary" href="create-ai-review.html">مراجعة القصة واعتمادها</a>');
      return;
    }

    const state = readiness(value);
    if (!state.sceneCountValid) {
      emptyState('عدد المشاهد غير مكتمل', `القصة تحتوي ${value.scenes.length} مشهدًا بينما الكتاب مضبوط على ${state.expected}.`, '<a class="btn primary" href="create-ai-review.html">العودة للمراجعة</a>');
      return;
    }

    const pages = edition === 'story'
      ? buildStoryEdition(value, state)
      : buildColoringEdition(value, state);
    $('#book').innerHTML = pages.join('');
    $('#bookStatus').textContent = `${pages.length} صفحة • الإصدار ${BOOK_VERSION}`;
    $('#reviewPdfBtn').disabled = false;
    $('#finalPdfBtn').disabled = !state.finalReady;
    $('#printBtn').disabled = !state.finalReady;
    renderReadiness(state);
  }

  async function waitForAssets() {
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all([...document.images].map(async (image) => {
      if (image.complete) return;
      try { await image.decode(); } catch {}
    }));
  }

  function fileName(kind) {
    const child = clean(draft.childName || 'book').replace(/[^\p{L}\p{N}_-]+/gu, '-');
    const title = clean(draft.generatedStory?.title || 'story').replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 45);
    return `ColorVerse-${child}-${title}-${edition}-${kind}.pdf`;
  }

  async function exportPdf(kind) {
    const state = readiness(story());
    if (kind === 'final' && !state.finalReady) {
      window.alert(edition === 'story'
        ? 'لا يمكن إنشاء PDF القصة النهائي قبل اكتمال الصور الملونة الإنتاجية.'
        : 'لا يمكن إنشاء PDF التلوين النهائي قبل اكتمال كل الرسومات الخطية الإنتاجية.');
      return;
    }
    const button = kind === 'final' ? $('#finalPdfBtn') : $('#reviewPdfBtn');
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'جاري إنشاء PDF…';
    try {
      if (!window.html2pdf) throw new Error('PDF library unavailable');
      document.body.classList.toggle('production-hidden', kind === 'final');
      await waitForAssets();
      await window.html2pdf().set({
        margin: 0,
        filename: fileName(kind),
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
        pagebreak: { mode: ['css', 'legacy'] },
      }).from($('#book')).save();
    } catch {
      window.alert('تعذر التنزيل المباشر. تأكد من تحميل الصور ثم أعد المحاولة.');
    } finally {
      document.body.classList.remove('production-hidden');
      button.disabled = kind === 'final' ? !readiness(story()).finalReady : false;
      button.textContent = original;
    }
  }

  $('#productionToggle')?.addEventListener('click', () => {
    const hidden = document.body.classList.toggle('production-hidden');
    $('#productionToggle').textContent = hidden ? 'إظهار ملاحظات الإنتاج' : 'إخفاء ملاحظات الإنتاج';
  });
  $('#printBtn')?.addEventListener('click', () => {
    if (readiness(story()).finalReady) window.print();
  });
  $('#reviewPdfBtn')?.addEventListener('click', () => exportPdf('review'));
  $('#finalPdfBtn')?.addEventListener('click', () => exportPdf('final'));

  buildBook();
})();
