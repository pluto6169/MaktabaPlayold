// Usage: MPEndScreen.show({ gameId: 'hangman', score: 80, correct: 1, total: 1 });
(function () {
  'use strict';

  const GAMES = [
    { id: 'hangman', name: 'هانج مان المخطوط', href: 'games/hangman/' },
    { id: 'ladder', name: 'السلم والتصنيف', href: 'ladder-classification.html' },
    { id: 'detective', name: 'محقق MARC21', href: 'book-detective.html' },
    { id: 'sorter', name: 'رتّب الرف', href: 'shelf-sorter.html' },
    { id: 'tree', name: 'سلسلة الفهرس الشجري', href: 'silsilat_alfahras_tree.html' },
    { id: 'minigames', name: 'التدريب السريع', href: 'minigames.html' },
    { id: 'tycoon', name: 'مهندس المكتبة', href: 'games/library-tycoon/' },
    { id: 'race', name: 'سباق التصنيف', href: 'games/classification-race/' },
    { id: 'traffic', name: 'موجه المستفيدين', href: 'traffic-controller.html' }
  ];

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function rootPrefix() {
    return location.pathname.includes('/games/') ? '../../' : '';
  }

  function show(options) {
    const cfg = options || {};
    if (!window.MPModal || typeof window.MPModal.open !== 'function') {
      throw new Error('MPEndScreen requires MPModal.open().');
    }
    if (!window.MPStorage) throw new Error('MPEndScreen requires MPStorage.');

    const prefix = rootPrefix();
    const best = window.MPStorage.getBest(cfg.gameId);
    const currentScore = Math.max(0, Number(cfg.score) || 0);
    const isNewBest = cfg.newBest === true || (cfg.newBest !== false && currentScore > best);
    const allBest = window.MPStorage.getAllBest();
    const suggestions = GAMES
      .filter(game => game.id !== cfg.gameId)
      .sort((a, b) => (allBest[a.id]?.plays || 0) - (allBest[b.id]?.plays || 0))
      .slice(0, 2);
    const badges = Array.isArray(cfg.newBadges) ? cfg.newBadges : [];
    const reviews = Array.isArray(cfg.reviewList) ? cfg.reviewList : [];
    const details = cfg.details || {};

    const detailHtml = details.word ? `
      <section class="mp-end-screen__term" aria-label="معلومات المصطلح">
        <h3>المصطلح: ${escapeHtml(details.word)}</h3>
        <p><strong>التعريف:</strong> ${escapeHtml(details.definition || 'لا يتوفر تعريف لهذا المصطلح بعد.')}</p>
        <p><strong>المصدر:</strong> ${escapeHtml(details.source || 'لا يتوفر مصدر لهذا المصطلح بعد.')}</p>
      </section>` : '';
    const badgesHtml = badges.length ? `
      <section class="mp-end-screen__badges"><h3>إنجازات جديدة</h3><ul>${badges.map(badge => `<li>${escapeHtml(badge)}</li>`).join('')}</ul></section>` : '';
    const reviewHtml = reviews.length ? `
      <section class="mp-end-screen__review"><h3>راجع لاحقًا</h3><ul>${reviews.map(item => {
        const label = typeof item === 'string' ? item : [item.word || item.key, item.why].filter(Boolean).join(' — ');
        return `<li>${escapeHtml(label)}</li>`;
      }).join('')}</ul></section>` : '';
    const suggestionsHtml = suggestions.map(game =>
      `<a class="mp-end-screen__suggestion" href="${prefix}${game.href}">${escapeHtml(game.name)}</a>`
    ).join('');

    const modal = window.MPModal.open({
      className: 'mp-overlay--end-screen',
      boxClass: 'mp-end-screen',
      label: 'نتيجة الجولة',
      html: `
        <div class="mp-end-screen__content">
          <h2>${cfg.correct ? 'أحسنت!' : 'انتهت الجولة'}</h2>
          <p class="mp-end-screen__score">النتيجة: <strong>${currentScore}</strong></p>
          <p class="mp-end-screen__best${isNewBest ? ' is-new' : ''}">${isNewBest ? 'أفضل نتيجة جديدة!' : 'أفضل نتيجة لك'}: <strong>${best}</strong></p>
          ${detailHtml}${badgesHtml}${reviewHtml}
          <div class="mp-end-screen__suggestions"><h3>جرّب لعبة أخرى</h3>${suggestionsHtml}</div>
          <div class="mp-end-screen__actions">
            <button type="button" class="hangman-btn" data-replay>العب تاني</button>
            <a class="hangman-btn hangman-btn-secondary" href="${prefix}index.html">الرئيسية</a>
          </div>
        </div>`
    });

    modal.el.querySelector('[data-replay]').addEventListener('click', () => {
      modal.close();
      if (typeof cfg.onReplay === 'function') cfg.onReplay();
    });
    return modal;
  }

  window.MPEndScreen = { show };
})();
