/* ============================================================
   MaktabaPlay — Game Shell
   شاشة بدء موحّدة (Play / Tutorial / Settings) + اختيار المستوى
   والجولات + إيقاف مؤقت حقيقي + شاشة نتائج موحّدة + أفضل نتيجة.

   التهيئة من داخل اللعبة:
   MPGame.init({
     id:'detective', title:'محقق MARC21', icon:'🔍',
     tagline:'...', field:'الفهرسة الآلية',
     levels:[{id:1,label:'مبتدئ',desc:'...'}], defaultLevel:1,
     rounds:{label:'عدد القضايا', options:[5,9], default:9},
     tutorial:{...},                     // يُعرض من زر «كيف تلعب؟»
     onPlay(opts){}, onPause(){}, onResume(){},
     onRestart(){}, onNext(){}, onResults(opts){}
   });
   MPGame.results({ score, correct, total, time, level, title, note });
   ============================================================ */
(function () {
  'use strict';

  const BEST_KEY = 'maktabaplay.best.v1';
  let cfg = null;
  let paused = false;
  let started = false;
  let lastOpts = null;
  let tutorialCfg = null;
  let nativeTutorial = null;
  let startEl = null, pauseEl = null, resultsEl = null;
  let overlayDepth = 0;

  /* ── أفضل النتائج ── */
  function readBests() {
    try { return JSON.parse(localStorage.getItem(BEST_KEY) || '{}'); } catch (e) { return {}; }
  }
  function writeBests(obj) {
    try { localStorage.setItem(BEST_KEY, JSON.stringify(obj)); } catch (e) { }
  }
  function bestOf(game) {
    return readBests()[game] || { best: 0, plays: 0, correct: 0, total: 0, lastLevel: 1 };
  }
  function accuracyOf() {
    const b = bestOf(cfg.id);
    return b.total ? Math.round((b.correct / b.total) * 100) : 0;
  }

  /* ── تعليق المؤقّتات العالمية (الإيقاف المؤقت الحقيقي) ──
     نلفّ setInterval/setTimeout/requestAnimationFrame قبل تحميل كود
     اللعبة، فلا ينقضي وقت ولا تتحرك جولة أثناء شاشة الإيقاف. */
  const nativeSetInterval = window.setInterval.bind(window);
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeRaf = window.requestAnimationFrame.bind(window);
  const isFrozen = () => !!(paused && started);

  window.setInterval = function (fn, ms) {
    if (typeof fn !== 'function') return nativeSetInterval(fn, ms);
    return nativeSetInterval(function () {
      if (isFrozen()) return;
      return fn.apply(this, arguments);
    }, ms);
  };

  function gatedTimeout(fn, args) {
    return function () {
      if (isFrozen()) { nativeSetTimeout(gatedTimeout(fn, args), 120); return; }
      return fn.apply(null, args);
    };
  }
  window.setTimeout = function (fn, ms) {
    let args = Array.prototype.slice.call(arguments, 2);
    if (typeof fn !== 'function') return nativeSetTimeout(fn, ms);
    return nativeSetTimeout(gatedTimeout(fn, args), ms);
  };

  window.requestAnimationFrame = function (cb) {
    return nativeRaf(function (t) {
      if (isFrozen()) { window.requestAnimationFrame(cb); return; }
      return cb(t);
    });
  };

  function lock() {
    overlayDepth++;
    document.body.style.overflow = 'hidden';
  }
  function unlock() {
    overlayDepth = Math.max(0, overlayDepth - 1);
    if (!overlayDepth) document.body.style.overflow = '';
  }

  function fmt(n) { return Number(n || 0).toLocaleString('ar-EG'); }

  /* ── الهيدر ── */
  function renderHeader() {
    window.MPHeader.render({
      title: cfg.title,
      icon: cfg.icon,
      tagline: cfg.tagline,
      field: cfg.field,
      levelLabel: (cfg.levels || []).find(l => l.id === (lastLevel() || 1))?.label || 'مستوى مبتدئ',
      level: lastLevel() || 1
    });
    const best = bestOf(cfg.id).best;
    if (best) window.MPHeader.setBest(best);

    const actions = document.querySelector('.mp-header__actions');
    if (!actions || document.getElementById('mpPauseBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'mpPauseBtn';
    btn.className = 'mp-icon-btn';
    btn.type = 'button';
    btn.title = 'إيقاف مؤقت (Esc)';
    btn.setAttribute('aria-label', 'إيقاف مؤقت');
    btn.innerHTML = '⏸';
    btn.hidden = true;
    btn.addEventListener('click', () => togglePause());
    actions.insertBefore(btn, actions.querySelector('.mp-back'));
  }

  function lastLevel() {
    if (lastOpts && lastOpts.level) return lastOpts.level;
    return Number(window.MPSettings.difficulty(cfg.id, cfg.defaultLevel || 1));
  }

  /* ── مستوى/شارة ── */
  function updateLevelBadge(level) {
    const l = (cfg.levels || []).find(x => x.id === Number(level));
    if (l && window.MPHeader) window.MPHeader.setLevel(l.label, l.id);
  }

  /* ── شاشة البدء ── */
  function buildStart() {
    const settings = window.MPSettings.get();
    const levels = cfg.levels || [{ id: 1, label: 'مبتدئ', desc: 'مفاهيم أساسية' }];
    const chosen = Number(window.MPSettings.difficulty(cfg.id, cfg.defaultLevel || levels[0].id));
    const best = bestOf(cfg.id);
    const acc = best.total ? Math.round((best.correct / best.total) * 100) : 0;

    const roundsCfg = cfg.rounds;
    const roundsDefault = roundsCfg
      ? Number(window.MPSettings.rounds(cfg.id, roundsCfg.default || roundsCfg.options[0]))
      : null;

    startEl = document.createElement('div');
    startEl.className = 'mp-overlay mp-overlay--start';
    startEl.id = 'mpStart';
    startEl.innerHTML = `
      <div class="mp-start" role="dialog" aria-modal="true" aria-label="شاشة بدء ${cfg.title}">
        <div class="mp-start__art">
          <div class="mp-start__icon">${cfg.icon || '🎮'}</div>
          <div class="mp-start__art-title">${cfg.title}</div>
          <div class="mp-start__art-sub">${cfg.tagline || ''}</div>
          <div class="mp-start__art-chips">
            <span class="mp-chip mp-chip--brand">🎓 تعليمي</span>
            <span class="mp-chip mp-chip--cyan">🧠 تفسير بعد كل إجابة</span>
          </div>
        </div>

        <div class="mp-start__body">
          <div class="mp-start__head">
            <span class="mp-eyebrow">${cfg.field ? '🏷️ ' + cfg.field : '🎮 لعبة مكتبية'}</span>
            <h2 class="mp-start__title">${cfg.title}</h2>
            <p class="mp-start__tagline">${cfg.intro || cfg.tagline || ''}</p>
          </div>

          <div class="mp-mini-stats">
            <div class="mp-mini-stat"><b>${best.best ? fmt(best.best) : '—'}</b><span>أفضل نتيجة</span></div>
            <div class="mp-mini-stat"><b>${fmt(best.plays)}</b><span>جولات لعبتها</span></div>
            <div class="mp-mini-stat"><b>${best.total ? acc + '%' : '—'}</b><span>دقة الإجابات</span></div>
          </div>

          <div>
            <div class="mp-field-label">المستوى <em>اختر ما يناسبك</em></div>
            <div class="mp-diff-grid" id="mpDiffGrid">
              ${levels.map((l, i) => `
                <button type="button" class="mp-diff mp-diff--l${l.id} ${Number(chosen) === Number(l.id) ? 'is-selected' : ''}"
                        data-level="${l.id}" aria-pressed="${Number(chosen) === Number(l.id)}">
                  <b><span class="mp-diff__dots"><i></i><i></i><i></i></span> ${l.label}</b>
                  <small>${l.desc || ''}</small>
                </button>`).join('')}
            </div>
          </div>

          ${roundsCfg ? `
          <div>
            <div class="mp-field-label">${roundsCfg.label || 'عدد الجولات'} <em>يمكنك تغييره لاحقًا</em></div>
            <div class="mp-seg" id="mpRoundsSeg" role="group" aria-label="${roundsCfg.label || 'عدد الجولات'}">
              ${roundsCfg.options.map(o => {
                const val = typeof o === 'object' ? o.value : o;
                const lab = typeof o === 'object' ? o.label : o;
                return `<button type="button" data-rounds="${val}" class="${Number(roundsDefault) === Number(val) ? 'is-selected' : ''}"
                        aria-pressed="${Number(roundsDefault) === Number(val)}">${lab}</button>`;
              }).join('')}
            </div>
          </div>` : ''}

          <div class="mp-start__actions">
            <button class="mp-btn mp-btn--lg" id="mpPlayBtn">▶ ابدأ اللعب</button>
            <button class="mp-btn mp-btn--ghost" id="mpHowBtn">📖 كيف تلعب؟</button>
            <button class="mp-start__settings" id="mpSetBtn" aria-label="الإعدادات" title="الإعدادات">⚙️</button>
          </div>

          <div class="mp-start__note">
            <span>📚 المصادر:</span>
            <a href="https://products.abc-clio.com/ODLIS/odlis_A.aspx" target="_blank" rel="noopener">ODLIS</a>
            <span>·</span><span>MARC 21 · RDA · DDC 23</span>
          </div>
        </div>
      </div>`;

    document.body.appendChild(startEl);
    lock();

    let level = chosen;
    startEl.querySelectorAll('#mpDiffGrid .mp-diff').forEach(b => {
      b.addEventListener('click', () => {
        level = Number(b.dataset.level);
        window.MPSettings.setDifficulty(cfg.id, level);
        startEl.querySelectorAll('#mpDiffGrid .mp-diff').forEach(x => {
          x.classList.toggle('is-selected', x === b);
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        window.MPSettings.sfx('click');
        updateLevelBadge(level);
      });
    });

    let rounds = roundsDefault;
    startEl.querySelectorAll('#mpRoundsSeg button').forEach(b => {
      b.addEventListener('click', () => {
        rounds = Number(b.dataset.rounds);
        window.MPSettings.setRounds(cfg.id, rounds);
        startEl.querySelectorAll('#mpRoundsSeg button').forEach(x => {
          x.classList.toggle('is-selected', x === b);
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        window.MPSettings.sfx('click');
      });
    });

    startEl.querySelector('#mpPlayBtn').addEventListener('click', () => {
      startEl.querySelector('#mpPlayBtn').disabled = true;
      window.MPSettings.sfx('click');
      play({ level, rounds: rounds || 0, noTimer: window.MPSettings.get().noTimer });
    });
    startEl.querySelector('#mpHowBtn').addEventListener('click', showTutorial);
    startEl.querySelector('#mpSetBtn').addEventListener('click', openSettings);

    updateLevelBadge(level);
  }

  function closeStart() {
    if (!startEl) return;
    const el = startEl;
    startEl = null;
    el.style.animation = 'mp-fade-in .16s ease reverse both';
    setTimeout(() => { el.remove(); unlock(); }, 150);
  }

  function play(opts) {
    lastOpts = Object.assign({}, opts || {});
    started = true;
    paused = false;
    closeStart();
    pairOpen();
    const pauseBtn = document.getElementById('mpPauseBtn');
    if (pauseBtn) pauseBtn.hidden = false;
    updateLevelBadge(lastOpts.level);
    if (typeof cfg.onPlay === 'function') cfg.onPlay(lastOpts);
    else {
      window.dispatchEvent(new CustomEvent('mp:play', { detail: lastOpts }));
      if (typeof window[cfg.startFn || 'startGame'] === 'function') window[cfg.startFn || 'startGame']();
    }
  }

  function pairOpen() { /* توافق خفيف مع الألعاب التي تفحص paused */ }

  function showStart() {
    if (resultsEl) closeResults();
    started = false;
    paused = false;
    if (startEl) return;
    buildStart();
  }

  /* ── الشرح ── */
  function showTutorial() {
    if (!window.ML) return;
    const openTutorial = nativeTutorial || window.ML.tutorial;
    const base = tutorialCfg || cfg.tutorial || {
      game: cfg.id,
      title: cfg.title,
      subtitle: cfg.tagline,
      goal: cfg.goal || '',
      rules: cfg.rules || []
    };
    openTutorial(Object.assign({}, base, { force: true, onStart: function () { /* يُدار من الشاشة */ } }));
    const tut = document.getElementById('ml-tut');
    if (tut) {
      const start = document.getElementById('ml-start');
      if (start) start.textContent = 'فهمت، ابدأ';
    }
  }

  /* ── الإعدادات ── */
  function settingsHTML() {
    const s = window.MPSettings.get();
    const row = (key, title, desc, on) => `
      <div class="mp-set-row">
        <div class="mp-set-row__text"><b>${title}</b><small>${desc}</small></div>
        <button class="mp-switch" role="switch" aria-checked="${on ? 'true' : 'false'}" data-set="${key}" aria-label="${title}"></button>
      </div>`;
    return `<div class="mp-settings" role="dialog" aria-modal="true" aria-label="إعدادات اللعبة">
      <div class="mp-settings__head">
        <div><h2>⚙️ الإعدادات</h2><p>تنطبق على كل ألعاب المنصة</p></div>
        <button class="mp-icon-btn" data-mp-close aria-label="إغلاق">✕</button>
      </div>
      ${row('sound', 'المؤثرات الصوتية', 'أصوات قصيرة عند الإجابة والنتائج', s.sound)}
      ${row('motion', 'تقليل الحركة', 'إيقاف الانتقالات والحركات الزائدة', s.motion === 'reduced')}
      ${row('noTimer', 'وضع بلا مؤقت', 'تفضيل افتراضي في الألعاب التي تدعمه', s.noTimer)}
      <div class="mp-set-row">
        <div class="mp-set-row__text"><b>إعادة عرض الشرح</b><small>سيظهر شرح اللعبة في المرة القادمة</small></div>
        <button class="mp-btn mp-btn--ghost mp-btn--sm" data-reset-tut>إعادة</button>
      </div>
      <div class="mp-settings__actions">
        <button class="mp-btn mp-btn--ghost" data-clear>🗑️ مسح التقدم المحلي</button>
        <button class="mp-btn" data-mp-close>تم</button>
      </div>
    </div>`;
  }

  function openSettings() {
    const m = window.MPModal.open({
      className: 'mp-overlay--settings',
      html: settingsHTML(),
      label: 'إعدادات اللعبة',
      onClose: () => {
        if (startEl) return;
        if (cfg.id) window.MPHeader.setBest(bestOf(cfg.id).best);
      }
    });
    const root = m.el;
    root.querySelectorAll('[data-set]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.set;
        if (key === 'motion') {
          const next = window.MPSettings.get().motion === 'reduced' ? 'full' : 'reduced';
          window.MPSettings.set({ motion: next });
          btn.setAttribute('aria-checked', next === 'reduced' ? 'true' : 'false');
          window.MPSettings.sfx('click');
          return;
        }
        const val = window.MPSettings.toggle(key);
        btn.setAttribute('aria-checked', val ? 'true' : 'false');
      });
    });
    root.querySelector('[data-reset-tut]').addEventListener('click', () => {
      try {
        Object.keys(localStorage).filter(k => k.indexOf('ml_tut_') === 0).forEach(k => localStorage.removeItem(k));
      } catch (e) { }
      window.MPSettings.sfx('click');
      const t = document.createElement('div');
      t.className = 'mp-toast is-open';
      t.textContent = '✅ سيظهر الشرح مجددًا في المرة القادمة';
      document.body.appendChild(t);
      setTimeout(() => t.classList.remove('is-open'), 2400);
      setTimeout(() => t.remove(), 2900);
    });
    root.querySelector('[data-clear]').addEventListener('click', () => {
      window.MPModal.confirm({
        title: 'مسح التقدم المحلي؟',
        text: 'سيُحذف أفضل نتيجة وسجل المراجعة وإعدادات المستويات من هذا المتصفح.',
        ok: 'نعم، امسح'
      }).then(ok => {
        if (!ok) return;
        try {
          Object.keys(localStorage)
            .filter(k => k.indexOf('maktabaplay.') === 0 || k.indexOf('ml_') === 0)
            .forEach(k => localStorage.removeItem(k));
        } catch (e) { }
        window.MPSettings.reset();
        location.reload();
      });
    });
  }

  /* ── الإيقاف المؤقت ── */
  function showPause() {
    if (pauseEl) return;
    const st = typeof cfg.getStatus === 'function' ? cfg.getStatus() : null;
    const chips = st && st.length
      ? `<div class="mp-pause__stats">${st.map(s => `<span class="mp-chip">${s.label}: <b style="color:#fff">${s.value}</b></span>`).join('')}</div>`
      : '';
    pauseEl = document.createElement('div');
    pauseEl.className = 'mp-overlay mp-overlay--pause';
    pauseEl.innerHTML = `
      <div class="mp-pause" role="dialog" aria-modal="true" aria-label="إيقاف مؤقت">
        <div class="mp-pause__icon">⏸</div>
        <h2>إيقاف مؤقت</h2>
        <p>الوقت والجولة متوقّفان — خُذ نفسًا ثم أكمل.</p>
        ${chips}
        <div class="mp-pause__actions">
          <button class="mp-btn mp-btn--lg mp-wide" data-resume>▶ استئناف اللعب</button>
          <button class="mp-btn mp-btn--ghost" data-restart>🔄 إعادة الجولة</button>
          <button class="mp-btn mp-btn--ghost" data-how>📖 كيف تلعب؟</button>
          <button class="mp-btn mp-btn--ghost" data-set>⚙️ الإعدادات</button>
          <button class="mp-btn mp-btn--ghost" data-exit>🏠 صفحة الألعاب</button>
        </div>
      </div>`;
    document.body.appendChild(pauseEl);
    lock();
    window.MPSettings.sfx('pause');

    pauseEl.querySelector('[data-resume]').addEventListener('click', resume);
    pauseEl.querySelector('[data-restart]').addEventListener('click', () => {
      resume(true);
      if (typeof cfg.onRestart === 'function') cfg.onRestart();
      else if (typeof cfg.onPlay === 'function') cfg.onPlay(lastOpts || {});
    });
    pauseEl.querySelector('[data-how]').addEventListener('click', showTutorial);
    pauseEl.querySelector('[data-set]').addEventListener('click', openSettings);
    pauseEl.querySelector('[data-exit]').addEventListener('click', () => {
      window.MPModal.confirm({
        title: 'الخروج من اللعبة؟',
        text: 'سيُفقد تقدم الجولة الحالية، لكن أفضل نتيجة محفوظة تبقى.',
        ok: 'خروج'
      }).then(ok => { if (ok) location.href = 'index.html'; });
    });

    if (typeof cfg.onPause === 'function') { try { cfg.onPause(); } catch (e) { } }
  }

  function pause() {
    if (!started || paused || resultsEl) return;
    paused = true;
    document.documentElement.classList.add('mp-paused');
    showPause();
  }

  function resume(silent) {
    paused = false;
    document.documentElement.classList.remove('mp-paused');
    if (pauseEl) {
      const el = pauseEl;
      pauseEl = null;
      el.remove();
      unlock();
    }
    if (!silent && typeof cfg.onResume === 'function') { try { cfg.onResume(); } catch (e) { } }
  }

  function togglePause() {
    if (resultsEl) return;
    if (!started) return;
    if (paused) resume(); else pause();
  }

  /* ── النتائج ── */
  function starsFor(accuracy) {
    if (accuracy >= 90) return 3;
    if (accuracy >= 65) return 2;
    return 1;
  }

  function results(opts) {
    opts = opts || {};
    if (resultsEl) return;
    started = true;
    paused = true;
    const score = Number(opts.score || 0);
    const correct = Number(opts.correct || 0);
    const total = Number(opts.total || 0);
    const accuracy = opts.accuracy != null
      ? Math.round(opts.accuracy)
      : (total ? Math.round((correct / total) * 100) : 0);
    const stars = opts.stars || starsFor(accuracy);

    const before = bestOf(cfg.id);
    const isRecord = score > (before.best || 0);
    const next = {
      best: Math.max(before.best || 0, score),
      plays: (before.plays || 0) + 1,
      correct: (before.correct || 0) + correct,
      total: (before.total || 0) + total,
      lastLevel: opts.level || lastLevel()
    };
    const all = readBests();
    all[cfg.id] = next;
    writeBests(all);
    if (window.MPHeader) window.MPHeader.setBest(next.best);

    const ringPct = Math.max(0, Math.min(100, accuracy));
    const offset = 377 - (377 * ringPct / 100);

    resultsEl = document.createElement('div');
    resultsEl.className = 'mp-overlay mp-overlay--results';
    resultsEl.innerHTML = `
      <div class="mp-results" role="dialog" aria-modal="true" aria-label="نتيجة الجولة">
        <div class="mp-results__top">
          ${isRecord ? `<div class="mp-new-record">🏅 رقم شخصي جديد!</div><br>` : ''}
          <div class="mp-results__rank">${stars === 3 ? '🥇 أداء خبير' : stars === 2 ? '🥈 أداء جيد' : '🥉 بداية طيبة'}</div>
          <h2 class="mp-results__title">${opts.title || 'انتهت الجولة'}</h2>
          <p class="mp-results__sub">${opts.note || ''}</p>

          <div class="mp-score-ring">
            <svg class="mp-score-ring__svg" viewBox="0 0 140 140" aria-hidden="true">
              <defs>
                <linearGradient id="mpScoreGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#22c55e"/><stop offset="100%" stop-color="#06b6d4"/>
                </linearGradient>
              </defs>
              <circle class="mp-score-ring__track" cx="70" cy="70" r="60"/>
              <circle class="mp-score-ring__bar" cx="70" cy="70" r="60" style="stroke-dashoffset:${offset}"/>
            </svg>
            <div class="mp-score-ring__value"><b>${fmt(score)}</b><span>نقطة</span></div>
          </div>
          <div class="mp-stars" aria-label="التقييم ${stars} من 3">
            ${[1, 2, 3].map(i => `<span class="${i <= stars ? 'on' : ''}">★</span>`).join('')}
          </div>
        </div>

        <div class="mp-results__stats">
          <div class="mp-rstat mp-rstat--good"><b>${total ? correct + '/' + total : correct}</b><span>إجابات صحيحة</span></div>
          <div class="mp-rstat"><b>${total ? accuracy + '%' : '—'}</b><span>الدقة</span></div>
          <div class="mp-rstat ${opts.time ? '' : 'mp-hide'}"><b>${opts.time || ''}</b><span>الوقت</span></div>
          <div class="mp-rstat mp-rstat--gold"><b>${fmt(next.best)}</b><span>أفضل نتيجة</span></div>
        </div>

        <div class="mp-results__body" id="mpResultsBody">${opts.extraHTML || ''}</div>

        <div class="mp-results__actions">
          <button class="mp-btn" data-again>🔄 العب مرة أخرى</button>
          ${(opts.next !== false && typeof cfg.onNext === 'function') ? `<button class="mp-btn mp-btn--gold" data-next>⬆️ ${opts.nextLabel || 'المستوى التالي'}</button>` : ''}
          <button class="mp-btn mp-btn--ghost" data-review>📌 راجع الأخطاء</button>
          <button class="mp-btn mp-btn--ghost" data-home>🏠 كل الألعاب</button>
        </div>
      </div>`;
    document.body.appendChild(resultsEl);
    lock();
    window.MPSettings.sfx(stars === 1 ? 'bad' : 'win');

    const body = resultsEl.querySelector('#mpResultsBody');
    if (window.ML && window.ML.review) {
      const items = window.ML.review.list(cfg.id);
      if (items.length) {
        const t = document.createElement('div');
        t.className = 'mp-results__review-title';
        t.textContent = '📌 مفاهيم تحتاج مراجعة (' + items.length + ')';
        body.appendChild(t);
        window.ML.reviewPanel(cfg.id, body);
      }
    }

    resultsEl.querySelector('[data-again]').addEventListener('click', () => {
      closeResults();
      if (typeof cfg.onRestart === 'function') cfg.onRestart();
      else if (typeof cfg.onPlay === 'function') cfg.onPlay(lastOpts || {});
    });
    const nextBtn = resultsEl.querySelector('[data-next]');
    if (nextBtn) nextBtn.addEventListener('click', () => { closeResults(); cfg.onNext(); });
    resultsEl.querySelector('[data-review]').addEventListener('click', () => {
      const el = resultsEl.querySelector('.mp-results__body');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (window.ML) {
        const items = window.ML.review.list(cfg.id);
        if (!items.length) window.ML.toast('لا توجد أخطاء مسجلة — أداء رائع!');
      }
    });
    resultsEl.querySelector('[data-home]').addEventListener('click', () => { location.href = 'index.html'; });

    if (typeof cfg.onResults === 'function') { try { cfg.onResults(opts); } catch (e) { } }
    return resultsEl;
  }

  function closeResults() {
    if (!resultsEl) return;
    const el = resultsEl;
    resultsEl = null;
    el.remove();
    unlock();
    paused = false;
  }

  /* ── لافتة انتقال المستوى ── */
  function banner(title, subtitle, ms) {
    let b = document.getElementById('mpLevelBanner');
    if (!b) {
      b = document.createElement('div');
      b.id = 'mpLevelBanner';
      b.className = 'mp-level-banner';
      b.innerHTML = '<div class="mp-level-banner__inner"><b></b><span></span></div>';
      document.body.appendChild(b);
    }
    b.querySelector('b').textContent = title;
    b.querySelector('span').textContent = subtitle || '';
    b.classList.add('is-open');
    setTimeout(() => b.classList.remove('is-open'), ms || 1400);
  }

  /* ── التهيئة ── */
  function init(options) {
    cfg = Object.assign({
      id: 'game',
      title: 'لعبة مكتبية',
      icon: '🎮',
      tagline: '',
      levels: [
        { id: 1, label: 'مبتدئ', desc: 'مفاهيم أساسية' },
        { id: 2, label: 'متوسط', desc: 'تطبيق عملي' },
        { id: 3, label: 'متقدم', desc: 'قرارات معقدة' }
      ],
      defaultLevel: 1
    }, options || {});

    document.body.setAttribute('data-mp-game', cfg.id);
    const preTut = document.getElementById('ml-tut');
    if (preTut) preTut.remove();
    renderHeader();
    lastOpts = { level: Number(window.MPSettings.difficulty(cfg.id, cfg.defaultLevel)), rounds: 0 };

    // نُمسك شرح اللعبة القادم من ML.tutorial ونعرضه من زر «كيف تلعب؟»
    if (window.ML && !nativeTutorial) nativeTutorial = window.ML.tutorial;
    if (window.ML && !window.ML.__mpPatched) {
      const original = window.ML.tutorial;
      window.ML.tutorial = function (opts) {
        if (window.MPGame && window.MPGame.isActive()) {
          tutorialCfg = opts;
          return;
        }
        return original(opts);
      };
      window.ML.__mpPatched = true;
    }

    if (cfg.autoStart) { started = true; return; }
    if (location.search.indexOf('autostart=1') > -1) {
      started = true;
      setTimeout(() => { if (typeof cfg.onPlay === 'function') cfg.onPlay(lastOpts); }, 60);
      return;
    }
    buildStart();
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && started && !resultsEl && !pauseEl && !document.getElementById('ml-tut')) {
      togglePause();
    }
  });

  window.MPGame = {
    init,
    play,
    pause,
    resume,
    togglePause,
    results,
    finish: results,
    closeResults,
    showStart,
    showTutorial,
    openSettings,
    banner,
    isPaused: () => paused,
    isActive: () => !!cfg,
    hasStarted: () => started,
    best: () => (cfg ? bestOf(cfg.id) : { best: 0 }),
    config: () => cfg,
    updateLevelBadge
  };
})();
