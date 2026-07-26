(() => {
  'use strict';

  const DRAFT_KEY = 'colorverse-book-draft-v3';
  const PHOTO_KEY = 'colorverse-child-photo';
  const BOOK_VERSION = 3;
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
  const safeText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

  function loadJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  const draft = loadJson(DRAFT_KEY, {});
  let photo = '';
  try { photo = localStorage.getItem(PHOTO_KEY) || ''; } catch {}

  function template() {
    return templates[draft.template] || templates.space;
  }

  function approvedStory() {
    const story = draft.generatedStory;
    if (!story || !Array.isArray(story.scenes)) return null;
    return story;
  }

  function isParentApproved() {
    return draft.parentReview?.approved === true;
  }

  function outputIncludesColoring() {
    return !['قصة فقط', 'story_only'].includes(draft.output);
  }

  function storyImage(scene) {
    const generated = draft.generatedImages?.[scene.sceneNumber] || draft.generatedImages?.[String(scene.sceneNumber)];
    return safeText(
      scene.imageUrl || scene.image || scene.illustrationUrl || generated?.story || generated?.illustration || '',
    );
  }

  function coloringImage(scene) {
    const generated = draft.generatedImages?.[scene.sceneNumber] || draft.generatedImages?.[String(scene.sceneNumber)];
    return safeText(
      scene.coloringImageUrl || scene.coloringImage || scene.lineArtUrl || generated?.coloring || generated?.lineArt || '',
    );
  }

  function coverImage() {
    return safeText(draft.generatedCover?.url || draft.coverImageUrl || draft.cover || template().cover);
  }

  function heroImage() {
    return safeText(draft.generatedHero?.url || draft.heroImageUrl || photo);
  }

  function inspectReadiness(story) {
    const expected = Number(draft.pages || story?.scenes?.length || 0);
    const scenes = story?.scenes || [];
    const storyImages = scenes.filter((scene) => Boolean(storyImage(scene))).length;
    const coloringRequired = outputIncludesColoring();
    const coloringImages = coloringRequired
      ? scenes.filter((scene) => Boolean(coloringImage(scene))).length
      : scenes.length;
    const sceneCountValid = [8, 12, 16].includes(expected) && scenes.length === expected;
    const approvalValid = isParentApproved();
    const allStoryImagesReady = storyImages === scenes.length && scenes.length > 0;
    const allColoringImagesReady = coloringImages === scenes.length && scenes.length > 0;
    const finalReady = approvalValid && sceneCountValid && allStoryImagesReady && allColoringImagesReady;

    return {
      expected,
      scenes,
      storyImages,
      coloringImages,
      coloringRequired,
      sceneCountValid,
      approvalValid,
      finalReady,
      missingStoryImages: scenes.length - storyImages,
      missingColoringImages: coloringRequired ? scenes.length - coloringImages : 0,
    };
  }

  function sheet(content, className = '') {
    return `<section class="sheet ${className}">${content}</section>`;
  }

  function productionNote(label, prompt) {
    return `<div class="production-note"><b>${esc(label)}:</b> ${esc(prompt || 'لم يُحفظ وصف لهذا المشهد.')}</div>`;
  }

  function emptyState(title, message, actions = '') {
    $('#book').innerHTML = `<div class="empty"><div class="empty-card"><h1>${esc(title)}</h1><p>${esc(message)}</p><div class="empty-actions">${actions}</div></div></div>`;
    $('#bookStatus').textContent = title;
    $('#finalPdfBtn').disabled = true;
    $('#reviewPdfBtn').disabled = true;
  }

  function dialogueMarkup(dialogue) {
    if (!Array.isArray(dialogue) || !dialogue.length) return '';
    return `<div class="dialogues">${dialogue.slice(0, 4).map((line) => `<div class="dialogue">${esc(line)}</div>`).join('')}</div>`;
  }

  function storyVisual(scene) {
    const image = storyImage(scene);
    if (image) return `<img src="${esc(image)}" alt="${esc(scene.title)}" crossorigin="anonymous">`;
    return `<div class="visual-placeholder"><div><b>صورة المشهد ${scene.sceneNumber}</b><p>ستُنشأ الصورة من وصف المشهد بعد ربط محرك الصور.</p></div></div>`;
  }

  function coloringVisual(scene) {
    const image = coloringImage(scene);
    if (image) return `<img src="${esc(image)}" alt="صفحة تلوين ${esc(scene.title)}" crossorigin="anonymous">`;
    return `<div class="line-placeholder"><div><b>صفحة التلوين ${scene.sceneNumber}</b><p>سيُحوّل المشهد نفسه إلى خطوط سوداء واضحة ومتطابقة مع شخصيات القصة.</p></div></div>`;
  }

  function renderReadiness(readiness) {
    const missing = readiness.missingStoryImages + readiness.missingColoringImages;
    const mode = !readiness.approvalValid || !readiness.sceneCountValid
      ? 'error'
      : missing > 0
        ? 'warning'
        : 'good';
    const title = mode === 'good'
      ? 'الكتاب جاهز للـPDF النهائي'
      : mode === 'warning'
        ? 'نسخة النص جاهزة، والصور ما زالت قيد الإنتاج'
        : 'الكتاب غير جاهز للاعتماد';
    const message = mode === 'good'
      ? 'تمت موافقة ولي الأمر واكتملت صور القصة وصفحات التلوين.'
      : mode === 'warning'
        ? 'يمكن تنزيل PDF للمراجعة الآن. يتفعّل PDF النهائي تلقائيًا بعد إضافة كل الصور المطلوبة.'
        : 'ارجع إلى مراجعة القصة وأكمل الاعتماد وعدد المشاهد المطلوب.';

    $('#readiness').innerHTML = `<div class="ready-card ${mode}"><div><h2>${title}</h2><p>${message}</p></div><div class="ready-stats"><span>${readiness.scenes.length}/${readiness.expected} مشاهد</span><span>${readiness.storyImages}/${readiness.scenes.length} صور قصة</span>${readiness.coloringRequired ? `<span>${readiness.coloringImages}/${readiness.scenes.length} صفحات تلوين</span>` : ''}</div></div>`;
  }

  function buildBook() {
    const story = approvedStory();
    if (!draft.childName || !draft.template || !story) {
      emptyState(
        'لا توجد قصة معتمدة',
        'ارجع إلى استوديو المراجعة، أنشئ القصة ثم اعتمدها قبل فتح قالب الكتاب.',
        '<a class="btn primary" href="create-ai-review.html">فتح مراجعة القصة</a>',
      );
      return;
    }

    if (!isParentApproved()) {
      emptyState(
        'موافقة ولي الأمر مطلوبة',
        'لن ينشئ ColorVerse نسخة PDF من قصة لم يراجعها ولي الأمر ويعتمد نصوصها.',
        '<a class="btn primary" href="create-ai-review.html">مراجعة القصة واعتمادها</a>',
      );
      return;
    }

    const readiness = inspectReadiness(story);
    if (!readiness.sceneCountValid) {
      emptyState(
        'عدد المشاهد غير مكتمل',
        `القصة المعتمدة تحتوي ${story.scenes.length} مشهدًا، بينما الكتاب مضبوط على ${readiness.expected}. أعد توليد القصة أو عدّل عدد الصفحات.`,
        '<a class="btn primary" href="create-ai-review.html">العودة للمراجعة</a>',
      );
      return;
    }

    const theme = template();
    const title = safeText(story.title || draft.customTitle || 'قصة من إبداع الطفل');
    const hero = safeText(draft.heroName || draft.childName || 'البطل الصغير');
    const cover = coverImage();
    const heroArt = heroImage();
    const pages = [];

    pages.push(sheet(`
      <img class="cover-bg" src="${esc(cover)}" alt="غلاف الكتاب" crossorigin="anonymous">
      <div class="shade"></div>
      <div class="cover-top"><img class="logo" src="public/brand/colorverse-logo-full.webp" alt="ColorVerse"><span class="chip">${esc(draft.coverStyle || 'غلاف أساسي')}</span></div>
      <div class="hero-photo ${heroArt ? '' : 'placeholder'}">${heroArt ? `<img src="${esc(heroArt)}" alt="البطل" crossorigin="anonymous">` : '<span>صورة البطل<br>قيد الإنتاج</span>'}</div>
      <div class="cover-copy"><h1>${esc(title)}</h1><p>${esc(story.creativeCredit || `فكرة وتأليف: ${draft.childName}`)}</p><small>بطولة ${esc(hero)} • ${esc(theme.label)}</small></div>
    `, 'cover'));

    const approvedAt = draft.parentReview?.approvedAt
      ? new Date(draft.parentReview.approvedAt).toLocaleString('ar-SA')
      : 'معتمد';
    pages.push(sheet(`
      <div class="center-page">
        <img class="logo" src="public/brand/colorverse-logo-full.webp" alt="ColorVerse">
        <h2>${esc(title)}</h2>
        <p>صُنعت هذه القصة من خيال ${esc(draft.childName)}، ثم روجعت نصوصها مشهدًا مشهدًا قبل إعداد الكتاب للطباعة.</p>
        <div class="credit">✍️ ${esc(story.creativeCredit || `فكرة وتأليف: ${draft.childName}`)}</div>
        <div class="meta">
          <div><span>اسم البطل</span><b>${esc(hero)}</b></div>
          <div><span>العمر</span><b>${esc(draft.age)} سنوات</b></div>
          <div><span>القيمة التربوية</span><b>${esc(story.moral || draft.moral)}</b></div>
          <div><span>عدد المشاهد</span><b>${story.scenes.length}</b></div>
        </div>
        <div class="approval-stamp">✓ تمت مراجعة ولي الأمر واعتماد النسخة بتاريخ ${esc(approvedAt)}</div>
      </div>
    `, 'opening'));

    story.scenes.forEach((scene) => {
      pages.push(sheet(`
        <div class="page-inner">
          <div class="page-head"><img class="mini-logo" src="public/brand/colorverse-logo-full.webp" alt="ColorVerse"><span class="scene-chip">المشهد ${scene.sceneNumber}</span></div>
          <div class="scene-visual">${storyVisual(scene)}</div>
          <div class="story-box"><h3>${esc(scene.title)}</h3><p>${esc(scene.storyText)}</p>${dialogueMarkup(scene.dialogue)}</div>
          ${productionNote('وصف الصورة', scene.illustrationPrompt)}
          <span class="page-num">${pages.length + 1}</span>
        </div>
      `, 'story-page'));

      if (readiness.coloringRequired) {
        pages.push(sheet(`
          <div class="page-inner">
            <div class="page-head"><img class="mini-logo" src="public/brand/colorverse-logo-full.webp" alt="ColorVerse"><span class="scene-chip">صفحة تلوين ${scene.sceneNumber}</span></div>
            <div class="coloring-frame">${coloringVisual(scene)}</div>
            <div class="coloring-title">لوّن مشهد: ${esc(scene.title)}</div>
            ${productionNote('وصف صفحة التلوين', scene.coloringPrompt)}
            <span class="page-num">${pages.length + 1}</span>
          </div>
        `, 'coloring-page'));
      }
    });

    pages.push(sheet(`
      <div class="center-page ending">
        <img class="logo" src="public/brand/colorverse-logo-full.webp" alt="ColorVerse">
        <h2>أحسنت يا ${esc(draft.childName)}!</h2>
        <p>أنت صاحب الفكرة ومؤلف هذه القصة. القراءة والكتابة تجعل الخيال أكبر في كل مغامرة جديدة.</p>
        <div class="reflection">${esc(story.endingReflection || 'ما الفكرة التي ستضيفها إلى قصتك القادمة؟')}</div>
        <div class="signature"><span>توقيع المؤلف الصغير</span><strong>${esc(draft.childName)}</strong></div>
      </div>
    `, 'ending'));

    $('#book').innerHTML = pages.join('');
    $('#bookStatus').textContent = `${pages.length} صفحة • قالب الإصدار ${BOOK_VERSION}`;
    $('#finalPdfBtn').disabled = !readiness.finalReady;
    $('#reviewPdfBtn').disabled = false;
    renderReadiness(readiness);
  }

  async function waitForAssets() {
    if (document.fonts?.ready) await document.fonts.ready;
    const images = [...document.images];
    await Promise.all(images.map(async (image) => {
      if (image.complete) return;
      try { await image.decode(); } catch {}
    }));
  }

  function fileName(kind) {
    const child = safeText(draft.childName || 'book').replace(/[^\p{L}\p{N}_-]+/gu, '-');
    const title = safeText(draft.generatedStory?.title || 'story').replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 45);
    return `ColorVerse-${child}-${title}-${kind}.pdf`;
  }

  async function exportPdf(kind) {
    const button = kind === 'final' ? $('#finalPdfBtn') : $('#reviewPdfBtn');
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'جاري إنشاء PDF…';
    try {
      if (!window.html2pdf) throw new Error('PDF library unavailable');
      if (kind === 'final' && !inspectReadiness(approvedStory()).finalReady) {
        throw new Error('Final assets are incomplete');
      }
      document.body.classList.toggle('production-hidden', kind === 'final');
      await waitForAssets();
      await window.html2pdf().set({
        margin: 0,
        filename: fileName(kind === 'final' ? 'final' : 'review'),
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
        pagebreak: { mode: ['css', 'legacy'] },
      }).from($('#book')).save();
    } catch (error) {
      window.alert(kind === 'final'
        ? 'لا يمكن إنشاء PDF النهائي قبل اكتمال صور القصة وصفحات التلوين.'
        : 'تعذر التنزيل المباشر. استخدم زر طباعة / حفظ PDF.');
    } finally {
      document.body.classList.remove('production-hidden');
      button.disabled = kind === 'final' ? !inspectReadiness(approvedStory()).finalReady : false;
      button.textContent = original;
    }
  }

  $('#productionToggle')?.addEventListener('click', () => {
    const hidden = document.body.classList.toggle('production-hidden');
    $('#productionToggle').textContent = hidden ? 'إظهار ملاحظات الإنتاج' : 'إخفاء ملاحظات الإنتاج';
  });
  $('#printBtn')?.addEventListener('click', () => window.print());
  $('#reviewPdfBtn')?.addEventListener('click', () => exportPdf('review'));
  $('#finalPdfBtn')?.addEventListener('click', () => exportPdf('final'));

  buildBook();
})();
