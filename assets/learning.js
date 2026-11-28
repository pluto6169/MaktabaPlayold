/* ============================================================
   MaktabaPlay — النظام التعليمي الموحّد (المرحلة الأولى)
   يوفّر لكل الألعاب:
   - شرحًا تعليميًا (Tutorial) قبل البدء: الهدف، القواعد، التحكم، المستويات
   - بطاقة تغذية راجعة تفسيرية بعد كل إجابة (لماذا صح/غلط) + ربط بالمفهوم
   - مرجعًا علميًا للمفهوم (ODLIS / MARC 21 / RDA / DDC / LCSH)
   - مستويات موحّدة: مبتدئ / متوسط / متقدم
   - حفظ التقدم محليًا (localStorage) وتسجيل الأخطاء للمراجعة
   - وضع تدريب بلا مؤقت
   الاستخدام: <script src="data/library-terms.js"></script>
              <script src="assets/learning.js"></script>
   ============================================================ */
(function () {
  'use strict';

  const STORE = 'maktabaplay.learning.v1';
  const LEVELS = {
    1: { ar: 'مبتدئ', en: 'Beginner' },
    2: { ar: 'متوسط', en: 'Intermediate' },
    3: { ar: 'متقدم', en: 'Advanced' }
  };

  function readStore() {
    try { return JSON.parse(localStorage.getItem(STORE) || '{}'); }
    catch (e) { return {}; }
  }
  function writeStore(obj) {
    try { localStorage.setItem(STORE, JSON.stringify(obj)); } catch (e) { /* التخزين غير متاح */ }
  }

  function injectCSS() {
    if (document.getElementById('ml-style')) return;
    const css = `
    .ml-overlay{position:fixed;inset:0;z-index:9000;background:rgba(6,10,18,.88);backdrop-filter:blur(6px);
      display:flex;align-items:center;justify-content:center;padding:18px;font-family:'Tajawal',sans-serif;direction:rtl}
    .ml-modal{background:linear-gradient(160deg,#0f1a2f,#0b1220);border:1px solid #1e293b;border-radius:22px;
      max-width:720px;width:100%;max-height:92vh;overflow:auto;padding:26px 26px 20px;color:#e2e8f0;box-shadow:0 30px 70px rgba(0,0,0,.6)}
    .ml-modal h2{font-size:22px;margin:0 0 4px;color:#fff}
    .ml-modal .ml-sub{color:#94a3b8;font-size:13px;margin-bottom:16px}
    .ml-modal h3{font-size:14px;color:#22d3ee;margin:16px 0 8px;letter-spacing:.3px}
    .ml-modal ul{margin:0;padding-inline-start:20px;font-size:14px;line-height:1.9;color:#cbd5e1}
    .ml-modal li strong{color:#fff;font-weight:700}
    .ml-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
    .ml-chip{background:rgba(6,182,212,.1);border:1px solid rgba(6,182,212,.35);color:#67e8f9;
      border-radius:999px;padding:3px 11px;font-size:12px;font-weight:600}
    .ml-lvl{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:6px}
    .ml-lvl div{background:rgba(255,255,255,.03);border:1px solid #1e293b;border-radius:12px;padding:9px 10px;font-size:12px;color:#cbd5e1}
    .ml-lvl b{display:block;color:#fff;font-size:13px;margin-bottom:2px}
    .ml-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:20px}
    .ml-btn{border:none;border-radius:999px;padding:11px 24px;font-family:'Tajawal',sans-serif;font-weight:700;
      font-size:14px;cursor:pointer;background:linear-gradient(135deg,#22c55e,#06b6d4);color:#04121a}
    .ml-btn.ghost{background:transparent;border:1px solid #334155;color:#e2e8f0}
    .ml-toggle{display:flex;align-items:center;gap:8px;font-size:13px;color:#94a3b8;cursor:pointer;user-select:none}
    .ml-toggle input{accent-color:#06b6d4;width:16px;height:16px}
    .ml-fb{border-radius:16px;padding:14px 16px;margin:14px 0;font-size:14px;line-height:1.85;display:none}
    .ml-fb.show{display:block}
    .ml-fb.ok{background:rgba(34,197,94,.1);border:1px solid #22c55e}
    .ml-fb.no{background:rgba(239,68,68,.1);border:1px solid #ef4444}
    .ml-fb .ml-verdict{font-weight:800;font-size:15px;display:block;margin-bottom:4px}
    .ml-fb.ok .ml-verdict{color:#4ade80}
    .ml-fb.no .ml-verdict{color:#f87171}
    .ml-fb .ml-why{color:#e2e8f0}
    .ml-fb .ml-concept{margin-top:8px;padding-top:8px;border-top:1px dashed rgba(148,163,184,.3);color:#94a3b8;font-size:13px}
    .ml-fb .ml-concept b{color:#67e8f9}
    .ml-fb a{color:#22d3ee}
    .ml-badge{display:inline-block;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:700;margin-inline-start:6px}
    .ml-badge.b1{background:rgba(34,197,94,.15);color:#4ade80;border:1px solid #22c55e}
    .ml-badge.b2{background:rgba(245,158,11,.15);color:#fbbf24;border:1px solid #f59e0b}
    .ml-badge.b3{background:rgba(239,68,68,.15);color:#f87171;border:1px solid #ef4444}
    .ml-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%) translateY(80px);opacity:0;
      background:#0f1a2f;border:1px solid #1e293b;color:#e2e8f0;border-radius:14px;padding:11px 20px;
      font-family:'Tajawal',sans-serif;font-size:14px;z-index:9500;transition:.35s}
    .ml-toast.show{transform:translateX(-50%) translateY(0);opacity:1}
    @media(max-width:560px){.ml-lvl{grid-template-columns:1fr}.ml-modal{padding:18px}}
    `;
    const st = document.createElement('style');
    st.id = 'ml-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function levelBadge(level) {
    const l = LEVELS[level] || LEVELS[1];
    return `<span class="ml-badge b${level}">${l.ar}</span>`;
  }

  // ── بطاقة التغذية الراجعة التفسيرية ──
  function explainHTML(opts) {
    const correct = !!opts.correct;
    const source = opts.source || (opts.termId && window.LIBRARY_TERMS
      ? { label: (window.LIBRARY_TERMS.find(t => t.id === opts.termId) || {}).src, url: null }
      : null);
    let concept = '';
    if (opts.concept || opts.termId) {
      const term = opts.termId && window.LIBRARY_TERM_BY_ID ? window.LIBRARY_TERM_BY_ID[opts.termId] : null;
      concept += `<div class="ml-concept">🔗 <b>المفهوم العلمي:</b> ${opts.concept || (term ? term.ar + ' — ' + term.en : '')}`;
      if (term) concept += `<br><span style="color:#94a3b8">${term.def}</span>`;
      if (source && source.label) {
        concept += `<br>📚 <b>المرجع:</b> ` +
          (source.url
            ? `<a href="${source.url}" target="_blank" rel="noopener">${source.label}</a>`
            : `<span style="color:#94a3b8">${source.label}</span>`);
      }
      if (opts.extra) concept += `<br>${opts.extra}`;
      concept += `</div>`;
    }
    return `<span class="ml-verdict">${correct ? '✅ ' + (opts.okTitle || 'إجابة صحيحة') : '❌ ' + (opts.noTitle || 'إجابة غير صحيحة')}</span>
      <span class="ml-why">${opts.why || ''}</span>${concept}`;
  }

  function showFeedback(el, opts) {
    if (!el) return;
    el.className = 'ml-fb show ' + (opts.correct ? 'ok' : 'no');
    el.innerHTML = explainHTML(opts);
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // ── الشرح التعليمي قبل البدء ──
  function tutorial(opts) {
    if (!opts || !opts.game) return;
    injectCSS();
    const key = 'ml_tut_' + opts.game;
    try { if (localStorage.getItem(key) === 'done' && !opts.force) return; } catch (e) { }

    const concepts = (opts.concepts || []).map(c => `<span class="ml-chip">${c}</span>`).join('');
    const rules = (opts.rules || []).map(r => `<li>${r}</li>`).join('');
    const levels = (opts.levels || [
      { n: 'مبتدئ', d: 'مفاهيم أساسية وتعرف على المصطلح' },
      { n: 'متوسط', d: 'تطبيق القواعد على حالات قريبة من الواقع' },
      { n: 'متقدم', d: 'قرارات معقدة وحالات متعارضة' }
    ]).map(l => `<div><b>${l.n}</b>${l.d}</div>`).join('');

    const wrap = document.createElement('div');
    wrap.className = 'ml-overlay';
    wrap.id = 'ml-tut';
    wrap.innerHTML = `
      <div class="ml-modal" role="dialog" aria-modal="true" aria-label="شرح اللعبة">
        <h2>${opts.title || 'قبل أن تبدأ'}</h2>
        <div class="ml-sub">${opts.subtitle || 'اقرأ الهدف والقواعد — لن يستغرق دقيقة'}</div>
        <h3>🎯 هدف اللعبة</h3>
        <ul><li>${opts.goal || ''}</li></ul>
        <h3>📋 القواعد</h3>
        <ul>${rules}</ul>
        <h3>🎮 التحكم</h3>
        <ul><li>${opts.controls || 'الفأرة أو اللمس أو لوحة المفاتيح'}</li></ul>
        <h3>📊 المستويات</h3>
        <div class="ml-lvl">${levels}</div>
        ${concepts ? `<h3>🔖 المفاهيم التي تغطيها</h3><div class="ml-chips">${concepts}</div>` : ''}
        <div class="ml-actions">
          <button class="ml-btn" id="ml-start">ابدأ الآن</button>
          <label class="ml-toggle"><input type="checkbox" id="ml-notimer"> تفضيل: وضع بلا مؤقت في الألعاب التعليمية</label>
        </div>
        <div style="margin-top:12px;font-size:12px;color:#64748b">المصطلحات والتعريفات مستندة إلى ODLIS ومعايير MARC 21 وRDA وDDC.</div>
      </div>`;
    document.body.appendChild(wrap);
    const pref = document.getElementById('ml-notimer');
    try { pref.checked = localStorage.getItem('ml_no_timer') === '1'; } catch (e) { }
    pref.onchange = () => { try { localStorage.setItem('ml_no_timer', pref.checked ? '1' : '0'); } catch (e) { } };
    document.getElementById('ml-start').onclick = () => {
      try { localStorage.setItem(key, 'done'); } catch (e) { }
      wrap.remove();
      if (typeof opts.onStart === 'function') opts.onStart({ noTimer: pref.checked });
    };
  }

  function prefersNoTimer() {
    try { return localStorage.getItem('ml_no_timer') === '1'; } catch (e) { return false; }
  }

  // ── التقدم ──
  const progress = {
    get(game) {
      const s = readStore();
      return (s[game] && s[game].progress) || { best: 0, played: 0, correct: 0, total: 0, level: 1 };
    },
    record(game, data) {
      const s = readStore();
      const g = s[game] || {};
      const p = g.progress || { best: 0, played: 0, correct: 0, total: 0, level: 1 };
      p.played += 1;
      p.correct += (data.correct || 0);
      p.total += (data.total || 0);
      p.best = Math.max(p.best, data.score || 0);
      if (data.level) p.level = Math.max(p.level, data.level);
      s[game] = g;
      g.progress = p;
      writeStore(s);
      return p;
    }
  };

  // ── سجل المفاهيم التي تحتاج مراجعة ──
  const review = {
    add(game, item) {
      const s = readStore();
      const g = s[game] || {};
      const list = g.review || [];
      const key = item.key || item.concept || '';
      const found = list.find(x => x.key === key);
      if (found) found.count = (found.count || 1) + 1;
      else list.push({ key, concept: item.concept || '', why: item.why || '', termId: item.termId || '', count: 1, at: Date.now() });
      g.review = list.slice(-40);
      s[game] = g;
      writeStore(s);
    },
    list(game) {
      const s = readStore();
      return ((s[game] || {}).review) || [];
    },
    clear(game) {
      const s = readStore();
      if (s[game]) s[game].review = [];
      writeStore(s);
    },
    remove(game, key) {
      const s = readStore();
      if (!s[game] || !Array.isArray(s[game].review)) return;
      s[game].review = s[game].review.filter(x => x.key !== key);
      writeStore(s);
    }
  };

  function toast(msg, ms) {
    injectCSS();
    let t = document.querySelector('.ml-toast');
    if (!t) { t = document.createElement('div'); t.className = 'ml-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), ms || 2600);
  }

  // ── مكوّن مراجعة المفاهيم في نهاية اللعبة ──
  function reviewPanel(game, container) {
    const items = review.list(game);
    if (!items.length || !container) return;
    const box = document.createElement('div');
    box.style.cssText = 'margin-top:16px;text-align:right;background:rgba(255,255,255,.03);border:1px solid #1e293b;border-radius:16px;padding:14px 16px';
    box.innerHTML = `<div style="font-weight:800;color:#fbbf24;margin-bottom:8px">📌 مفاهيم تحتاج مراجعة (${items.length})</div>` +
      items.slice(-8).reverse().map(i =>
        `<div style="font-size:13px;color:#cbd5e1;line-height:1.8;padding:6px 0;border-bottom:1px dashed rgba(148,163,184,.18)">
          <b style="color:#e2e8f0">${i.concept || i.key}</b>${i.why ? ' — ' + i.why : ''}
          ${i.count > 1 ? `<span style="color:#f87171"> (تكرر ${i.count}×)</span>` : ''}
        </div>`).join('') +
      `<a href="https://products.abc-clio.com/ODLIS/odlis_A.aspx" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;color:#22d3ee;font-size:12px">↗ راجع المصطلح في ODLIS</a>`;
    container.appendChild(box);
  }

  injectCSS();
  window.ML = {
    LEVELS, levelBadge, explainHTML, showFeedback, tutorial, prefersNoTimer,
    progress, review, toast, reviewPanel,
    terms: () => window.LIBRARY_TERMS || [],
    term: id => (window.LIBRARY_TERM_BY_ID || {})[id]
  };
})();
