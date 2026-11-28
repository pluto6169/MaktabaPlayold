/* ============================================================
   MaktabaPlay — Game Header
   يبني هيدرًا واحدًا لكل الألعاب: الشعار، المسار، التنقّل، عنوان
   اللعبة وأيقونتها، شارة المستوى، وزر الرجوع.
   الاستخدام: MPHeader.render({ title, icon, tagline, level, field })
   ============================================================ */
(function () {
  'use strict';

  const LOGO = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v18H6.5A2.5 2.5 0 0 0 4 23V5.5Z" fill="currentColor" opacity=".85"/>
    <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v18h4.5A2.5 2.5 0 0 1 20 23V5.5Z" fill="currentColor" opacity=".55"/>
    <path d="M9.6 8.8v6.4l5.1-3.2-5.1-3.2Z" fill="#04121a"/>
  </svg>`;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function render(config) {
    const cfg = config || {};
    const root = location.pathname.includes('/games/') ? '../../' : '';
    const home = `${root}index.html`;
    const profile = `${root}profile.html`;
    const learning = `${root}my-learning.html`;
    let host = document.getElementById('mpHeader');
    if (!host) {
      host = document.createElement('header');
      host.id = 'mpHeader';
      document.body.insertBefore(host, document.body.firstChild);
    }
    host.className = 'mp-header';
    host.setAttribute('role', 'banner');

    const title = esc(cfg.title || 'لعبة مكتبية');
    const icon = esc(cfg.icon || '🎮');
    const tagline = esc(cfg.tagline || '');
    const levelText = esc(cfg.levelLabel || 'مستوى مبتدئ');
    const level = cfg.level || 1;
    const active = cfg.active || 'games';

    host.innerHTML = `
      <div class="mp-header__bar">
        <a class="mp-brand" href="${home}" aria-label="MaktabaPlay — الصفحة الرئيسية">
          <span class="mp-brand__mark">${LOGO}</span>
          <span class="mp-brand__text"><b>MaktabaPlay</b><small>العب • اتعلم • اتطور</small></span>
        </a>

        <div class="mp-crumbs" aria-label="مسار التنقّل">
          <a href="${home}">مكتبة الألعاب</a>
          <span>›</span>
          <strong>${title}</strong>
        </div>

        <nav class="mp-nav" id="mpNav" aria-label="التنقّل الرئيسي">
          <a href="${home}" class="${active === 'home' ? 'is-active' : ''}">الرئيسية</a>
          <a href="${home}#games" class="${active === 'games' ? 'is-active' : ''}">الألعاب</a>
          <a href="${learning}" class="${active === 'achievements' ? 'is-active' : ''}">تعلّمي</a>
          <a href="${profile}" class="${active === 'profile' ? 'is-active' : ''}">الملف الشخصي</a>
        </nav>

        <div class="mp-header__actions">
          <div id="authLinks"></div>
          <button class="mp-icon-btn mp-menu-btn" id="mpMenuBtn" aria-label="فتح القائمة" aria-expanded="false">☰</button>
          <a class="mp-back" href="${home}" title="العودة إلى مكتبة الألعاب">
            <span>→</span><b>رجوع</b>
          </a>
        </div>
      </div>

      <div class="mp-game-strip">
        <div class="mp-game-strip__icon" aria-hidden="true">${icon}</div>
        <div class="mp-game-strip__text">
          <div class="mp-game-strip__title">${title}
            <span class="mp-badge-level" data-level="${level}" id="mpLevelBadge">${levelText}</span>
          </div>
          ${tagline ? `<div class="mp-game-strip__tagline">${tagline}</div>` : ''}
        </div>
        <div class="mp-game-strip__spacer"></div>
        <div class="mp-game-strip__meta">
          ${cfg.field ? `<span class="mp-chip mp-chip--violet">🏷️ ${esc(cfg.field)}</span>` : ''}
          <a class="mp-chip mp-chip--gold mp-xp-chip" id="mpXpChip" href="${learning}" hidden title="نقاط الخبرة على المنصة — تعلّمي">
            ⚡ <b id="mpXpValue">0</b> XP · <span id="mpXpLevel">مستكشف مبتدئ</span>
          </a>
          <span class="mp-chip mp-chip--cyan" id="mpBestChip" hidden>🏆 أفضل نتيجة: <b id="mpBestValue">0</b></span>
        </div>
      </div>`;

    const menu = host.querySelector('#mpMenuBtn');
    const nav = host.querySelector('#mpNav');
    if (menu && nav) {
      menu.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        menu.setAttribute('aria-expanded', open ? 'true' : 'false');
        menu.textContent = open ? '✕' : '☰';
      });
    }

    document.body.classList.add('mp-has-header');
    window.MPHeader.current = cfg;
    if (window.MPProgress) { try { setXP(window.MPProgress.summary().level); } catch (e) { } }
    return host;
  }

  function setLevel(label, level) {
    const badge = document.getElementById('mpLevelBadge');
    if (!badge) return;
    badge.textContent = label || 'مستوى مبتدئ';
    badge.setAttribute('data-level', String(level || 1));
  }

  function setBest(value) {
    const chip = document.getElementById('mpBestChip');
    const val = document.getElementById('mpBestValue');
    if (!chip || !val) return;
    if (!value) { chip.hidden = true; return; }
    val.textContent = Number(value).toLocaleString('ar-EG');
    chip.hidden = false;
  }

  function setXP(level) {
    const chip = document.getElementById('mpXpChip');
    const value = document.getElementById('mpXpValue');
    const name = document.getElementById('mpXpLevel');
    if (!chip || !value || !level) return;
    if (!level.xp) { chip.hidden = true; return; }
    value.textContent = Number(level.xp).toLocaleString('ar-EG');
    if (name) name.textContent = level.name + ' · م' + Number(level.level).toLocaleString('ar-EG');
    chip.hidden = false;
  }

  window.MPHeader = { render, setLevel, setBest, setXP };
})();
