  const DC = [
    { num: "000", name: "المعارف العامة" },
    { num: "100", name: "الفلسفة وعلم النفس" },
    { num: "200", name: "الديانات" },
    { num: "300", name: "العلوم الاجتماعية" },
    { num: "400", name: "اللغات" },
    { num: "500", name: "العلوم البحتة" },
    { num: "600", name: "العلوم التطبيقية" },
    { num: "700", name: "الفنون" },
    { num: "800", name: "الآداب" },
    { num: "900", name: "التاريخ والجغرافيا" }
  ];
  const BDB = [
    { title: "مقدمة في علم الحاسوب", hint: "أساسيات الحواسيب", cat: "000" },
    { title: "الموسوعة البريطانية", hint: "موسوعة عامة", cat: "000" },
    { title: "مبادئ التحليل النفسي", hint: "علم النفس", cat: "100" },
    { title: "تاريخ الفلسفة اليونانية", hint: "فلسفة", cat: "100" },
    { title: "أحكام التجويد", hint: "علوم القرآن", cat: "200" },
    { title: "تاريخ الأديان", hint: "مقارنة أديان", cat: "200" },
    { title: "مبادئ الاقتصاد الجزئي", hint: "اقتصاد", cat: "300" },
    { title: "القانون التجاري", hint: "قانون", cat: "300" },
    { title: "أصول التربية", hint: "تعليم وتربية", cat: "300" },
    { title: "النحو الوافي", hint: "لغة عربية", cat: "400" },
    { title: "قاموس أكسفورد", hint: "معاجم لغوية", cat: "400" },
    { title: "الفيزياء الجامعية", hint: "فيزياء", cat: "500" },
    { title: "أساسيات علم النبات", hint: "أحياء", cat: "500" },
    { title: "الكيمياء العضوية", hint: "كيمياء", cat: "500" },
    { title: "أسس الطب الباطني", hint: "طب", cat: "600" },
    { title: "هندسة الطرق", hint: "هندسة", cat: "600" },
    { title: "إدارة الأعمال", hint: "إدارة", cat: "600" },
    { title: "تاريخ الفن التشكيلي", hint: "فنون", cat: "700" },
    { title: "قواعد التصوير الفوتوغرافي", hint: "تصوير", cat: "700" },
    { title: "ديوان المتنبي", hint: "شعر عربي", cat: "800" },
    { title: "رواية البؤساء", hint: "أدب فرنسي", cat: "800" },
    { title: "أطلس العالم", hint: "خرائط وجغرافيا", cat: "900" },
    { title: "تاريخ الحضارة الإسلامية", hint: "تاريخ", cat: "900" },
    { title: "رحلة ابن بطوطة", hint: "رحلات وسير", cat: "900" }
  ];

  const cv = document.getElementById('rc');
  const cx = cv.getContext('2d');
  const W = 680, H = 200;
  const px = 5;

  // --- game state ---
  let wave = 1, score = 0, lives = 3, curBook = null, timerInt = null, maxT = 15, timeR = 15, combo = 0, animId = null;
  let diffLevel = 2;

  // --- character state ---
  const FLOOR_Y = H - 40;
  const CHAR_GROUND = FLOOR_Y - 40;
  let charX = 110, charY = CHAR_GROUND;
  let stumbling = false, stumbleT = 0;
  // break-through state
  let breaking = false, breakT = 0, breakDone = false;

  // --- obstacle state ---
  let obstX = W + 60, obstSpeed = 3;
  // shatter pieces for the break effect
  let shards = [];

  // --- background ---
  let bgOff = 0, shelfBooks = [], frameC = 0;

  function initShelfBooks() {
    shelfBooks = [];
    for (let i = 0; i < 30; i++) {
      shelfBooks.push({
        x: i * 22 + Math.random() * 6,
        w: 10 + Math.floor(Math.random() * 10),
        h: 18 + Math.floor(Math.random() * 16),
        c: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#818cf8', '#ec4899'][Math.floor(Math.random() * 7)],
        row: Math.floor(Math.random() * 2)
      });
    }
  }

  // particles
  let parts = [];
  function spawnParts(x, y, col, n = 12) {
    for (let i = 0; i < n; i++) {
      parts.push({ x, y, vx: (Math.random() - .5) * 6, vy: -Math.random() * 7 - 1, col, sz: 4 + Math.floor(Math.random() * 5), life: 40 + Math.random() * 20, ml: 60 });
    }
  }

  // spawn wall shards when breaking
  function spawnShards(ox, oy) {
    shards = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 6; c++) {
        shards.push({
          x: ox + c * px, y: oy + r * px,
          vx: (Math.random() - .5) * 9 + (c < 3 ? -3 : 3),
          vy: -Math.random() * 8 - 2,
          rot: Math.random() * Math.PI * 2,
          rotV: (Math.random() - .5) * 0.3,
          col: (r + c) % 2 === 0 ? '#f97316' : '#fb923c',
          life: 40, ml: 40, sz: px
        });
      }
    }
    // also add green burst particles at impact
    spawnParts(ox + 15, oy + 25, '#22c55e', 16);
  }

  // ---- DRAW BACKGROUND ----
  function drawBG() {
    cx.fillStyle = '#0b1220'; cx.fillRect(0, 0, W, H);
    cx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 20; i++) { const sx = ((i * 73 + bgOff * .1) % W), sy = 8 + (i * 17) % 38; cx.fillRect(sx, sy, 2, 2); }
    const sby = [25, 65];
    sby.forEach((sy, ri) => {
      cx.fillStyle = ri === 0 ? '#1a2f50' : '#0d1f38'; cx.fillRect(0, sy, W, 38);
      cx.fillStyle = '#06b6d4'; cx.fillRect(0, sy, W, 2); cx.fillRect(0, sy + 38, W, 2);
      shelfBooks.filter(b => b.row === ri).forEach(b => {
        const bx = ((b.x - bgOff * (ri === 0 ? .6 : .4)) % (W + 40) + W + 40) % (W + 40) - 20;
        cx.fillStyle = b.c; cx.fillRect(bx, sy + (38 - b.h), b.w, b.h);
        cx.fillStyle = 'rgba(255,255,255,0.15)'; cx.fillRect(bx + 1, sy + (38 - b.h), 2, b.h);
      });
    });
    const fy = FLOOR_Y;
    for (let tx = 0; tx < W; tx += 20) {
      cx.fillStyle = Math.floor((tx + bgOff) / 20) % 2 === 0 ? '#0f1e3d' : '#0d1b38';
      cx.fillRect(tx, fy, 20, H - fy);
    }
    cx.fillStyle = '#06b6d4'; cx.fillRect(0, fy, W, 2);
    for (let li = 0; li < 3; li++) {
      const lx = ((li * 220 - bgOff * 1.2) % (W + 100) + W + 100) % (W + 100) - 50;
      cx.fillStyle = '#1e3a5f'; cx.fillRect(lx, fy - 55, 5, 55);
      cx.fillStyle = '#2a4a70'; cx.fillRect(lx - 8, fy - 58, 21, 8);
      cx.fillStyle = '#fbbf24'; cx.fillRect(lx - 4, fy - 62, 13, 8);
      cx.fillStyle = 'rgba(251,191,36,0.15)'; cx.beginPath(); cx.arc(lx + 2, fy - 58, 22, 0, Math.PI * 2); cx.fill();
    }
  }

  // ---- DRAW CHARACTER ----
  function drawChar() {
    const px5 = px;
    cx.save();
    if (stumbling) {
      const prog = Math.min(1, (Date.now() - stumbleT) / 600);
      cx.translate(charX + 10, charY + 20);
      cx.rotate(prog * Math.PI * .45);
      cx.translate(-(charX + 10), -(charY + 20));
    }
    const ls = Math.sin(frameC * .28);
    const leg1Y = charY + 24 + ls * 3;
    const leg2Y = charY + 24 - ls * 3;
    function dp(x, y, c, s = px5) { cx.fillStyle = c; cx.fillRect(Math.round(x), Math.round(y), s, s); }

    dp(charX + 6, leg1Y, '#06b6d4'); dp(charX + 6, leg1Y + px5, '#0284a8');
    dp(charX + 12, leg2Y, '#06b6d4'); dp(charX + 12, leg2Y + px5, '#0284a8');
    for (let i = 0; i < 3; i++)dp(charX + 4 + i * px5, charY + 14, '#06b6d4');
    for (let i = 0; i < 3; i++)dp(charX + 4 + i * px5, charY + 19, '#06b6d4');
    const as = Math.sin(frameC * .28 + Math.PI);
    dp(charX + 2, charY + 14 + as * 2, '#06b6d4');
    dp(charX + 18, charY + 14 - as * 2, '#06b6d4');
    for (let i = 0; i < 3; i++)dp(charX + 5 + i * px5, charY + 4, '#06b6d4');
    for (let i = 0; i < 3; i++)dp(charX + 5 + i * px5, charY + 9, '#06b6d4');
    dp(charX + 5, charY + 4, '#0284a8'); dp(charX + 15, charY + 4, '#0284a8');
    dp(charX + 5, charY + 7, '#fff', px5 - 1);
    for (let i = 0; i < 4; i++)dp(charX + 4 + i * px5, charY, '#818cf8');
    dp(charX + 18, charY + 2, '#818cf8');

    if (stumbling) {
      const t = Date.now() * .01;
      for (let i = 0; i < 4; i++) {
        cx.fillStyle = '#fbbf24';
        cx.fillRect(charX + 22 + Math.cos(t + i * 1.57) * 10, charY - 4 + Math.sin(t + i * 1.57) * 8, 4, 4);
      }
    }
    cx.restore();
  }

  // ---- DRAW OBSTACLE ----
  function drawObst() {
    if (obstX > W + 50) return;
    // If breaking, don't draw the intact block (shards handle it)
    if (breaking && (Date.now() - breakT) > 80) return;
    const ox = obstX, oy = FLOOR_Y - 50;
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 10; row++) {
        cx.fillStyle = (col + row) % 2 === 0 ? '#f97316' : '#fb923c';
        cx.fillRect(ox + col * px, oy + row * px, px, px);
      }
    }
    cx.fillStyle = '#fed7aa';
    for (let col = 0; col < 6; col++)cx.fillRect(ox + col * px, oy, px, px);
    if (curBook) {
      cx.fillStyle = 'rgba(11,18,32,0.85)';
      cx.beginPath(); cx.roundRect(ox - 30, oy - 38, 90, 30, 6); cx.fill();
      cx.strokeStyle = '#f97316'; cx.lineWidth = 1.5; cx.stroke();
      cx.fillStyle = '#fff'; cx.font = 'bold 11px Tajawal,sans-serif'; cx.textAlign = 'center';
      cx.fillText(DC.find(d => d.num === curBook.cat)?.name || '', ox + 15, oy - 17);
    }
  }

  // ---- DRAW SHARDS ----
  function drawShards() {
    shards = shards.filter(s => s.life > 0);
    shards.forEach(s => {
      cx.save();
      cx.globalAlpha = s.life / s.ml;
      cx.translate(s.x + s.sz / 2, s.y + s.sz / 2);
      cx.rotate(s.rot);
      cx.fillStyle = s.col;
      cx.fillRect(-s.sz / 2, -s.sz / 2, s.sz, s.sz);
      cx.restore();
      s.x += s.vx; s.y += s.vy; s.vy += .35; s.rot += s.rotV; s.life--;
    });
  }

  // ---- DRAW PARTICLES ----
  function drawParts() {
    parts = parts.filter(p => p.life > 0);
    parts.forEach(p => {
      cx.globalAlpha = p.life / p.ml;
      cx.fillStyle = p.col;
      cx.fillRect(p.x, p.y, p.sz, p.sz);
      p.x += p.vx; p.y += p.vy; p.vy += .2; p.life--;
    });
    cx.globalAlpha = 1;
  }

  // ---- MAIN LOOP ----
  function loop() {
    frameC++;
    bgOff += 2 + wave * .15;

    // Obstacle moves only when not breaking / not stumbling
    if (!stumbling && !breaking) {
      obstX -= obstSpeed;
      if (obstX < -80) obstX = W + 80;
    }

    cx.clearRect(0, 0, W, H);
    drawBG();
    drawObst();
    drawShards();
    drawChar();
    drawParts();

    // Reset break flag after shards launched
    if (breaking && (Date.now() - breakT) > 150) {
      breaking = false;
      breakDone = true;
    }

    animId = requestAnimationFrame(loop);
  }

  // ---- EXPLANATION (تفسير تعليمي بعد كل إجابة) ----
  const DDC_WHY = {
    '000': 'المعارف العامة: الموسوعات والحاسوب والمعلوماتية وعلم المكتبات.',
    '100': 'الفلسفة وعلم النفس: يتضمن المنطق والأخلاق وعلم النفس.',
    '200': 'الديانات: الأديان المقارنة وعلوم القرآن والحديث.',
    '300': 'العلوم الاجتماعية: الاقتصاد والقانون والتربية والمجتمع.',
    '400': 'اللغات: النحو والمعاجم واللغويات.',
    '500': 'العلوم البحتة: الرياضيات والفلك والفيزياء والكيمياء والأحياء.',
    '600': 'العلوم التطبيقية: الطب والهندسة والزراعة وإدارة الأعمال.',
    '700': 'الفنون: الفنون التشكيلية والموسيقى والتصوير والرياضة.',
    '800': 'الآداب: الشعر والنثر والرواية بكل اللغات.',
    '900': 'التاريخ والجغرافيا: تاريخ الدول والرحلات والأطالس.'
  };

  function explainRoute(ok) {
    if (!curBook) return;
    let box = document.getElementById('raceExplain');
    if (!box) {
      box = document.createElement('div');
      box.id = 'raceExplain';
      box.style.cssText = 'margin:8px 16px 14px;background:#0f1a2f;border:1px solid #1e293b;border-radius:12px;padding:9px 13px;font-family:Tajawal,sans-serif;font-size:12.5px;line-height:1.85;color:#cbd5e1;text-align:right';
      const bgEl = document.getElementById('bg');
      if (bgEl) bgEl.insertAdjacentElement('afterend', box);
      else document.getElementById('gr').appendChild(box);
    }
    const name = (DC.find(d => d.num === curBook.cat) || {}).name || '';
    box.style.borderColor = ok ? '#22c55e' : '#ef4444';
    box.innerHTML = `<b style="color:${ok ? '#4ade80' : '#f87171'}">${ok ? '✅ إجابة صحيحة' : '❌ إجابة غير صحيحة'}</b> —
      «${curBook.title}» موضعه <b>${curBook.cat} ${name}</b>. ${DDC_WHY[curBook.cat] || ''}
      <br><span style="font-size:11px;color:#94a3b8">📚 المرجع: DDC 23 — OCLC · رقم التصنيف يحدد التجاور الموضوعي على الرف.</span>`;
  }

  // ---- GAME LOGIC ----
  function triggerBreak() {
    // Shatter obstacle at its current position
    const oy = FLOOR_Y - 50;
    spawnShards(obstX, oy);
    breaking = true;
    breakT = Date.now();
    obstX = W + 100; // reset obstacle offscreen
  }

  function triggerStumble() {
    stumbling = true;
    stumbleT = Date.now();
    spawnParts(charX + 15, charY + 10, '#ef4444', 14);
    setTimeout(() => { stumbling = false; }, 700);
  }

  function flash(col) {
    const fo = document.getElementById('fo');
    fo.style.background = col; fo.style.opacity = '1';
    setTimeout(() => fo.style.opacity = '0', 200);
  }

  function renderBtns() {
    const grid = document.getElementById('bg'); grid.innerHTML = '';
    DC.forEach(cat => {
      const b = document.createElement('button');
      b.className = 'cb';
      b.innerHTML = `<span class="cn">${cat.num}</span><span class="cl">${cat.name}</span>`;
      b.onclick = () => checkAns(cat.num, b);
      grid.appendChild(b);
    });
  }

  function updateHUD() {
    document.getElementById('wsp').textContent = wave;
    document.getElementById('ssp').textContent = score;
    document.getElementById('lsp').textContent = '❤️'.repeat(lives);
  }

  function nextBook() {
    if (lives <= 0) { endGame(); return; }
    const av = BDB.filter(b => b !== curBook);
    curBook = av[Math.floor(Math.random() * av.length)];
    document.getElementById('btit').textContent = curBook.title;
    document.getElementById('bhin').textContent = curBook.hint;
    document.querySelectorAll('.cb').forEach(b => { b.classList.remove('correct', 'wrong'); b.disabled = false; });
    const baseT = diffLevel === 1 ? 18 : diffLevel === 3 ? 12 : 15;
    maxT = Math.max(3, baseT - wave * .5); timeR = maxT;
    obstX = W + 60;
    obstSpeed = 2.5 + wave * .25;
    startTimer();
  }

  function startTimer() {
    clearInterval(timerInt);
    const bar = document.getElementById('tb');
    timerInt = setInterval(() => {
      timeR -= .05;
      const pct = Math.max(0, (timeR / maxT) * 100);
      bar.style.width = pct + '%';
      if (pct < 30) bar.style.background = '#ef4444';
      else if (pct < 60) bar.style.background = '#f97316';
      else bar.style.background = 'linear-gradient(90deg,#06b6d4,#818cf8)';
      if (timeR <= 0) { clearInterval(timerInt); handleWrong(null, true); }
    }, 50);
  }

  function checkAns(num, btn) {
    clearInterval(timerInt);
    document.querySelectorAll('.cb').forEach(b => b.disabled = true);
    if (num === curBook.cat) {
      btn.classList.add('correct');
      combo++;
      const bonus = Math.floor(timeR * 10);
      const cb2 = combo > 1 ? combo * 20 : 0;
      score += 100 + bonus + cb2;
      wave++;
      updateHUD();
      // BREAK the wall!
      triggerBreak();
      flash('rgba(34,197,94,0.12)');
      explainRoute(true);
      if (combo > 1) {
        const cp = document.getElementById('cp');
        cp.textContent = '🔥 كومبو ×' + combo;
        cp.style.opacity = '1'; cp.style.transform = 'translateY(-10px)';
        setTimeout(() => { cp.style.opacity = '0'; cp.style.transform = 'translateY(0)'; }, 900);
      }
      setTimeout(nextBook, 1100);
    } else {
      handleWrong(btn, false);
    }
  }

  function handleWrong(btn, isT) {
    combo = 0;
    if (btn) btn.classList.add('wrong');
    document.querySelectorAll('.cb').forEach(b => {
      if (b.querySelector('.cn')?.textContent === curBook.cat) b.classList.add('correct');
    });
    lives--; updateHUD();
    triggerStumble();
    flash('rgba(239,68,68,0.15)');
    explainRoute(false);
    if (window.ML) ML.review.add('race', { key: curBook.title, concept: curBook.cat + ' — ' + curBook.title, why: DDC_WHY[curBook.cat] });
    setTimeout(nextBook, 1800);
  }

  function endGame() {
    clearInterval(timerInt); cancelAnimationFrame(animId);
    const total = Math.max(1, wave - 1 + (3 - lives));
    if (window.ML) ML.progress.record('race', { score: score, correct: Math.max(0, wave - 1), total: total, level: 2 });
    if (window.maktabaAuth) { try { window.maktabaAuth.updateScore('race', score); } catch (e) { } }
    document.getElementById('rs').classList.remove('show');
    MPGame.results({
      score: score,
      correct: Math.max(0, wave - 1),
      total: total,
      level: 2,
      title: lives <= 0 ? 'اصطدمت بالعقبة 🏁' : 'انتهى السباق 🏁',
      note: 'وصلت إلى الموجة ' + wave + ' — كل فئة خاطئة كانت فرصة لمراجعة DDC.'
    });
  }

  function initGame() {
    clearInterval(timerInt); cancelAnimationFrame(animId);
    document.getElementById('rs').classList.remove('show');
    wave = 1; score = 0; combo = 0; parts = []; shards = [];
    lives = diffLevel === 1 ? 4 : diffLevel === 3 ? 2 : 3;
    bgOff = 0; obstX = W + 80; breaking = false; stumbling = false; frameC = 0;
    charY = CHAR_GROUND;
    initShelfBooks(); renderBtns(); updateHUD(); nextBook(); loop();
  }

  MPGame.init({
    id: 'race',
    title: 'سباق التصنيف',
    icon: '🏁',
    field: 'تصنيف ديوي',
    tagline: 'اجرِ بين رفوف المكتبة واختر فئة DDC الصحيحة قبل العقبة.',
    intro: 'كل موجة تعرض كتابًا وتلميحًا لموضوعه. اختر الفئة الرئيسية الصحيحة لتكسر العقبة وتتقدم؛ والخطأ يفقدك قلبًا.',
    defaultLevel: 2,
    levels: [
      { id: 1, label: 'مبتدئ', desc: 'الفئات العشر الأساسية بوضوح' },
      { id: 2, label: 'متوسط', desc: 'تلميحات أدق وسرعة متزايدة' },
      { id: 3, label: 'متقدم', desc: 'تصنيف دقيق تحت ضغط الوقت' }
    ],
    getStatus: () => [
      { label: 'النقاط', value: score },
      { label: 'الموجة', value: wave },
      { label: 'القلوب', value: lives }
    ],
          onPlay: function (opts) { diffLevel = (opts && opts.level) || 2; initGame(); },
      onRestart: function () { initGame(); }
  });

  if (window.ML) {
    ML.tutorial({
      game: 'race',
      title: '🏁 سباق التصنيف — Classification Race',
      subtitle: 'اجرِ بين رفوف المكتبة واختر فئة ديوي الصحيحة قبل اصطدام العقبة',
      goal: 'توجيه كل كتاب إلى فئته الرئيسية في تصنيف ديوي العشري قبل نفاد الوقت.',
      rules: [
        'كل موجة تعرض كتابًا بعنوانه وتلميح موضوعه.',
        'اختر الفئة الصحيحة لتكسر العقبة وتتقدم؛ الخطأ يفقدك قلبًا.',
        'الوقت يقصر تدريجيًا مع تقدم الموجات، والكومبو يضاعف النقاط.',
        'بعد كل إجابة يظهر تفسير الفئة ومرجعها من DDC 23.'
      ],
      controls: 'انقر الفئة بالأزرار أسفل الساحة أو باللمس على الموبايل.',
      concepts: ['DDC', 'الفئات العشر', 'رقم التصنيف', 'التجاور الموضوعي'],
      onStart: function () { }
    });
  }

  window.MPHowTo && MPHowTo.init('race');