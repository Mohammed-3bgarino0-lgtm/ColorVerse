(() => {
  'use strict';

  const CATALOG_URL = 'public/data/story-references.json';
  const HISTORY_KEY = 'colorverse-recent-story-references-v1';
  const MAX_HISTORY = 5;

  let catalog = { references: [] };
  let catalogReady = false;
  let refreshTimer = 0;

  const safeJson = (value, fallback) => {
    try { return JSON.parse(value); } catch { return fallback; }
  };

  const normalizeArabic = (value) => String(value || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const containsTerm = (text, term) => {
    const normalized = normalizeArabic(term);
    return normalized.length > 1 && text.includes(normalized);
  };

  const unique = (values) => [...new Set(values.filter(Boolean))];

  function getRecentReferenceIds() {
    try {
      const value = safeJson(localStorage.getItem(HISTORY_KEY) || '[]', []);
      return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }

  function rememberReference(referenceId) {
    if (!referenceId) return;
    try {
      const history = getRecentReferenceIds().filter((id) => id !== referenceId);
      history.unshift(referenceId);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
    } catch {
      // The experience must keep working when storage is unavailable.
    }
  }

  function ageScore(age, range) {
    const numericAge = Number(age);
    if (!Number.isFinite(numericAge) || !range) return 0;
    if (numericAge >= Number(range.min) && numericAge <= Number(range.max)) return 4;
    const distance = numericAge < Number(range.min)
      ? Number(range.min) - numericAge
      : numericAge - Number(range.max);
    if (distance === 1) return 2;
    if (distance === 2) return 1;
    return -2;
  }

  function scoreReference(reference) {
    const text = normalizeArabic([
      state.childStory,
      state.adventure,
      state.moral,
      state.templateTitle,
    ].join(' '));

    const synonyms = {
      'البخل': ['بخيل', 'اناني', 'لا يشارك', 'يحتفظ لنفسه', 'لا يعطي'],
      'الكرم': ['كريم', 'يعطي', 'يتقاسم', 'تقاسم', 'يساعد'],
      'المشاركة': ['يشارك', 'معا', 'نتعاون', 'تقاسم'],
      'الصداقة': ['صديق', 'اصدقاء', 'رفيق'],
      'وفاء الأصدقاء': ['وفي', 'وفاء', 'وقف معه', 'ساعد صديقه', 'لم يترك صديقه'],
      'الشجاعة': ['شجاع', 'خوف', 'واجه', 'جرأة'],
      'الأمانة': ['امين', 'امانه', 'صدق', 'اعاد الشيء'],
      'التعاون': ['تعاون', 'فريق', 'ساعدوا بعضهم'],
    };

    const matchedTopics = (reference.topics || []).filter((topic) => {
      if (containsTerm(text, topic)) return true;
      return (synonyms[topic] || []).some((term) => containsTerm(text, term));
    });
    const matchedKeywords = (reference.keywords || []).filter((keyword) => containsTerm(text, keyword));
    const moralWords = normalizeArabic(reference.moral || '')
      .split(' ')
      .filter((word) => word.length >= 4 && text.includes(word));
    const recentPenalty = getRecentReferenceIds().includes(reference.id) ? -6 : 0;
    const languageValue = state.language === 'ثنائي اللغة' || reference.language === 'bilingual' ||
      (state.language === 'العربية' && reference.language === 'ar') ||
      (state.language === 'English' && reference.language === 'en') ? 2 : -3;

    const parts = {
      topic: matchedTopics.length * 5,
      keyword: matchedKeywords.length * 2,
      moral: Math.min(5, moralWords.length),
      age: ageScore(state.age, reference.ageRange),
      language: languageValue,
      repetitionPenalty: recentPenalty,
    };

    return {
      reference,
      total: Object.values(parts).reduce((sum, value) => sum + value, 0),
      parts,
      matchedTerms: unique([...matchedTopics, ...matchedKeywords, ...moralWords]),
    };
  }

  function rankedReferences() {
    return (catalog.references || [])
      .map(scoreReference)
      .sort((a, b) => b.total - a.total || String(a.reference.id).localeCompare(String(b.reference.id)));
  }

  function weightedPick(items) {
    if (!items.length) return null;
    const weights = items.map((item) => Math.max(1, item.total + 4));
    let cursor = Math.random() * weights.reduce((sum, value) => sum + value, 0);
    for (let index = 0; index < items.length; index += 1) {
      cursor -= weights[index];
      if (cursor <= 0) return items[index];
    }
    return items[items.length - 1];
  }

  function chooseDynamicReference() {
    if (state.creationMode === 'selected_reference') {
      return (catalog.references || []).find((reference) => reference.id === state.referenceId) || null;
    }
    if (state.creationMode !== 'auto_reference') return null;

    const ranked = rankedReferences().filter((item) => item.total > 0);
    if (!ranked.length) return null;
    const best = ranked[0].total;
    const candidates = ranked.filter((item) => item.total >= Math.max(1, best - 3)).slice(0, 3);
    return weightedPick(candidates)?.reference || candidates[0]?.reference || null;
  }

  function splitIdeas(text) {
    return unique(String(text || '')
      .split(/[\n.!؟،,؛;]/)
      .map((part) => part.replace(/\s+/g, ' ').trim())
      .filter((part) => part.length >= 8))
      .slice(0, 6);
  }

  function preservedIdeas() {
    const ideas = splitIdeas(state.childStory);
    if (state.adventure && ideas.length < 5) ideas.push(...splitIdeas(state.adventure));
    const hero = state.heroName || state.childName;
    if (hero) ideas.unshift(`البطل الذي اختاره الطفل: ${hero}`);
    if (state.helper && state.helper !== 'بدون شخصية مساعدة') ideas.push(`الشخصية المساعدة: ${state.helper}`);
    return unique(ideas).slice(0, 6);
  }

  const BEATS = {
    8: [
      ['البداية', 'تقديم البطل والعالم وفكرة الطفل الأساسية'],
      ['الهدف', 'حدث يجعل البطل يبدأ الرحلة'],
      ['المحاولة الأولى', 'حل أول يكشف معلومة جديدة'],
      ['الصديق أو الأداة', 'مساعدة تغير طريقة التفكير'],
      ['العقبة الأكبر', 'نتيجة أو مشكلة ترفع التوتر'],
      ['الاختيار', 'قرار أخلاقي أو شجاع يعبّر عن شخصية الطفل'],
      ['الحل', 'تجتمع أفكار الطفل والخبرة للوصول إلى حل'],
      ['النهاية', 'نتيجة دافئة وسؤال يشجع الطفل على الإبداع'],
    ],
    12: [
      ['البداية', 'تقديم البطل والعالم'],
      ['تفصيل من خيال الطفل', 'إبراز شيء مميز كتبه الطفل'],
      ['الهدف', 'تحديد ما يريده البطل'],
      ['الحدث المحفز', 'ظهور سبب البدء'],
      ['المحاولة الأولى', 'تجربة بسيطة لا تكفي'],
      ['لقاء المساعد', 'صديق أو أداة تضيف منظورًا جديدًا'],
      ['أثر القرار', 'تظهر نتيجة الاختيار السابق'],
      ['العقبة الأكبر', 'اختبار أصعب مرتبط بالقيمة'],
      ['لحظة الفهم', 'يتغير فهم البطل للمشكلة'],
      ['القرار الحاسم', 'اختيار نابع من شخصية الطفل'],
      ['الحل', 'حل أصلي في عالم القصة'],
      ['الخاتمة', 'احتفال وتأمل وفتح باب لفكرة جديدة'],
    ],
    16: [
      ['البداية', 'تقديم البطل'],
      ['العالم', 'تفاصيل المكان والجو'],
      ['رغبة البطل', 'ما الذي يريده ولماذا'],
      ['الإشارة الأولى', 'علامة تدعو للمغامرة'],
      ['الانطلاق', 'قرار بدء الرحلة'],
      ['المحاولة الأولى', 'تجربة تكشف جزءًا من المشكلة'],
      ['لقاء المساعد', 'دخول شخصية مساعدة'],
      ['معلومة جديدة', 'اكتشاف يغير الخطة'],
      ['نتيجة الاختيار', 'ظهور أثر قرار سابق'],
      ['العقبة الوسطى', 'مشكلة تحتاج تعاونًا أو شجاعة'],
      ['التردد', 'لحظة شعورية مناسبة للعمر'],
      ['الفهم', 'إدراك القيمة من خلال الحدث'],
      ['الخطة الأخيرة', 'ترتيب حل أصلي'],
      ['الذروة', 'تنفيذ القرار الحاسم'],
      ['الحل', 'ظهور نتيجة منطقية ودافئة'],
      ['الخاتمة', 'تقدير إبداع الطفل وسؤال لمغامرة جديدة'],
    ],
  };

  function buildDynamicPlan() {
    collect();
    const reference = chooseDynamicReference();
    const ideas = preservedIdeas();
    const value = inferMoral();
    const hero = state.heroName || state.childName || 'البطل الصغير';
    const friend = state.helper || 'صديق وفي';
    const beats = BEATS[Number(state.pages)] || BEATS[8];
    const referenceStructure = reference?.structure || [];

    state.selectedReference = reference ? {
      id: reference.id,
      title: reference.title,
      usage: 'structure_moral_reading_level_only',
      matchedTerms: scoreReference(reference).matchedTerms,
    } : null;
    state.preservedChildIdeas = ideas;
    state.editorContributions = [
      'ترتيب السبب والنتيجة',
      'توزيع التصاعد على الصفحات',
      'إضافة حوار قصير مناسب للعمر',
      'صياغة نهاية تربوية غير مباشرة',
    ];
    state.originalityPolicy = {
      copyText: false,
      copyNames: false,
      copySetting: false,
      copySceneOrder: false,
      referenceInfluence: reference ? 'البنية والقيمة والإيقاع فقط' : 'لا يوجد مرجع خارجي',
    };

    state.storyPlan = beats.map(([titleText, purpose], index) => {
      const childIdea = ideas[index % Math.max(1, ideas.length)] || state.childStory || state.adventure;
      const referenceBeat = referenceStructure[index % Math.max(1, referenceStructure.length)] || '';
      const referenceNote = reference
        ? `يُراعى هنا ${referenceBeat || 'وضوح التصاعد'} من دون تكرار موقف أو مكان من المرجع.`
        : 'يُبنى المشهد بالكامل من فكرة الطفل.';

      return {
        sceneNumber: index + 1,
        title: titleText,
        purpose,
        preservedChildIdea: childIdea,
        text: `${purpose}. يظهر ${hero}${index === 6 || index === 7 ? ` مع ${friend}` : ''} داخل عالم ${state.templateTitle || 'القصة'}، ويُحافظ على عنصر الطفل: ${concise(childIdea, 130)}. ${referenceNote}`,
        referenceInfluence: reference ? 'macro_structure_only' : 'none',
      };
    });

    if (reference) rememberReference(reference.id);
    save();
    return state.storyPlan;
  }

  function referenceLabelDynamic() {
    if (state.creationMode === 'selected_reference') {
      return state.selectedReference ? `مرجع مختار: ${state.selectedReference.title}` : 'مرجع مختار غير متاح';
    }
    if (state.creationMode === 'auto_reference') {
      return state.selectedReference ? `اختيار ذكي: ${state.selectedReference.title}` : 'اختيار ذكي: لا يوجد مرجع مطابق حاليًا';
    }
    if (state.creationMode === 'child_story') return 'تحسين قصة الطفل دون مرجع خارجي';
    return 'فكرة الطفل فقط';
  }

  function renderRankings() {
    const autoBox = document.querySelector('#autoReferenceBox');
    if (!autoBox) return;
    const ranked = rankedReferences().slice(0, 3);
    const cards = ranked.length
      ? ranked.map((item, index) => `<article class="cv-reference-result">
          <div><b>${index + 1}. ${esc(item.reference.title)}</b><small>${esc(item.reference.moral || '')}</small></div>
          <span>${Math.max(0, item.total)} نقطة</span>
          <p>${item.matchedTerms.length ? `مطابق لـ: ${esc(item.matchedTerms.join('، '))}` : 'مطابقة بالعمر ومستوى القراءة.'}</p>
        </article>`).join('')
      : '<p class="cv-reference-empty">لا توجد مراجع مطابقة بعد. ستُبنى القصة من فكرة الطفل فقط.</p>';
    autoBox.innerHTML = `<div class="reference-card"><b>أفضل المراجع المقترحة</b><p>يتم الاختيار عشوائيًا من أفضل النتائج، مع تقليل تكرار المرجع المستخدم مؤخرًا.</p></div><div class="cv-reference-results">${cards}</div>`;
  }

  function renderSelectedReference() {
    const referenceId = document.querySelector('#referenceId')?.value;
    const reference = (catalog.references || []).find((item) => item.id === referenceId);
    const container = document.querySelector('#referenceBox .reference-card');
    if (!container || !reference) return;
    container.innerHTML = `<b>${esc(reference.title)}</b>
      <p>${esc(reference.summary || reference.moral || '')}</p>
      <div class="tags">${(reference.topics || []).slice(0, 6).map((topic) => `<span>${esc(topic)}</span>`).join('')}</div>
      <p class="cv-reference-meta">العمر: ${reference.ageRange?.min || '—'}–${reference.ageRange?.max || '—'} سنوات · التأثير المسموح: البنية والقيمة والإيقاع فقط.</p>`;
  }

  function populateReferenceSelect() {
    const select = document.querySelector('#referenceId');
    if (!select) return;
    const previous = state.referenceId || select.value;
    select.innerHTML = (catalog.references || []).map((reference) =>
      `<option value="${esc(reference.id)}">${esc(reference.title)} — ${esc(reference.moral || '')}</option>`
    ).join('');
    if (previous && (catalog.references || []).some((reference) => reference.id === previous)) select.value = previous;
    state.referenceId = select.value;
    renderSelectedReference();
  }

  function refreshReferenceUi() {
    clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      collect();
      renderRankings();
      renderSelectedReference();
    }, 180);
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .cv-reference-results{display:grid;gap:9px;margin-top:12px}.cv-reference-result{display:grid;grid-template-columns:1fr auto;gap:5px 12px;padding:12px;border:1px solid #e7dff1;border-radius:15px;background:#fff}.cv-reference-result b{display:block}.cv-reference-result small{display:block;margin-top:3px;color:#7e8799}.cv-reference-result>span{align-self:start;padding:5px 8px;border-radius:999px;background:#effcf6;color:#08784f;font-size:11px;font-weight:900}.cv-reference-result p{grid-column:1/-1;margin:2px 0 0;color:#737d91;font-size:12px}.cv-reference-empty{margin:12px 0 0;color:#7a8497}.cv-reference-meta{margin-top:10px!important;font-size:12px!important;color:#737d91!important}.cv-plan-summary{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}.cv-plan-summary>div{padding:14px;border-radius:16px;background:#faf7ff;border:1px solid #e8e0f2}.cv-plan-summary b{display:block;margin-bottom:7px}.cv-plan-summary ul{margin:0;padding-right:18px;color:#616c82;line-height:1.8;font-size:13px}@media(max-width:680px){.cv-plan-summary{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  async function loadCatalog() {
    try {
      const response = await fetch(CATALOG_URL, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const loaded = await response.json();
      catalog = loaded && Array.isArray(loaded.references) ? loaded : { references: [] };
    } catch (error) {
      console.warn('[ColorVerse] Story catalog unavailable; using local fallback.', error);
      catalog = {
        references: [
          {
            ...REFERENCE,
            language: 'ar',
            ageRange: { min: REFERENCE.ageMin, max: REFERENCE.ageMax },
            keywords: REFERENCE.topics,
            summary: REFERENCE.moral,
          },
        ],
      };
    }
    catalogReady = true;
    populateReferenceSelect();
    refreshReferenceUi();
  }

  const originalBuildReview = buildReview;
  window.chooseReference = chooseDynamicReference;
  window.buildPlan = buildDynamicPlan;
  window.referenceLabel = referenceLabelDynamic;
  window.buildReview = function enhancedBuildReview() {
    originalBuildReview();
    const review = document.querySelector('#reviewContent');
    if (!review) return;
    const preserved = (state.preservedChildIdeas || []).map((idea) => `<li>${esc(idea)}</li>`).join('');
    const editor = (state.editorContributions || []).map((item) => `<li>${esc(item)}</li>`).join('');
    review.insertAdjacentHTML('afterbegin', `<div class="cv-plan-summary">
      <div><b>أفكار الطفل المحفوظة</b><ul>${preserved || '<li>سيتم استخراجها من نص الطفل.</li>'}</ul></div>
      <div><b>ما أضافه المحرر</b><ul>${editor || '<li>الترتيب والوضوح فقط.</li>'}</ul></div>
    </div>`);
  };

  injectStyles();
  document.querySelector('#referenceId')?.addEventListener('change', () => {
    state.referenceId = document.querySelector('#referenceId').value;
    renderSelectedReference();
    scheduleSave();
  });
  ['childStory', 'adventure', 'moral', 'age'].forEach((id) => {
    document.querySelector(`#${id}`)?.addEventListener('input', refreshReferenceUi);
  });
  document.querySelectorAll('input[name="creationMode"], input[name="language"]').forEach((input) => {
    input.addEventListener('change', refreshReferenceUi);
  });

  loadCatalog();
  window.ColorVerseStoryStudio = {
    getCatalog: () => catalog,
    isCatalogReady: () => catalogReady,
    rankReferences: rankedReferences,
    chooseReference: chooseDynamicReference,
    buildPlan: buildDynamicPlan,
    getRecentReferenceIds,
  };
})();
