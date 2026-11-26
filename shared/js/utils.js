(function () {
  'use strict';

  function shuffle(items) {
    const result = Array.from(items || []);
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function pick(items, count) {
    const amount = Math.max(0, Math.min(Number(count) || 0, (items || []).length));
    return shuffle(items || []).slice(0, amount);
  }

  function clamp(number, min, max) {
    return Math.min(max, Math.max(min, number));
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  function normalizeArabic(value) {
    return String(value == null ? '' : value)
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه');
  }

  function debounce(fn, ms) {
    let timer;
    return function () {
      const context = this;
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(context, args), ms);
    };
  }

  function uid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  window.MPUtils = { shuffle, pick, clamp, formatTime, normalizeArabic, debounce, uid };
})();
