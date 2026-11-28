/* ============================================================
   MaktabaPlay — Shared Learning & Progress Layer
   طبقة مشتركة واحدة للتقدم: XP، المهارات، الشارات، أخطاء المراجعة،
   المهام اليومية، مسارات التعلم، وتصدير/استيراد/مسح التقدم.

   الاستخدام:
     MPProgress.recordResult({ game:'detective', score, correct, total, level });
     MPProgress.addMistakes('detective', ML.review.list('detective'));
     MPProgress.summary();
   التخزين: maktabaplay.progress.v2 (محلي فقط، بلا خادم أو حساب).
   ============================================================ */
(function () {
  'use strict';

  const KEY = 'maktabaplay.progress.v2';
  const VERSION = 2;

  const GAMES = {
    hangman: { title: 'هانج مان المخطوط', icon: '📜', skill: 'manuscripts', field: 'المخطوطات والحفظ', url: 'games/hangman/' },
    ladder: { title: 'السلم والتصنيف', icon: '🪜', skill: 'classification', field: 'التصنيف', url: 'ladder-classification.html' },
    detective: { title: 'محقق MARC21', icon: '🔍', skill: 'cataloging', field: 'الفهرسة الآلية', url: 'book-detective.html' },
    sorter: { title: 'رتّب الرف', icon: '📚', skill: 'classification', field: 'تنظيم المجموعات', url: 'shelf-sorter.html' },
    tree: { title: 'سلسلة الفهرس الشجري', icon: '🌳', skill: 'indexing', field: 'التكشيف', url: 'silsilat_alfahras_tree.html' },
    minigames: { title: 'التدريب السريع', icon: '⚡', skill: 'foundations', field: 'مصطلحات أساسية', url: 'minigames.html' },
    tycoon: { title: 'مهندس المكتبة', icon: '🏛️', skill: 'management', field: 'الإدارة', url: 'games/library-tycoon/' },
    race: { title: 'سباق التصنيف', icon: '🏁', skill: 'classification', field: 'تصنيف ديوي', url: 'games/classification-race/' },
    traffic: { title: 'موجّه المستفيدين', icon: '🧭', skill: 'reference', field: 'خدمات المستفيدين', url: 'traffic-controller.html' }
  };

  const SKILLS = {
    foundations: { name: 'أساسيات علم المكتبات', icon: '🧩' },
    cataloging: { name: 'الفهرسة الآلية (MARC21/RDA)', icon: '🗂️' },
    classification: { name: 'التصنيف وتنظيم المجموعات (DDC)', icon: '📕' },
    indexing: { name: 'التكشيف والعلاقات الموضوعية', icon: '🌿' },
    reference: { name: 'خدمات المستفيدين والمرجع', icon: '🧭' },
    management: { name: 'إدارة المكتبات والتخطيط', icon: '🏛️' },
    manuscripts: { name: 'المخطوطات والحفظ', icon: '📜' }
  };

  const LEVELS = [
    { at: 0, name: 'مستكشف مبتدئ' },
    { at: 120, name: 'باحث متدرّب' },
    { at: 300, name: 'فاهر متوسط' },
    { at: 550, name: 'محقق متمكّن' },
    { at: 900, name: 'أخصائي مكتبات' },
    { at: 1400, name: 'خبير معلومات' }
  ];

  const DAILY_MISSIONS = [
    { id: 'rounds-1', title: 'أكمل جولة واحدة اليوم', hint: 'أي لعبة تُقيّم إجاباتك', target: 1, xp: 15, kind: 'rounds' },
    { id: 'questions-10', title: 'أجب عن ١٠ أسئلة اليوم', hint: 'الدقة تهم أكثر من السرعة', target: 10, xp: 25, kind: 'questions' },
    { id: 'games-2', title: 'العب لعبتين مختلفتين اليوم', hint: 'تنقّل بين مجالات التعلم', target: 2, xp: 20, kind: 'games' }
  ];

  const PATHS = [
    {
      id: 'cataloging', title: 'مسار الفهرسة', icon: '🗂️',
      desc: 'من مصطلحات الفهرسة إلى كشف أخطاء MARC21 وتصحيحها.',
      steps: ['hangman', 'minigames', 'detective']
    },
    {
      id: 'classification', title: 'مسار التصنيف وتنظيم المجموعات', icon: '📕',
      desc: 'مبادئ التصنيف، فئات ديوي، ثم وضع الكتب في الرفوف.',
      steps: ['ladder', 'race', 'sorter']
    },
    {
      id: 'reference', title: 'مسار خدمات المعلومات', icon: '🧭',
      desc: 'فهم حاجة المستفيد وتوجيهه إلى الخدمة المناسبة.',
      steps: ['minigames', 'traffic']
    },
    {
      id: 'management', title: 'مسار إدارة المكتبات', icon: '🏛️',
      desc: 'المفاهيم الإدارية ثم إدارة الميزانية والموظفين والأزمات.',
      steps: ['minigames', 'tycoon']
    }
  ];

  const BADGES = [
    { id: 'first-round', name: 'أول خطوة', icon: '🌱', desc: 'أكملت أول جولة مُقيّمة.', check: a => a.rounds >= 1 },
    { id: 'perfect', name: 'إجابة كاملة', icon: '🎯', desc: 'جولة كاملة بلا خطأ (٥ أسئلة على الأقل).', check: (a, s) => !!s.flags.perfectRound },
    { id: 'sharp', name: 'دقة عالية', icon: '📐', desc: 'دقة ٨٠٪ أو أكثر عبر ٣٠ سؤالًا.', check: a => a.total >= 30 && a.accuracy >= 80 },
    { id: 'ddc-explorer', name: 'DDC Explorer', icon: '📚', desc: '٢٠ سؤال تصنيف بدقة ٧٠٪ على الأقل.', check: a => a.skill('classification').total >= 20 && a.skill('classification').accuracy >= 70 },
    { id: 'marc-investigator', name: 'MARC21 Investigator', icon: '🔍', desc: '٣ جولات في محقق MARC21 بدقة ٧٥٪.', check: a => a.game('detective').plays >= 3 && a.game('detective').accuracy >= 75 },
    { id: 'manuscript-explorer', name: 'Manuscript Explorer', icon: '📜', desc: '٣ جولات في هانج مان بدقة ٧٠٪.', check: a => a.game('hangman').plays >= 3 && a.game('hangman').accuracy >= 70 },
    { id: 'shelf-organizer', name: 'Shelf Organizer', icon: '🗄️', desc: '٣ جولات في رتّب الرف بدقة ٧٠٪.', check: a => a.game('sorter').plays >= 3 && a.game('sorter').accuracy >= 70 },
    { id: 'thesaurus-builder', name: 'Thesaurus Builder', icon: '🌳', desc: '٣ جولات في الفهرس الشجري بدقة ٧٠٪.', check: a => a.game('tree').plays >= 3 && a.game('tree').accuracy >= 70 },
    { id: 'reference-expert', name: 'Reference Service Expert', icon: '🧭', desc: '٣ جولات في موجّه المستفيدين بدقة ٧٠٪.', check: a => a.game('traffic').plays >= 3 && a.game('traffic').accuracy >= 70 },
    { id: 'library-manager', name: 'Library Manager', icon: '🏛️', desc: 'جولتان في مهندس المكتبة.', check: a => a.game('tycoon').plays >= 2 },
    { id: 'all-games', name: 'مكتبي شامل', icon: '🌟', desc: 'لعبت الألعاب التسع.', check: a => Object.keys(GAMES).every(id => a.game(id).plays >= 1) },
    { id: 'streak-3', name: 'سلسلة ثلاثة أيام', icon: '🔥', desc: 'لعبت في ثلاثة أيام متتالية.', check: a => a.streak >= 3 },
    { id: 'xp-500', name: 'خمسمئة نقطة خبرة', icon: '⚡', desc: 'جمعت ٥٠٠ XP على المنصة.', check: a => a.xp >= 500 },
    { id: 'path-cataloging', name: 'مسار الفهرسة مكتمل', icon: '🗂️', desc: 'أتممت كل خطوات مسار الفهرسة.', check: a => a.path('cataloging') === 100 },
    { id: 'path-classification', name: 'مسار التصنيف مكتمل', icon: '📕', desc: 'أتممت كل خطوات مسار التصنيف.', check: a => a.path('classification') === 100 }
  ];

  /* ── أدوات ── */
  function todayKey(d) {
    const date = d || new Date();
    const pad = n => String(n).padStart(2, '0');
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }
  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  function pct(correct, total) {
    return total ? Math.round((correct / total) * 100) : 0;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  function emptyState() {
    return {
      v: VERSION, xp: 0, createdAt: Date.now(), updatedAt: Date.now(),
      games: {}, skills: {}, badges: [], flags: {},
      mistakes: [], activity: [], missions: { date: todayKey(), claimed: [] }
    };
  }

  let memory = null;
  let warned = false;
  function warn(e) {
    if (warned) return;
    warned = true;
    console.warn('MPProgress: التخزين المحلي غير متاح، سيُستخدم تخزين مؤقت.', e);
  }
  function read() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { warn(e); }
    if (!raw) {
      if (!memory) {
        memory = emptyState();
        migrate(memory);
      }
      return memory;
    }
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    const s = normalize(parsed);
    memory = s;
    return s;
  }
  function write(s) {
    s.updatedAt = Date.now();
    s.v = VERSION;
    memory = s;
    try { localStorage.setItem(KEY, JSON.stringify(s)); }
    catch (e) { warn(e); }
    return s;
  }
  function normalize(input) {
    const s = emptyState();
    if (!input || typeof input !== 'object') return s;
    s.xp = num(input.xp);
    s.createdAt = num(input.createdAt) || Date.now();
    s.flags = input.flags && typeof input.flags === 'object' ? input.flags : {};
    ['games', 'skills'].forEach(bucket => {
      const src = input[bucket];
      if (!src || typeof src !== 'object') return;
      Object.keys(src).forEach(id => {
        if (bucket === 'games' && !GAMES[id]) return;
        if (bucket === 'skills' && !SKILLS[id]) return;
        const g = src[id] || {};
        s[bucket][id] = {
          plays: num(g.plays), total: num(g.total), correct: num(g.correct),
          best: num(g.best), xp: num(g.xp), lastAt: num(g.lastAt)
        };
      });
    });
    if (Array.isArray(input.badges)) {
      s.badges = input.badges.filter(id => BADGES.some(b => b.id === id));
    }
    if (Array.isArray(input.mistakes)) {
      s.mistakes = input.mistakes.slice(0, 120).filter(m => m && m.key).map(m => ({
        id: String(m.id || (m.game + '|' + m.key)),
        game: GAMES[m.game] ? m.game : 'minigames',
        key: String(m.key),
        concept: String(m.concept || ''),
        why: String(m.why || ''),
        termId: String(m.termId || ''),
        count: num(m.count) || 1,
        at: num(m.at) || Date.now(),
        reviewed: !!m.reviewed
      }));
    }
    if (Array.isArray(input.activity)) {
      s.activity = input.activity.slice(-400).filter(a => a && a.d).map(a => ({
        d: String(a.d), game: GAMES[a.game] ? a.game : '', total: num(a.total), correct: num(a.correct), xp: num(a.xp), at: num(a.at)
      }));
    }
    if (input.missions && input.missions.date === todayKey()) {
      s.missions = { date: todayKey(), claimed: Array.isArray(input.missions.claimed) ? input.missions.claimed.filter(id => DAILY_MISSIONS.some(m => m.id === id)) : [] };
    }
    return s;
  }

  /* ── ترحيل بيانات المراحل السابقة (أفضل نتيجة/التعلم) بلا فقدها ── */
  function migrate(s) {
    try {
      const bests = JSON.parse(localStorage.getItem('maktabaplay.best.v1') || '{}');
      Object.keys(bests).forEach(id => {
        if (!GAMES[id]) return;
        const b = bests[id] || {};
        s.games[id] = {
          plays: num(b.plays), total: num(b.total), correct: num(b.correct),
          best: num(b.best), xp: 0, lastAt: 0
        };
        const skill = GAMES[id].skill;
        if (!s.skills[skill]) s.skills[skill] = { plays: 0, total: 0, correct: 0, best: 0, xp: 0, lastAt: 0 };
        s.skills[skill].plays += num(b.plays);
        s.skills[skill].total += num(b.total);
        s.skills[skill].correct += num(b.correct);
      });
      s.xp = Math.min(600, Object.keys(s.games).reduce((sum, id) => sum + Math.min(80, Math.round(s.games[id].best / 10)), 0));
    } catch (e) { /* لا بيانات قديمة */ }
  }

  /* ── المستوى ── */
  function levelInfo(xp) {
    const value = num(xp);
    let i = 0;
    for (let k = 0; k < LEVELS.length; k++) if (value >= LEVELS[k].at) i = k;
    const current = LEVELS[i];
    const next = LEVELS[i + 1] || null;
    const span = next ? next.at - current.at : 1;
    const done = next ? value - current.at : 1;
    return {
      level: i + 1,
      name: current.name,
      xp: value,
      nextAt: next ? next.at : null,
      nextName: next ? next.name : null,
      toNext: next ? Math.max(0, next.at - value) : 0,
      pct: next ? Math.max(0, Math.min(100, Math.round((done / span) * 100))) : 100
    };
  }

  /* ── تجميعات للشارات واللوحة ── */
  function aggregates(s) {
    const gameIds = Object.keys(GAMES);
    const totals = gameIds.reduce((acc, id) => {
      const g = s.games[id] || {};
      acc.total += num(g.total);
      acc.correct += num(g.correct);
      acc.plays += num(g.plays);
      acc.rounds += num(g.plays);
      return acc;
    }, { total: 0, correct: 0, plays: 0, rounds: 0 });
    const dates = Array.from(new Set(s.activity.map(a => a.d))).sort();
    let streak = 0;
    if (dates.length) {
      const check = new Date(todayKey() + 'T00:00:00');
      const last = new Date(dates[dates.length - 1] + 'T00:00:00');
      const diffDays = Math.round((check - last) / 86400000);
      if (diffDays <= 1) {
        streak = 1;
        for (let i = dates.length - 1; i > 0; i--) {
          const a = new Date(dates[i] + 'T00:00:00');
          const b = new Date(dates[i - 1] + 'T00:00:00');
          if (Math.round((a - b) / 86400000) === 1) streak++;
          else break;
        }
      }
    }
    return {
      total: totals.total,
      correct: totals.correct,
      plays: totals.plays,
      rounds: totals.rounds,
      accuracy: pct(totals.correct, totals.total),
      streak: streak,
      xp: s.xp,
      game(id) {
        const g = s.games[id] || { plays: 0, total: 0, correct: 0, best: 0 };
        return { plays: g.plays || 0, total: g.total || 0, correct: g.correct || 0, best: g.best || 0, accuracy: pct(g.correct, g.total) };
      },
      skill(id) {
        const sk = s.skills[id] || { plays: 0, total: 0, correct: 0 };
        return { plays: sk.plays || 0, total: sk.total || 0, correct: sk.correct || 0, accuracy: pct(sk.correct, sk.total) };
      },
      path(id) {
        const path = PATHS.find(p => p.id === id);
        if (!path) return 0;
        const done = path.steps.filter(g => (s.games[g] || {}).plays > 0).length;
        return Math.round((done / path.steps.length) * 100);
      }
    };
  }

  function awardBadges(s) {
    const a = aggregates(s);
    const earned = [];
    BADGES.forEach(b => {
      if (s.badges.indexOf(b.id) > -1) return;
      let ok = false;
      try { ok = !!b.check(a, s); } catch (e) { ok = false; }
      if (ok) { s.badges.push(b.id); earned.push(b); }
    });
    return earned;
  }

  /* ── احتساب XP ── */
  function xpForRound(info) {
    const total = num(info.total);
    const correct = num(info.correct);
    const accuracy = info.accuracy != null ? Math.max(0, Math.min(100, Number(info.accuracy))) : pct(correct, total);
    if (total > 0) {
      const volume = Math.min(total, 20);
      let xp = volume * 3 * (accuracy / 100);          // الدقة أولًا
      xp += total >= 5 ? 10 : 5;                        // إتمام الجولة
      if (accuracy >= 90 && total >= 8) xp += 10;       // إتقان
      return { xp: Math.round(Math.max(0, Math.min(80, xp))), accuracy: Math.round(accuracy) };
    }
    // المحاكاة (مهندس المكتبة): تُقاس بالنقاط لا بعدد الإجابات
    const score = num(info.score);
    return { xp: Math.round(Math.max(0, Math.min(80, score / 120))), accuracy: accuracy || null };
  }

  function recordResult(info) {
    info = info || {};
    const gameId = GAMES[info.game] ? info.game : null;
    if (!gameId) return null;
    const s = read();
    const today = todayKey();
    if (s.missions.date !== today) s.missions = { date: today, claimed: [] };

    const total = num(info.total);
    const correct = Math.min(total || num(info.correct), num(info.correct));
    const calc = xpForRound(info);
    if (!calc.xp && !num(info.score) && !total) return null;

    // سقف يومي: أول ٣ جولات كاملة لكل لعبة ثم ٥٠٪، وبحد أقصى ٣٠٠ XP يوميًا
    const todayRows = s.activity.filter(a => a.d === today);
    const gameRounds = todayRows.filter(a => a.game === gameId).length;
    const todayXp = todayRows.reduce((sum, a) => sum + num(a.xp), 0);
    let factor = gameRounds < 3 ? 1 : 0.5;
    let xp = Math.round(calc.xp * factor);
    xp = Math.max(0, Math.min(xp, 300 - todayXp));

    const g = s.games[gameId] || { plays: 0, total: 0, correct: 0, best: 0, xp: 0, lastAt: 0 };
    g.plays = num(g.plays) + 1;
    g.total = num(g.total) + total;
    g.correct = num(g.correct) + correct;
    g.best = Math.max(num(g.best), num(info.score));
    g.xp = num(g.xp) + xp;
    g.lastAt = Date.now();
    s.games[gameId] = g;

    const skillId = GAMES[gameId].skill;
    const sk = s.skills[skillId] || { plays: 0, total: 0, correct: 0, best: 0, xp: 0, lastAt: 0 };
    sk.plays = num(sk.plays) + 1;
    sk.total = num(sk.total) + total;
    sk.correct = num(sk.correct) + correct;
    sk.best = Math.max(num(sk.best), num(info.score));
    sk.xp = num(sk.xp) + xp;
    sk.lastAt = Date.now();
    s.skills[skillId] = sk;

    if (total >= 5 && calc.accuracy === 100) s.flags.perfectRound = true;

    s.xp = num(s.xp) + xp;
    s.activity.push({ d: today, game: gameId, total: total, correct: correct, xp: xp, at: Date.now() });
    s.activity = s.activity.slice(-400);

    const newBadges = awardBadges(s);
    write(s);
    if (newBadges.length) toastBadges(newBadges);

    return {
      game: gameId,
      xp: xp,
      accuracy: calc.accuracy,
      level: levelInfo(s.xp),
      newBadges: newBadges,
      todayXp: todayXp + xp,
      capped: xp < calc.xp
    };
  }

  /* ── أخطاء المراجعة ── */
  function addMistakes(gameId, items) {
    if (!GAMES[gameId] || !Array.isArray(items) || !items.length) return 0;
    const s = read();
    let added = 0;
    items.forEach(item => {
      if (!item || (!item.key && !item.concept)) return;
      const key = String(item.key || item.concept);
      const id = gameId + '|' + key;
      const found = s.mistakes.find(m => m.id === id);
      if (found) {
        found.count = Math.max(num(found.count), num(item.count) || 1);
        found.why = String(item.why || found.why || '');
        found.termId = String(item.termId || found.termId || '');
        found.at = num(item.at) || found.at;
      } else {
        s.mistakes.push({
          id: id, game: gameId, key: key,
          concept: String(item.concept || item.key || ''),
          why: String(item.why || ''),
          termId: String(item.termId || ''),
          count: num(item.count) || 1,
          at: num(item.at) || Date.now(),
          reviewed: false
        });
        added++;
      }
    });
    s.mistakes = s.mistakes.slice(-120);
    write(s);
    return added;
  }

  function removeMistake(id) {
    const s = read();
    const item = s.mistakes.find(m => m.id === id);
    if (!item) return false;
    s.mistakes = s.mistakes.filter(m => m.id !== id);
    write(s);
    try {
      if (window.ML && window.ML.review && window.ML.review.remove) {
        window.ML.review.remove(item.game, item.key);
      }
    } catch (e) { }
    return true;
  }

  /* ── المهام اليومية ── */
  function missions() {
    const s = read();
    const today = todayKey();
    const rows = s.activity.filter(a => a.d === today);
    const values = {
      rounds: rows.length,
      questions: rows.reduce((sum, a) => sum + num(a.total), 0),
      games: new Set(rows.map(a => a.game)).size
    };
    const claimed = s.missions.date === today ? s.missions.claimed : [];
    return DAILY_MISSIONS.map(m => {
      const value = Math.min(values[m.kind] || 0, m.target);
      return {
        id: m.id, title: m.title, hint: m.hint, xp: m.xp,
        value: value, target: m.target,
        done: value >= m.target,
        claimed: claimed.indexOf(m.id) > -1
      };
    });
  }

  function claimMission(id) {
    const s = read();
    const today = todayKey();
    if (s.missions.date !== today) s.missions = { date: today, claimed: [] };
    const m = missions().find(x => x.id === id);
    if (!m || !m.done || m.claimed || s.missions.claimed.indexOf(id) > -1) return { ok: false };
    s.missions.claimed.push(id);
    s.xp = num(s.xp) + m.xp;
    s.activity.push({ d: today, game: '', total: 0, correct: 0, xp: m.xp, at: Date.now() });
    const newBadges = awardBadges(s);
    write(s);
    if (newBadges.length) toastBadges(newBadges);
    return { ok: true, xp: m.xp, level: levelInfo(s.xp), newBadges: newBadges };
  }

  /* ── المسارات والتوصية ── */
  function paths() {
    const s = read();
    return PATHS.map(p => {
      const steps = p.steps.map(id => {
        const g = GAMES[id];
        return {
          id: id, title: g.title, icon: g.icon, url: g.url,
          done: num((s.games[id] || {}).plays) > 0
        };
      });
      const done = steps.filter(st => st.done).length;
      return {
        id: p.id, title: p.title, icon: p.icon, desc: p.desc, steps: steps,
        done: done, total: steps.length,
        pct: Math.round((done / steps.length) * 100),
        complete: done === steps.length,
        next: steps.find(st => !st.done) || null
      };
    });
  }

  function recommend() {
    const list = paths();
    const open = list.find(p => !p.complete && p.done > 0) || list.find(p => !p.complete) || list[0];
    if (!open) return null;
    if (!open.next) return { type: 'done', title: 'أتممت كل المسارات', desc: 'أعد الجولات لرفع الدقة، أو جرّب مستوى أصعب.', url: 'index.html' };
    return {
      type: 'step',
      path: open.title,
      title: open.next.title,
      icon: open.next.icon,
      url: open.next.url,
      desc: 'الخطوة التالية في ' + open.title + ' (' + open.done + '/' + open.total + ').'
    };
  }

  /* ── ملخص اللوحة ── */
  function summary() {
    const s = read();
    const a = aggregates(s);
    const lv = levelInfo(s.xp);
    const skillList = Object.keys(SKILLS).map(id => {
      const sk = a.skill(id);
      return {
        id: id, name: SKILLS[id].name, icon: SKILLS[id].icon,
        plays: sk.plays, total: sk.total, accuracy: sk.accuracy,
        enough: sk.total >= 15,
        level: sk.total >= 15 ? (sk.accuracy >= 85 ? 'متقن' : sk.accuracy >= 65 ? 'متقدم' : 'قيد التقدم') : 'بيانات غير كافية'
      };
    });
    return {
      xp: s.xp, level: lv,
      badges: s.badges.length, badgesTotal: BADGES.length,
      plays: a.plays, rounds: a.rounds, total: a.total, correct: a.correct,
      accuracy: a.accuracy, streak: a.streak,
      skills: skillList,
      paths: paths(),
      recommend: recommend(),
      missions: missions(),
      games: Object.keys(GAMES).map(id => {
        const g = a.game(id);
        return Object.assign({ id: id }, GAMES[id], { plays: g.plays, best: g.best, accuracy: g.accuracy });
      })
    };
  }

  function badgeList() {
    const s = read();
    return BADGES.map(b => ({ id: b.id, name: b.name, icon: b.icon, desc: b.desc, earned: s.badges.indexOf(b.id) > -1 }));
  }

  function mistakeList() {
    const s = read();
    return s.mistakes.slice().sort((a, b) => b.at - a.at).map(m => Object.assign({}, m, {
      gameTitle: (GAMES[m.game] || {}).title || m.game,
      gameIcon: (GAMES[m.game] || {}).icon || '🎮'
    }));
  }

  /* ── تصدير / استيراد / مسح ── */
  function exportData() {
    const s = read();
    return {
      app: 'MaktabaPlay', kind: 'progress', version: VERSION,
      exportedAt: new Date().toISOString(),
      data: s
    };
  }

  function importData(obj) {
    if (!obj || obj.app !== 'MaktabaPlay' || obj.kind !== 'progress') {
      throw new Error('الملف ليس نسخة تقدم من MaktabaPlay.');
    }
    if (Number(obj.version) !== VERSION) {
      throw new Error('إصدار ملف التقدم غير مدعوم (' + esc(obj.version) + ').');
    }
    const data = obj.data;
    if (!data || typeof data !== 'object' || !Number.isFinite(Number(data.xp))) {
      throw new Error('بيانات التقدم غير مكتملة أو تالفة.');
    }
    const s = normalize(data);
    write(s);
    return summary();
  }

  function reset() {
    try {
      ['maktabaplay.progress.v2', 'maktabaplay.learning.v1', 'maktabaplay.best.v1'].forEach(k => localStorage.removeItem(k));
    } catch (e) { warn(e); }
    memory = emptyState();
    write(memory);
  }

  function toastBadges(badges) {
    if (!badges || !badges.length) return;
    const text = badges.map(b => b.icon + ' شارة جديدة: ' + b.name).join(' · ');
    try {
      if (window.ML && window.ML.toast) { window.ML.toast(text, 4200); return; }
    } catch (e) { }
    const t = document.createElement('div');
    t.className = 'mp-toast is-open';
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.classList.remove('is-open'), 3600);
    setTimeout(() => t.remove(), 4200);
  }

  /* ── جسر مع الألعاب القديمة التي تحفظ عبر MPStorage (هانج مان) ── */
  function bridgeStorage() {
    if (!window.MPStorage || window.MPStorage.__mpProgressBridge) return;
    const original = window.MPStorage.saveResult;
    if (typeof original !== 'function') return;
    window.MPStorage.saveResult = function (gameId, result) {
      const out = original.apply(this, arguments);
      try {
        const r = result || {};
        if (GAMES[gameId]) {
          recordResult({
            game: gameId, score: r.score, correct: r.correct, total: r.total,
            level: r.level, accuracy: r.total ? Math.round((r.correct / r.total) * 100) : null
          });
        }
      } catch (e) { /* لا نكسر نهاية اللعبة */ }
      return out;
    };
    window.MPStorage.__mpProgressBridge = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bridgeStorage);
  } else {
    bridgeStorage();
  }

  window.MPProgress = {
    GAMES: GAMES,
    SKILLS: SKILLS,
    PATHS: PATHS,
    BADGES: BADGES,
    LEVELS: LEVELS,
    recordResult: recordResult,
    addMistakes: addMistakes,
    removeMistake: removeMistake,
    missions: missions,
    claimMission: claimMission,
    paths: paths,
    recommend: recommend,
    summary: summary,
    badges: badgeList,
    mistakes: mistakeList,
    levelFor: levelInfo,
    exportData: exportData,
    importData: importData,
    reset: reset,
    todayKey: todayKey,
    read: read
  };
})();
