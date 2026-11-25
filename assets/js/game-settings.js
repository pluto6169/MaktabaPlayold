/* ============================================================
   MaktabaPlay — Game Settings & Sound
   إعدادات موحّدة محفوظة محليًا + محرك مؤثرات صوتية خفيف (WebAudio).
   التخزين: maktabaplay.settings.v1
   ============================================================ */
(function () {
  'use strict';

  const KEY = 'maktabaplay.settings.v1';
  const DEFAULTS = {
    sound: true,
    motion: 'full',      // full | reduced
    noTimer: false,
    difficulty: {},      // { gameId: levelId }
    rounds: {}           // { gameId: value }
  };

  function read() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      return Object.assign({}, DEFAULTS, raw, {
        difficulty: Object.assign({}, raw.difficulty || {}),
        rounds: Object.assign({}, raw.rounds || {})
      });
    } catch (e) {
      return Object.assign({}, DEFAULTS, { difficulty: {}, rounds: {} });
    }
  }

  function write(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { /* التخزين غير متاح */ }
  }

  let state = read();

  function applyMotion() {
    document.documentElement.setAttribute('data-mp-motion', state.motion === 'reduced' ? 'reduced' : 'full');
  }
  applyMotion();

  /* ── محرك الصوت ── */
  let ac = null;
  function ctx() {
    if (!state.sound) return null;
    try {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
      }
      if (ac.state === 'suspended' && ac.resume) ac.resume();
      return ac;
    } catch (e) { return null; }
  }

  function tone(freq, start, dur, type, gain) {
    const c = ctx();
    if (!c) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, c.currentTime + start);
    g.gain.setValueAtTime(0.0001, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime(gain || 0.08, c.currentTime + start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
    osc.connect(g); g.connect(c.destination);
    osc.start(c.currentTime + start);
    osc.stop(c.currentTime + start + dur + 0.02);
  }

  function sfx(name) {
    if (!state.sound) return;
    switch (name) {
      case 'click': tone(520, 0, .06, 'triangle', .05); break;
      case 'ok':
        tone(660, 0, .1, 'sine', .07);
        tone(880, .09, .14, 'sine', .06);
        break;
      case 'bad':
        tone(240, 0, .14, 'sawtooth', .05);
        tone(180, .1, .18, 'sawtooth', .045);
        break;
      case 'win':
        [523, 659, 784, 1046].forEach((f, i) => tone(f, i * .1, .22, 'triangle', .07));
        break;
      case 'pause': tone(420, 0, .08, 'sine', .05); tone(320, .08, .1, 'sine', .04); break;
      case 'tick': tone(880, 0, .04, 'square', .025); break;
      default: tone(600, 0, .07, 'sine', .05);
    }
  }

  window.MPSettings = {
    get: () => Object.assign({}, state),
    set(patch) {
      state = Object.assign({}, state, patch);
      if (patch.difficulty) state.difficulty = Object.assign({}, patch.difficulty);
      if (patch.rounds) state.rounds = Object.assign({}, patch.rounds);
      write(state);
      applyMotion();
      return state;
    },
    toggle(key) {
      const patch = {};
      patch[key] = !state[key];
      this.set(patch);
      sfx('click');
      return state[key];
    },
    difficulty(game, fallback) { return state.difficulty[game] || fallback; },
    setDifficulty(game, value) {
      const map = Object.assign({}, state.difficulty);
      map[game] = value;
      this.set({ difficulty: map });
    },
    rounds(game, fallback) { return state.rounds[game] || fallback; },
    setRounds(game, value) {
      const map = Object.assign({}, state.rounds);
      map[game] = value;
      this.set({ rounds: map });
    },
    sfx,
    reset() {
      state = Object.assign({}, DEFAULTS, { difficulty: {}, rounds: {} });
      write(state);
      applyMotion();
    }
  };
})();
