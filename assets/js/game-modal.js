/* ============================================================
   MaktabaPlay — Modals (نوافذ موحّدة قابلة للوصول)
   MPModal.open({ html, className, label, dismissible, onClose }) → { el, close }
   حبس التركيز، Esc للإغلاق، إعادة التركيز للعنصر السابق.
   ============================================================ */
(function () {
  'use strict';

  let openCount = 0;

  function lockScroll() {
    openCount++;
    document.body.style.overflow = 'hidden';
  }
  function unlockScroll() {
    openCount = Math.max(0, openCount - 1);
    if (!openCount) document.body.style.overflow = '';
  }

  function open(opts) {
    opts = opts || {};
    const prevFocus = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'mp-overlay ' + (opts.className || '') + ' mp-anim-rise';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    if (opts.label) overlay.setAttribute('aria-label', opts.label);

    const box = document.createElement('div');
    box.className = opts.boxClass || '';
    box.innerHTML = opts.html || '';
    overlay.appendChild(box);

    const dismissible = opts.dismissible !== false;
    function close() {
      overlay.remove();
      unlockScroll();
      document.removeEventListener('keydown', onKey, true);
      if (typeof opts.onClose === 'function') opts.onClose();
      try { if (prevFocus && prevFocus.focus) prevFocus.focus(); } catch (e) { }
    }

    function onKey(e) {
      if (e.key === 'Escape' && dismissible) { e.stopPropagation(); close(); return; }
      if (e.key !== 'Tab') return;
      const nodes = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const list = Array.from(nodes).filter(n => !n.disabled && n.offsetParent !== null);
      if (!list.length) return;
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    overlay.addEventListener('mousedown', e => {
      if (e.target === overlay && dismissible) close();
    });
    document.addEventListener('keydown', onKey, true);

    document.body.appendChild(overlay);
    lockScroll();

    const focusable = overlay.querySelector('[data-autofocus], button, [href], input');
    if (focusable) setTimeout(() => { try { focusable.focus(); } catch (e) { } }, 30);

    box.querySelectorAll('[data-mp-close]').forEach(b => b.addEventListener('click', close));

    return { el: overlay, close };
  }

  function confirm(opts) {
    return new Promise(resolve => {
      const m = open({
        className: 'mp-overlay--settings',
        html: `<div class="mp-settings">
          <div class="mp-settings__head">
            <div>
              <h2>${opts.title || 'تأكيد'}</h2>
              <p>${opts.text || ''}</p>
            </div>
            <button class="mp-icon-btn" data-mp-close aria-label="إغلاق">✕</button>
          </div>
          <div class="mp-settings__actions">
            <button class="mp-btn mp-btn--ghost" data-mp-close>إلغاء</button>
            <button class="mp-btn mp-btn--danger" data-yes>${opts.ok || 'تأكيد'}</button>
          </div>
        </div>`,
        onClose: () => resolve(false)
      });
      m.el.querySelector('[data-yes]').addEventListener('click', () => {
        m.close();
        resolve(true);
      });
    });
  }

  window.MPModal = { open, confirm };
})();
