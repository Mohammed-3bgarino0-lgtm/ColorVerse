(() => {
  'use strict';

  const DRAFT_KEY = 'colorverse-book-draft-v3';
  const REVIEW_VERSION = 1;
  const busy = new Set();
  let state = {};

  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));
  const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

  function load() {
    try { state = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') || {}; } catch { state = {}; }
  }

  function save() {
    state.updatedAt = new Date().toISOString();
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state)); } catch {}
  }

  function scenes() {
    return Array.isArray(state.generatedStory?.scenes) ? state.generatedStory.scenes : [];
  }

  function ensureReview() {
    const current = state.imageReview && typeof state.imageReview === 'object' ? state.imageReview : {};
    const reviewScenes = current.scenes && typeof current.scenes === 'object' ? current.scenes : {};
    for (const scene of scenes()) {
      const key = String(scene.sceneNumber);
      reviewScenes[key] = {
        storyApproved: Boolean(reviewScenes[key]?.storyApproved),
        coloringApproved: Boolean(reviewScenes[key]?.coloringApproved),
        pairMatched: Boolean(reviewScenes[key]?.pairMatched),
        note: clean(reviewScenes[key]?.note),
        updatedAt: reviewScenes[key]?.updatedAt || null,
      };
    }
    state.imageReview = {
      version: REVIEW_VERSION,
      approved: Boolean(current.approved),
      approvedAt: current.approvedAt || null,
      hero: { approved: Boolean(current.hero?.approved), note: clean(current.hero?.note), updatedAt: current.hero?.updatedAt || null },
      cover: { approved: Boolean(current.cover?.approved), note: clean(current.cover?.note), updatedAt: current.cover?.updatedAt || null },
      scenes: reviewScenes,
      lastChangedAt: current.lastChangedAt || new Date().toISOString(),
    };
  }

  function asset(kind, sceneNumber) {
    if (kind === 'hero') return state.generatedHero;
    if (kind === 'cover') return state.generatedCover;
    const pair = state.generatedImages?.[String(sceneNumber)] || state.generatedImages?.[sceneNumber];
    return pair?.[kind];
  }

  function productionReady(value) {
    return Boolean(value?.url && value?.productionReady === true);
  }

  function allProductionReady() {
    if (!productionReady(asset('hero')) || !productionReady(asset('cover'))) return false;
    return scenes().every((scene) => productionReady(asset('story', scene.sceneNumber)) && productionReady(asset('coloring', scene.sceneNumber)));
  }

  function approvalStats() {
    const total = 2 + scenes().length * 3;
    let approved = Number(state.imageReview.hero.approved) + Number(state.imageReview.cover.approved);
    for (const scene of scenes()) {
      const item = state.imageReview.scenes[String(scene.sceneNumber)] || {};
      approved += Number(item.storyApproved) + Number(item.coloringApproved) + Number(item.pairMatched);
    }
    return { total, approved, percent: total ? Math.round((approved / total) * 100) : 0 };
  }

  function allApprovalsComplete() {
    const stats = approvalStats();
    return stats.total > 2 && stats.approved === stats.total;
  }

  function finalReady() {
    return allApprovalsComplete() && allProductionReady();
  }

  function imageMarkup(value, label) {
    if (!value?.url) return `<div class="visual"><div class="error">الصورة غير متوفرة.</div><span class="visual-label">${esc(label)}</span></div>`;
    return `<div class="visual"><img src="${esc(value.url)}" alt="${esc(label)}" crossorigin="anonymous"><span class="visual-label">${esc(label)}</span></div>`;
  }

  function approvalCheckbox(id, checked, label) {
    return `<label class="checkline"><input type="checkbox" id="${esc(id)}" ${checked ? 'checked' : ''}><span>${esc(label)}</span></label>`;
  }

  function regenerateButton(kind, sceneNumber, label) {
    const key = `${kind}:${sceneNumber || 0}`;
    const isBusy = busy.has(key);
    return `<button class="btn regenerate ${isBusy ? 'loading' : ''}" type="button" data-regenerate="${esc(kind)}" ${sceneNumber ? `data-scene="${sceneNumber}"` : ''} ${isBusy ? 'disabled' : ''}>${esc(isBusy ? 'جارٍ إعادة التوليد' : label)}</button>`;
  }

  function renderPrimaryAssets() {
    const hero = state.generatedHero;
    const cover = state.generatedCover;
    return `<div class="section-title"><h2>الشخصية والغلاف</h2><p>اعتمد مرجع البطل أولًا، ثم تأكد أن الغلاف يستخدم الشخصية نفسها دون تغير.</p></div>
      <article class="asset-card"><div class="asset-head"><div><h3>مرجع شخصية البطل</h3><p>هذا المرجع يحدد الوجه والشعر والملابس والألوان في جميع المشاهد.</p></div><span class="badge ${state.imageReview.hero.approved ? 'good' : ''}">${state.imageReview.hero.approved ? 'معتمد' : 'بانتظار المراجعة'}</span></div><div class="single-asset">${imageMarkup(hero, 'شخصية البطل')}<div class="asset-controls">${approvalCheckbox('approveHero', state.imageReview.hero.approved, 'أوافق أن شكل البطل مناسب وثابت لاستخدامه في الغلاف والمشاهد.') }<div class="note-field"><label for="heroNote">ملاحظة اختيارية</label><textarea id="heroNote" maxlength="400">${esc(state.imageReview.hero.note)}</textarea></div><div class="actions">${regenerateButton('hero', undefined, 'إعادة توليد البطل')}</div>${!productionReady(hero) ? '<div class="notice">هذا أصل تجريبي، لذلك لا يفتح PDF النهائي.</div>' : ''}</div></div></article>
      <article class="asset-card"><div class="asset-head"><div><h3>غلاف الكتاب</h3><p>راجع حضور البطل والمساحة المخصصة لعنوان القصة دون كتابة مولدة داخل الصورة.</p></div><span class="badge ${state.imageReview.cover.approved ? 'good' : ''}">${state.imageReview.cover.approved ? 'معتمد' : 'بانتظار المراجعة'}</span></div><div class="single-asset">${imageMarkup(cover, 'غلاف القصة')}<div class="asset-controls">${approvalCheckbox('approveCover', state.imageReview.cover.approved, 'أوافق أن الغلاف يطابق البطل وعالم القصة ويترك مساحة مناسبة للعنوان.') }<div class="note-field"><label for="coverNote">ملاحظة اختيارية</label><textarea id="coverNote" maxlength="400">${esc(state.imageReview.cover.note)}</textarea></div><div class="actions">${regenerateButton('cover', undefined, 'إعادة توليد الغلاف')}</div>${!productionReady(cover) ? '<div class="notice">هذا أصل تجريبي، لذلك لا يفتح PDF النهائي.</div>' : ''}</div></div></article>`;
  }

  function renderScene(scene) {
    const number = scene.sceneNumber;
    const key = String(number);
    const review = state.imageReview.scenes[key];
    const storyAsset = asset('story', number);
    const coloringAsset = asset('coloring', number);
    const complete = review.storyApproved && review.coloringApproved && review.pairMatched;
    return `<article class="asset-card" data-scene-card="${number}"><div class="asset-head"><div><h3>المشهد ${number}: ${esc(scene.title)}</h3><p>قارن الشخصيات والوضعية والأشياء وزاوية الكاميرا بين النسختين.</p></div><span class="badge ${complete ? 'good' : ''}">${complete ? 'معتمد بالكامل' : 'يحتاج مراجعة'}</span></div><div class="scene-pair"><div><div class="asset-head"><b>الصورة الملونة</b></div>${imageMarkup(storyAsset, `القصة ${number}`)}<div class="asset-controls">${approvalCheckbox(`story-${number}`, review.storyApproved, 'الصورة مناسبة للنص والعمر وتحافظ على شكل البطل.') }<div class="actions">${regenerateButton('story', number, 'إعادة توليد الصورة الملونة')}</div>${!productionReady(storyAsset) ? '<div class="notice">صورة تجريبية غير صالحة للنسخة النهائية.</div>' : ''}</div></div><div><div class="asset-head"><b>رسمة التلوين</b></div>${imageMarkup(coloringAsset, `التلوين ${number}`)}<div class="asset-controls">${approvalCheckbox(`coloring-${number}`, review.coloringApproved, 'الرسمة نظيفة وبلا نصوص أو أرقام ومناسبة للتلوين.') }<div class="actions">${regenerateButton('coloring', number, 'إعادة توليد صفحة التلوين')}</div>${!productionReady(coloringAsset) ? '<div class="notice">رسمة تجريبية غير صالحة للنسخة النهائية.</div>' : ''}</div></div></div><div class="pair-check">${approvalCheckbox(`pair-${number}`, review.pairMatched, 'أؤكد أن رسمة التلوين تطابق الصورة الملونة في الشخصيات والوضعية والعناصر الأساسية.') }<div class="note-field"><label for="note-${number}">ملاحظة المشهد</label><textarea id="note-${number}" maxlength="500">${esc(review.note)}</textarea></div></div></article>`;
  }

  function renderSummary() {
    const stats = approvalStats();
    const readyAssets = [asset('hero'), asset('cover'), ...scenes().flatMap((scene) => [asset('story', scene.sceneNumber), asset('coloring', scene.sceneNumber)])].filter(productionReady).length;
    const totalAssets = 2 + scenes().length * 2;
    $('#score').innerHTML = `<b>${stats.percent}%</b><span>مكتمل</span>`;
    $('#summary').innerHTML = `<div class="summary-card"><span>بنود الاعتماد</span><b>${stats.approved}/${stats.total}</b></div><div class="summary-card ${allProductionReady() ? 'good' : 'warning'}"><span>الأصول الإنتاجية</span><b>${readyAssets}/${totalAssets}</b></div><div class="summary-card"><span>المشاهد</span><b>${scenes().length}</b></div><div class="summary-card ${finalReady() ? 'good' : 'warning'}"><span>حالة PDF النهائي</span><b>${finalReady() ? 'جاهز' : 'مغلق'}</b></div>`;
  }

  function updateFinalControls() {
    const ready = finalReady();
    const approved = state.imageReview.approved === true && ready;
    $('#approveAll').disabled = !ready;
    $('#approveAll').textContent = approved ? 'تم اعتماد الصور ✓' : 'اعتماد الصور وفتح PDF النهائي';
    $('#approvalTitle').textContent = approved ? 'اكتملت المراجعة البصرية' : ready ? 'جميع الصور جاهزة للاعتماد' : 'المراجعة غير مكتملة';
    $('#approvalMessage').textContent = approved ? 'يمكن الآن فتح نسختي القصة والتلوين وتصدير PDF النهائي.' : allApprovalsComplete() && !allProductionReady() ? 'الموافقات مكتملة، لكن توجد صور تجريبية أو ناقصة.' : 'اعتمد البطل والغلاف وكل صورة وتأكد من تطابق التلوين.';
    for (const id of ['storyBookLink', 'coloringBookLink']) {
      const link = $(`#${id}`);
      link.classList.toggle('disabled', !approved);
      link.setAttribute('aria-disabled', approved ? 'false' : 'true');
    }
    $('#reviewStatus').textContent = approved ? 'تم اعتماد جميع الأصول' : `${approvalStats().approved} من ${approvalStats().total} بندًا معتمدًا`;
  }

  function render() {
    ensureReview();
    renderSummary();
    $('#assets').innerHTML = renderPrimaryAssets() + `<div class="section-title"><h2>مشاهد القصة والتلوين</h2><p>يجب اعتماد الصورتين وتأكيد التطابق في كل مشهد.</p></div>` + scenes().map(renderScene).join('');
    updateFinalControls();
    bindEvents();
  }

  function touchReview() {
    state.imageReview.approved = false;
    state.imageReview.approvedAt = null;
    state.imageReview.lastChangedAt = new Date().toISOString();
    save();
  }

  function bindApproval(id, callback) {
    const input = $(`#${id}`);
    input?.addEventListener('change', () => {
      callback(Boolean(input.checked));
      touchReview();
      render();
    });
  }

  function bindEvents() {
    bindApproval('approveHero', (value) => { state.imageReview.hero.approved = value; state.imageReview.hero.updatedAt = new Date().toISOString(); });
    bindApproval('approveCover', (value) => { state.imageReview.cover.approved = value; state.imageReview.cover.updatedAt = new Date().toISOString(); });
    $('#heroNote')?.addEventListener('change', (event) => { state.imageReview.hero.note = clean(event.target.value); touchReview(); });
    $('#coverNote')?.addEventListener('change', (event) => { state.imageReview.cover.note = clean(event.target.value); touchReview(); });
    for (const scene of scenes()) {
      const number = scene.sceneNumber;
      const item = state.imageReview.scenes[String(number)];
      bindApproval(`story-${number}`, (value) => { item.storyApproved = value; item.updatedAt = new Date().toISOString(); });
      bindApproval(`coloring-${number}`, (value) => { item.coloringApproved = value; item.updatedAt = new Date().toISOString(); });
      bindApproval(`pair-${number}`, (value) => { item.pairMatched = value; item.updatedAt = new Date().toISOString(); });
      $(`#note-${number}`)?.addEventListener('change', (event) => { item.note = clean(event.target.value); item.updatedAt = new Date().toISOString(); touchReview(); });
    }
    document.querySelectorAll('[data-regenerate]').forEach((button) => button.addEventListener('click', () => regenerate(button.dataset.regenerate, Number(button.dataset.scene) || undefined)));
    $('#approveAll')?.addEventListener('click', approveAll);
  }

  function resetApprovals(keys) {
    for (const key of keys || []) {
      if (key === 'hero') state.imageReview.hero.approved = false;
      else if (key === 'cover') state.imageReview.cover.approved = false;
      else if (key === 'all-story-scenes') Object.values(state.imageReview.scenes).forEach((item) => { item.storyApproved = false; item.pairMatched = false; });
      else if (key === 'all-coloring-scenes') Object.values(state.imageReview.scenes).forEach((item) => { item.coloringApproved = false; item.pairMatched = false; });
      else {
        const [type, sceneNumber] = key.split(':');
        const item = state.imageReview.scenes[sceneNumber];
        if (!item) continue;
        if (type === 'story') item.storyApproved = false;
        if (type === 'coloring') item.coloringApproved = false;
        if (type === 'pair') item.pairMatched = false;
      }
    }
  }

  async function regenerate(kind, sceneNumber) {
    const key = `${kind}:${sceneNumber || 0}`;
    if (busy.has(key)) return;
    const client = window.ColorVerseStoryImages;
    if (!client?.regenerate) {
      window.alert('عميل إعادة توليد الصور غير متاح.');
      return;
    }
    busy.add(key);
    render();
    try {
      const result = await client.regenerate(state, { kind, sceneNumber });
      if (kind === 'hero') state.generatedHero = result.asset;
      else if (kind === 'cover') state.generatedCover = result.asset;
      else {
        const pair = state.generatedImages[String(sceneNumber)] || state.generatedImages[sceneNumber];
        pair[kind] = result.asset;
      }
      resetApprovals(result.invalidatedApprovalKeys);
      touchReview();
    } catch (error) {
      window.alert(error?.message || 'تعذر إعادة توليد الصورة.');
    } finally {
      busy.delete(key);
      render();
    }
  }

  async function syncManifest() {
    if (!state.bookId) return;
    const manifest = {
      bookId: state.bookId,
      edition: 'story',
      title: state.generatedStory?.title,
      childName: state.childName,
      parentReview: state.parentReview,
      imageReview: state.imageReview,
      imageGeneration: state.imageGeneration,
      updatedAt: new Date().toISOString(),
    };
    try {
      await fetch(`/api/drive/books/${encodeURIComponent(state.bookId)}/manifest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(manifest),
      });
    } catch {}
  }

  async function approveAll() {
    if (!finalReady()) return;
    state.imageReview.approved = true;
    state.imageReview.approvedAt = new Date().toISOString();
    state.imageReview.reviewedAssetCount = 2 + scenes().length * 2;
    state.imageReview.reviewedPairCount = scenes().length;
    save();
    await syncManifest();
    render();
  }

  load();
  if (!state.generatedStory?.scenes?.length || !state.generatedImages || !state.generatedHero || !state.generatedCover) {
    $('#assets').innerHTML = '<div class="error">لا توجد صور جاهزة للمراجعة. ارجع إلى الاستوديو وأنشئ نسختي الصور أولًا.</div>';
    $('#reviewStatus').textContent = 'لا توجد أصول';
    $('#approveAll').disabled = true;
    return;
  }
  ensureReview();
  save();
  render();
})();
