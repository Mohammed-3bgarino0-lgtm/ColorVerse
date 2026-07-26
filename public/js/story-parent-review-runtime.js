(() => {
  'use strict';

  const REVIEW_VERSION = 1;
  const MODE_KEY = 'colorverse-story-ai-mode-v1';
  const API_BASE_KEY = 'colorverse-story-api-base-v1';
  const PROGRESS_STEPS = [
    ['ideas', 'حفظ أفكار الطفل'],
    ['reference', 'اختيار المرجع المناسب'],
    ['writing', 'كتابة القصة والحوارات'],
    ['originality', 'فحص الأصالة وحضور أفكار الطفل'],
    ['review', 'تجهيز مراجعة ولي الأمر'],
  ];

  let generationController = null;
  let progressTimers = [];
  let activeResult = null;
  let originalBuildPreview = typeof buildPreview === 'function' ? buildPreview : null;

  const safeText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const safeHtml = (value) => (typeof esc === 'function'
    ? esc(value)
    : String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
      }[character])));

  function readSetting(key, fallback = '') {
    try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
  }

  function aiMode() {
    const configured = safeText(window.COLORVERSE_STORY_AI_MODE || readSetting(MODE_KEY, 'auto'));
    return ['auto', 'live', 'demo'].includes(configured) ? configured : 'auto';
  }

  function apiEndpoint() {
    const base = safeText(window.COLORVERSE_STORY_API_BASE_URL || readSetting(API_BASE_KEY));
    return base ? `${base.replace(/\/$/, '')}/api/stories/generate` : '/api/stories/generate';
  }

  function clearProgressTimers() {
    progressTimers.forEach((timer) => window.clearTimeout(timer));
    progressTimers = [];
  }

  function injectStyles() {
    if (document.querySelector('#cv-parent-review-styles')) return;
    const style = document.createElement('style');
    style.id = 'cv-parent-review-styles';
    style.textContent = `
      .cv-ai-mode{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border-radius:999px;background:#f4efff;color:#5d36b8;font-size:12px;font-weight:900}.cv-ai-mode.demo{background:#fff4df;color:#9b5c00}.cv-ai-mode.live{background:#eafaf3;color:#08784f}.cv-ai-mode::before{content:'';width:8px;height:8px;border-radius:50%;background:currentColor}.cv-progress{padding:22px;border:1px solid #e9e2f3;border-radius:22px;background:linear-gradient(145deg,#fff,#fbf8ff)}.cv-progress-head{text-align:center;margin-bottom:20px}.cv-progress-head .cv-spinner{width:44px;height:44px;margin:0 auto 12px;border-radius:50%;border:4px solid #eee7fa;border-top-color:#7437ea;animation:cvSpin .9s linear infinite}.cv-progress-head h3{margin:0 0 7px}.cv-progress-head p{margin:0;color:#727d91}.cv-progress-list{display:grid;gap:10px;max-width:680px;margin:auto}.cv-progress-item{display:grid;grid-template-columns:30px 1fr auto;align-items:center;gap:10px;padding:12px 14px;border-radius:15px;background:#f8f6fc;color:#69748a}.cv-progress-item .dot{display:grid;place-items:center;width:27px;height:27px;border-radius:50%;background:#e9e4f2;font-weight:900}.cv-progress-item.active{background:#f1eaff;color:#5f36bb}.cv-progress-item.active .dot{background:#7437ea;color:#fff}.cv-progress-item.done{background:#ebfaf4;color:#08784f}.cv-progress-item.done .dot{background:#14a66d;color:#fff}.cv-progress-item small{font-size:11px}.cv-review-shell{display:grid;gap:16px}.cv-review-banner{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:16px 18px;border-radius:18px;background:#faf7ff;border:1px solid #e7def5}.cv-review-banner h3{margin:0 0 6px}.cv-review-banner p{margin:0;color:#6f7a8f;line-height:1.7}.cv-review-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.cv-review-meta>div{padding:13px;border-radius:15px;background:#fff;border:1px solid #ece6f3}.cv-review-meta span{display:block;font-size:11px;color:#8992a3;margin-bottom:4px}.cv-review-meta b{font-size:13px}.cv-parent-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.cv-parent-field{display:grid;gap:6px}.cv-parent-field.full{grid-column:1/-1}.cv-parent-field label{font-weight:900;font-size:13px}.cv-parent-field input,.cv-parent-field textarea{width:100%;box-sizing:border-box;border:1px solid #ddd5e8;border-radius:13px;padding:11px 12px;font:inherit;background:#fff}.cv-parent-field textarea{min-height:84px;resize:vertical;line-height:1.7}.cv-scene-editor{padding:15px;border-radius:18px;background:#fff;border:1px solid #e8e1f1;display:grid;gap:10px}.cv-scene-editor-head{display:flex;gap:10px;align-items:center}.cv-scene-editor-head span{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#7437ea;color:#fff;font-weight:900}.cv-scene-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.cv-scene-grid .story{grid-column:1/-1}.cv-scene-editor input,.cv-scene-editor textarea{width:100%;box-sizing:border-box;border:1px solid #ddd7e7;border-radius:12px;padding:10px 11px;font:inherit}.cv-scene-editor textarea{min-height:105px;resize:vertical;line-height:1.75}.cv-scene-editor .dialogue textarea{min-height:70px}.cv-count{font-size:11px;color:#8790a0;text-align:left}.cv-originality{padding:14px 16px;border-radius:16px;background:#edfaf5;border:1px solid #cdeedf;color:#08784f}.cv-originality.warning{background:#fff7e8;border-color:#f4dfb5;color:#8b5900}.cv-originality strong{display:block;margin-bottom:5px}.cv-parent-approval{display:flex;align-items:flex-start;gap:10px;padding:15px;border-radius:16px;background:#fff;border:1px solid #ded6e8;font-weight:800;line-height:1.7}.cv-parent-approval input{margin-top:5px;transform:scale(1.2)}.cv-review-error{display:none;padding:12px 14px;border-radius:13px;background:#fff0f0;color:#a32626}.cv-review-error.show{display:block}.cv-error-panel{text-align:center;padding:28px;border:1px solid #f1d1d1;border-radius:20px;background:#fff8f8}.cv-error-panel h3{margin:0 0 8px;color:#a12929}.cv-error-panel p{color:#757e8f;line-height:1.8}.cv-error-actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:16px}.cv-final-story{margin-top:18px;display:grid;gap:10px}.cv-final-scene{padding:13px 14px;border:1px solid #e8e1f1;border-radius:15px;background:#fff}.cv-final-scene b{display:block;margin-bottom:5px}.cv-final-scene p{margin:0;color:#687389;line-height:1.8}.cv-demo-note{padding:12px 14px;border-radius:14px;background:#fff7e8;border:1px solid #f1dfba;color:#885800;font-size:13px;line-height:1.7}@keyframes cvSpin{to{transform:rotate(360deg)}}@media(max-width:760px){.cv-review-meta,.cv-parent-fields,.cv-scene-grid{grid-template-columns:1fr}.cv-parent-field.full,.cv-scene-grid .story{grid-column:auto}.cv-review-banner{display:grid}}
    `;
    document.head.appendChild(style);
  }

  function updateStepHeader(titleText, description, badge) {
    const panel = document.querySelector('#step4');
    if (!panel) return;
    const heading = panel.querySelector('.panel-head h2');
    const paragraph = panel.querySelector('.panel-head p');
    const badgeElement = panel.querySelector('.panel-badge');
    if (heading) heading.textContent = titleText;
    if (paragraph) paragraph.textContent = description;
    if (badgeElement && badge) badgeElement.textContent = badge;
  }

  function setFooterGenerating(isGenerating) {
    const footer = document.querySelector('#step4 .footer-actions');
    if (!footer) return;
    footer.style.display = isGenerating ? 'none' : '';
  }

  function progressMarkup(activeIndex = 0, complete = false) {
    return `<section class="cv-progress" aria-live="polite">
      <div class="cv-progress-head">
        ${complete ? '' : '<div class="cv-spinner" aria-hidden="true"></div>'}
        <h3>${complete ? 'اكتملت القصة' : 'نبني قصة طفلك الآن'}</h3>
        <p>${complete ? 'يتم تجهيزها لمراجعة ولي الأمر.' : 'نحافظ على خيال الطفل ونراجع الأصالة قبل عرض النص.'}</p>
      </div>
      <div class="cv-progress-list">
        ${PROGRESS_STEPS.map(([key, label], index) => {
          const status = complete || index < activeIndex ? 'done' : index === activeIndex ? 'active' : '';
          const icon = status === 'done' ? '✓' : index + 1;
          const statusText = status === 'done' ? 'اكتمل' : status === 'active' ? 'جارٍ الآن' : 'بانتظار';
          return `<div class="cv-progress-item ${status}" data-progress="${key}"><span class="dot">${icon}</span><b>${safeHtml(label)}</b><small>${statusText}</small></div>`;
        }).join('')}
      </div>
    </section>`;
  }

  function renderProgress() {
    updateStepHeader('جارٍ بناء القصة الاحترافية', 'المحرك يكتب القصة ويفحصها قبل عرضها للمراجعة.', '4 من 5');
    setFooterGenerating(true);
    const container = document.querySelector('#reviewContent');
    if (container) container.innerHTML = progressMarkup(0, false);
    clearProgressTimers();
    [1, 2, 3].forEach((step, index) => {
      progressTimers.push(window.setTimeout(() => {
        const current = document.querySelector('#reviewContent');
        if (current && generationController) current.innerHTML = progressMarkup(step, false);
      }, 750 + index * 950));
    });
  }

  function beatTypes(pageCount) {
    const map = {
      8: ['opening', 'goal', 'obstacle', 'helper', 'choice', 'climax', 'resolution', 'reflection'],
      12: ['opening', 'world', 'goal', 'inciting_event', 'attempt', 'helper', 'consequence', 'obstacle', 'realization', 'choice', 'resolution', 'reflection'],
      16: ['opening', 'world', 'goal', 'inciting_event', 'attempt', 'helper', 'consequence', 'obstacle', 'attempt', 'realization', 'choice', 'consequence', 'climax', 'resolution', 'reflection', 'reflection'],
    };
    return map[pageCount] || map[8];
  }

  function demoResult() {
    collect();
    const studio = window.ColorVerseStoryStudio;
    const plan = studio?.buildPlan ? studio.buildPlan() : (state.storyPlan || []);
    const pageCount = Number(state.pages) || 8;
    const hero = safeText(state.heroName || state.childName || 'البطل الصغير');
    const helper = safeText(state.helper || 'صديق وفي');
    const preserved = (state.preservedChildIdeas || [state.childStory, state.adventure]).filter(Boolean).slice(0, 8);
    const types = beatTypes(pageCount);
    const scenes = Array.from({ length: pageCount }, (_, index) => {
      const source = plan[index] || plan[index % Math.max(1, plan.length)] || {};
      const childIdea = safeText(source.preservedChildIdea || preserved[index % Math.max(1, preserved.length)] || state.childStory);
      const purpose = safeText(source.purpose || source.text || 'يتقدم البطل خطوة جديدة في المغامرة.');
      const storyText = `${purpose} يحاول ${hero} استخدام فكرته: ${childIdea || 'حل مبتكر من خيال الطفل'}. ${index === pageCount - 1 ? `وفي النهاية يكتب ${state.childName} فكرة جديدة لمغامرة قادمة.` : `ويتعاون مع ${helper} ليفهم أثر قراره ويتقدم نحو الحل.`}`;
      return {
        sceneNumber: index + 1,
        beatType: types[index] || 'attempt',
        title: safeText(source.title || `المشهد ${index + 1}`),
        storyText,
        dialogue: index % 3 === 1 ? [`قال ${hero}: سنجرب فكرتنا معًا.`] : [],
        illustrationPrompt: `Original children's storybook illustration, scene ${index + 1}, ${hero} and ${helper}, ${state.templateTitle || 'fantasy world'}, consistent character design, warm age-appropriate composition.`,
        coloringPrompt: `Same scene ${index + 1} and same characters as clean black line art for children, white background, clear printable outlines.`,
      };
    });
    const story = {
      title: safeText(state.customTitle || (typeof title === 'function' ? title() : `${hero} في مغامرة مدهشة`)),
      creativeCredit: `فكرة وتأليف: ${state.childName}`,
      preservedChildIdeas: preserved.length ? preserved : [safeText(state.childStory)],
      moral: safeText(state.moral || (typeof inferMoral === 'function' ? inferMoral() : 'التعلم من التجربة')),
      referenceUsed: state.selectedReference ? { id: state.selectedReference.id, influence: 'structure_moral_only' } : null,
      characters: [hero, helper].filter(Boolean),
      setting: safeText(state.templateTitle || 'عالم خيالي أصلي'),
      scenes,
      endingReflection: `ما الفكرة الجديدة التي يرغب ${state.childName} في إضافتها إلى القصة القادمة؟`,
    };
    return {
      ok: true,
      demo: true,
      requestId: `demo_${Date.now()}`,
      story,
      originality: {
        approved: true,
        textSimilarity: 0,
        sceneSequenceSimilarity: 0,
        preservedChildIdeasRatio: 1,
        reusedReferenceNames: [],
        issues: [],
      },
      attempts: [{ attempt: 1, outcome: 'accepted' }],
      provider: { model: 'demo-local', modelVersion: String(REVIEW_VERSION) },
      metadata: {
        creativeCredit: story.creativeCredit,
        referenceId: story.referenceUsed?.id || null,
        referenceTitle: state.selectedReference?.title || null,
        preservedChildIdeas: story.preservedChildIdeas,
        createdAt: new Date().toISOString(),
      },
    };
  }

  async function requestStory() {
    const mode = aiMode();
    if (mode === 'demo') return demoResult();
    if (!window.ColorVerseStoryAI) throw new Error('عميل إنشاء القصص غير محمل.');

    try {
      return await window.ColorVerseStoryAI.generateStory(state, {
        endpoint: apiEndpoint(),
        timeoutMs: 125000,
      });
    } catch (error) {
      const fallbackCodes = new Set(['NETWORK_ERROR', 'NOT_CONFIGURED', 'CLIENT_TIMEOUT']);
      const mayFallback = mode === 'auto' && (fallbackCodes.has(error?.code) || [0, 404, 503].includes(Number(error?.status || 0)));
      if (mayFallback) {
        const demo = demoResult();
        demo.fallbackReason = error?.code || 'SERVER_UNAVAILABLE';
        return demo;
      }
      throw error;
    }
  }

  function applyStoryToState(result) {
    activeResult = result;
    state.generatedStory = result.story;
    state.storyGeneration = {
      requestId: result.requestId,
      demo: Boolean(result.demo),
      fallbackReason: result.fallbackReason || null,
      provider: result.provider || null,
      attempts: result.attempts || [],
      generatedAt: new Date().toISOString(),
    };
    state.originalityReport = result.originality || null;
    state.preservedChildIdeas = result.story.preservedChildIdeas || [];
    state.customTitle = result.story.title;
    state.moral = result.story.moral;
    state.storyPlan = result.story.scenes.map((scene) => ({
      sceneNumber: scene.sceneNumber,
      title: scene.title,
      text: scene.storyText,
      dialogue: scene.dialogue,
      illustrationPrompt: scene.illustrationPrompt,
      coloringPrompt: scene.coloringPrompt,
      beatType: scene.beatType,
    }));
    const titleInput = document.querySelector('#customTitle');
    const moralInput = document.querySelector('#moral');
    if (titleInput) titleInput.value = result.story.title;
    if (moralInput) moralInput.value = result.story.moral;
    save();
  }

  function originalityMarkup(result) {
    const report = result.originality || {};
    const demo = Boolean(result.demo);
    const ratio = Math.round(Number(report.preservedChildIdeasRatio || 0) * 100);
    if (demo) {
      return `<div class="cv-originality warning"><strong>وضع تجريبي محلي</strong>خادم الذكاء الاصطناعي غير متصل، لذلك تم إنشاء نموذج قابل للمراجعة دون استهلاك API. لا يعد هذا فحص الأصالة النهائي.</div>`;
    }
    return `<div class="cv-originality"><strong>اجتازت القصة فحص الأصالة</strong>حضور أفكار الطفل: ${ratio}% · تشابه النص المرجعي: ${Math.round(Number(report.textSimilarity || 0) * 100)}% · لم تُعتمد القصة إلا بعد الفحص.</div>`;
  }

  function sceneEditor(scene) {
    const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue.join('\n') : '';
    return `<article class="cv-scene-editor" data-scene-index="${scene.sceneNumber - 1}">
      <div class="cv-scene-editor-head"><span>${scene.sceneNumber}</span><b>المشهد ${scene.sceneNumber}</b></div>
      <div class="cv-scene-grid">
        <label><b>عنوان المشهد</b><input data-role="title" maxlength="90" value="${safeHtml(scene.title)}"></label>
        <label class="dialogue"><b>الحوار — كل جملة في سطر</b><textarea data-role="dialogue" maxlength="900">${safeHtml(dialogue)}</textarea></label>
        <label class="story"><b>نص المشهد</b><textarea data-role="storyText" maxlength="1000">${safeHtml(scene.storyText)}</textarea><div class="cv-count" data-role="count">${scene.storyText.length}/1000</div></label>
      </div>
    </article>`;
  }

  function renderParentReview(result) {
    clearProgressTimers();
    generationController = null;
    updateStepHeader('مراجعة ولي الأمر', 'راجع النص وعدّله قبل اعتماد الكتاب. لن تنتقل القصة إلى الغلاف والـPDF دون موافقتك.', '4 من 5');
    setFooterGenerating(false);
    const story = result.story;
    const referenceLabel = result.metadata?.referenceTitle || (story.referenceUsed ? story.referenceUsed.id : 'دون مرجع');
    const container = document.querySelector('#reviewContent');
    if (!container) return;
    container.innerHTML = `<section class="cv-review-shell">
      <div class="cv-review-banner">
        <div><h3>${safeHtml(story.title)}</h3><p>يمكن تعديل العنوان والقيمة وكل مشهد. سيظل اسم الطفل مثبتًا بوصفه صاحب الفكرة والتأليف.</p></div>
        <span class="cv-ai-mode ${result.demo ? 'demo' : 'live'}">${result.demo ? 'تجريبي' : 'ذكاء اصطناعي متصل'}</span>
      </div>
      ${result.demo ? '<div class="cv-demo-note">هذه المعاينة تعمل محليًا لأن خادم Node أو مفتاح Gemini غير متاح. عند تشغيل الخادم سيستخدم الزر المسار الحقيقي نفسه تلقائيًا.</div>' : ''}
      <div class="cv-review-meta">
        <div><span>صاحب الفكرة</span><b>${safeHtml(state.childName)}</b></div>
        <div><span>المرجع</span><b>${safeHtml(referenceLabel)}</b></div>
        <div><span>عدد المشاهد</span><b>${story.scenes.length}</b></div>
      </div>
      ${originalityMarkup(result)}
      <div class="cv-parent-fields">
        <div class="cv-parent-field"><label for="cvStoryTitle">عنوان القصة</label><input id="cvStoryTitle" maxlength="100" value="${safeHtml(story.title)}"></div>
        <div class="cv-parent-field"><label>نسبة التأليف</label><input value="${safeHtml(story.creativeCredit)}" readonly></div>
        <div class="cv-parent-field full"><label for="cvStoryMoral">القيمة التربوية</label><textarea id="cvStoryMoral" maxlength="240">${safeHtml(story.moral)}</textarea></div>
        <div class="cv-parent-field full"><label for="cvEndingReflection">سؤال الطفل في النهاية</label><textarea id="cvEndingReflection" maxlength="260">${safeHtml(story.endingReflection)}</textarea></div>
      </div>
      <div class="cv-scenes-review">${story.scenes.map(sceneEditor).join('')}</div>
      <label class="cv-parent-approval"><input type="checkbox" id="cvParentApproval"><span>راجعت عنوان القصة ونصوص المشاهد، وأوافق على اعتماد هذه النسخة للكتاب.</span></label>
      <div class="cv-review-error" id="cvReviewError"></div>
    </section>`;
    container.querySelectorAll('textarea[data-role="storyText"]').forEach((textarea) => {
      textarea.addEventListener('input', () => {
        const count = textarea.closest('.story')?.querySelector('[data-role="count"]');
        if (count) count.textContent = `${textarea.value.length}/1000`;
      });
    });
    const approve = document.querySelector('#approvePlan');
    if (approve) approve.textContent = 'اعتماد القصة وإنشاء المعاينة ←';
  }

  function showReviewError(message) {
    const element = document.querySelector('#cvReviewError');
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function collectParentEdits() {
    const story = state.generatedStory;
    if (!story) throw new Error('لا توجد قصة مولدة للمراجعة.');
    if (!document.querySelector('#cvParentApproval')?.checked) {
      throw new Error('يجب تأكيد مراجعة ولي الأمر قبل اعتماد القصة.');
    }
    const titleValue = safeText(document.querySelector('#cvStoryTitle')?.value);
    const moralValue = safeText(document.querySelector('#cvStoryMoral')?.value);
    const endingValue = safeText(document.querySelector('#cvEndingReflection')?.value);
    if (titleValue.length < 3) throw new Error('عنوان القصة قصير جدًا.');
    if (moralValue.length < 3) throw new Error('اكتب قيمة تربوية واضحة.');

    const scenes = [...document.querySelectorAll('.cv-scene-editor')].map((editor, index) => {
      const current = story.scenes[index];
      const sceneTitle = safeText(editor.querySelector('[data-role="title"]')?.value);
      const storyText = safeText(editor.querySelector('[data-role="storyText"]')?.value);
      const dialogue = String(editor.querySelector('[data-role="dialogue"]')?.value || '')
        .split('\n').map(safeText).filter(Boolean).slice(0, 4);
      if (sceneTitle.length < 2) throw new Error(`عنوان المشهد ${index + 1} قصير جدًا.`);
      if (storyText.length < 25) throw new Error(`نص المشهد ${index + 1} يحتاج إلى تفاصيل أكثر.`);
      return { ...current, title: sceneTitle, storyText, dialogue };
    });

    state.generatedStory = {
      ...story,
      title: titleValue,
      moral: moralValue,
      endingReflection: endingValue,
      scenes,
    };
    state.customTitle = titleValue;
    state.moral = moralValue;
    state.storyPlan = scenes.map((scene) => ({
      sceneNumber: scene.sceneNumber,
      title: scene.title,
      text: scene.storyText,
      dialogue: scene.dialogue,
      illustrationPrompt: scene.illustrationPrompt,
      coloringPrompt: scene.coloringPrompt,
      beatType: scene.beatType,
    }));
    state.parentReview = {
      approved: true,
      approvedAt: new Date().toISOString(),
      reviewVersion: REVIEW_VERSION,
      sceneCount: scenes.length,
    };
    const titleInput = document.querySelector('#customTitle');
    const moralInput = document.querySelector('#moral');
    if (titleInput) titleInput.value = titleValue;
    if (moralInput) moralInput.value = moralValue;
    save();
  }

  function renderApprovedPreview() {
    if (originalBuildPreview) originalBuildPreview();
    const story = state.generatedStory;
    const preview = document.querySelector('#previewContent');
    if (!preview || !story) return;
    const scenes = story.scenes.map((scene) => `<article class="cv-final-scene"><b>${scene.sceneNumber}. ${safeHtml(scene.title)}</b><p>${safeHtml(scene.storyText)}</p></article>`).join('');
    preview.insertAdjacentHTML('beforeend', `<section class="cv-final-story"><h3>النص المعتمد من ولي الأمر</h3>${scenes}<div class="creative-credit">✓ تمت مراجعة القصة واعتمادها في ${new Date(state.parentReview.approvedAt).toLocaleString('ar-SA')}.</div></section>`);
  }

  function renderGenerationError(error) {
    clearProgressTimers();
    generationController = null;
    updateStepHeader('تعذر إنشاء القصة', 'لم يتم اعتماد أي نص، ويمكن المحاولة مجددًا أو العودة لتعديل الفكرة.', '4 من 5');
    setFooterGenerating(true);
    const details = error?.code === 'ORIGINALITY_REJECTED'
      ? 'تم رفض النتيجة لحماية أصالة القصة وأفكار الطفل.'
      : error?.message || 'حدث خطأ غير متوقع.';
    const container = document.querySelector('#reviewContent');
    if (!container) return;
    container.innerHTML = `<section class="cv-error-panel"><h3>لم تكتمل القصة</h3><p>${safeHtml(details)}</p><div class="cv-error-actions"><button class="btn btn-primary" id="cvRetryGeneration">إعادة المحاولة</button><button class="btn btn-secondary" id="cvBackToIdea">تعديل الفكرة</button>${aiMode() !== 'demo' ? '<button class="btn btn-secondary" id="cvUseDemo">استخدام الوضع التجريبي</button>' : ''}</div></section>`;
    document.querySelector('#cvRetryGeneration')?.addEventListener('click', startGeneration);
    document.querySelector('#cvBackToIdea')?.addEventListener('click', () => go(3));
    document.querySelector('#cvUseDemo')?.addEventListener('click', () => {
      try { localStorage.setItem(MODE_KEY, 'demo'); } catch {}
      startGeneration();
    });
  }

  async function startGeneration() {
    if (generationController) return;
    if (!validate(3)) return;
    collect();
    save();
    go(4);
    renderProgress();
    generationController = {};
    try {
      const result = await requestStory();
      applyStoryToState(result);
      const container = document.querySelector('#reviewContent');
      if (container) container.innerHTML = progressMarkup(PROGRESS_STEPS.length, true);
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      renderParentReview(result);
    } catch (error) {
      renderGenerationError(error);
    }
  }

  function approveReview() {
    try {
      collectParentEdits();
      renderApprovedPreview();
      go(5);
    } catch (error) {
      showReviewError(error?.message || 'راجع الحقول قبل الاعتماد.');
    }
  }

  function bind() {
    injectStyles();
    const buildButton = document.querySelector('.next[data-from="3"]');
    if (buildButton) {
      buildButton.textContent = 'بناء القصة بالذكاء الاصطناعي ←';
      buildButton.onclick = startGeneration;
    }
    const approve = document.querySelector('#approvePlan');
    if (approve) approve.onclick = approveReview;

    const head = document.querySelector('#step3 .panel-head');
    if (head && !head.querySelector('.cv-ai-mode')) {
      const mode = aiMode();
      head.insertAdjacentHTML('beforeend', `<span class="cv-ai-mode ${mode === 'demo' ? 'demo' : ''}">${mode === 'live' ? 'خادم مباشر' : mode === 'demo' ? 'وضع تجريبي' : 'تلقائي: خادم أو تجريبي'}</span>`);
    }

    if (state.generatedStory?.scenes?.length) {
      activeResult = {
        story: state.generatedStory,
        originality: state.originalityReport,
        provider: state.storyGeneration?.provider,
        metadata: {
          referenceTitle: state.selectedReference?.title || null,
        },
        demo: Boolean(state.storyGeneration?.demo),
      };
      renderParentReview(activeResult);
    }
  }

  window.ColorVerseParentReview = Object.freeze({
    startGeneration,
    renderParentReview,
    collectParentEdits,
    setMode(mode) {
      if (!['auto', 'live', 'demo'].includes(mode)) throw new Error('Unsupported story AI mode.');
      try { localStorage.setItem(MODE_KEY, mode); } catch {}
    },
    setApiBaseUrl(url) {
      try { localStorage.setItem(API_BASE_KEY, safeText(url)); } catch {}
    },
  });

  bind();
})();
