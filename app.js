/* ===========================================================
   CPTI · 关系塑 — app.js v3
   =========================================================== */
(function () {
  'use strict';

  // ------------------------------------------------------------
  // Mock fallbacks (used only if JSON fetch fails — e.g. file://)
  // ------------------------------------------------------------
  const MOCK_QUESTIONS = [
    {
      id: 1, dim: 'EI', text: '周末到了，你会选择？',
      bubble: '一个人最诚实的时刻', avatar: 'images/fox.png',
      options: [
        { label: '呼朋唤友约饭唱K,越热闹越舒服', score: 1, types: ['PURS'] },
        { label: '看心情,有局就去没局也不强求',    score: 0, types: ['ANCH'] },
        { label: '关灯拉窗帘,一个人和我的宠物',    score: -1, types: ['AVOI'] }
      ]
    }
  ];

  // 6 relationship types (CPTI) — shape mirrors real data/couples.json:
  //   { types: [...], couples: [ {id: 'A_B', left, right, title, subtitle, compat_score, dynamics, strengths, risks, repair}, ... ] }
  const MOCK_COUPLES = {
    types: [
      { id: 'PURS', name_title: 'PURS', name_cn: '追求者',
        slogan: '心动就冲,爱得毫无保留',
        quick_review: '你是把感情端上桌的人,敢爱敢说也敢黏。',
        interpretation: '你是关系里的火种——行动极快,反应链最短,情绪全部外放。',
        tags: ['#敢爱敢黏', '#上头快', '#反应极短', '#爱得毫无保留'] },
      { id: 'KIND', name_title: 'KIND', name_cn: '点火者',
        slogan: '激情主导,决定了就上',
        quick_review: '你点燃一段关系的速度快到别人反应不过来。',
        interpretation: '你是关系里的主导者——自信、果断、火焰型。',
        tags: ['#主导', '#自信', '#直接', '#火焰型'] },
      { id: 'ANCH', name_title: 'ANCH', name_cn: '定锚人',
        slogan: '慢热但长情,一旦认定就终身',
        quick_review: '你是关系里的海底——稳、深、不轻易摇摆。',
        interpretation: '你是关系里的压舱石——承诺门槛高但踏进来就长。',
        tags: ['#稳定', '#长情', '#慢热', '#承诺厚重'] },
      { id: 'WEAV', name_title: 'WEAV', name_cn: '编织者',
        slogan: '把关系织进日常的温柔',
        quick_review: '你不炸不闹,但关系因你变得像毛衣。',
        interpretation: '你用情感浓度编织关系,低调但深入每一缕经纬。',
        tags: ['#温柔', '#情感浓度高', '#织入日常', '#高宜人'] },
      { id: 'AVOI', name_title: 'AVOI', name_cn: '回避者',
        slogan: '爱前先审,筛过再开机',
        quick_review: '你不是不爱,只是先把门关上审一审。',
        interpretation: '你保留情绪、保留空间,关系对你是被邀请的事。',
        tags: ['#筛选型', '#空间感', '#冷静', '#高冷'] },
      { id: 'CHAO', name_title: 'CHAO', name_cn: '风暴眼',
        slogan: '焦-避切换,凌晨三点的脑回路',
        quick_review: '你是一段关系里最戏剧的那个信号灯。',
        interpretation: '你在靠近和逃跑之间反复,情绪浓度是双倍的。',
        tags: ['#焦虑避冲突', '#戏剧', '#高敏', '#凌晨派'] }
    ],
    couples: []
  };

  const MOCK_ANIMALS = [
    { id: 'fox', name_title: 'SAGE', name_cn: '狐狸', image: 'images/fox.png', primary_type: 'AVOI', secondary_type: 'ANCH' },
    { id: 'husky', name_title: 'YELL', name_cn: '哈士奇', image: 'images/husky.png', primary_type: 'PURS', secondary_type: 'KIND' }
  ];

  // ------------------------------------------------------------
  // State
  // ------------------------------------------------------------
  const state = {
    view: 'intro',
    questions: [],
    animals: [],
    couples: null,        // { types:[], pairs:{} }
    currentIdx: 0,
    answers: [],          // [{id, dim, score, types}]
    result: null,         // solo: 6-type object
    coupleResult: null,   // couple: pair object + left/right animals
    matchPick: { left: null, right: null },
    userVec: [0, 0, 0, 0],
    isAnimating: false
  };

  // CPTI v2 · 4 维 (questions.json 的 dim 字段对齐):
  //   AX 依恋焦虑 / AV 依恋回避 / EX 情绪外显 / CO 承诺锁定
  const DIM_IDX = { AX: 0, AV: 1, EX: 2, CO: 3 };
  const DIM_LABELS = ['依恋焦虑', '依恋回避', '情绪外显', '承诺锁定'];
  const DIM_COUNT = DIM_LABELS.length;
  const SCORE_MIN_PER_DIM = -5;  // 5 题 × min score(-1)
  const SCORE_MAX_PER_DIM = 10;  // 5 题 × max score(+2)
  const SCORE_RANGE_PER_DIM = SCORE_MAX_PER_DIM - SCORE_MIN_PER_DIM;
  const ANIM_MS = 280;
  const FLASH_MS = 320;
  const NEXT_DELAY = 260;

  // ------------------------------------------------------------
  // DOM refs
  // ------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const el = {
    views: {
      intro:           $('view-intro'),
      quiz:            $('view-quiz'),
      match:           $('view-match'),
      result:          $('view-result'),
      'couple-result': $('view-couple-result')
    },
    // intro
    scrollRows: [$('scroll-row-1'), $('scroll-row-2'), $('scroll-row-3')],
    btnSolo:    $('btn-solo'),
    btnMatch:   $('btn-match'),
    // quiz
    btnHome:         $('btn-home'),
    progressFill:    $('progress-fill'),
    progressCurrent: $('progress-current'),
    progressTotal:   $('progress-total'),
    scenarioAvatar:  $('scenario-avatar-img'),
    scenarioAvatarBox: document.querySelector('.scenario-avatar'),
    scenarioBubble:  $('scenario-bubble'),
    quizCard:        $('quiz-card'),
    qText:           $('q-text'),
    optionsList:     $('options-list'),
    btnPrev:         $('btn-prev'),
    btnNext:         $('btn-next'),
    // match
    btnHomeMatch:    $('btn-home-match'),
    matchSlotLeft:   $('match-slot-left'),
    matchSlotRight:  $('match-slot-right'),
    matchPlaceholderLeft:  $('match-placeholder-left'),
    matchPlaceholderRight: $('match-placeholder-right'),
    matchImgLeft:    $('match-img-left'),
    matchImgRight:   $('match-img-right'),
    matchNameLeft:   $('match-name-left'),
    matchNameRight:  $('match-name-right'),
    matchPickerTitle:$('match-picker-title'),
    animalGrid:      $('animal-grid'),
    btnMatchGo:      $('btn-match-go'),
    // result (solo)
    resultImage:          $('result-image'),
    resultNameTitle:      $('result-name-title'),
    resultName:           $('result-name'),
    resultMdValue:        $('result-md-value'),
    resultMdNote:         $('result-md-note'),
    resultNzValue:        $('result-nz-value'),
    resultNzNote:         $('result-nz-note'),
    resultQuote:          $('result-quote'),
    resultTags:           $('result-tags'),
    resultQuickReview:    $('result-quick-review'),
    resultInterpretation: $('result-interpretation'),
    resultCatchphrases:   $('result-catchphrases'),
    radarCanvas:          $('radar-canvas'),
    btnRestart:           $('btn-restart'),
    btnShare:             $('btn-share'),
    btnSaveLong:          $('btn-save-long'),
    btnGoMatch:           $('btn-go-match'),
    saveLoading:          $('save-loading'),
    saveModal:            $('save-modal'),
    saveModalBackdrop:    $('save-modal-backdrop'),
    saveModalImg:         $('save-modal-img'),
    btnSaveClose:         $('btn-save-close'),
    viewResult:           $('view-result'),
    // couple result
    btnHomeCouple:   $('btn-home-couple'),
    coupleImgLeft:   $('couple-img-left'),
    coupleImgRight:  $('couple-img-right'),
    couplePreamble:  $('couple-preamble'),
    coupleTitle:     $('couple-title'),
    coupleSubtitle:  $('couple-subtitle'),
    coupleScore:     $('couple-score'),
    coupleScoreNote: $('couple-score-note'),
    coupleDynamics:  $('couple-dynamics'),
    coupleStrengths: $('couple-strengths'),
    coupleRisks:     $('couple-risks'),
    coupleRepair:    $('couple-repair'),
    btnCoupleSave:   $('btn-couple-save'),
    btnCoupleShare:  $('btn-couple-share'),
    btnCoupleRestart:$('btn-couple-restart'),
    btnCoupleToSolo: $('btn-couple-to-solo'),
    viewCouple:      $('view-couple-result')
  };

  // ------------------------------------------------------------
  // Init — load JSON + render
  // ------------------------------------------------------------
  async function init() {
    const [questions, couples, animals] = await Promise.all([
      loadJSON('data/questions.json', MOCK_QUESTIONS),
      loadJSON('data/couples.json',   MOCK_COUPLES),
      loadJSON('data/animals.json',   MOCK_ANIMALS)
    ]);
    state.questions = Array.isArray(questions) && questions.length ? questions : MOCK_QUESTIONS;
    state.couples   = couples && couples.types ? couples : MOCK_COUPLES;
    state.animals   = Array.isArray(animals)   && animals.length   ? animals   : MOCK_ANIMALS;

    el.progressTotal.textContent = state.questions.length;

    renderIntroGallery();
    renderAnimalGrid();
    bindEvents();
    render();
  }

  async function loadJSON(path, fallback) {
    try {
      const res = await fetch(path, { cache: 'no-cache' });
      if (!res.ok) throw new Error('http ' + res.status);
      return await res.json();
    } catch (err) {
      console.warn('[CPTI] fallback to mock for', path, err.message);
      return fallback;
    }
  }

  // ------------------------------------------------------------
  // Intro marquee (3 rows of scrolling pixel animals)
  // ------------------------------------------------------------
  function renderIntroGallery() {
    if (!el.scrollRows || !el.scrollRows.every(Boolean)) return;
    const ids = state.animals.map(a => a.id);
    if (!ids.length) return;

    const groups = [[], [], []];
    ids.forEach((id, idx) => groups[idx % 3].push(id));

    el.scrollRows.forEach((row, i) => {
      if (!row) return;
      const list = groups[i].concat(groups[i]);
      row.innerHTML = list.map(id => {
        const a = state.animals.find(x => x.id === id);
        const src = a ? a.image : ('images/' + id + '.png');
        return '<div class="pet"><img src="' + src + '" alt=""></div>';
      }).join('');
      const PET = 96, GAP = 14;
      row.style.width = (list.length * PET + (list.length - 1) * GAP) + 'px';
    });
  }

  // ------------------------------------------------------------
  // Animal grid for MATCH view
  // ------------------------------------------------------------
  function renderAnimalGrid() {
    if (!el.animalGrid) return;
    el.animalGrid.innerHTML = '';
    state.animals.forEach(function (a) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'animal-grid-item';
      item.dataset.animalId = a.id;
      item.setAttribute('aria-label', a.name_cn);
      item.style.position = 'relative';
      item.innerHTML =
        '<img src="' + a.image + '" alt="">' +
        '<span class="animal-grid-name">' + a.name_cn + '</span>';
      item.addEventListener('click', function () { onPickAnimal(a.id); });
      el.animalGrid.appendChild(item);
    });
  }

  // ------------------------------------------------------------
  // Events
  // ------------------------------------------------------------
  function bindEvents() {
    el.btnSolo     && el.btnSolo.addEventListener('click',  startSolo);
    el.btnMatch    && el.btnMatch.addEventListener('click', startMatch);
    el.btnHome     && el.btnHome.addEventListener('click',  goHome);
    el.btnHomeMatch  && el.btnHomeMatch.addEventListener('click',  goHome);
    el.btnHomeCouple && el.btnHomeCouple.addEventListener('click', goHome);
    el.btnPrev     && el.btnPrev.addEventListener('click',  previousQuestion);
    el.btnNext     && el.btnNext.addEventListener('click',  nextQuestion);
    el.btnRestart  && el.btnRestart.addEventListener('click', restart);
    el.btnShare    && el.btnShare.addEventListener('click',  function(){ shareLink(el.btnShare, '复制分享链接'); });
    el.btnSaveLong && el.btnSaveLong.addEventListener('click', function(){ saveLongScreenshot(el.viewResult, el.btnSaveLong, 'cpti-solo'); });
    el.btnSaveClose && el.btnSaveClose.addEventListener('click', closeSaveModal);
    el.saveModalBackdrop && el.saveModalBackdrop.addEventListener('click', closeSaveModal);

    // match slot clicks
    el.matchSlotLeft  && el.matchSlotLeft.addEventListener('click',  function(){ setActiveSide('left'); });
    el.matchSlotRight && el.matchSlotRight.addEventListener('click', function(){ setActiveSide('right'); });
    el.btnMatchGo     && el.btnMatchGo.addEventListener('click', goToCoupleResult);

    // solo → match cross-promo
    el.btnGoMatch && el.btnGoMatch.addEventListener('click', function () {
      // Prefill "我" with an animal whose primary_type matches user result
      if (state.result) prefillMatchFromSolo(state.result.id);
      startMatch();
    });

    // couple-result actions
    el.btnCoupleSave    && el.btnCoupleSave.addEventListener('click', function(){ saveLongScreenshot(el.viewCouple, el.btnCoupleSave, 'cpti-couple'); });
    el.btnCoupleShare   && el.btnCoupleShare.addEventListener('click', function(){ shareLink(el.btnCoupleShare, '复制配对链接'); });
    el.btnCoupleRestart && el.btnCoupleRestart.addEventListener('click', function(){
      state.matchPick = { left: null, right: null };
      renderMatchSlots();
      paintAnimalGridSelection();
      updateMatchCTA();
      setActiveSide('left');
      setView('match');
    });
    el.btnCoupleToSolo && el.btnCoupleToSolo.addEventListener('click', function (e) {
      e.preventDefault();
      startSolo();
    });
  }

  // ------------------------------------------------------------
  // View routing
  // ------------------------------------------------------------
  function setView(name) {
    state.view = name;
    Object.entries(el.views).forEach(([k, node]) => {
      if (!node) return;
      node.classList.toggle('active', k === name);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function render() {
    if (state.view === 'quiz')           renderQuiz();
    if (state.view === 'result')         renderResult();
    if (state.view === 'match')          renderMatchView();
    if (state.view === 'couple-result')  renderCoupleResult();
    setView(state.view);
  }

  // ------------------------------------------------------------
  // Intro actions
  // ------------------------------------------------------------
  function startSolo() {
    state.view = 'quiz';
    state.currentIdx = 0;
    state.answers = [];
    render();
  }

  function startMatch() {
    state.view = 'match';
    // ensure default active side
    if (!state._activeSide) state._activeSide = 'left';
    render();
  }

  function goHome() {
    if (state.isAnimating) return;
    state.view = 'intro';
    render();
  }

  // ------------------------------------------------------------
  // QUIZ
  // ------------------------------------------------------------
  function renderQuiz() {
    renderProgress();
    renderScenarioHint();
    renderQuestion();
    updateNavButtons();
  }

  function renderProgress() {
    const total = state.questions.length;
    const current = state.currentIdx + 1;
    el.progressTotal.textContent = total;
    el.progressCurrent.textContent = current;
    const pct = Math.round((current / total) * 100);
    el.progressFill.style.width = pct + '%';
  }

  function renderScenarioHint() {
    const q = state.questions[state.currentIdx];
    if (!q) return;
    el.scenarioBubble.textContent = q.bubble || '';
    if (q.avatar) {
      el.scenarioAvatar.src = q.avatar;
      el.scenarioAvatar.alt = '';
    }
    if (el.scenarioAvatarBox) {
      el.scenarioAvatarBox.classList.remove('pop');
      // eslint-disable-next-line no-unused-expressions
      el.scenarioAvatarBox.offsetHeight;
      el.scenarioAvatarBox.classList.add('pop');
    }
  }

  function renderQuestion() {
    const q = state.questions[state.currentIdx];
    if (!q) return;
    el.qText.textContent = q.text || '';

    const prev = state.answers[state.currentIdx];

    el.optionsList.innerHTML = '';
    (q.options || []).forEach((opt, i) => {
      const li = document.createElement('li');
      li.className = 'option';
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');
      li.dataset.score = String(opt.score);
      if (prev && prev.score === opt.score) li.classList.add('selected');
      li.innerHTML =
        '<span class="option-bullet" aria-hidden="true">' + String.fromCharCode(65 + i) + '</span>' +
        '<span class="option-label"></span>';
      li.querySelector('.option-label').textContent = opt.label;

      const handler = function (e) {
        if (e.type === 'keydown') {
          if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
          e.preventDefault();
        }
        onSelectOption(li, opt);
      };
      li.addEventListener('click', handler);
      li.addEventListener('keydown', handler);

      el.optionsList.appendChild(li);
    });
  }

  function onSelectOption(node, opt) {
    if (state.isAnimating) return;
    state.isAnimating = true;

    [...el.optionsList.children].forEach(c => {
      c.classList.remove('selected', 'flashing');
    });
    node.classList.add('flashing');

    const q = state.questions[state.currentIdx];
    state.answers[state.currentIdx] = {
      id: q.id,
      dim: q.dim,
      score: opt.score,
      types: Array.isArray(opt.types) ? opt.types : []
    };

    setTimeout(function () {
      node.classList.remove('flashing');
      node.classList.add('selected');

      setTimeout(function () {
        if (state.currentIdx < state.questions.length - 1) {
          animateTo(+1);
        } else {
          state.isAnimating = false;
          computeResult();
        }
      }, NEXT_DELAY);
    }, FLASH_MS);
  }

  function previousQuestion() {
    if (state.isAnimating || state.currentIdx === 0) return;
    animateTo(-1);
  }

  function nextQuestion() {
    if (state.isAnimating) return;
    if (!state.answers[state.currentIdx]) return;
    if (state.currentIdx < state.questions.length - 1) {
      animateTo(+1);
    } else {
      computeResult();
    }
  }

  function animateTo(direction) {
    state.isAnimating = true;
    const card = el.quizCard;
    const outX = direction === 1 ? -28 : 28;
    const inX  = direction === 1 ? 28 : -28;

    card.style.transition = 'transform 0.26s cubic-bezier(0.16,1,0.3,1), opacity 0.26s ease';
    card.style.transform  = 'translateX(' + outX + 'px)';
    card.style.opacity    = '0';

    setTimeout(function () {
      state.currentIdx += direction;

      card.style.transition = 'none';
      card.style.transform  = 'translateX(' + inX + 'px)';
      card.style.opacity    = '0';

      renderQuiz();

      // eslint-disable-next-line no-unused-expressions
      card.offsetHeight;

      card.style.transition = 'transform 0.26s cubic-bezier(0.16,1,0.3,1), opacity 0.26s ease';
      card.style.transform  = 'translateX(0)';
      card.style.opacity    = '1';

      setTimeout(function () {
        state.isAnimating = false;
        card.style.transition = '';
        card.style.transform  = '';
        card.style.opacity    = '';
      }, ANIM_MS + 40);
    }, ANIM_MS);
  }

  function updateNavButtons() {
    el.btnPrev.disabled = state.currentIdx === 0;
    const hasAnswer = !!state.answers[state.currentIdx];
    const isLast = state.currentIdx === state.questions.length - 1;
    el.btnNext.disabled = !hasAnswer;
    const nextLabel = el.btnNext.querySelector('span');
    if (nextLabel) nextLabel.textContent = isLast ? '看结果' : '下一题';
  }

  // ------------------------------------------------------------
  // SOLO RESULT · typeHits voting classifier (CPTI v2)
  // ------------------------------------------------------------
  // 10 类型直接由 questions.json 的 options[].types 数组累计投票决定。
  // 每选项给 1-3 个 type 加 1 分,top type 胜出。userVec 仅用于雷达可视化。
  const WEAK_SIGNAL_THRESHOLD = 4;   // 全部 typeHits 总和 < 该值视为弱信号

  function computeResult() {
    // 1. Build radar vector (userVec, 4 dims)
    const userVec = new Array(DIM_COUNT).fill(0);
    state.answers.forEach(function (a) {
      if (!a) return;
      const idx = DIM_IDX[a.dim];
      if (typeof idx === 'number') userVec[idx] += a.score;
    });
    state.userVec = userVec;

    // 2. typeHits voting
    const typeIds = (state.couples.types || []).map(function (t) { return t.id; });
    const typeHits = {};
    typeIds.forEach(function (tid) { typeHits[tid] = 0; });
    state.answers.forEach(function (a) {
      if (!a) return;
      const types = Array.isArray(a.types) ? a.types : [];
      types.forEach(function (tid) { if (tid in typeHits) typeHits[tid] += 1; });
    });

    const totalHits = Object.values(typeHits).reduce(function (s, v) { return s + v; }, 0);
    state.weakSignal = totalHits < WEAK_SIGNAL_THRESHOLD;

    // 3. 取 top type, 平票时按 typeIds 顺序 (稳定)
    const winnerId = typeIds.slice().sort(function (a, b) {
      const diff = (typeHits[b] || 0) - (typeHits[a] || 0);
      if (diff !== 0) return diff;
      return typeIds.indexOf(a) - typeIds.indexOf(b);
    })[0];

    console.log('[CPTI v2 classify]', {
      winner: winnerId,
      typeHits: typeHits,
      totalHits: totalHits,
      weakSignal: state.weakSignal,
      userVec: userVec
    });

    let result = (state.couples.types || []).find(function (t) { return t.id === winnerId; });
    if (!result) result = (state.couples.types || [])[0];

    state.result = result;
    state.isAnimating = false;
    state.view = 'result';
    render();
  }

  function renderWeakSignalCallout() {
    if (!el.viewResult) return;
    // 移除旧的 (重渲染时幂等)
    const old = el.viewResult.querySelector('.result-warn-callout');
    if (old) old.remove();
    if (!state.weakSignal) return;
    const t = state.result;
    const typeName = t ? (t.name_cn || t.name_title || t.id || 'ANCH 定锚人') : 'ANCH 定锚人';
    const callout = document.createElement('div');
    callout.className = 'result-warn-callout highlight-card';
    callout.style.cssText = 'background:#ffd6e8;border:3px solid #1a1a1a;border-radius:14px;padding:14px 16px;margin:14px 16px 0;box-shadow:4px 4px 0 #1a1a1a;font-size:14px;line-height:1.55;color:#1a1a1a;';
    callout.textContent = '检测到你大多数选择中立 — 我们暂定你是 ' + typeName + ',但建议复测前认真投入答题更准确。';
    const top = el.viewResult.querySelector('.result-top');
    if (top && top.parentNode) {
      top.parentNode.insertBefore(callout, top.nextSibling);
    } else {
      el.viewResult.insertBefore(callout, el.viewResult.firstChild);
    }
  }

  function renderResult() {
    const t = state.result;
    if (!t) return;

    // weakSignal callout: 用户答全 B 中立 → 提示数据不可靠
    renderWeakSignalCallout();

    // Type records don't carry `image` — use an animal whose primary_type matches
    const typeImage = t.image || imageForType(t.id) || '';
    el.resultImage.src = typeImage;
    el.resultImage.alt = t.name_cn || t.name || '';

    el.resultNameTitle.textContent = t.name_title ? t.name_title + ' ' : (t.id ? t.id + ' ' : '');
    el.resultName.textContent      = t.name_cn || t.name || '';

    el.resultQuote.textContent = t.tagline || t.punchline || t.slogan || '';
    if (el.resultQuickReview) el.resultQuickReview.textContent = t.one_liner || t.quick_review || '';
    el.resultInterpretation.textContent = t.interpretation || '';

    el.resultTags.innerHTML = '';
    (t.tags || []).slice(0, 3).forEach(function (tag) {
      const span = document.createElement('span');
      span.className = 'tag';
      // tags in couples.json already start with "#"; don't double
      span.textContent = String(tag).charAt(0) === '#' ? tag : '#' + tag;
      el.resultTags.appendChild(span);
    });

    if (el.resultCatchphrases) {
      el.resultCatchphrases.innerHTML = '';
      const phrases = t.monologue || t.catchphrases || [];
      if (phrases.length) {
        phrases.forEach(function (phrase) {
          const d = document.createElement('div');
          d.className = 'catchphrase';
          d.textContent = phrase;
          el.resultCatchphrases.appendChild(d);
        });
      } else {
        // Hide the section heading above if nothing to show
        el.resultCatchphrases.style.display = 'none';
        const header = el.resultCatchphrases.previousElementSibling;
        if (header && header.classList.contains('result-section-title')) header.style.display = 'none';
      }
    }

    drawRadar(el.radarCanvas, state.userVec);

    // 副属性: 依恋焦虑 (userVec[0]=AX) + 依恋回避 (userVec[1]=AV) — CPTI 关系核心两轴
    // 5 题/维, score [-1, +2] → 单维范围 [-5, +10],映射到 [0, 100]
    const axPct = Math.max(0, Math.min(100, Math.round(((state.userVec[0] + 5) / 15) * 100)));
    const avPct = Math.max(0, Math.min(100, Math.round(((state.userVec[1] + 5) / 15) * 100)));
    if (el.resultMdValue) el.resultMdValue.textContent = axPct + '%';
    if (el.resultNzValue) el.resultNzValue.textContent = avPct + '%';
    if (el.resultMdNote)  el.resultMdNote.textContent  = anxiNoteFor(axPct);
    if (el.resultNzNote)  el.resultNzNote.textContent  = avoidNoteFor(avPct);

    el.btnShare.classList.remove('is-copied');
    el.btnShare.textContent = '复制分享链接';
  }

  // ------------------------------------------------------------
  // MATCH view
  // ------------------------------------------------------------
  function setActiveSide(side) {
    state._activeSide = side;
    if (el.matchSlotLeft)  el.matchSlotLeft.classList.toggle('is-active',  side === 'left');
    if (el.matchSlotRight) el.matchSlotRight.classList.toggle('is-active', side === 'right');
    if (el.matchPickerTitle) {
      el.matchPickerTitle.textContent = side === 'left'
        ? '选「我」的动物'
        : '选「ta」的动物';
    }
  }

  function renderMatchView() {
    renderMatchSlots();
    paintAnimalGridSelection();
    updateMatchCTA();
    if (!state._activeSide) setActiveSide('left');
    else setActiveSide(state._activeSide);
  }

  function onPickAnimal(animalId) {
    const side = state._activeSide || 'left';
    // Prevent picking same animal for both sides (allow override)
    const otherSide = side === 'left' ? 'right' : 'left';
    if (state.matchPick[otherSide] === animalId) {
      state.matchPick[otherSide] = null;
    }
    state.matchPick[side] = animalId;

    renderMatchSlots();
    paintAnimalGridSelection();
    updateMatchCTA();

    // Auto-toggle to the other side if it's still empty
    if (!state.matchPick[otherSide]) {
      setActiveSide(otherSide);
    } else {
      setActiveSide(side);
    }
  }

  function renderMatchSlots() {
    ['left', 'right'].forEach(function (side) {
      const id = state.matchPick[side];
      const placeholderEl = side === 'left' ? el.matchPlaceholderLeft : el.matchPlaceholderRight;
      const imgEl         = side === 'left' ? el.matchImgLeft         : el.matchImgRight;
      const nameEl        = side === 'left' ? el.matchNameLeft        : el.matchNameRight;
      const slotEl        = side === 'left' ? el.matchSlotLeft        : el.matchSlotRight;

      if (!id) {
        if (placeholderEl) placeholderEl.style.display = 'block';
        if (imgEl) { imgEl.style.display = 'none'; imgEl.src = ''; }
        if (nameEl) {
          nameEl.textContent = side === 'left' ? '选我的动物' : '选 ta 的动物';
          nameEl.classList.add('match-slot-name-empty');
        }
        if (slotEl) slotEl.classList.remove('is-filled');
        return;
      }
      const a = state.animals.find(function (x) { return x.id === id; });
      if (!a) return;
      if (placeholderEl) placeholderEl.style.display = 'none';
      if (imgEl) { imgEl.src = a.image; imgEl.alt = a.name_cn; imgEl.style.display = 'block'; }
      if (nameEl) {
        nameEl.textContent = a.name_cn;
        nameEl.classList.remove('match-slot-name-empty');
      }
      if (slotEl) slotEl.classList.add('is-filled');
    });
  }

  function paintAnimalGridSelection() {
    if (!el.animalGrid) return;
    [...el.animalGrid.children].forEach(function (item) {
      item.classList.remove('picked-left', 'picked-right');
      const id = item.dataset.animalId;
      if (id === state.matchPick.left)  item.classList.add('picked-left');
      if (id === state.matchPick.right) item.classList.add('picked-right');
    });
  }

  function updateMatchCTA() {
    const ready = !!(state.matchPick.left && state.matchPick.right);
    if (el.btnMatchGo) el.btnMatchGo.disabled = !ready;
  }

  // Prefill "我" from solo result type — deterministic hash → diverse animal per user
  // 同 type 用户根据答案 hash 落到不同代表动物,避免"PURS 永远哈士奇"
  function prefillMatchFromSolo(typeId) {
    const candidates = state.animals.filter(function (a) { return a.primary_type === typeId; });
    if (candidates.length) {
      // hash answers into a stable index
      const seed = state.answers.reduce(function (acc, a) {
        return acc * 31 + (a.score + 2) * 7 + (a.id || 0);
      }, 0);
      const idx = Math.abs(seed) % candidates.length;
      state.matchPick.left = candidates[idx].id;
    }
    // force user to pick ta next
    state._activeSide = 'right';
  }

  function goToCoupleResult() {
    const leftId  = state.matchPick.left;
    const rightId = state.matchPick.right;
    if (!leftId || !rightId) return;

    const leftA  = state.animals.find(function (a) { return a.id === leftId; });
    const rightA = state.animals.find(function (a) { return a.id === rightId; });
    if (!leftA || !rightA) return;

    const leftType  = leftA.primary_type;
    const rightType = rightA.primary_type;

    // Look up pair — 严格方向优先,fallback 才镜像 (修配对方向 bug)
    // 修复前: 4 个 || 条件混搭,fox(AVOI) × husky(PURS) 会先击中 PURS_AVOI,
    //         但用户的"我"是 fox(AVOI),报告里却写"你(PURS)..." → 视角错位
    const couples = (state.couples && state.couples.couples) || [];
    function findPair(lt, rt) {
      return couples.find(function (c) {
        // CPTI v2 uses type_a/type_b; legacy used left/right
        const a = c.type_a || c.left;
        const b = c.type_b || c.right;
        return a === lt && b === rt;
      }) || null;
    }

    // 1. 严格方向优先
    let pair = findPair(leftType, rightType);
    let perspectiveFlipped = false;
    let usedSecondary = false;

    // 2. 反向命中
    if (!pair) {
      pair = findPair(rightType, leftType);
      if (pair) perspectiveFlipped = true;
    }

    // 3. 用左侧 secondary 试 (primary 配不到 → 退一步用副人格)
    if (!pair && leftA.secondary_type) {
      pair = findPair(leftA.secondary_type, rightType) || findPair(rightType, leftA.secondary_type);
      if (pair) usedSecondary = true;
    }

    // 4. 用右侧 secondary 试
    if (!pair && rightA.secondary_type) {
      pair = findPair(leftType, rightA.secondary_type) || findPair(rightA.secondary_type, leftType);
      if (pair) usedSecondary = true;
    }

    // 副人格匹配的 compatibility 轻微贴现 -5 (clamp 到 [20, 95])
    if (usedSecondary && pair) {
      const cur = (typeof pair.compatibility === 'number' ? pair.compatibility
                  : typeof pair.compat_score === 'number' ? pair.compat_score
                  : 70);
      pair = Object.assign({}, pair, {
        compatibility: Math.max(20, Math.min(95, cur - 5)),
        _via_secondary: true
      });
    }

    if (!pair) pair = synthesizePair(leftType, rightType);

    state.coupleResult = {
      pair: pair,
      leftAnimal:  leftA,
      rightAnimal: rightA,
      leftType:    leftType,
      rightType:   rightType,
      perspectiveFlipped: perspectiveFlipped
    };
    state.view = 'couple-result';
    render();
  }

  function synthesizePair(lt, rt) {
    const lName = typeNameFor(lt);
    const rName = typeNameFor(rt);
    return {
      pair_id: lt + '_' + rt,
      type_a: lt,
      type_b: rt,
      title: lName + ' × ' + rName,
      summary: '一段关系的两种模式,彼此给对方一面新的镜子。',
      compatibility: 70,
      vibe_tag: '✨ 互补型',
      interpretation: '你们的节奏不同, 这既是吸引也是磨合 — 当差异变成共同语言, 关系会比同频更有张力。',
      highlight: '互补才有张力, 不同频率让关系不无聊',
      warning: '表达方式错位时容易误解 ta 的好意',
      advice: '每周一次诚实复盘, 用对方的语言翻译自己'
    };
  }

  function typeNameFor(id) {
    const t = (state.couples.types || []).find(function (x) { return x.id === id; });
    return t ? (t.name_cn || t.name || id) : id;
  }

  // Pick a representative image for a 6-type from the 24-animal list
  function imageForType(typeId) {
    const a = (state.animals || []).find(function (x) { return x.primary_type === typeId; });
    return a ? a.image : '';
  }

  // Tiny bucket copy for the compat_score display
  function compatNoteFor(score) {
    if (score >= 85) return '同频率 · 看见彼此时像照镜子';
    if (score >= 75) return '互补吸引 · 需要点翻译就能同频';
    if (score >= 65) return '有张力 · 稳住节奏就能长';
    if (score >= 50) return '磨合型 · 关键在「翻译」对方的语言';
    return '挑战型 · 爱得到但需要工具';
  }

  // ------------------------------------------------------------
  // COUPLE RESULT
  // ------------------------------------------------------------
  function renderCoupleResult() {
    const cr = state.coupleResult;
    if (!cr) return;

    const pair = cr.pair || {};
    // 如果 perspectiveFlipped: 我们 fallback 到反向 pair (e.g. user 选 AVOI×PURS,
    // 但只有 PURS_AVOI 数据)。pair.dynamics 里"你"指 pair.left=PURS,所以把
    // 显示左边的 avatar 换成 PURS 那只动物,确保文字和视觉一致。
    const showLeft  = cr.perspectiveFlipped ? cr.rightAnimal : cr.leftAnimal;
    const showRight = cr.perspectiveFlipped ? cr.leftAnimal  : cr.rightAnimal;
    const showLeftType  = cr.perspectiveFlipped ? cr.rightType : cr.leftType;
    const showRightType = cr.perspectiveFlipped ? cr.leftType  : cr.rightType;

    if (el.coupleImgLeft)  { el.coupleImgLeft.src  = showLeft.image;  el.coupleImgLeft.alt  = showLeft.name_cn; }
    if (el.coupleImgRight) { el.coupleImgRight.src = showRight.image; el.coupleImgRight.alt = showRight.name_cn; }

    if (el.couplePreamble) {
      el.couplePreamble.textContent = typeNameFor(showLeftType) + ' × ' + typeNameFor(showRightType);
    }
    if (el.coupleTitle)    el.coupleTitle.textContent    = pair.title    || '未定义配对';
    if (el.coupleSubtitle) {
      const baseSub = pair.summary || pair.subtitle || pair.vibe_tag || '';
      el.coupleSubtitle.textContent = pair._via_secondary
        ? (baseSub + ' (基于副人格匹配)').trim()
        : baseSub;
    }

    const compat = (pair.compatibility != null ? pair.compatibility
                    : pair.compat_score != null ? pair.compat_score
                    : null);
    if (el.coupleScore)     el.coupleScore.textContent     = (compat != null ? compat : '--');
    if (el.coupleScoreNote) el.coupleScoreNote.textContent = pair.vibe_tag || pair.compat_note || compatNoteFor(compat || 0);

    if (el.coupleDynamics)  el.coupleDynamics.textContent  = pair.interpretation || pair.dynamics || '';

    // CPTI v2: highlight / warning / advice (single string each)
    // Legacy: strengths / risks / repair (string or array)
    fillCoupleBlock(el.coupleStrengths, pair.highlight  || pair.strengths);
    fillCoupleBlock(el.coupleRisks,     pair.warning    || pair.risks);
    fillCoupleBlock(el.coupleRepair,    pair.advice     || pair.repair);

    if (el.btnCoupleShare) {
      el.btnCoupleShare.classList.remove('is-copied');
      el.btnCoupleShare.textContent = '复制配对链接';
    }
  }

  function fillCoupleBlock(host, data) {
    if (!host) return;
    host.innerHTML = '';
    if (!data) return;
    // If already an array, render as bullet list; if string, split on 句号 / 分号 to make bullets
    let items;
    if (Array.isArray(data)) {
      items = data.filter(Boolean);
    } else {
      // Split on full-width semicolon / semicolon (keep 。-ended sentences intact for density)
      items = String(data)
        .split(/[;；]/)
        .map(function (s) { return s.trim(); })
        .filter(Boolean);
    }
    items.forEach(function (s) {
      const li = document.createElement('li');
      li.textContent = s;
      host.appendChild(li);
    });
  }

  // ------------------------------------------------------------
  // Radar chart (unchanged)
  // ------------------------------------------------------------
  function drawRadar(canvas, vector) {
    if (!canvas || !canvas.getContext) return;
    const dpr = window.devicePixelRatio || 1;
    const logicalSize = 320;
    canvas.width  = logicalSize * dpr;
    canvas.height = logicalSize * dpr;
    canvas.style.width  = logicalSize + 'px';
    canvas.style.height = logicalSize + 'px';

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, logicalSize, logicalSize);

    const cx = logicalSize / 2;
    const cy = logicalSize / 2;
    const r  = Math.min(cx, cy) - 56;
    const axisCount = DIM_COUNT;

    const norm = vector.map(v => Math.max(0, Math.min(1, (v + 5) / 15)));

    const angleFor = (i) => (-Math.PI / 2) + (i * 2 * Math.PI / axisCount);

    ctx.strokeStyle = '#D5D5D5';
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1].forEach(scale => {
      ctx.beginPath();
      for (let i = 0; i < axisCount; i++) {
        const a = angleFor(i);
        const x = cx + Math.cos(a) * r * scale;
        const y = cy + Math.sin(a) * r * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    });

    ctx.strokeStyle = '#D5D5D5';
    for (let i = 0; i < axisCount; i++) {
      const a = angleFor(i);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(26, 26, 26, 0.12)';
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < axisCount; i++) {
      const a = angleFor(i);
      const x = cx + Math.cos(a) * r * norm[i];
      const y = cy + Math.sin(a) * r * norm[i];
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1A1A1A';
    for (let i = 0; i < axisCount; i++) {
      const a = angleFor(i);
      const x = cx + Math.cos(a) * r * norm[i];
      const y = cy + Math.sin(a) * r * norm[i];
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#1A1A1A';
    ctx.font = '600 14px -apple-system, "PingFang SC", "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < axisCount; i++) {
      const a = angleFor(i);
      const labelDist = r + 26;
      const lx = cx + Math.cos(a) * labelDist;
      const ly = cy + Math.sin(a) * labelDist;
      ctx.fillStyle = '#1A1A1A';
      ctx.fillText(DIM_LABELS[i], lx, ly - 8);

      ctx.fillStyle = '#8A8A8A';
      ctx.font = '400 12px -apple-system, sans-serif';
      ctx.fillText(Math.round(norm[i] * 100) + '%', lx, ly + 8);
      ctx.font = '600 14px -apple-system, "PingFang SC", "Noto Sans SC", sans-serif';
    }
  }

  // ------------------------------------------------------------
  // Highlight card copy
  // ------------------------------------------------------------
  // 依恋焦虑 (高 = 容易过度激活情绪 / 担心被抛弃)
  function anxiNoteFor(pct) {
    if (pct >= 80) return '消息没回 = 内心 50 集大戏开播';
    if (pct >= 60) return '会脑补 · 但能在崩溃前抢救自己';
    if (pct >= 40) return '偶尔多想 · 大多时候挺稳';
    if (pct >= 20) return '不轻易上头 · 自我抚慰高手';
    return '钝感力 MAX · 别扭情绪检测不到';
  }
  // 依恋回避 (高 = 容易关闭情感 / 拉开距离)
  function avoidNoteFor(pct) {
    if (pct >= 80) return '靠近警报 · 主动拉距离专家';
    if (pct >= 60) return '需要独处缓冲 · 但能回头';
    if (pct >= 40) return '亲密 OK · 有自己的呼吸节奏';
    if (pct >= 20) return '愿意靠近 · 不太逃';
    return '亲密无障碍 · 越近越踏实';
  }

  // ------------------------------------------------------------
  // Share / Restart
  // ------------------------------------------------------------
  async function shareLink(btn, defaultLabel) {
    if (!btn) return;
    const url = location.href;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        legacyCopy(url);
      }
      showCopied(btn, defaultLabel);
    } catch (err) {
      try { legacyCopy(url); showCopied(btn, defaultLabel); }
      catch (_) { btn.textContent = '复制失败 · 请手动复制'; }
    }
  }
  function legacyCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  function showCopied(btn, defaultLabel) {
    btn.classList.add('is-copied');
    btn.textContent = '已复制 ✓';
    clearTimeout(btn._copyT);
    btn._copyT = setTimeout(() => {
      btn.classList.remove('is-copied');
      btn.textContent = defaultLabel;
    }, 2000);
  }

  function restart() {
    state.view = 'intro';
    state.currentIdx = 0;
    state.answers = [];
    state.result = null;
    state.userVec = new Array(DIM_COUNT).fill(0);
    state.isAnimating = false;
    render();
  }

  // ------------------------------------------------------------
  // One-click long screenshot (reusable for solo & couple)
  // ------------------------------------------------------------
  const CAPTURE_CDN = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
  let _captureLibLoading = null;
  function ensureCaptureLib() {
    if (window.html2canvas) return Promise.resolve();
    if (_captureLibLoading) return _captureLibLoading;
    _captureLibLoading = new Promise(function (resolve, reject) {
      const s = document.createElement('script');
      s.src = CAPTURE_CDN;
      s.onload = function () { resolve(); };
      s.onerror = function () { _captureLibLoading = null; reject(new Error('html2canvas load failed')); };
      document.head.appendChild(s);
    });
    return _captureLibLoading;
  }

  async function embedImagesAsDataUrl(root) {
    const imgs = root.querySelectorAll('img');
    await Promise.all(Array.from(imgs).map(async function (img) {
      const src = img.getAttribute('src');
      if (!src || src.startsWith('data:')) return;
      try {
        const abs = new URL(src, location.href).href;
        const res = await fetch(abs, { cache: 'force-cache' });
        const blob = await res.blob();
        const dataUrl = await new Promise(function (resolve, reject) {
          const r = new FileReader();
          r.onloadend = function () { resolve(r.result); };
          r.onerror = reject;
          r.readAsDataURL(blob);
        });
        img.src = dataUrl;
        if (typeof img.decode === 'function') { try { await img.decode(); } catch (_) {} }
      } catch (e) {
        console.warn('[CPTI] embed img fail, keep original', src, e);
      }
    }));
  }

  function snapshotCanvases(root) {
    const swaps = [];
    root.querySelectorAll('canvas').forEach(function (canvas) {
      try {
        if (!canvas.width || !canvas.height) return;
        const dataUrl = canvas.toDataURL('image/png');
        const img = new Image();
        img.src = dataUrl;
        img.alt = '';
        img.setAttribute('aria-hidden', 'true');
        const cs = window.getComputedStyle(canvas);
        img.style.width = cs.width;
        img.style.height = cs.height;
        img.style.display = cs.display === 'inline' ? 'inline-block' : (cs.display || 'block');
        img.style.verticalAlign = 'middle';
        const parent = canvas.parentNode;
        const next = canvas.nextSibling;
        parent.replaceChild(img, canvas);
        swaps.push({ canvas: canvas, img: img, parent: parent, next: next });
      } catch (e) {
        console.warn('[CPTI] canvas snapshot failed', e);
      }
    });
    return function restore() {
      swaps.forEach(function (s) {
        if (!s.img.parentNode) return;
        if (s.next && s.next.parentNode === s.parent) {
          s.parent.insertBefore(s.canvas, s.next);
        } else {
          s.parent.appendChild(s.canvas);
        }
        s.img.remove();
      });
    };
  }

  async function waitAllImagesReady(root) {
    const imgs = Array.from(root.querySelectorAll('img'));
    await Promise.all(imgs.map(function (img) {
      const settled = (img.complete && img.naturalWidth > 0)
        ? Promise.resolve()
        : new Promise(function (resolve) {
            const done = function () {
              img.removeEventListener('load', done);
              img.removeEventListener('error', done);
              resolve();
            };
            img.addEventListener('load', done);
            img.addEventListener('error', done);
            setTimeout(done, 2000);
          });
      return settled.then(function () {
        if (typeof img.decode === 'function') {
          return img.decode().catch(function () {});
        }
      });
    }));
  }

  function showSaveLoading(show) {
    if (!el.saveLoading) return;
    el.saveLoading.classList.toggle('visible', !!show);
  }
  function openSaveModal(dataUrl) {
    if (!el.saveModal || !el.saveModalImg) return;
    el.saveModalImg.src = dataUrl;
    el.saveModal.classList.add('visible');
    el.saveModal.setAttribute('aria-hidden', 'false');
  }
  function closeSaveModal() {
    if (!el.saveModal) return;
    el.saveModal.classList.remove('visible');
    el.saveModal.setAttribute('aria-hidden', 'true');
    if (el.saveModalImg) el.saveModalImg.src = '';
  }

  async function saveLongScreenshot(rootEl, triggerBtn, filenamePrefix) {
    if (!rootEl) return;
    if (triggerBtn && triggerBtn.disabled) return;

    const originalLabel = triggerBtn ? triggerBtn.innerHTML : '';
    if (triggerBtn) {
      triggerBtn.disabled = true;
      triggerBtn.textContent = '生成中…';
    }
    showSaveLoading(true);

    rootEl.classList.add('result-capturing');

    let restoreCanvases = function () {};
    try {
      await ensureCaptureLib();
      await embedImagesAsDataUrl(rootEl);
      restoreCanvases = snapshotCanvases(rootEl);
      await waitAllImagesReady(rootEl);
      await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });

      const scale = (window.devicePixelRatio && window.devicePixelRatio > 1) ? 2 : 1;
      const canvas = await window.html2canvas(rootEl, {
        backgroundColor: '#FFFFFF',
        scale: scale,
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: false,
        logging: false,
        imageTimeout: 8000,
        removeContainer: true
      });
      const blob = await new Promise(function (resolve, reject) {
        canvas.toBlob(function (b) {
          if (b) resolve(b); else reject(new Error('canvas.toBlob returned null'));
        }, 'image/png');
      });
      if (!blob) throw new Error('canvas toBlob returned null');

      const filename = (filenamePrefix || 'cpti') + '-' + Date.now() + '.png';
      const file = new File([blob], filename, { type: 'image/png' });

      let shared = false;
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'CPTI · 关系塑',
            text: 'CPTI 关系塑结果来了'
          });
          shared = true;
        }
      } catch (e) {
        if (e && e.name === 'AbortError') { shared = true; }
        else console.warn('[CPTI] share API failed, falling back', e);
      }

      if (!shared) {
        const ua = (navigator.userAgent || '').toLowerCase();
        const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const dataUrl = await new Promise(function (resolve, reject) {
          const r = new FileReader();
          r.onloadend = function () { resolve(r.result); };
          r.onerror = reject;
          r.readAsDataURL(blob);
        });

        if (isIOS) {
          openSaveModal(dataUrl);
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        }
      }
    } catch (err) {
      console.error('[CPTI] long screenshot failed', err);
      alert('截图生成失败,请稍后重试~');
    } finally {
      try { restoreCanvases(); } catch (_) {}
      rootEl.classList.remove('result-capturing');
      showSaveLoading(false);
      if (triggerBtn) {
        triggerBtn.disabled = false;
        triggerBtn.innerHTML = originalLabel;
      }
    }
  }

  // ------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
