(function () {
  'use strict';

  const STORAGE_PREFIX = 'maktaba:howto:';
  const memorySeen = new Set();
  const initialized = new Set();
  const openDialogs = new Map();
  let warnedStorage = false;

  function getSteps(gameId) {
    const steps = window.MP_HOWTO && window.MP_HOWTO[gameId];
    if (!Array.isArray(steps) || steps.length !== 3 || steps.some(step => typeof step !== 'string' || !step.trim())) {
      throw new Error(`MPHowTo requires exactly three non-empty steps for "${gameId}".`);
    }
    return steps;
  }

  function hasSeen(gameId) {
    try {
      return window.localStorage.getItem(STORAGE_PREFIX + gameId) === '1';
    } catch (error) {
      if (!warnedStorage) {
        warnedStorage = true;
        console.warn('MPHowTo is using in-memory completion state because localStorage is unavailable.', error);
      }
      return memorySeen.has(gameId);
    }
  }

  function markSeen(gameId) {
    memorySeen.add(gameId);
    try {
      window.localStorage.setItem(STORAGE_PREFIX + gameId, '1');
    } catch (error) {
      if (!warnedStorage) {
        warnedStorage = true;
        console.warn('MPHowTo could not persist completion because localStorage is unavailable.', error);
      }
    }
  }

  function show(gameId, steps) {
    if (openDialogs.has(gameId)) return openDialogs.get(gameId);
    if (!window.MPModal || typeof window.MPModal.open !== 'function') {
      throw new Error('MPHowTo requires MPModal.open().');
    }

    let currentStep = 0;
    let modal;
    modal = window.MPModal.open({
      className: 'mp-overlay--howto',
      boxClass: 'mp-howto',
      label: 'كيف تلعب؟',
      html: `
        <div class="mp-howto__header">
          <div>
            <p class="mp-howto__eyebrow">دليل سريع</p>
            <h2>كيف تلعب؟</h2>
          </div>
          <button type="button" class="mp-icon-btn" data-mp-close aria-label="إغلاق الشرح">×</button>
        </div>
        <p class="mp-howto__progress" data-progress></p>
        <p class="mp-howto__step" data-step aria-live="polite"></p>
        <div class="mp-howto__actions">
          <button type="button" class="mp-howto__button mp-howto__button--quiet" data-prev>السابق</button>
          <button type="button" class="mp-howto__button mp-howto__button--quiet" data-skip>تخطي</button>
          <button type="button" class="mp-howto__button" data-next>التالي</button>
        </div>`,
      onClose: () => {
        openDialogs.delete(gameId);
        markSeen(gameId);
      }
    });
    openDialogs.set(gameId, modal);

    const progress = modal.el.querySelector('[data-progress]');
    const stepText = modal.el.querySelector('[data-step]');
    const previous = modal.el.querySelector('[data-prev]');
    const next = modal.el.querySelector('[data-next]');
    function renderStep() {
      progress.textContent = `الخطوة ${currentStep + 1} من ${steps.length}`;
      stepText.textContent = steps[currentStep];
      previous.disabled = currentStep === 0;
      next.textContent = currentStep === steps.length - 1 ? 'ابدأ اللعب' : 'التالي';
    }

    previous.addEventListener('click', () => {
      if (currentStep === 0) return;
      currentStep--;
      renderStep();
    });
    next.addEventListener('click', () => {
      if (currentStep === steps.length - 1) {
        modal.close();
        return;
      }
      currentStep++;
      renderStep();
    });
    modal.el.querySelector('[data-skip]').addEventListener('click', () => modal.close());
    renderStep();
    return modal;
  }

  function init(gameId) {
    if (initialized.has(gameId)) return;
    const steps = getSteps(gameId);
    initialized.add(gameId);

    const mount = () => {
      const actions = document.querySelector('.mp-header__actions');
      if (!actions) {
        initialized.delete(gameId);
        console.warn(`MPHowTo could not find the game header for "${gameId}".`);
        return;
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mp-icon-btn mp-howto-trigger';
      button.textContent = '؟';
      button.title = 'كيف تلعب؟';
      button.setAttribute('aria-label', 'كيف تلعب؟');
      button.addEventListener('click', () => show(gameId, steps));
      const back = actions.querySelector('.mp-back');
      actions.insertBefore(button, back || null);

      if (gameId !== 'tycoon' && !hasSeen(gameId) && !document.querySelector('[role="dialog"]')) {
        show(gameId, steps);
      }
    };

    if (document.querySelector('.mp-header__actions')) {
      mount();
    } else {
      document.addEventListener('DOMContentLoaded', mount, { once: true });
    }
  }

  window.MPHowTo = { init };
})();
