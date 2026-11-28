/* Original inline script block 1 */
    // ═══════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════
    const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const fmt = n => Math.round(n).toLocaleString('ar-EG');

    // ═══════════════════════════════════════════════════
    //  GAME STATE
    // ═══════════════════════════════════════════════════
    const G = {
      budget: 10000, satisfaction: 70, quality: 40, collections: 500,
      score: 0, day: 1, month: 1, year: 2026, level: 1,
      levelNames: ['مكتبة مدرسية صغيرة', 'مكتبة كلية أكاديمية', 'مكتبة عامة إقليمية', 'المكتبة الوطنية الضخمة'],
      levelReqs: [null,
        { budget: 40000, satisfaction: 80, quality: 70 },
        { budget: 120000, satisfaction: 85, quality: 80 },
        { budget: 300000, satisfaction: 90, quality: 88 }],
      levelPerks: [null,
        ['رفع سعة الشبكة', 'ميزانية إضافية 5,000 ج', 'فتح: مستودع أرشيفي رقمي', 'قسم الإدارة يصبح إلزامياً'],
        ['فتح: نظام الإيداع القانوني', 'فتح: خدمة الإعارة بين المكتبات', 'رفع رواتب الكوادر +20%', 'خدمات مجتمعية متوسعة'],
        ['أرشفة وطنية رقمية', 'فتح: مركز توثيق التراث الوطني', 'رواتب أكاديمية متطورة', 'الإيداع القانوني الشامل']],
      // 10×8 grid = 80 cells
      mapCells: Array(80).fill(null),
      selectedSection: null,
      staff: { cataloger: false, reference: false, archivist: false, volunteer: false },
      staffMorale: { cataloger: 80, reference: 80, archivist: 80, volunteer: 80 },
      staffServiceCount: { cataloger: 0, reference: 0, archivist: 0, volunteer: 0 },
      acqCounts: { books: 0, database: 0, manuscripts: 0, periodicals: 0, digital: 0, equipment: 0, rare: 0 },
      pendingQualityGains: 0,
      financeLedger: [], monthlyIncome: 0, monthlyExpense: 0,
      crisisActive: false, gameOver: false,
      totalServiced: 0, totalRejected: 0,
      ticks: 0, crisisCooldown: 0,
      achievements: { firstSection: false, firstStaff: false, firstDB: false, firstCrisis: false, level2: false, level3: false, satisfaction90: false, quality80: false },
      monthlyHistory: [], logCount: 0,
      gameSpeed: 1, currentFilter: 'all', crisisManaged: 0,
      visitorsToday: 0
    };

    // ═══════════════════════════════════════════════════
    //  MAP LAYOUT  (10 cols × 8 rows = indices 0-79)
    //  Fixed cells: walls, corridors, entrance
    // ═══════════════════════════════════════════════════
    // Cell types: null=buildable, 'wall'=wall, 'corridor'=path, section keys
    const COL = 10, ROW = 8;
    const idx = (r, c) => r * COL + c;

    // Define fixed structure
    const FIXED_CELLS = {}; // idx -> type
    // Outer walls (row 0, row 7, col 0, col 9 – corners only actually we use as border cells)
    // We'll make col0 and col9 walls on all rows except entrance
    for (let r = 0; r < ROW; r++) {
      FIXED_CELLS[idx(r, 0)] = 'wall';
      FIXED_CELLS[idx(r, 9)] = 'wall';
    }
    for (let c = 0; c < COL; c++) {
      FIXED_CELLS[idx(0, c)] = 'wall';
      FIXED_CELLS[idx(7, c)] = 'wall';
    }
    // Entrance on bottom-center
    FIXED_CELLS[idx(7, 4)] = 'entrance';
    FIXED_CELLS[idx(7, 5)] = 'entrance';
    // Horizontal corridor row 6 (main corridor)
    for (let c = 1; c < 9; c++) FIXED_CELLS[idx(6, c)] = 'corridor';
    // Vertical corridor col5 rows 1-5
    for (let r = 1; r < 6; r++) FIXED_CELLS[idx(r, 5)] = 'corridor';

    // Pre-place entrance in state
    G.mapCells[idx(7, 4)] = 'entrance';
    G.mapCells[idx(7, 5)] = 'entrance';

    // Buildable cells = all non-fixed, non-entrance rows 1-5, cols 1-4 and 6-8
    // That's left wing (c1-c4, r1-r5) = 20 cells and right wing (c6-c8, r1-r5) = 15 cells

    // ═══════════════════════════════════════════════════
    //  SECTION DEFINITIONS (with preferred zones)
    // ═══════════════════════════════════════════════════
    const SECTIONS = {
      loan: { name: 'قسم الإعارة', icon: '📤', cost: 1500, cls: 'loan', desc: 'كاونتر الإعارة ورد الكتب – مصدر الإيراد الأساسي', color: '#0e7490', preferZone: 'near-entrance' },
      reference: { name: 'قاعة المراجع', icon: '📚', cost: 2200, cls: 'reference', desc: 'قاعة الموسوعات والمراجع المتخصصة', color: '#92400e', preferZone: 'right' },
      manuscript: { name: 'قاعة المخطوطات', icon: '📜', cost: 4500, cls: 'manuscript', desc: 'تتطلب أمين مخطوطات للتفعيل', color: '#581c87', requires: 'archivist', preferZone: 'back' },
      digital: { name: 'المعمل الرقمي', icon: '💻', cost: 3800, cls: 'digital', desc: 'محطات بحث رقمي وإنترنت عالي السرعة', color: '#065f46', preferZone: 'right' },
      study: { name: 'قاعة الاستذكار', icon: '🤫', cost: 1300, cls: 'study', desc: '⚠️ عزلها عن الأقسام الصاخبة', color: '#1e3a5f', preferZone: 'back' },
      storage: { name: 'مستودع الأرشيف', icon: '🗄️', cost: 900, cls: 'storage', desc: 'تخزين الأوعية القديمة والمؤرشفة', color: '#78350f', preferZone: 'back' },
      admin: { name: 'مكتب الإدارة', icon: '🏢', cost: 1800, cls: 'admin', desc: 'يرفع الكفاءة الإدارية ويقلل الأخطاء', color: '#7f1d1d', preferZone: 'left' }
    };

    const STAFF_DEF = [
      { id: 'cataloger', name: 'مفهرس MARC21', role: 'الفهرسة والتصنيف', icon: '🗂️', emoji: '🗂️', salary: 800, skills: ['MARC21', 'RDA', 'OPAC', 'DDC'], effect: 'يرفع جودة البيانات +8%/شهر', desk: 'reference', deskFallback: 'loan' },
      { id: 'reference', name: 'أخصائي مرجعي', role: 'المراجع والإرشاد', icon: '🔎', emoji: '🔍', salary: 750, skills: ['بحث متقدم', 'EBSCO', 'إرشاد', 'ILL'], effect: 'يرفع رضا المستفيدين +6%/شهر', desk: 'reference', deskFallback: 'loan' },
      { id: 'archivist', name: 'أمين مخطوطات', role: 'المخطوطات والأرشيف', icon: '📜', emoji: '📜', salary: 950, skills: ['ترميم', 'أرشفة رقمية', 'مخطوطات', 'حفظ وصون'], effect: 'يُفعّل قاعة المخطوطات ويزيد المجموعات', desk: 'manuscript', deskFallback: 'storage' },
      { id: 'volunteer', name: 'متطوع أكاديمي', role: 'مساعد إداري', icon: '🎓', emoji: '🎓', salary: 200, skills: ['إعارة', 'ترتيب', 'بيانات', 'استقبال'], effect: 'يخفف الضغط ويرفع السعة', desk: 'loan', deskFallback: 'admin' }
    ];

    const ACQ_ITEMS = [
      { id: 'books', name: 'دفعة كتب ورقية', icon: '📖', cost: 2000, desc: 'إضافة 200 عنوان متخصص وفق خطة تنمية المجموعات', collAdd: 200, qualAdd: 5, satAdd: 3, reqLevel: 1 },
      { id: 'database', name: 'قواعد بيانات أكاديمية', icon: '🖥️', cost: 5000, desc: 'اشتراك في JSTOR وScienceDirect وEBSCO لسنة كاملة', collAdd: 0, qualAdd: 22, satAdd: 12, reqLevel: 1, reqSection: 'digital' },
      { id: 'manuscripts', name: 'مخطوطات تراثية', icon: '📜', cost: 8000, desc: 'اقتناء مخطوطات نادرة من مزادات التراث الوطني', collAdd: 50, qualAdd: 10, satAdd: 6, reqLevel: 2, reqStaff: 'archivist' },
      { id: 'periodicals', name: 'دوريات علمية محكّمة', icon: '📰', cost: 1500, desc: 'اشتراك في الدوريات المتخصصة والمحكّمة', collAdd: 100, qualAdd: 10, satAdd: 6, reqLevel: 1 },
      { id: 'digital', name: 'مستودع DSpace', icon: '☁️', cost: 6500, desc: 'مستودع رقمي وفق معايير Dublin Core وOAI-PMH', collAdd: 0, qualAdd: 28, satAdd: 9, reqLevel: 2 },
      { id: 'equipment', name: 'أجهزة مسح ضوئي', icon: '🖨️', cost: 3500, desc: 'ماسحات ضوئية عالية الدقة للرقمنة والأرشفة', collAdd: 0, qualAdd: 8, satAdd: 4, reqLevel: 1 },
      { id: 'rare', name: 'موسوعات نادرة', icon: '📔', cost: 12000, desc: 'موسوعات علمية نادرة ومجموعات تراثية حصرية', collAdd: 300, qualAdd: 15, satAdd: 8, reqLevel: 3 }
    ];

    const CRISES = [
      {
        id: 'ransomware', icon: '🛡️', severity: 'sev-high', severityLabel: 'أزمة سيبرانية حرجة', title: 'هجوم فيروس فدية على نظام Koha!', desc: 'تعرّض نظام إدارة المكتبة لهجوم سيبراني متطور. المخترقون يطلبون فدية لإعادة الوصول للفهرس الرقمي.', choices: [
          { label: 'دفع الفدية وإنقاذ الفهرس فوراً', cost: -3500, qualLoss: 0, satLoss: -4, tags: ['💸 -3,500 ج', '✅ إنقاذ الفهرس', '-4% رضا'] },
          { label: 'رفض الفدية والاعتماد على النسخ الاحتياطية', cost: -600, qualLoss: -22, satLoss: -12, tags: ['💸 -600 ج', '📉 -22% جودة', '-12% رضا'] }]
      },
      {
        id: 'flood', icon: '💧', severity: 'sev-med', severityLabel: 'أزمة بيئية', title: 'تسريب مياه في مخزن المخطوطات!', desc: 'اكتشف تسريباً في سقف مخزن البدروم. الرطوبة تهدد المخطوطات النادرة.', choices: [
          { label: 'ترميم فوري بمواد متخصصة', cost: -2800, qualLoss: 0, satLoss: -2, tags: ['💸 -2,800 ج', '✅ صون المخطوطات'] },
          { label: 'توثيق الأضرار فقط وتأجيل الإصلاح', cost: 0, qualLoss: -10, satLoss: -15, collLoss: 30, tags: ['🆓 لا تكلفة', '📉 -10% جودة', '-30 وعاء'] }]
      },
      {
        id: 'audit', icon: '🏛️', severity: 'sev-med', severityLabel: 'تفتيش أكاديمي', title: 'زيارة مفاجئة للجنة ضمان الجودة!', desc: 'وصلت لجنة تقييم الاعتماد الأكاديمي للزيارة الميدانية. التقييم سيؤثر على التمويل.', choices: [
          { label: 'تقرير ذاتي شفاف مع خطة تطوير', cost: -900, qualBonus: 12, satBonus: 18, tags: ['💸 -900 ج', '✅ +18% رضا', '+12% جودة'] },
          { label: 'عرض تقديمي احترافي مُخرَج', cost: -2000, qualBonus: 3, satBonus: 7, tags: ['💸 -2,000 ج', '+7% رضا', '+3% جودة'] }]
      },
      {
        id: 'donation', icon: '🎁', severity: 'sev-low', severityLabel: 'فرصة استثنائية', title: 'عرض تبرع بمجموعة أكاديمية نادرة!', desc: 'أسرة أستاذ جامعي تعرض التبرع بمكتبته الخاصة التي تحتوي مخطوطات ومراجع نادرة.', choices: [
          { label: 'قبول التبرع والالتزام بالتوثيق الأكاديمي', cost: -600, collBonus: 320, qualBonus: 14, satBonus: 9, tags: ['💸 -600 ج', '📚 +320 وعاء', '+14% جودة'] },
          { label: 'الاعتذار بسبب محدودية المساحة', cost: 0, qualLoss: -6, satLoss: -6, tags: ['🆓 لا تكلفة', '-6% جودة', '-6% رضا'] }]
      },
      {
        id: 'electricity', icon: '⚡', severity: 'sev-high', severityLabel: 'عطل تقني طارئ', title: 'انقطاع كهربائي في المعمل الرقمي!', desc: 'توقف المعمل الرقمي كلياً بسبب عطل في الشبكة الكهربائية. الباحثون عالقون.', choices: [
          { label: 'استدعاء فني طوارئ فوري', cost: -1500, satBonus: 5, tags: ['💸 -1,500 ج', '✅ إصلاح فوري', '+5% رضا'] },
          { label: 'انتظار الفريق الرسمي غداً', cost: 0, satLoss: -18, qualLoss: -5, tags: ['🆓 لا تكلفة', '-18% رضا', '-5% جودة'] }]
      },
      {
        id: 'conference', icon: '🎓', severity: 'sev-low', severityLabel: 'حدث أكاديمي', title: 'دعوة لاستضافة مؤتمر المعلومات الإقليمي!', desc: 'دعوة رسمية لاستضافة المؤتمر السنوي. ستضع مكتبتك في الواجهة الأكاديمية.', choices: [
          { label: 'قبول الاستضافة والتجهيز الكامل', cost: -3000, satBonus: 22, qualBonus: 8, scoreBon: 200, tags: ['💸 -3,000 ج', '✅ +22% رضا', '+200 نقطة'] },
          { label: 'الاعتذار والتوصية بمكتبة أخرى', cost: 0, satLoss: -8, tags: ['🆓 لا تكلفة', '-8% رضا'] }]
      }
    ];

    const VISITOR_EVENTS = [
      () => {
        const hasLoan = G.mapCells.includes('loan'), hasCat = G.staff.cataloger;
        if (hasLoan && hasCat) { const inc = 70 + rand(0, 40); G.budget += inc; G.totalServiced++; G.visitorsToday++; G.staffServiceCount.cataloger++; addLog('success', `📚 مستفيد طلب كتاباً أكاديمياً – خُدم بنجاح (+${inc} ج)`); addFinance('إيراد إعارة', 'income', inc); floatNum('+' + inc + ' ج', 'pos'); }
        else if (hasLoan) { const inc = 25; G.budget += inc; G.satisfaction = Math.max(0, G.satisfaction - 2); G.totalServiced++; G.visitorsToday++; addLog('warning', `📚 مستفيد خُدم بصعوبة – الفهرس غير مكتمل (+${inc} ج، -2% رضا)`); }
        else { G.satisfaction = Math.max(0, G.satisfaction - 5); G.totalRejected++; addLog('danger', `😡 مستفيد غاضب: لا يوجد قسم إعارة! (-5% رضا)`, true); }
      },
      () => {
        const hasDig = G.mapCells.includes('digital'), hasDb = G.acqCounts.database > 0;
        if (hasDig && hasDb) { const inc = 55 + rand(0, 30); G.budget += inc; G.satisfaction = Math.min(100, G.satisfaction + 1); G.totalServiced++; G.visitorsToday++; addLog('success', `💻 باحث أجرى بحثاً رقمياً عبر EBSCO (+${inc} ج)`); addFinance('إيراد رقمي', 'income', inc); floatNum('+' + inc + ' ج', 'pos'); }
        else if (hasDig) { const inc = 18; G.budget += inc; G.totalServiced++; G.visitorsToday++; addLog('info', `💻 باحث استخدم المعمل الرقمي – قواعد البيانات محدودة (+${inc} ج)`); }
        else { G.satisfaction = Math.max(0, G.satisfaction - 4); G.totalRejected++; addLog('danger', `😤 باحث: لا معمل رقمي متاح! (-4% رضا)`); }
      },
      () => {
        const hasManu = G.mapCells.includes('manuscript'), hasArch = G.staff.archivist;
        if (hasManu && hasArch) { const inc = 110 + rand(0, 50); G.budget += inc; G.quality = Math.min(100, G.quality + 1); G.totalServiced++; G.visitorsToday++; G.staffServiceCount.archivist++; addLog('success', `📜 باحث في التراث استفاد من المخطوطات (+${inc} ج، +1% جودة)`); addFinance('إيراد مخطوطات', 'income', inc); floatNum('+' + inc + ' ج', 'pos'); }
        else if (hasManu && !hasArch) { G.satisfaction = Math.max(0, G.satisfaction - 6); addLog('danger', `📜 قاعة المخطوطات مغلقة! غياب الأمين. (-6% رضا)`, true); }
        else { addLog('info', `📜 باحث سأل عن مخطوطات – القاعة غير متوفرة بعد.`); }
      },
      () => {
        const hasRef = G.mapCells.includes('reference'), hasRefStaff = G.staff.reference;
        if (hasRef && hasRefStaff) { const inc = 45 + rand(0, 25); G.budget += inc; G.totalServiced++; G.visitorsToday++; G.staffServiceCount.reference++; addLog('success', `🔍 طالب دكتوراه أُرشد بنجاح (+${inc} ج)`); addFinance('إيراد إرشاد', 'income', inc); floatNum('+' + inc + ' ج', 'pos'); }
        else if (hasRef) { const inc = 20; G.budget += inc; G.totalServiced++; G.visitorsToday++; addLog('info', `📚 مستفيد في قاعة المراجع – بدون أخصائي (+${inc} ج)`); }
        else { G.satisfaction = Math.max(0, G.satisfaction - 3); G.totalRejected++; addLog('warning', `😕 طالب بحث عن مرجع ولم يجد القاعة. (-3% رضا)`); }
      },
      () => {
        const hasStudy = G.mapCells.includes('study');
        if (hasStudy) { const inc = 15 + rand(0, 10); G.budget += inc; G.totalServiced++; G.visitorsToday++; G.satisfaction = Math.min(100, G.satisfaction + 0.5); addLog('success', `🤫 طلاب يستذكرون في القاعة الهادئة (+${inc} ج، +0.5% رضا)`); addFinance('إيراد استذكار', 'income', inc); floatNum('+' + inc + ' ج', 'pos'); }
        else { addLog('info', `🤫 طالب يبحث عن مكان هادئ للمذاكرة – لا قاعة متاحة.`); }
      },
      () => {
        if (G.staff.volunteer) { G.satisfaction = Math.min(100, G.satisfaction + 1); G.staffServiceCount.volunteer++; addLog('info', `🎓 المتطوع ساعد في ترتيب الأرفف – انتهى بكفاءة (+1% رضا)`); }
        else { addLog('info', `📦 أرفف تحتاج ترتيباً – لا يوجد متطوع.`); }
      }
    ];

    // ═══════════════════════════════════════════════════
    //  LOGGING
    // ═══════════════════════════════════════════════════
    let allLogs = [];
    let _lastLogMsg = ''; // throttle exact duplicates
    function addLog(type, msg, important = false) {
      // Throttle: skip routine info duplicates within 3 entries
      if (!important && type === 'info' && allLogs.slice(0, 3).some(l => l.msg === msg)) return;
      const entry = { type, msg, time: `${G.day}/${G.month}/${G.year}`, important };
      allLogs.unshift(entry);
      if (allLogs.length > 120) allLogs.pop();
      G.logCount++;
      if (_activeSTab !== 'log') _unreadLog++;
      updateLogBadge();
      document.getElementById('live-event-count').textContent = G.logCount;
      renderLog();
    }
    function renderLog() {
      const el = document.getElementById('live-log');
      const filtered = G.currentFilter === 'all' ? allLogs : allLogs.filter(l => l.type === G.currentFilter);
      const typeIcon = { success: '✅', warning: '⚠️', danger: '🚨', info: '💡', purple: '🏅' };
      el.innerHTML = filtered.slice(0, 35).map(l => {
        const icon = l.important ? '⚡' : typeIcon[l.type] || '•';
        return `<div class="log-entry ${l.type}${l.important ? ' log-important' : ''}">
      <span style="margin-left:5px;font-size:.75rem">${icon}</span>${l.msg}
      <span class="log-time">🕐 ${l.time}</span>
    </div>`;
      }).join('');
    }

    function addFinance(label, type, amount) {
      G.financeLedger.unshift({ label, type, amount, date: `${G.day}/${G.month}/${G.year}` });
      if (G.financeLedger.length > 50) G.financeLedger.pop();
      if (type === 'income') G.monthlyIncome += amount;
      else G.monthlyExpense += amount;
    }

    function showToast(msg, type = 'info', dur = 3000) {
      const el = document.createElement('div');
      el.className = `toast ${type}`;
      el.textContent = msg;
      document.getElementById('toast-container').appendChild(el);
      setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, dur);
    }

    function floatNum(txt, cls) {
      const el = document.createElement('div');
      el.className = `float-num ${cls}`;
      el.textContent = txt;
      el.style.cssText = `left:${rand(30, 70)}vw;top:${rand(30, 60)}vh`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1100);
    }

    // ═══════════════════════════════════════════════════
    //  HUD RENDER
    // ═══════════════════════════════════════════════════
    let _prevHUD = { budget: null, satisfaction: null, quality: null };
    function flashHUD(elId, newVal, prevVal) {
      if (prevVal === null || newVal === prevVal) return;
      const el = document.getElementById(elId);
      if (!el) return;
      el.classList.remove('hud-flash-up', 'hud-flash-down');
      void el.offsetWidth; // reflow to restart animation
      el.classList.add(newVal > prevVal ? 'hud-flash-up' : 'hud-flash-down');
      setTimeout(() => el.classList.remove('hud-flash-up', 'hud-flash-down'), 600);
    }
    function renderHUD() {
      // Flash on changes
      flashHUD('hud-budget', G.budget, _prevHUD.budget);
      flashHUD('hud-satisfaction', G.satisfaction, _prevHUD.satisfaction);
      flashHUD('hud-quality', G.quality, _prevHUD.quality);
      _prevHUD.budget = G.budget;
      _prevHUD.satisfaction = G.satisfaction;
      _prevHUD.quality = G.quality;

      document.getElementById('hud-budget').textContent = fmt(G.budget) + ' ج';
      document.getElementById('hud-satisfaction').textContent = Math.round(G.satisfaction) + '%';
      document.getElementById('hud-quality').textContent = Math.round(G.quality) + '%';
      document.getElementById('hud-collections').textContent = fmt(G.collections);
      document.getElementById('hud-date').textContent = `${G.day}/${G.month}/${G.year}`;
      document.getElementById('hud-visitors').textContent = G.visitorsToday;
      document.getElementById('hdr-score').textContent = fmt(G.score);
      document.getElementById('hdr-level').textContent = G.levelNames[G.level - 1];
      // Library name in header
      const lnEl = document.getElementById('hdr-libname');
      if (lnEl) lnEl.textContent = G.libraryName || 'مهندس المكتبة';
      // Monthly net
      const net = G.monthlyIncome - G.monthlyExpense;
      const netEl = document.getElementById('hud-net');
      const netStatEl = document.getElementById('hud-net-stat');
      if (netEl) {
        netEl.textContent = (net >= 0 ? '+' : '') + fmt(net) + ' ج';
        netEl.style.color = net > 0 ? 'var(--brand)' : net < 0 ? 'var(--danger)' : 'var(--muted)';
        if (netStatEl) netStatEl.style.borderColor = net > 0 ? 'rgba(34,197,94,.3)' : net < 0 ? 'rgba(239,68,68,.3)' : 'var(--border2)';
      }
      const tb = document.getElementById('map-time-badge');
      if (tb) tb.textContent = `📅 يوم ${G.day} / شهر ${G.month}`;
      // Dynamic max: scales with level so bar stays meaningful throughout the game
      const budgetMax = G.level === 1 ? 20000 : G.level === 2 ? 80000 : G.level === 3 ? 200000 : 400000;
      const budgetPct = clamp(G.budget / budgetMax * 100, 0, 100);
      const budgetBar = document.getElementById('hb-budget');
      const budgetStat = document.getElementById('hud-budget-stat');
      const budgetVal = document.getElementById('hud-budget');
      budgetBar.style.width = budgetPct + '%';
      if (budgetPct <= 15) {
        budgetBar.style.background = 'var(--danger)';
        if (budgetStat) { budgetStat.style.animation = 'hudPop .6s ease infinite'; }
        if (budgetVal) budgetVal.style.color = 'var(--danger)';
      } else if (budgetPct <= 30) {
        budgetBar.style.background = 'var(--warn)';
        if (budgetStat) budgetStat.style.animation = '';
        if (budgetVal) budgetVal.style.color = 'var(--warn)';
      } else {
        budgetBar.style.background = 'var(--brand)';
        if (budgetStat) budgetStat.style.animation = '';
        if (budgetVal) budgetVal.style.color = 'var(--brand)';
      }
      document.getElementById('hb-satisfaction').style.width = G.satisfaction + '%';
      document.getElementById('hb-quality').style.width = G.quality + '%';
      // Level bar
      const req = G.levelReqs[G.level];
      if (req) {
        const pBudget = clamp(G.budget / req.budget * 100, 0, 100);
        const pSat = clamp(G.satisfaction / req.satisfaction * 100, 0, 100);
        const pQual = clamp(G.quality / req.quality * 100, 0, 100);
        const pct = Math.round((pBudget + pSat + pQual) / 3);
        document.getElementById('level-bar-fill').style.width = pct + '%';
        document.getElementById('lp-pct').textContent = pct + '%';
        document.getElementById('lp-current').textContent = 'المستوى ' + G.level;
        document.getElementById('lp-next').textContent = 'المستوى ' + (G.level + 1);
        document.getElementById('lp-label').textContent = 'التقدم للمستوى التالي';
      } else {
        document.getElementById('level-bar-fill').style.width = '100%';
        document.getElementById('lp-label').textContent = 'أعلى مستوى!';
      }
    }

    // ═══════════════════════════════════════════════════
    //  THE MAP
    // ═══════════════════════════════════════════════════
    function renderMap() {
      const canvas = document.getElementById('lib-map-canvas');
      canvas.innerHTML = '';

      const { penalties, bonuses } = calcPenaltiesAndBonuses();

      for (let i = 0; i < 80; i++) {
        const r = Math.floor(i / COL), c = i % COL;
        const fixed = FIXED_CELLS[i];
        const placed = G.mapCells[i];
        const div = document.createElement('div');
        div.className = 'map-cell';
        div.dataset.idx = i;

        const pixelBookshelf = '<div style="position:absolute;bottom:2px;left:1px;right:1px;height:3px;background:repeating-linear-gradient(90deg,#c05020 0,#c05020 2px,#2a1005 2px,#2a1005 3px);z-index:1;pointer-events:none"></div>';
        const pixelDesk = '<div style="position:absolute;bottom:2px;left:3px;right:3px;height:2px;background:#8b5a2b;border-top:1px solid #d4a574;z-index:1;pointer-events:none"></div>';
        const pixelRug = '<div style="position:absolute;inset:20%;border:1px solid rgba(210,80,10,.5);z-index:1;pointer-events:none"></div>';
        const pixelPlant = '<span style="position:absolute;top:1px;left:2px;font-size:.5rem;z-index:2;pointer-events:none">🪴</span>';
        const pixelLamp = '<span style="position:absolute;bottom:2px;right:2px;font-size:.5rem;z-index:2;pointer-events:none">🕯️</span>';
        const pixelComputer = '<span style="position:absolute;bottom:2px;right:2px;font-size:.5rem;z-index:2;pointer-events:none">🖥️</span>';
        const pixelScroll = '<span style="position:absolute;top:1px;right:2px;font-size:.5rem;z-index:2;pointer-events:none">📜</span>';
        const pixelBox = '<span style="position:absolute;top:1px;left:2px;font-size:.5rem;z-index:2;pointer-events:none">📦</span>';
        const ROOM_DECO = { loan: pixelDesk + pixelPlant, reference: pixelBookshelf + pixelPlant, manuscript: pixelScroll + pixelBookshelf, digital: pixelComputer, study: pixelDesk + pixelLamp + pixelRug, storage: pixelBox, admin: pixelDesk + pixelLamp, entrance: '' };
        const pixelLampInline = '<span style="position:absolute;bottom:2px;right:2px;font-size:.5rem;z-index:2;pointer-events:none">🕯️</span>';

        if (fixed === 'wall') {
          div.classList.add('map-wall-cell');
        } else if (fixed === 'corridor') {
          div.classList.add('map-occupied', 'room-corridor');
        } else if (placed === 'entrance' || fixed === 'entrance') {
          div.classList.add('map-occupied', 'room-entrance');
          div.innerHTML = `<span class="room-icon">🚪</span><span class="room-label" style="color:#86efac">مدخل</span>`;
        } else if (placed && SECTIONS[placed]) {
          const s = SECTIONS[placed];
          div.classList.add('map-occupied', `room-${placed}`);
          // Check if this section contributes to an adjacency bonus
          const hasBonus = bonuses.some(b => b.sections && b.sections.includes(placed));
          if (hasBonus) div.style.outline = '2px solid rgba(34,197,94,.55)';
          const staffHere = STAFF_DEF.filter(st => G.staff[st.id] && st.desk === placed).map(st => `<span style="font-size:.65rem;filter:drop-shadow(0 1px 2px rgba(0,0,0,.9))">${st.emoji}</span>`).join('');
          const deco = ROOM_DECO[placed] || '';
          const bonusTag = hasBonus ? `<span style="position:absolute;top:1px;left:1px;font-size:.42rem;background:rgba(34,197,94,.25);border-radius:3px;padding:0 2px;z-index:4;color:#86efac">✨</span>` : '';
          div.innerHTML = `${deco}${bonusTag}<span class="room-icon" style="position:relative;z-index:3">${s.icon}</span><span class="room-label" style="color:${s.color};font-size:.36rem;position:relative;z-index:3">${s.name}</span>${staffHere ? `<span style="display:flex;gap:1px;position:relative;z-index:3;margin-top:1px">${staffHere}</span>` : ''}`;
          const tip = document.createElement('div');
          tip.className = 'map-tooltip';
          const staffPresent = STAFF_DEF.filter(st => G.staff[st.id] && st.desk === placed);
          const bonusDetail = bonuses.filter(b => b.sections && b.sections.includes(placed)).map(b => `✨ ${b.msg}`).join('<br>');
          tip.innerHTML = `<b>${s.icon} ${s.name}</b><br>${s.desc}${staffPresent.length ? '<br>' + staffPresent.map(st => st.icon + ' ' + st.name).join(', ') : ''}${bonusDetail ? '<br><span style="color:#86efac">' + bonusDetail + '</span>' : ''}`;
          div.appendChild(tip);
        } else {
          if (G.selectedSection) div.classList.add('build-target');
          else div.classList.add('map-cell-buildable');
          div.innerHTML = `<span style="font-size:.38rem;color:rgba(255,200,100,.18);position:relative;z-index:2">${i + 1}</span>`;
          div.addEventListener('click', () => {
            if (!G.selectedSection) { showToast('اختر قسماً من القائمة أولاً', 'error'); return; }
            const s = SECTIONS[G.selectedSection];
            if (G.mapCells.includes(G.selectedSection) && G.selectedSection !== 'study') { showToast('هذا القسم مُركّب مسبقاً', 'error'); return; }
            if (G.budget < s.cost) { showToast('الميزانية غير كافية لهذا القسم!', 'error'); return; }
            // Confirmation for sections costing ≥3000 ج
            if (s.cost >= 3000) {
              const ok = confirm(`⚠️ تأكيد التركيب\n\n"${s.icon} ${s.name}"\nالتكلفة: ${fmt(s.cost)} جنيه\n\nميزانيتك بعد التركيب: ${fmt(G.budget - s.cost)} ج\n\nهل أنت متأكد؟`);
              if (!ok) return;
            }
            G.budget -= s.cost;
            G.mapCells[i] = G.selectedSection;
            addFinance('تركيب: ' + s.name, 'expense', s.cost);
            addLog('info', `🏗️ تم تركيب ${s.icon} ${s.name} في الموقع (${r + 1},${c + 1}) (-${fmt(s.cost)} ج)`);
            showToast('✅ تم تركيب ' + s.name, 'success');
            floatNum('-' + fmt(s.cost) + ' ج', 'neg');
            if (!G.achievements.firstSection) { G.achievements.firstSection = true; unlockAchievement('🏗️', 'أول قسم مُركّب'); }
            G.selectedSection = null;
            renderMap(); renderHUD(); renderMSBSidebar(); checkQuests();
          });
        }
        canvas.appendChild(div);
      }

      renderMSBSidebar();
      renderMapInfoBar();
      renderPenaltyBox(penalties, bonuses);
      renderStaffOnMap();
      renderMapLegend();
    }

    function renderMapInfoBar() {
      const placed = G.mapCells.filter(Boolean).length;
      const sections = new Set(G.mapCells.filter(v => v && v !== 'entrance' && v !== 'corridor'));
      const hiredCount = Object.values(G.staff).filter(Boolean).length;
      const manuOk = G.mapCells.includes('manuscript') && G.staff.archivist;
      document.getElementById('mib-occ').textContent = placed + '/80';
      document.getElementById('mib-sec').textContent = sections.size;
      document.getElementById('mib-staff').textContent = hiredCount;
      document.getElementById('mib-manu').innerHTML = G.mapCells.includes('manuscript')
        ? (manuOk ? '<span style="color:var(--brand)">✅ فعّالة</span>' : '<span style="color:var(--danger)">⚠️ بلا أمين</span>')
        : '<span style="color:var(--muted)">–</span>';
    }

    function renderMapLegend() {
      const el = document.getElementById('map-legend');
      const items = [
        { color: '#2d6a1f', label: '🚪 مدخل' },
        { color: '#5a3010', label: '🟫 ممر' },
        { color: '#1a5f6e', label: '📤 إعارة' },
        { color: '#7a3d12', label: '📚 مراجع' },
        { color: '#3d1a6e', label: '📜 مخطوطات' },
        { color: '#0d4a3a', label: '💻 رقمي' },
        { color: '#1a3060', label: '🤫 استذكار' },
        { color: '#5c2d0a', label: '🗄️ أرشيف' },
        { color: '#5c1010', label: '🏢 إدارة' },
      ];
      el.innerHTML = items.map(it => `<div class="leg-item"><div class="leg-dot" style="background:${it.color};border-radius:1px;border:1px solid rgba(255,255,255,.15)"></div>${it.label}</div>`).join('');
    }

    function renderMSBSidebar() {
      const sb = document.getElementById('msb-list');
      sb.innerHTML = '';
      Object.entries(SECTIONS).forEach(([key, s]) => {
        const placed = G.mapCells.includes(key);
        const canAfford = G.budget >= s.cost;
        const div = document.createElement('div');
        div.className = 'msb-item';
        if (placed && key !== 'study') div.classList.add('msb-placed');
        else if (!canAfford) div.classList.add('msb-locked');
        if (G.selectedSection === key) div.classList.add('msb-selected');
        let tag = '';
        if (placed && key !== 'study') tag = `<span class="msb-tag msb-tag-placed">✅ مركّب</span>`;
        else if (s.requires) tag = `<span class="msb-tag msb-tag-lock">🔒 يتطلب أمين</span>`;
        div.innerHTML = `<div class="msb-icon">${s.icon}</div><div class="msb-name">${s.name}</div><div class="msb-cost">${s.cost > 0 ? fmt(s.cost) + ' ج' : 'مجاناً'}</div>${tag}`;
        if ((!placed || key === 'study') && canAfford) {
          div.addEventListener('click', () => {
            G.selectedSection = (G.selectedSection === key) ? null : key;
            renderMSBSidebar();
            document.querySelectorAll('.map-cell:not(.map-occupied):not(.map-wall-cell)').forEach(c => {
              if (G.selectedSection) c.classList.add('build-target');
              else c.classList.remove('build-target');
            });
          });
        }
        sb.appendChild(div);
      });
    }

    function renderPenaltyBox(penalties, bonuses) {
      const box = document.getElementById('penalty-box');
      box.innerHTML = bonuses.map(b => `<div class="bonus-line">✅ ${b.msg}</div>`).join('') +
        penalties.map(p => `<div class="penalty-line">⚠️ ${p.msg}</div>`).join('');
    }

    function calcPenaltiesAndBonuses() {
      const penalties = [], bonuses = [];
      const cells = G.mapCells;
      if (!cells.includes('loan')) penalties.push({ msg: 'لا يوجد قسم إعارة – الخدمة الرئيسية معطّلة', sat: -5, qual: 0 });
      if (cells.includes('manuscript') && !G.staff.archivist) penalties.push({ msg: 'قاعة المخطوطات بدون أمين مخطوطات', sat: -6, qual: -3 });
      if (cells.includes('digital') && G.acqCounts.database > 0) bonuses.push({ msg: 'المعمل الرقمي + قواعد البيانات = خدمة بحثية متكاملة', sat: 3, qual: 5, sections: ['digital'] });
      if (cells.includes('storage') && cells.includes('manuscript')) {
        const si = cells.indexOf('storage'), mi = cells.indexOf('manuscript');
        const sr = Math.floor(si / COL), sc = si % COL, mr = Math.floor(mi / COL), mc = mi % COL;
        if (Math.abs(sr - mr) <= 2 && Math.abs(sc - mc) <= 2) bonuses.push({ msg: 'مستودع الأرشيف مجاور للمخطوطات: +4% جودة/شهر', sat: 0, qual: 4, sections: ['storage', 'manuscript'] });
      }
      if (cells.includes('admin') && G.staff.cataloger) bonuses.push({ msg: 'مكتب الإدارة + مفهرس: كفاءة إدارية مرتفعة', sat: 2, qual: 3, sections: ['admin'] });
      if (G.staff.reference && cells.includes('reference')) bonuses.push({ msg: 'أخصائي مرجعي في قاعة المراجع: +3% رضا/شهر', sat: 3, qual: 0, sections: ['reference'] });
      return { penalties, bonuses };
    }

    // ═══════════════════════════════════════════════════
    //  ANIMATED VISITORS ON MAP
    // ═══════════════════════════════════════════════════
    const MAX_VISITORS = 8;
    let visitorDots = [];
    let visitorLayer;

    function initVisitorLayer() {
      visitorLayer = document.getElementById('visitor-layer');
    }

    // Get pixel position of cell center relative to visitor layer
    function getCellPos(cellIdx) {
      const canvas = document.getElementById('lib-map-canvas');
      const layerRect = visitorLayer.getBoundingClientRect();
      const cells = canvas.querySelectorAll('.map-cell');
      if (!cells[cellIdx]) return null;
      const rect = cells[cellIdx].getBoundingClientRect();
      return {
        x: rect.left - layerRect.left + rect.width / 2 - 8,
        y: rect.top - layerRect.top + rect.height / 2 - 8
      };
    }

    // Get walkable cells (corridors + rooms)
    function getWalkableCells() {
      const walkable = [];
      for (let i = 0; i < 80; i++) {
        if (FIXED_CELLS[i] === 'wall') continue;
        if (FIXED_CELLS[i] === 'entrance') { walkable.push(i); continue; }
        if (FIXED_CELLS[i] === 'corridor') { walkable.push(i); continue; }
        if (G.mapCells[i] && SECTIONS[G.mapCells[i]]) walkable.push(i);
      }
      return walkable;
    }

    // Get room cells only (for visitors to visit)
    function getRoomCells() {
      const rooms = [];
      for (let i = 0; i < 80; i++) {
        if (G.mapCells[i] && SECTIONS[G.mapCells[i]]) rooms.push(i);
      }
      return rooms;
    }

    // Spawn a visitor
    function spawnVisitor() {
      if (visitorDots.length >= MAX_VISITORS) return;
      if (!visitorLayer) return;
      const entrance = [idx(7, 4), idx(7, 5)];
      const startCell = entrance[rand(0, 1)];
      const pos = getCellPos(startCell);
      if (!pos) return;

      const emojiList = ['🧝‍♀️', '🧙', '🧑‍🎓', '👩‍🎓', '👨‍🎓', '🧝', '🧑‍💼', '👩', '👨', '🧑'];
      const dot = document.createElement('div');
      dot.className = 'visitor';
      dot.textContent = emojiList[rand(0, emojiList.length - 1)];
      dot.style.left = pos.x + 'px';
      dot.style.top = pos.y + 'px';
      visitorLayer.appendChild(dot);

      const visitorObj = { el: dot, cell: startCell, targetCell: null, timeout: null, alive: true };
      visitorDots.push(visitorObj);
      scheduleVisitorMove(visitorObj);
    }

    function scheduleVisitorMove(v) {
      if (!v.alive) return;
      const delay = rand(1500, 4000);
      v.timeout = setTimeout(() => {
        if (!v.alive) return;
        moveVisitor(v);
      }, delay);
    }

    function moveVisitor(v) {
      if (!v.alive) return;
      const walkable = getWalkableCells();
      if (walkable.length === 0) return;

      // Sometimes go to room, sometimes wander corridor
      const rooms = getRoomCells(); // only PLACED rooms
      let targetCell;

      const shouldLeave = rand(1, 8) === 1; // 1 in 8 chance to leave
      if (shouldLeave) {
        // Go to entrance and despawn
        const entrance = [idx(7, 4), idx(7, 5)];
        targetCell = entrance[rand(0, 1)];
        v.alive = false; // Mark for removal
        const pos = getCellPos(targetCell);
        if (pos) {
          v.el.style.left = pos.x + 'px';
          v.el.style.top = pos.y + 'px';
          v.el.classList.add('moving');
        }
        setTimeout(() => {
          v.el.remove();
          visitorDots = visitorDots.filter(d => d !== v);
        }, 2000);
        return;
      }

      // Smart targeting: pick only from rooms that actually exist
      if (rooms.length > 0 && rand(1, 3) === 1) {
        // Weight rooms: loan & reference get 2x traffic, others 1x
        const weightedRooms = [];
        rooms.forEach(cellIdx => {
          const type = G.mapCells[cellIdx];
          const weight = (type === 'loan' || type === 'reference') ? 2 : 1;
          for (let w = 0; w < weight; w++) weightedRooms.push(cellIdx);
        });
        targetCell = weightedRooms[rand(0, weightedRooms.length - 1)];
      } else {
        const corridors = walkable.filter(c => FIXED_CELLS[c] === 'corridor' || FIXED_CELLS[c] === 'entrance');
        targetCell = corridors.length > 0 ? corridors[rand(0, corridors.length - 1)] : walkable[rand(0, walkable.length - 1)];
      }

      v.cell = targetCell;
      const pos = getCellPos(targetCell);
      if (pos) {
        v.el.style.left = pos.x + 'px';
        v.el.style.top = pos.y + 'px';
        v.el.classList.add('moving');
        setTimeout(() => { if (v.el) v.el.classList.remove('moving'); }, 1800);
      }
      scheduleVisitorMove(v);
    }

    function tickVisitors() {
      // Spawn new visitors occasionally
      const hasLoan = G.mapCells.includes('loan');
      const hasAny = G.mapCells.filter(c => c && SECTIONS[c]).length > 0;
      if (!hasAny) return;
      if (visitorDots.length < MAX_VISITORS && rand(1, 4) === 1) {
        spawnVisitor();
      }
    }

    // ═══════════════════════════════════════════════════
    //  STAFF VISUAL ON MAP (static badges over their sections)
    // ═══════════════════════════════════════════════════
    function renderStaffOnMap() {
      // Remove old staff badges
      document.querySelectorAll('.staff-on-map-badge').forEach(e => e.remove());
      const canvas = document.getElementById('lib-map-canvas');
      const cells = canvas.querySelectorAll('.map-cell');

      STAFF_DEF.forEach(st => {
        if (!G.staff[st.id]) return;
        // Find their desk cell
        const deskSection = G.mapCells.includes(st.desk) ? st.desk : (G.mapCells.includes(st.deskFallback) ? st.deskFallback : null);
        if (!deskSection) return;
        const cellIdx = G.mapCells.indexOf(deskSection);
        if (cellIdx < 0) return;
        const cell = cells[cellIdx];
        if (!cell) return;
        const badge = document.createElement('div');
        badge.className = 'staff-on-map-badge';
        badge.style.cssText = `position:absolute;top:2px;right:2px;font-size:.65rem;z-index:5;line-height:1;filter:drop-shadow(0 0 3px rgba(34,197,94,.8));animation:pulse 2s infinite`;
        badge.textContent = st.emoji;
        badge.title = st.name + ' – ' + st.role;
        cell.appendChild(badge);
      });
    }

    // ═══════════════════════════════════════════════════
    //  HR RENDER
    // ═══════════════════════════════════════════════════
    function renderHR() {
      // Staff productivity summary
      const sp = document.getElementById('staff-productivity');
      sp.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px">
  ${STAFF_DEF.map(s => {
        const hired = G.staff[s.id];
        const morale = G.staffMorale[s.id];
        const loc = hired ? (G.mapCells.includes(s.desk) ? SECTIONS[s.desk]?.name : G.mapCells.includes(s.deskFallback) ? SECTIONS[s.deskFallback]?.name : 'جوّال') : null;
        return `<div style="background:var(--card2);border:1px solid var(--border2);border-radius:8px;padding:10px;display:flex;align-items:center;gap:8px">
      <div style="font-size:1.4rem">${s.icon}</div>
      <div style="flex:1">
        <div style="font-size:.72rem;font-weight:700">${s.name}</div>
        ${hired && loc ? `<div class="sc-location"><span class="loc-dot"></span>${loc}</div>` : ''}
        <div style="font-size:.62rem;color:var(--muted)">خدم: ${G.staffServiceCount[s.id]} | معنوية: ${morale}%</div>
      </div>
      <span style="font-size:.62rem;font-weight:700;padding:2px 7px;border-radius:8px;${hired ? 'background:rgba(34,197,94,.15);color:var(--brand);border:1px solid rgba(34,197,94,.25)' : 'background:rgba(107,114,128,.12);color:var(--muted);border:1px solid rgba(107,114,128,.2)'}">${hired ? 'فعّال' : 'غائب'}</span>
    </div>`;
      }).join('')}
  </div>`;

      const grid = document.getElementById('hr-grid');
      grid.innerHTML = '';
      const salMult = 1 + (G.level - 1) * 0.18;
      STAFF_DEF.forEach(s => {
        const hired = G.staff[s.id];
        const morale = G.staffMorale[s.id];
        const effSal = Math.round(s.salary * salMult);
        const card = document.createElement('div');
        card.className = `staff-card ${hired ? 'hired' : 'available'}`;
        const deskLabel = SECTIONS[s.desk]?.name || 'جوّال';
        card.innerHTML = `
      <div class="sc-badge ${hired ? 'hired' : 'avail'}">${hired ? 'موظف حالياً' : 'متاح'}</div>
      <div class="sc-icon">${s.icon}</div>
      <div class="sc-name">${s.name}</div>
      <div class="sc-role">🏛️ ${s.role}</div>
      ${hired ? `<div class="sc-location"><span class="loc-dot"></span>مكتبه في: ${deskLabel}</div>` : ''}
      <div class="sc-skills">${s.skills.map(sk => `<span class="skill-tag">${sk}</span>`).join('')}</div>
      <div class="sc-salary">💰 الراتب: ${fmt(effSal)} ج/شهر${G.level > 1 ? ` (×${salMult.toFixed(2)})` : ''}</div>
      <div class="sc-effect">📈 ${s.effect}</div>
      <div class="sc-morale">
        <div style="display:flex;justify-content:space-between;font-size:.65rem"><span style="color:var(--muted)">المعنوية</span><span style="color:${morale > 60 ? 'var(--brand)' : morale > 35 ? 'var(--warn)' : 'var(--danger)'}">${morale}%</span></div>
        <div class="sc-morale-bar"><div class="sc-morale-fill" style="width:${morale}%;background:${morale > 60 ? 'var(--brand)' : morale > 35 ? 'var(--warn)' : 'var(--danger)'}"></div></div>
      </div>
      <button class="sc-btn ${hired ? 'fire' : 'hire'}" data-id="${s.id}">${hired ? '🚫 إنهاء الخدمة' : '✅ توظيف الآن'}</button>
    `;
        card.querySelector('button').addEventListener('click', () => {
          if (!hired) {
            if (G.budget < effSal * 2) { showToast('الميزانية غير كافية للتوظيف!', 'error'); return; }
            G.staff[s.id] = true; G.staffMorale[s.id] = 80;
            addFinance('توظيف: ' + s.name, 'expense', effSal);
            addLog('success', `👤 تم توظيف ${s.icon} ${s.name} (${fmt(effSal)} ج/شهر)`);
            showToast('✅ تم توظيف ' + s.name, 'success');
            if (!G.achievements.firstStaff) { G.achievements.firstStaff = true; unlockAchievement('👤', 'أول موظف'); }
          } else {
            G.staff[s.id] = false;
            addLog('warning', `👤 إنهاء خدمة ${s.name}.`);
            showToast('تم إنهاء خدمة ' + s.name, 'warn');
          }
          renderHR(); renderMap(); renderHUD(); checkQuests();
        });
        grid.appendChild(card);
      });
      const needArch = G.mapCells.includes('manuscript') && !G.staff.archivist;
      document.getElementById('hr-alert').style.display = needArch ? 'block' : 'none';
    }

    // ═══════════════════════════════════════════════════
    //  ACQUISITION RENDER
    // ═══════════════════════════════════════════════════
    function renderAcquisition() {
      const grid = document.getElementById('acq-grid');
      grid.innerHTML = '';
      ACQ_ITEMS.forEach(item => {
        const count = G.acqCounts[item.id] || 0;
        const canAfford = G.budget >= item.cost;
        const levelOk = G.level >= item.reqLevel;
        const sectionOk = !item.reqSection || G.mapCells.includes(item.reqSection);
        const staffOk = !item.reqStaff || G.staff[item.reqStaff];
        const canBuy = canAfford && levelOk && sectionOk && staffOk;
        const card = document.createElement('div');
        card.className = 'acq-card';
        let reqHTML = '';
        if (!levelOk) reqHTML += `<div class="acq-req unmet">🔒 يتطلب المستوى ${item.reqLevel}</div>`;
        else if (!sectionOk) reqHTML += `<div class="acq-req unmet">⚠️ يتطلب: ${SECTIONS[item.reqSection]?.name}</div>`;
        else if (!staffOk) reqHTML += `<div class="acq-req unmet">👤 يتطلب: ${STAFF_DEF.find(d => d.id === item.reqStaff)?.name}</div>`;
        else reqHTML += `<div class="acq-req met">✅ متاح للاقتناء</div>`;
        if (!levelOk) card.innerHTML = `<div class="acq-level-lock">المستوى ${item.reqLevel}+</div>`;
        card.innerHTML += `
      <div class="acq-icon">${item.icon}</div>
      <div class="acq-name">${item.name}</div>
      <div class="acq-desc">${item.desc}</div>
      <div class="acq-stats">
        ${item.collAdd > 0 ? `<span class="acq-stat cyan">📦 +${item.collAdd} وعاء</span>` : ''}
        ${item.qualAdd > 0 ? `<span class="acq-stat green">🎯 +${item.qualAdd}% جودة</span>` : ''}
        ${item.satAdd > 0 ? `<span class="acq-stat gold">😊 +${item.satAdd}% رضا</span>` : ''}
      </div>
      ${reqHTML}
      <div class="acq-price">💰 ${fmt(item.cost)} جنيه</div>
      <div class="acq-count">اقتُني ${count} ${count === 0 ? 'مرة' : count < 3 ? 'مرات' : 'مرات'}</div>
      <button class="acq-btn" ${!canBuy ? 'disabled' : ''} data-id="${item.id}">${canBuy ? 'اقتناء الآن ✅' : (!canAfford ? 'لا تكفي الميزانية' : 'غير متاح حالياً')}</button>
    `;
        card.querySelector('button').addEventListener('click', () => {
          if (!canBuy) return;
          // Confirmation for expensive items
          if (item.cost >= 3000) {
            const ok = confirm(`⚠️ تأكيد الاقتناء\n\n"${item.name}"\nالتكلفة: ${fmt(item.cost)} جنيه\n\nميزانيتك بعد الشراء: ${fmt(G.budget - item.cost)} ج\n\nهل أنت متأكد؟`);
            if (!ok) return;
          }
          G.budget -= item.cost;
          G.acqCounts[item.id] = (G.acqCounts[item.id] || 0) + 1;
          G.collections += item.collAdd;
          // Large quality gains (>8) are gradual over 3 months; smaller ones are instant
          if (item.qualAdd > 8) {
            G.pendingQualityGains += item.qualAdd;
            addLog('info', `📈 تحسين الجودة (+${item.qualAdd}%) سيظهر تدريجياً خلال 3 أشهر.`);
          } else {
            G.quality = clamp(G.quality + item.qualAdd, 0, 100);
          }
          G.satisfaction = clamp(G.satisfaction + item.satAdd, 0, 100);
          G.score += Math.round(item.cost / 15);
          addFinance('اقتناء: ' + item.name, 'expense', item.cost);
          addLog('success', `📦 تم اقتناء "${item.name}" (+${item.qualAdd}% جودة، -${fmt(item.cost)} ج)`);
          showToast('✅ اقتناء ناجح: ' + item.name, 'success');
          floatNum('-' + fmt(item.cost) + ' ج', 'neg');
          if (item.id === 'database' && !G.achievements.firstDB) { G.achievements.firstDB = true; unlockAchievement('🖥️', 'أول قاعدة بيانات'); }
          renderAcquisition(); renderHUD(); checkQuests();
        });
        grid.appendChild(card);
      });
    }

    // ═══════════════════════════════════════════════════
    //  ANALYTICS RENDER
    // ═══════════════════════════════════════════════════
    function renderAnalytics() {
      const totalSal = STAFF_DEF.reduce((a, s) => a + (G.staff[s.id] ? s.salary * (1 + (G.level - 1) * 0.18) : 0), 0);
      const sections = G.mapCells.filter(v => v && SECTIONS[v]).length;
      document.getElementById('analytics-grid').innerHTML = `
    <div class="ana-card"><div class="ana-num" style="color:var(--brand)">${fmt(G.budget)}</div><div class="ana-label">الميزانية (ج)</div></div>
    <div class="ana-card"><div class="ana-num" style="color:var(--accent)">${Math.round(G.satisfaction)}%</div><div class="ana-label">رضا المستفيدين</div></div>
    <div class="ana-card"><div class="ana-num" style="color:var(--brand)">${Math.round(G.quality)}%</div><div class="ana-label">جودة الفهرسة</div></div>
    <div class="ana-card"><div class="ana-num" style="color:var(--warn)">${fmt(G.collections)}</div><div class="ana-label">إجمالي الأوعية</div></div>
    <div class="ana-card"><div class="ana-num" style="color:var(--brand)">${G.totalServiced}</div><div class="ana-label">مستفيدون مخدومون</div></div>
    <div class="ana-card"><div class="ana-num" style="color:var(--danger)">${G.totalRejected}</div><div class="ana-label">طلبات لم تُخدم</div></div>
    <div class="ana-card"><div class="ana-num" style="color:var(--danger)">${fmt(totalSal)}</div><div class="ana-label">رواتب شهرية</div></div>
    <div class="ana-card"><div class="ana-num" style="color:var(--purple)">${sections}</div><div class="ana-label">أقسام مفعّلة</div></div>
    <div class="ana-card"><div class="ana-num" style="color:var(--warn)">${fmt(G.score)}</div><div class="ana-label">النقاط الكلية</div></div>
  `;

      const avg = (G.satisfaction + G.quality) / 2;
      let stars, label, color;
      if (avg >= 90) { stars = 5; label = 'ممتاز – نموذج يُحتذى به'; color = 'var(--brand)'; }
      else if (avg >= 75) { stars = 4; label = 'جيد جداً – مستوى أكاديمي رفيع'; color = 'var(--accent)'; }
      else if (avg >= 60) { stars = 3; label = 'جيد – يحتاج تطوير مستمر'; color = 'var(--warn)'; }
      else if (avg >= 40) { stars = 2; label = 'مقبول – أداء دون المأمول'; color = '#f97316'; }
      else { stars = 1; label = 'ضعيف – خطر إغلاق وشيك'; color = 'var(--danger)'; }
      document.getElementById('analytics-rating').innerHTML = `
    <div style="font-size:1.5rem;margin-bottom:5px">${'⭐'.repeat(stars)}${'☆'.repeat(5 - stars)}</div>
    <div style="font-size:.78rem;font-weight:800;color:${color}">${label}</div>
    <div style="font-size:.65rem;color:var(--muted);margin-top:3px">متوسط رضا + جودة: ${Math.round(avg)}%</div>`;

      const chartEl = document.getElementById('monthly-chart');
      chartEl.innerHTML = '';
      const hist = G.monthlyHistory.slice(-8);
      const maxVal = Math.max(...hist.map(h => Math.max(h.income, h.expense, 1)), 1);
      hist.forEach(h => {
        const incH = Math.max(3, Math.round((h.income / maxVal) * 68));
        const expH = Math.max(3, Math.round((h.expense / maxVal) * 68));
        const satH = Math.max(2, Math.round(((h.satisfaction || 0) / 100) * 68));
        const qualH = Math.max(2, Math.round(((h.quality || 0) / 100) * 68));
        chartEl.innerHTML += `
      <div class="chart-bar-wrap">
        <div class="chart-bar-val" style="font-size:.52rem">${fmt(h.income)}</div>
        <div style="display:flex;gap:1px;align-items:flex-end;height:68px">
          <div class="chart-bar" style="height:${incH}px;background:linear-gradient(180deg,var(--brand),rgba(34,197,94,.3));width:8px" title="إيراد: ${fmt(h.income)} ج"></div>
          <div class="chart-bar" style="height:${expH}px;background:linear-gradient(180deg,var(--danger),rgba(239,68,68,.3));width:8px" title="مصروف: ${fmt(h.expense)} ج"></div>
          <div class="chart-bar" style="height:${satH}px;background:linear-gradient(180deg,var(--accent),rgba(6,182,212,.3));width:5px;opacity:.8" title="رضا: ${h.satisfaction || 0}%"></div>
          <div class="chart-bar" style="height:${qualH}px;background:linear-gradient(180deg,var(--warn),rgba(245,158,11,.3));width:5px;opacity:.8" title="جودة: ${h.quality || 0}%"></div>
        </div>
        <div class="chart-bar-label">ش${h.month}</div>
      </div>`;
      });
      if (!hist.length) chartEl.innerHTML = `<div style="color:var(--muted);font-size:.76rem;padding:20px">لا بيانات شهرية بعد</div>`;
      // Add chart legend
      chartEl.insertAdjacentHTML('afterend', `<div style="display:flex;gap:12px;font-size:.6rem;color:var(--muted);margin-top:6px;flex-wrap:wrap">
    <span><span style="color:var(--brand)">█</span> إيراد</span>
    <span><span style="color:var(--danger)">█</span> مصروف</span>
    <span><span style="color:var(--accent)">█</span> رضا%</span>
    <span><span style="color:var(--warn)">█</span> جودة%</span>
  </div>`);

      document.getElementById('expense-log').innerHTML = G.financeLedger.slice(0, 20).map(e => `
    <tr>
      <td>${e.label}</td>
      <td><span class="${e.type === 'income' ? 'etbl-income' : 'etbl-expense'}">${e.type === 'income' ? 'إيراد' : 'مصروف'}</span></td>
      <td class="${e.type === 'income' ? 'etbl-income' : 'etbl-expense'}">${e.type === 'income' ? '+' : '-'}${fmt(e.amount)} ج</td>
      <td style="color:var(--muted);font-size:.66rem">${e.date}</td>
    </tr>`).join('') || `<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--muted)">لا معاملات بعد</td></tr>`;
    }

    // ═══════════════════════════════════════════════════
    //  CRISES
    // ═══════════════════════════════════════════════════
    let crisisTimer = null;
    function triggerCrisis() {
      if (G.crisisActive || G.gameOver) return;
      // Context-aware crisis pool — only show relevant crises
      let pool = CRISES.filter(c => {
        if (c.id === 'flood') return G.mapCells.includes('manuscript') || G.mapCells.includes('storage');
        if (c.id === 'electricity') return G.mapCells.includes('digital');
        if (c.id === 'ransomware') return G.acqCounts.database > 0 || G.mapCells.includes('digital');
        return true; // donation & audit & conference always possible
      });
      // Fallback to full pool if nothing matches
      if (pool.length === 0) pool = CRISES;
      const c = pool[rand(0, pool.length - 1)];
      G.crisisActive = true;
      document.getElementById('modal-icon').textContent = c.icon;
      document.getElementById('modal-severity').className = `modal-severity ${c.severity}`;
      document.getElementById('modal-severity').textContent = c.severityLabel;
      document.getElementById('modal-title').textContent = c.title;
      document.getElementById('modal-desc').textContent = c.desc;
      const choicesEl = document.getElementById('modal-choices');
      choicesEl.innerHTML = '';
      c.choices.forEach(ch => {
        const btn = document.createElement('button');
        btn.className = 'modal-choice-btn';
        btn.innerHTML = `${ch.label}<div class="choice-tags">${ch.tags.map(t => `<span class="ctag">${t}</span>`).join('')}</div>`;
        btn.addEventListener('click', () => resolveCrisis(c, ch));
        choicesEl.appendChild(btn);
      });
      document.getElementById('modal-overlay').classList.add('active');
      if (!G.achievements.firstCrisis) { G.achievements.firstCrisis = true; unlockAchievement('⚠️', 'أول أزمة'); }
      if (c.severity === 'sev-high') {
        let countdown = 30;
        const timerEl = document.getElementById('crisis-timer');
        const countEl = document.getElementById('crisis-countdown');
        timerEl.style.display = 'block';
        countEl.textContent = countdown;
        crisisTimer = setInterval(() => {
          countdown--;
          countEl.textContent = countdown;
          if (countdown <= 0) {
            clearInterval(crisisTimer);
            const auto = c.choices[1];
            resolveCrisis(c, auto);
            addLog('danger', `⏰ انتهى وقت القرار – تم تطبيق الخيار الأسوأ تلقائياً!`);
          }
        }, 1000);
      }
    }

    function resolveCrisis(c, ch) {
      if (crisisTimer) clearInterval(crisisTimer);
      document.getElementById('crisis-timer').style.display = 'none';
      document.getElementById('modal-overlay').classList.remove('active');
      G.crisisActive = false; G.crisisCooldown = 20; G.crisisManaged++;
      if (ch.cost) G.budget = Math.max(0, G.budget + ch.cost);
      if (ch.qualLoss) G.quality = clamp(G.quality + ch.qualLoss, 0, 100);
      if (ch.satLoss) G.satisfaction = clamp(G.satisfaction + ch.satLoss, 0, 100);
      if (ch.qualBonus) G.quality = clamp(G.quality + ch.qualBonus, 0, 100);
      if (ch.satBonus) G.satisfaction = clamp(G.satisfaction + ch.satBonus, 0, 100);
      if (ch.collBonus) G.collections += ch.collBonus;
      if (ch.collLoss) G.collections = Math.max(0, G.collections - ch.collLoss);
      if (ch.scoreBon) G.score += ch.scoreBon;
      G.score += 30;
      addLog('warning', `⚡ أزمة "${c.title}" → قرار: "${ch.label}"`);
      if (ch.cost < 0) floatNum(ch.cost + ' ج', 'neg');
      renderHUD(); checkQuests();
    }

    // ═══════════════════════════════════════════════════
    //  WIN SCREEN
    // ═══════════════════════════════════════════════════
    function showWinScreen() {
      const ov = document.getElementById('win-overlay');
      ov.style.opacity = '1'; ov.style.pointerEvents = 'all';

      const lname = G.libraryName || 'مكتبتك';
      document.getElementById('win-title').textContent = `🏆 مبروك! "${lname}" وصلت لأعلى مستوى!`;
      document.getElementById('win-subtitle').textContent =
        `أتممت بناء المكتبة الوطنية الضخمة في ${G.month - 1} شهراً · ${G.year}`;

      document.getElementById('win-stats').innerHTML = `
    <div style="background:var(--card);border:1px solid var(--border2);border-radius:9px;padding:12px;text-align:center">
      <div style="font-size:1.4rem;font-weight:800;color:var(--warn)">${fmt(G.score)}</div>
      <div style="font-size:.62rem;color:var(--muted);margin-top:2px">⭐ النقاط النهائية</div>
    </div>
    <div style="background:var(--card);border:1px solid var(--border2);border-radius:9px;padding:12px;text-align:center">
      <div style="font-size:1.4rem;font-weight:800;color:var(--brand)">${G.totalServiced}</div>
      <div style="font-size:.62rem;color:var(--muted);margin-top:2px">👣 مستفيد خُدم</div>
    </div>
    <div style="background:var(--card);border:1px solid var(--border2);border-radius:9px;padding:12px;text-align:center">
      <div style="font-size:1.4rem;font-weight:800;color:var(--accent)">${fmt(G.collections)}</div>
      <div style="font-size:.62rem;color:var(--muted);margin-top:2px">📚 وعاء في المجموعات</div>
    </div>
    <div style="background:var(--card);border:1px solid var(--border2);border-radius:9px;padding:12px;text-align:center">
      <div style="font-size:1.4rem;font-weight:800;color:var(--accent)">${Math.round(G.satisfaction)}%</div>
      <div style="font-size:.62rem;color:var(--muted);margin-top:2px">😊 رضا المستفيدين</div>
    </div>
    <div style="background:var(--card);border:1px solid var(--border2);border-radius:9px;padding:12px;text-align:center">
      <div style="font-size:1.4rem;font-weight:800;color:var(--brand)">${Math.round(G.quality)}%</div>
      <div style="font-size:.62rem;color:var(--muted);margin-top:2px">📋 جودة الفهرسة</div>
    </div>
    <div style="background:var(--card);border:1px solid var(--border2);border-radius:9px;padding:12px;text-align:center">
      <div style="font-size:1.4rem;font-weight:800;color:var(--purple)">${Object.values(G.achievements).filter(Boolean).length}</div>
      <div style="font-size:.62rem;color:var(--muted);margin-top:2px">🏅 إنجاز محقق</div>
    </div>`;

      // Rating based on score
      let rating, ratingColor, ratingDesc;
      if (G.score >= 15000) { rating = 'S'; ratingColor = '#ffd700'; ratingDesc = 'أسطوري — مكتبتك ستُذكر في التاريخ'; }
      else if (G.score >= 10000) { rating = 'A'; ratingColor = 'var(--brand)'; ratingDesc = 'ممتاز — مكتبة نموذجية بكل المقاييس'; }
      else if (G.score >= 6000) { rating = 'B'; ratingColor = 'var(--accent)'; ratingDesc = 'جيد جداً — مكتبة محترمة بأداء متميز'; }
      else { rating = 'C'; ratingColor = 'var(--warn)'; ratingDesc = 'جيد — مكتبة ناجحة لكن فيها مجال للتطوير'; }

      document.getElementById('win-rating').innerHTML = `
    <div style="font-size:2.5rem;font-weight:800;color:${ratingColor};margin-bottom:4px">تقييم: ${rating}</div>
    <div>${ratingDesc}</div>
    <div style="margin-top:8px;font-size:.72rem">
      ${G.score >= 15000 ? '' : '💡 لتحقيق S: ارفع النقاط فوق 15,000 بالاقتناء المبكر وإدارة الأزمات بالخيار الأفضل'}
    </div>`;

      // Confetti-like emoji burst
      const emojis = ['🎉', '⭐', '🏆', '📚', '✨', '🎊', '📖', '🌟'];
      for (let i = 0; i < 12; i++) {
        setTimeout(() => {
          const el = document.createElement('div');
          el.textContent = emojis[rand(0, emojis.length - 1)];
          el.style.cssText = `position:fixed;font-size:${rand(16, 28)}px;left:${rand(5, 95)}vw;top:-30px;z-index:600;pointer-events:none;transition:top 2.5s ease,opacity 2s ease;opacity:1`;
          document.body.appendChild(el);
          setTimeout(() => { el.style.top = '110vh'; el.style.opacity = '0'; }, 50);
          setTimeout(() => el.remove(), 2600);
        }, i * 120);
      }
    }

    document.getElementById('win-restart-btn').addEventListener('click', () => {
      document.getElementById('win-overlay').style.opacity = '0';
      document.getElementById('win-overlay').style.pointerEvents = 'none';
      G.libraryName = '';
      const namingOv = document.getElementById('naming-overlay');
      namingOv.style.display = 'flex'; namingOv.style.opacity = '1';
      document.getElementById('naming-input').value = '';
      initGame();
    });
    document.getElementById('win-continue-btn').addEventListener('click', () => {
      document.getElementById('win-overlay').style.opacity = '0';
      document.getElementById('win-overlay').style.pointerEvents = 'none';
      showToast('🕹️ تابع البناء — المكتبة الوطنية في أوجها!', 'success', 4000);
    });
    function checkLevelUp() {
      const req = G.levelReqs[G.level];
      if (!req || G.level >= 4) return;
      if (G.budget >= req.budget && G.satisfaction >= req.satisfaction && G.quality >= req.quality) {
        G.level++;
        document.getElementById('lu-title').textContent = '🎓 ترقية للمستوى ' + G.level + '!';
        document.getElementById('lu-sub').textContent = G.levelNames[G.level - 1];
        document.getElementById('lu-perks').innerHTML = G.levelPerks[G.level - 1].map(p => `<div class="lu-perk">✅ ${p}</div>`).join('');
        document.getElementById('levelup-overlay').classList.add('active');
        if (G.level === 2) { G.budget += 5000; G.achievements.level2 = true; unlockAchievement('🎓', 'المستوى 2'); }
        if (G.level === 3) { G.achievements.level3 = true; unlockAchievement('🏛️', 'المستوى 3'); }
        if (G.level === 4) {
          G.achievements.level4 = true;
          setTimeout(() => showWinScreen(), 1200); // slight delay after levelup overlay
        }
        addLog('success', `🎓 ترقية! المكتبة الآن: "${G.levelNames[G.level - 1]}" (المستوى ${G.level})`);
        renderHUD();
      }
    }
    document.getElementById('levelup-btn').addEventListener('click', () => document.getElementById('levelup-overlay').classList.remove('active'));

    // ═══════════════════════════════════════════════════
    //  MONTHLY CYCLE
    // ═══════════════════════════════════════════════════
    function doMonthlyCycle() {
      // Snapshot before changes for delta reporting
      const prevSat = G.satisfaction, prevQual = G.quality;
      const monthIncome = G.monthlyIncome, monthExpense = G.monthlyExpense;

      G.monthlyHistory.push({ month: G.month, income: G.monthlyIncome, expense: G.monthlyExpense, satisfaction: Math.round(G.satisfaction), quality: Math.round(G.quality) });
      if (G.monthlyHistory.length > 12) G.monthlyHistory.shift();
      G.visitorsToday = 0;

      const salMult = 1 + (G.level - 1) * 0.18;
      let totalSal = 0;
      STAFF_DEF.forEach(s => { if (G.staff[s.id]) totalSal += s.salary * salMult; });
      if (totalSal > 0) {
        G.budget -= totalSal;
        addFinance('رواتب الشهر ' + G.month, 'expense', totalSal);
        addLog('warning', `💼 رواتب شهر ${G.month}: ${fmt(totalSal)} ج`);
        floatNum('-' + fmt(totalSal) + ' ج', 'neg');
      }

      if (G.staff.cataloger) { G.quality = clamp(G.quality + 8 + (G.acqCounts.database > 0 ? 4 : 0), 0, 100); }
      if (G.staff.reference) { G.satisfaction = clamp(G.satisfaction + 6 + (G.mapCells.includes('reference') ? 3 : 0), 0, 100); }
      if (G.staff.archivist && G.mapCells.includes('manuscript')) { G.quality = clamp(G.quality + 4, 0, 100); G.collections += 15; }
      if (G.staff.volunteer) { G.satisfaction = clamp(G.satisfaction + 2, 0, 100); }

      // Gradual quality drip: release ~1/3 of pending gains per month
      if (G.pendingQualityGains > 0) {
        const drip = Math.ceil(G.pendingQualityGains / 3);
        const actual = Math.min(drip, G.pendingQualityGains);
        G.quality = clamp(G.quality + actual, 0, 100);
        G.pendingQualityGains = Math.max(0, G.pendingQualityGains - actual);
        if (actual > 0) addLog('info', `📈 تطبيق تدريجي للجودة: +${actual}% (متبقي: ${G.pendingQualityGains}%)`);
      }

      Object.keys(G.staffMorale).forEach(k => {
        if (!G.staff[k]) return;
        G.staffMorale[k] = clamp(G.staffMorale[k] - 2 + rand(0, 3), 10, 100);
        const m = G.staffMorale[k];
        const staffInfo = STAFF_DEF.find(s => s.id === k);
        const name = staffInfo ? staffInfo.name : k;
        // Critical: staff quits below 15%
        if (m <= 15) {
          G.staff[k] = false;
          G.staffMorale[k] = 80;
          G.satisfaction = clamp(G.satisfaction - 8, 0, 100);
          addLog('danger', `😤 ${name} استقال بسبب انخفاض معنويته! (-8% رضا)`, true);
          showToast(`⚠️ ${name} استقال! وظّف بديلاً فوراً`, 'error', 5000);
        } else if (m <= 30) {
          addLog('warning', `😟 معنوية ${name} منخفضة جداً (${m}%) — يحتاج حافزاً`);
        } else if (m <= 40) {
          // Reduced performance: half the monthly benefit this month
          addLog('info', `😐 ${name} كفاءته منخفضة (معنوية ${m}%) — تأثيره نصفي هذا الشهر`);
        }
      });

      const { penalties, bonuses } = calcPenaltiesAndBonuses();
      penalties.forEach(p => { G.satisfaction = clamp(G.satisfaction + p.sat, 0, 100); G.quality = clamp(G.quality + p.qual, 0, 100); });
      bonuses.forEach(b => { G.satisfaction = clamp(G.satisfaction + b.sat, 0, 100); G.quality = clamp(G.quality + b.qual, 0, 100); });

      if (!G.staff.cataloger && G.quality > 15) G.quality = clamp(G.quality - 3, 0, 100);
      if (!G.staff.reference && G.satisfaction > 20) G.satisfaction = clamp(G.satisfaction - 2, 0, 100);

      if (G.satisfaction >= 90 && !G.achievements.satisfaction90) { G.achievements.satisfaction90 = true; unlockAchievement('😍', 'رضا 90%'); }
      if (G.quality >= 80 && !G.achievements.quality80) { G.achievements.quality80 = true; unlockAchievement('⭐', 'جودة 80%'); }

      G.score += Math.round(G.satisfaction * 0.3 + G.quality * 0.3 + G.collections / 50 + G.level * 10);
      G.monthlyIncome = 0; G.monthlyExpense = 0;

      addLog('info', `📅 إغلاق شهر ${G.month}/${G.year} | الميزانية: ${fmt(G.budget)} ج`);

      // Build monthly report data
      const alerts = [];
      const highlights = [];
      if (!G.mapCells.includes('loan')) alerts.push('⚠️ لا يوجد قسم إعارة — مصدر الدخل الرئيسي معطّل');
      if (G.mapCells.includes('manuscript') && !G.staff.archivist) alerts.push('⚠️ قاعة المخطوطات بدون أمين — -6% رضا شهرياً');
      if (G.satisfaction < 50) alerts.push('🚨 رضا المستفيدين منخفض جداً (' + Math.round(G.satisfaction) + '%)');
      if (monthIncome > monthExpense) highlights.push('✅ الشهر ده ربحت ' + (fmt(monthIncome - monthExpense)) + ' ج');
      if (G.staff.cataloger) highlights.push('📋 المفهرس رفع الجودة +' + Math.round(8 + (G.acqCounts.database > 0 ? 4 : 0)) + '%');
      if (G.pendingQualityGains > 0) highlights.push('⏳ ' + G.pendingQualityGains + '% جودة لا تزال في التطبيق التدريجي');
      setTimeout(() => showMonthlyReport({
        month: G.month, year: G.year,
        income: monthIncome, expense: monthExpense, net: monthIncome - monthExpense,
        satisfaction: G.satisfaction, satisfactionDelta: G.satisfaction - prevSat,
        quality: G.quality, qualityDelta: G.quality - prevQual,
        serviced: G.visitorsToday,
        alerts, highlights
      }), 200);

      G.month++;
      if (G.month > 12) { G.month = 1; G.year++; }
      checkLevelUp();
      if (document.querySelector('#tab-analytics.active')) renderAnalytics();
      renderHUD(); renderMap();
    }

    // ═══════════════════════════════════════════════════
    //  GAME OVER
    // ═══════════════════════════════════════════════════
    function endGame(reason) {
      if (G.gameOver) return;
      G.gameOver = true;
      clearInterval(gameLoop);
      if (crisisTimer) clearInterval(crisisTimer);

      // الطبقة المشتركة: تُحتسب المحاكاة بالنقاط لا بعدد الإجابات
      try {
        if (window.MPProgress) {
          window.MPProgress.recordResult({ game: 'tycoon', score: G.score, level: G.level });
        }
      } catch (e) { }

      // Build post-mortem: what led to this loss
      const postMortem = [];
      if (reason === 'bankrupt') {
        document.getElementById('go-title').textContent = '💔 إفلاس المكتبة!';
        document.getElementById('go-sub').textContent = 'الميزانية وصلت للصفر';
        if (!G.mapCells.includes('loan')) postMortem.push('❌ لم تُركّب قسم الإعارة — مصدر الدخل الرئيسي');
        if (Object.values(G.staff).filter(Boolean).length === 0) postMortem.push('❌ لا موظفين — الرواتب مش الأزمة، بل غياب الإيراد');
        const totalSalary = (G.staff.cataloger ? 800 : 0) + (G.staff.reference ? 750 : 0) + (G.staff.archivist ? 950 : 0) + (G.staff.volunteer ? 200 : 0);
        if (totalSalary > G.monthlyIncome) postMortem.push(`⚠️ الرواتب (${fmt(totalSalary)} ج) أكبر من إيراد الشهر (${fmt(G.monthlyIncome)} ج)`);
        postMortem.push('💡 في المرة الجاية: ابدأ بقسم الإعارة فوراً قبل أي إنفاق آخر');
      } else {
        document.getElementById('go-title').textContent = '😞 انهيار الخدمة!';
        document.getElementById('go-sub').textContent = 'رضا المستفيدين انهار تحت 10%';
        if (G.mapCells.includes('manuscript') && !G.staff.archivist) postMortem.push('❌ قاعة مخطوطات بدون أمين خصمت رضا كل شهر');
        if (!G.staff.reference) postMortem.push('⚠️ لا أخصائي مرجعي — الرضا لم يرتفع تلقائياً');
        if (G.crisisManaged === 0) postMortem.push('⚠️ لم تُدِر أي أزمة — تراكمت العواقب');
        postMortem.push('💡 في المرة الجاية: راقب رضا المستفيدين كل شهر وأصلح المشكلة فوراً');
      }

      const goStatsEl = document.getElementById('go-stats');
      goStatsEl.innerHTML = `
    <div class="go-stat"><div class="go-stat-num">${fmt(G.score)}</div><div class="go-stat-label">النقاط</div></div>
    <div class="go-stat"><div class="go-stat-num">${G.level}</div><div class="go-stat-label">المستوى</div></div>
    <div class="go-stat"><div class="go-stat-num">${G.totalServiced}</div><div class="go-stat-label">مخدومون</div></div>
    <div class="go-stat"><div class="go-stat-num">${G.month - 1}</div><div class="go-stat-label">أشهر</div></div>
    <div class="go-stat"><div class="go-stat-num">${Object.values(G.achievements).filter(Boolean).length}</div><div class="go-stat-label">إنجازات</div></div>
    <div class="go-stat"><div class="go-stat-num">${fmt(G.collections)}</div><div class="go-stat-label">أوعية</div></div>
  `;

      // Append post-mortem if container exists
      const pmContainer = document.getElementById('go-postmortem');
      if (pmContainer && postMortem.length) {
        pmContainer.style.display = 'block';
        pmContainer.innerHTML = `
      <div style="font-size:.72rem;font-weight:700;color:var(--warn);margin-bottom:8px">🔍 ماذا حدث؟</div>
      ${postMortem.map(p => `<div style="font-size:.7rem;color:var(--muted);padding:5px 9px;background:var(--card2);border-radius:6px;margin-bottom:5px;line-height:1.55;border-right:2px solid rgba(245,158,11,.3)">${p}</div>`).join('')}
    `;
      }
      document.getElementById('gameover-overlay').classList.add('active');
    }
    document.getElementById('restart-btn').addEventListener('click', () => {
      document.getElementById('gameover-overlay').classList.remove('active');
      const pm = document.getElementById('go-postmortem');
      if (pm) pm.style.display = 'none';
      G.libraryName = ''; // will prompt again
      // Show naming screen
      const namingOv = document.getElementById('naming-overlay');
      if (namingOv) {
        namingOv.style.display = 'flex';
        namingOv.style.opacity = '1';
        document.getElementById('naming-input').value = '';
      }
      initGame();
    });

    // ═══════════════════════════════════════════════════
    //  ACHIEVEMENTS
    // ═══════════════════════════════════════════════════
    const ACHIEVEMENTS = [
      { id: 'firstSection', icon: '🏗️', label: 'أول قسم' },
      { id: 'firstStaff', icon: '👤', label: 'أول موظف' },
      { id: 'firstDB', icon: '🖥️', label: 'أول قاعدة' },
      { id: 'firstCrisis', icon: '⚠️', label: 'أول أزمة' },
      { id: 'level2', icon: '🎓', label: 'المستوى 2' },
      { id: 'level3', icon: '🏛️', label: 'المستوى 3' },
      { id: 'satisfaction90', icon: '😍', label: 'رضا 90%' },
      { id: 'quality80', icon: '⭐', label: 'جودة 80%' }
    ];
    function unlockAchievement(icon, label) {
      showToast('🏅 إنجاز جديد: ' + label, 'info', 4500);
      renderAchievements();
    }
    function renderAchievements() {
      document.getElementById('achievements-bar').innerHTML = ACHIEVEMENTS.map(a => `
    <div class="ach-badge ${G.achievements[a.id] ? 'earned' : ''}">${a.icon} ${a.label}</div>`).join('');
    }

    // ═══════════════════════════════════════════════════
    //  QUESTS
    // ═══════════════════════════════════════════════════
    const QUESTS = [
      { id: 'q1', title: 'الخطوة الأولى', desc: 'ركّب قسم الإعارة', icon: '📤', check: () => G.mapCells.includes('loan'), reward: { budget: 500, score: 50 }, done: false },
      { id: 'q2', title: 'الفهرسة العلمية', desc: 'وظّف مفهرساً متخصصاً', icon: '🗂️', check: () => G.staff.cataloger, reward: { quality: 10, score: 80 }, done: false },
      { id: 'q3', title: 'حارس التراث', desc: 'ركّب قاعة المخطوطات ووظّف أمين مخطوطات', icon: '📜', check: () => G.mapCells.includes('manuscript') && G.staff.archivist, reward: { budget: 1500, score: 150 }, done: false },
      { id: 'q4', title: 'التحول الرقمي', desc: 'أنشئ المعمل الرقمي واشترك في قواعد بيانات', icon: '💻', check: () => G.mapCells.includes('digital') && G.acqCounts.database > 0, reward: { quality: 15, satisfaction: 10, score: 200 }, done: false },
      { id: 'q5', title: 'الأكاديمية المتكاملة', desc: 'وصل رضا المستفيدين إلى 80%', icon: '😊', check: () => G.satisfaction >= 80, reward: { budget: 3000, score: 300 }, done: false },
      { id: 'q6', title: 'المكتبة المثالية', desc: 'حقق جودة 70% مع توظيف جميع الكوادر', icon: '⭐', check: () => G.quality >= 70 && Object.values(G.staff).every(Boolean), reward: { budget: 5000, score: 500 }, done: false },
      { id: 'q7', title: 'مدير الأزمات', desc: 'أدِر 3 أزمات بنجاح', icon: '🛡️', check: () => G.crisisManaged >= 3, reward: { score: 400, satisfaction: 8 }, done: false },
      { id: 'q8', title: 'المقتني المتميز', desc: 'اقتنِ 5 مصادر مختلفة', icon: '📦', check: () => Object.values(G.acqCounts).filter(v => v > 0).length >= 5, reward: { budget: 2000, quality: 10, score: 250 }, done: false }
    ];
    function checkQuests() {
      QUESTS.forEach(q => {
        if (!q.done && q.check()) {
          q.done = true;
          if (q.reward.budget) G.budget += q.reward.budget;
          if (q.reward.quality) G.quality = clamp(G.quality + q.reward.quality, 0, 100);
          if (q.reward.satisfaction) G.satisfaction = clamp(G.satisfaction + q.reward.satisfaction, 0, 100);
          if (q.reward.score) G.score += q.reward.score;
          addLog('success', `🏅 مهمة مكتملة: "${q.title}"! ${q.reward.budget ? '+' + fmt(q.reward.budget) + ' ج' : ''} ${q.reward.score ? '+' + q.reward.score + ' نقطة' : ''}`, true); showToast('🏅 "' + q.title + '" مكتملة!', 'info', 5000);
          renderQuestsWidget();
        }
      });
    }
    function renderQuestsWidget() {
      const el = document.getElementById('quests-widget');
      if (!el) return;
      const pending = QUESTS.filter(q => !q.done);
      const done = QUESTS.filter(q => q.done).length;
      el.innerHTML = `<div style="font-size:.68rem;font-weight:700;color:var(--accent);margin-bottom:6px;display:flex;justify-content:space-between">
    <span>🎯 المهام الجارية</span><span style="color:var(--brand)">${done}/${QUESTS.length}</span></div>
  ${pending.slice(0, 3).map(q => `
    <div style="background:var(--card2);border:1px solid var(--border2);border-radius:6px;padding:7px 9px;margin-bottom:5px">
      <div style="font-size:.68rem;font-weight:700">${q.icon} ${q.title}</div>
      <div style="font-size:.62rem;color:var(--muted);margin-top:1px">${q.desc}</div>
      <div style="font-size:.58rem;color:var(--warn);margin-top:2px">${q.reward.budget ? '💰 +' + fmt(q.reward.budget) + ' ج ' : ''} ${q.reward.score ? '⭐ +' + q.reward.score + ' نقطة' : ''}</div>
    </div>`).join('')}
  ${!pending.length ? '<div style="color:var(--brand);font-size:.72rem;text-align:center">🏆 جميع المهام مكتملة!</div>' : ''}`;
      renderNowTask();
      updateQuestsBadge();
    }

    function renderNowTask() {
      const banner = document.getElementById('now-task-banner');
      const textEl = document.getElementById('now-task-text');
      const rewardEl = document.getElementById('now-task-reward');
      const badgeEl = document.getElementById('now-task-badge');
      if (!banner || !textEl) return;
      const pending = QUESTS.filter(q => !q.done);
      if (!pending.length) {
        banner.style.background = 'rgba(34,197,94,.06)';
        banner.style.borderColor = 'rgba(34,197,94,.25)';
        textEl.textContent = '🏆 أحسنت! جميع المهام مكتملة';
        rewardEl.textContent = '';
        badgeEl.textContent = 'مكتمل';
        return;
      }
      const q = pending[0];
      textEl.textContent = q.icon + ' ' + q.title + ' — ' + q.desc;
      const rew = [];
      if (q.reward.budget) rew.push('💰 +' + fmt(q.reward.budget) + ' ج');
      if (q.reward.quality) rew.push('📈 +' + q.reward.quality + '% جودة');
      if (q.reward.satisfaction) rew.push('😊 +' + q.reward.satisfaction + '% رضا');
      if (q.reward.score) rew.push('⭐ +' + q.reward.score);
      rewardEl.textContent = 'المكافأة: ' + rew.join(' · ');
      const done = QUESTS.filter(q => q.done).length;
      badgeEl.textContent = done + '/' + QUESTS.length + ' مهمة';
    }

    // ═══════════════════════════════════════════════════
    //  LEADERBOARD
    // ═══════════════════════════════════════════════════
    const MOCK_LB = [
      { name: 'د. أحمد السيد', score: 18450, level: 'مكتبة وطنية' },
      { name: 'م. سارة العمري', score: 12300, level: 'مكتبة إقليمية' },
      { name: 'أ. خالد النصر', score: 9800, level: 'مكتبة كلية' },
      { name: 'أنتَ', score: 0, level: 'جارٍ...', isUser: true }
    ];
    function renderLeaderboard() {
      const el = document.getElementById('leaderboard-widget');
      if (!el) return;
      MOCK_LB[3].score = G.score;
      MOCK_LB[3].level = G.levelNames[G.level - 1];
      const sorted = [...MOCK_LB].sort((a, b) => b.score - a.score);
      el.innerHTML = `<div style="font-size:.68rem;font-weight:700;color:var(--warn);margin-bottom:6px">🏆 المتصدرون</div>` +
        sorted.map((p, i) => `
    <div style="display:flex;align-items:center;gap:6px;padding:5px 7px;border-radius:6px;margin-bottom:3px;background:${p.isUser ? 'rgba(34,197,94,.07)' : 'rgba(255,255,255,.015)'};border:1px solid ${p.isUser ? 'rgba(34,197,94,.2)' : 'var(--border2)'}">
      <span style="font-size:.75rem;font-weight:800;color:${i === 0 ? 'var(--warn)' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7c2a' : 'var(--muted)'}">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1)}</span>
      <div style="flex:1"><div style="font-size:.68rem;font-weight:700;color:${p.isUser ? 'var(--brand)' : 'var(--text)'}">${p.name}</div><div style="font-size:.58rem;color:var(--muted)">${p.level}</div></div>
      <span style="font-size:.68rem;font-weight:800;color:var(--warn)">${fmt(p.score)}</span>
    </div>`).join('');
    }

    // ═══════════════════════════════════════════════════
    //  TIPS
    // ═══════════════════════════════════════════════════
    const TIPS = [
      '💡 ضع قسم الإعارة قريباً من المدخل لرفع رضا المستفيدين.',
      '📊 بدون مفهرس، تتآكل الجودة 3% شهرياً.',
      '📜 قاعة المخطوطات بدون أمين تُسبب خسارة في الرضا.',
      '🤫 قاعة الاستذكار تحتاج عزل عن الأقسام الصاخبة.',
      '💻 المعمل الرقمي يبلغ كفاءته الكاملة مع قواعد البيانات.',
      '🗄️ الأرشيف بجانب المخطوطات يمنح +4% جودة/شهر.',
      '💰 الرواتب ترتفع 18% مع كل ترقية. راقب ميزانيتك!',
      '🎓 المتطوع الأكاديمي رخيص الأثمان وفعّال جداً.',
      '⭐ رضا عالي + جودة عالية = ترقية أسرع للمستوى التالي.',
      '🏛️ انتبه لأزمات الأجهزة الرقمية – قرارك في 30 ثانية!',
    ];
    let tipIdx = 0;
    function rotateTip() {
      const el = document.getElementById('tip-text');
      if (!el) return;
      el.style.opacity = '0';
      setTimeout(() => { el.textContent = TIPS[tipIdx % TIPS.length]; el.style.opacity = '1'; tipIdx++; }, 300);
    }

    // Footer ticker
    let footerMsgs, footerIdx = 0;
    function rotateFooter() {
      footerMsgs = [
        `📚 ${fmt(G.collections)} وعاء في المجموعات`,
        `😊 رضا المستفيدين: ${Math.round(G.satisfaction)}%`,
        `🎯 جودة الفهرسة: ${Math.round(G.quality)}%`,
        `💰 الميزانية: ${fmt(G.budget)} ج`,
        `⭐ النقاط: ${fmt(G.score)}`,
        `🗓️ ${G.day}/${G.month}/${G.year}`,
      ];
      const el = document.getElementById('footer-ticker');
      el.style.opacity = '0';
      setTimeout(() => { el.textContent = footerMsgs[footerIdx % footerMsgs.length]; el.style.opacity = '1'; el.style.transition = 'opacity .4s'; footerIdx++; }, 250);
    }

    // ═══════════════════════════════════════════════════
    //  GAME LOOP + INIT
    // ═══════════════════════════════════════════════════
    let gameLoop, paused = false, tickCount = 0;

    function gameTick() {
      if (G.gameOver || paused) return;
      tickCount++;

      if (tickCount % 3 === 0) {
        G.day++;
        if (G.day > 30) { G.day = 1; doMonthlyCycle(); }
        renderHUD();
      }
      if (tickCount % 5 === 0) {
        const ev = VISITOR_EVENTS[rand(0, VISITOR_EVENTS.length - 1)];
        ev(); renderHUD();
        if (document.querySelector('#tab-acquisition.active')) renderAcquisition();
        checkQuests();
      }
      if (tickCount % 7 === 0) tickVisitors();
      if (G.crisisCooldown > 0) G.crisisCooldown--;
      if (tickCount % 45 === 0 && !G.crisisActive && G.crisisCooldown === 0 && rand(1, 4) === 1) triggerCrisis();
      if (tickCount % 60 === 0) {
        renderLeaderboard();
        if (!G.staff.cataloger && G.quality < 50) addLog('warning', '📉 جودة الفهرسة تتراجع – وظّف مفهرساً.');
        if (G.mapCells.includes('manuscript') && !G.staff.archivist) addLog('danger', '📜 قاعة المخطوطات معطّلة – لا أمين مخطوطات.');
        if (G.satisfaction < 40) addLog('danger', '😟 رضا المستفيدين خطير جداً!');
      }
      if (G.budget <= 0) { endGame('bankrupt'); return; }
      if (G.satisfaction <= 0) { endGame('satisfaction'); return; }
    }

    function initGame() {
      Object.assign(G, {
        budget: 10000, satisfaction: 70, quality: 40, collections: 500,
        score: 0, day: 1, month: 1, year: 2026, level: 1,
        libraryName: G.libraryName || 'مهندس المكتبة',
        mapCells: Array(80).fill(null),
        selectedSection: null,
        staff: { cataloger: false, reference: false, archivist: false, volunteer: false },
        staffMorale: { cataloger: 80, reference: 80, archivist: 80, volunteer: 80 },
        staffServiceCount: { cataloger: 0, reference: 0, archivist: 0, volunteer: 0 },
        acqCounts: { books: 0, database: 0, manuscripts: 0, periodicals: 0, digital: 0, equipment: 0, rare: 0 },
        pendingQualityGains: 0,
        financeLedger: [], monthlyIncome: 0, monthlyExpense: 0,
        crisisActive: false, gameOver: false,
        totalServiced: 0, totalRejected: 0, ticks: 0, crisisCooldown: 0,
        achievements: { firstSection: false, firstStaff: false, firstDB: false, firstCrisis: false, level2: false, level3: false, satisfaction90: false, quality80: false },
        monthlyHistory: [], logCount: 0, gameSpeed: G.gameSpeed || 1, currentFilter: 'all',
        crisisManaged: 0, visitorsToday: 0
      });
      // Replace fixed cells
      G.mapCells[idx(7, 4)] = 'entrance';
      G.mapCells[idx(7, 5)] = 'entrance';

      allLogs = [];
      tickCount = 0;
      paused = false;
      // Clear visitors
      if (visitorLayer) visitorLayer.innerHTML = '';
      visitorDots = [];
      QUESTS.forEach(q => q.done = false);

      if (gameLoop) clearInterval(gameLoop);
      gameLoop = setInterval(gameTick, 1000 / G.gameSpeed);

      renderHUD(); renderMap(); renderHR(); renderAcquisition(); renderAnalytics(); renderAchievements(); renderQuestsWidget(); renderLeaderboard(); renderNowTask();
      const lname = G.libraryName || 'مكتبتك';
      addLog('success', `🏛️ مرحباً في "${lname}"! ابدأ بتركيب قسم الإعارة وتوظيف مفهرس.`, true);
      addLog('info', '💡 اختر قسماً من الشريط الجانبي في تبويب "خريطة المكتبة" ثم انقر على أي خلية فارغة لتركيبه.');
      addLog('info', '💡 الميزانية الافتتاحية: 10,000 جنيه. راقب الرواتب الشهرية!');
    }

    // ─── MONTHLY REPORT ───
    function showMonthlyReport(data) {
      const ov = document.getElementById('monthly-report-overlay');
      const body = document.getElementById('mr-body');
      const title = document.getElementById('mr-title');
      if (!ov || !body) return;
      title.textContent = `📅 تقرير شهر ${data.month} / ${data.year}`;
      const arrow = (v) => v > 0 ? `<span style="color:var(--brand)">▲ +${Math.abs(Math.round(v))}</span>` : v < 0 ? `<span style="color:var(--danger)">▼ ${Math.round(v)}</span>` : `<span style="color:var(--muted)">─</span>`;
      const statRow = (icon, label, val, delta) => `
    <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:1rem;flex-shrink:0">${icon}</span>
      <span style="font-size:.74rem;color:var(--muted);flex:1">${label}</span>
      <span style="font-size:.82rem;font-weight:700;color:var(--text)">${val}</span>
      <span style="font-size:.72rem;min-width:52px;text-align:left">${arrow(delta)}</span>
    </div>`;
      const netColor = data.net >= 0 ? 'var(--brand)' : 'var(--danger)';
      const netSign = data.net >= 0 ? '+' : '';
      body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <div style="background:rgba(34,197,94,.07);border:1px solid rgba(34,197,94,.2);border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:.6rem;color:var(--muted);font-weight:600;margin-bottom:2px">📥 إيراد الشهر</div>
        <div style="font-size:1.05rem;font-weight:800;color:var(--brand)">+${fmt(data.income)} ج</div>
      </div>
      <div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:.6rem;color:var(--muted);font-weight:600;margin-bottom:2px">📤 مصروف الشهر</div>
        <div style="font-size:1.05rem;font-weight:800;color:var(--danger)">-${fmt(data.expense)} ج</div>
      </div>
    </div>
    <div style="background:var(--card2);border:1px solid var(--border2);border-radius:8px;padding:8px 12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:.74rem;color:var(--muted);font-weight:600">صافي الشهر</span>
      <span style="font-size:.95rem;font-weight:800;color:${netColor}">${netSign}${fmt(data.net)} ج</span>
    </div>
    ${statRow('😊', 'رضا المستفيدين', Math.round(data.satisfaction) + '%', data.satisfactionDelta)}
    ${statRow('📋', 'جودة الفهرسة', Math.round(data.quality) + '%', data.qualityDelta)}
    ${statRow('👣', 'زوار خُدموا', data.serviced, data.serviced)}
    ${data.alerts.length ? `<div style="margin-top:10px;display:flex;flex-direction:column;gap:5px">${data.alerts.map(a => `<div style="font-size:.7rem;padding:6px 10px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.18);border-radius:6px;color:#fca5a5">${a}</div>`).join('')}</div>` : ''}
    ${data.highlights.length ? `<div style="margin-top:8px;display:flex;flex-direction:column;gap:5px">${data.highlights.map(h => `<div style="font-size:.7rem;padding:6px 10px;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.18);border-radius:6px;color:#86efac">${h}</div>`).join('')}</div>` : ''}
  `;
      ov.style.opacity = '1'; ov.style.pointerEvents = 'all';
    }
    document.getElementById('mr-close-btn').addEventListener('click', () => {
      const ov = document.getElementById('monthly-report-overlay');
      ov.style.opacity = '0'; ov.style.pointerEvents = 'none';
    });
    document.getElementById('mr-continue-btn').addEventListener('click', () => {
      const ov = document.getElementById('monthly-report-overlay');
      ov.style.opacity = '0'; ov.style.pointerEvents = 'none';
    });

    // ─── SAVE / LOAD ───
    const SAVE_KEY = 'maktaba_save_v4';
    function saveGame() {
      const snap = {
        budget: G.budget, satisfaction: G.satisfaction, quality: G.quality,
        collections: G.collections, score: G.score, day: G.day, month: G.month,
        year: G.year, level: G.level,
        libraryName: G.libraryName || 'مهندس المكتبة',
        mapCells: [...G.mapCells],
        staff: { ...G.staff },
        staffMorale: { ...G.staffMorale },
        staffServiceCount: { ...G.staffServiceCount },
        acqCounts: { ...G.acqCounts },
        pendingQualityGains: G.pendingQualityGains,
        totalServiced: G.totalServiced, totalRejected: G.totalRejected,
        crisisManaged: G.crisisManaged,
        achievements: { ...G.achievements },
        monthlyHistory: [...G.monthlyHistory],
        gameSpeed: G.gameSpeed,
        savedAt: new Date().toLocaleString('ar-EG')
      };
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
        showToast('💾 تم الحفظ: ' + snap.savedAt, 'success', 3000);
      } catch (e) {
        showToast('❌ فشل الحفظ!', 'error', 3000);
      }
    }
    function loadGame() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) { showToast('لا يوجد حفظ سابق', 'error', 3000); return; }
        const snap = JSON.parse(raw);
        Object.assign(G, {
          budget: snap.budget, satisfaction: snap.satisfaction, quality: snap.quality,
          collections: snap.collections, score: snap.score, day: snap.day, month: snap.month,
          year: snap.year, level: snap.level,
          libraryName: snap.libraryName || 'مهندس المكتبة',
          mapCells: [...snap.mapCells],
          staff: { ...snap.staff },
          staffMorale: { ...snap.staffMorale },
          staffServiceCount: { ...snap.staffServiceCount },
          acqCounts: { ...snap.acqCounts },
          pendingQualityGains: snap.pendingQualityGains || 0,
          totalServiced: snap.totalServiced, totalRejected: snap.totalRejected,
          crisisManaged: snap.crisisManaged || 0,
          achievements: { ...snap.achievements },
          monthlyHistory: [...snap.monthlyHistory],
          gameSpeed: snap.gameSpeed || 1
        });
        clearInterval(gameLoop);
        if (!paused) gameLoop = setInterval(gameTick, 1000 / G.gameSpeed);
        renderHUD(); renderMap(); renderHR(); renderAcquisition(); renderAnalytics(); renderAchievements(); renderQuestsWidget(); renderLeaderboard(); renderNowTask();
        showToast('📂 تم استعادة اللعبة من ' + snap.savedAt, 'success', 4000);
        addLog('success', `📂 تم تحميل لعبة محفوظة (يوم ${snap.day}/${snap.month}/${snap.year})`);
      } catch (e) {
        showToast('❌ خطأ في التحميل: ملف تالف', 'error', 3000);
      }
    }

    // Auto-save every 2 minutes
    setInterval(() => { if (!G.gameOver && !paused) saveGame(); }, 120000);


    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + tab).classList.add('active');
        if (tab === 'analytics') renderAnalytics();
        else if (tab === 'map') { renderMap(); }
        else if (tab === 'hr') renderHR();
        else if (tab === 'acquisition') renderAcquisition();
        // guide tab needs no render – static HTML
      });
    });

    // ─── SPEED ───
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        G.gameSpeed = parseInt(btn.dataset.speed);
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active-speed'));
        btn.classList.add('active-speed');
        clearInterval(gameLoop);
        if (!paused) gameLoop = setInterval(gameTick, 1000 / G.gameSpeed);
        showToast('السرعة: ×' + G.gameSpeed, 'info', 1500);
      });
    });

    // ─── PAUSE ───
    document.getElementById('pause-btn').addEventListener('click', () => {
      paused = !paused;
      document.getElementById('pause-btn').textContent = paused ? '▶ استمرار' : '⏸ إيقاف';
      if (paused) { clearInterval(gameLoop); showToast('⏸ اللعبة متوقفة', 'info', 2000); }
      else { gameLoop = setInterval(gameTick, 1000 / G.gameSpeed); showToast('▶ اللعبة مستمرة', 'success', 1500); }
    });

    // ─── SIDEBAR TAB SWITCHER ───
    let _unreadLog = 0, _activeSTab = 'log';
    function initSidebarTabs() {
      document.querySelectorAll('.stab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.dataset.stab;
          _activeSTab = tab;
          document.querySelectorAll('.stab-btn').forEach(b => b.classList.remove('stab-active'));
          document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('sp-active'));
          btn.classList.add('stab-active');
          document.getElementById('sp-' + tab).classList.add('sp-active');
          if (tab === 'log') { _unreadLog = 0; updateLogBadge(); }
        });
      });
    }
    function updateLogBadge() {
      const badge = document.getElementById('stab-log-badge');
      if (!badge) return;
      if (_unreadLog > 0 && _activeSTab !== 'log') {
        badge.textContent = _unreadLog > 99 ? '99+' : _unreadLog;
        badge.classList.add('visible');
      } else {
        badge.classList.remove('visible');
      }
    }
    function updateQuestsBadge() {
      const pending = QUESTS.filter(q => !q.done).length;
      const done = QUESTS.filter(q => q.done).length;
      const badge = document.getElementById('stab-quests-badge');
      const doneCount = document.getElementById('quests-done-count');
      if (badge) {
        badge.textContent = pending;
        if (pending > 0) badge.classList.add('visible'); else badge.classList.remove('visible');
      }
      if (doneCount) doneCount.textContent = done + '/' + QUESTS.length;
    }

    // ─── LOG FILTERS ───
    document.querySelectorAll('.log-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        G.currentFilter = btn.dataset.filter;
        document.querySelectorAll('.log-filter-btn').forEach(b => b.classList.remove('active-filter'));
        btn.classList.add('active-filter');
        renderLog();
      });
    });

    // ─── KEYBOARD ───
    document.addEventListener('keydown', e => {
      if (G.gameOver) return;
      if (e.key === '1') document.querySelector('[data-tab="map"]')?.click();
      else if (e.key === '2') document.querySelector('[data-tab="hr"]')?.click();
      else if (e.key === '3') document.querySelector('[data-tab="acquisition"]')?.click();
      else if (e.key === '4') document.querySelector('[data-tab="analytics"]')?.click();
      else if (e.key === '5') document.querySelector('[data-tab="guide"]')?.click();
      else if (e.key === 'Escape') { G.selectedSection = null; renderMSBSidebar(); document.querySelectorAll('.map-cell').forEach(c => c.classList.remove('build-target')); }
      else if (e.key === 'p' || e.key === 'P') document.getElementById('pause-btn').click();
    });

    // ─── WELCOME SCREEN ───
    function showWelcome() {
      const ov = document.createElement('div');
      ov.id = 'welcome-ov';
      ov.style.cssText = `position:fixed;inset:0;z-index:1000;background:rgba(8,15,26,.97);display:flex;align-items:center;justify-content:center;flex-direction:column;backdrop-filter:blur(20px);animation:fadeIn .5s ease`;
      ov.innerHTML = `
    <div style="text-align:center;max-width:540px;padding:20px">
      <div style="font-size:3.5rem;margin-bottom:14px">📖</div>
      <div style="font-size:1.5rem;font-weight:800;color:var(--brand);margin-bottom:7px">مهندس المكتبة</div>
      <div style="font-size:.9rem;color:var(--accent);font-weight:600;margin-bottom:18px">بناء مكتبة المستقبل | Library Tycoon v2</div>
      <div style="font-size:.78rem;color:var(--muted);line-height:1.9;margin-bottom:20px;background:var(--card);border:1px solid var(--border2);border-radius:12px;padding:14px;text-align:right">
        🗺️ الجديد في النسخة الثانية: خريطة مسقط حقيقية للمكتبة مع غرف يمكنك بناؤها في أماكن محددة.<br>
        👥 زوار حقيقيون يتجولون في المكتبة ويدخلون الغرف ويتفاعلون مع خدماتها.<br>
        🗂️ موظفوك يجلسون في مكاتبهم الفعلية ويظهرون على الخريطة بشكل مرئي.<br>
        ⚡ كل قرار له ثمن وأثر – فكّر قبل أن تُنفق!
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px">
        ${[['🗺️', 'خريطة حية', 'تصميم أقسام المكتبة'], ['👣', 'زوار متحركون', 'تفاعل حقيقي'], ['👤', 'موظفون فاعلون', 'يجلسون في أماكنهم'], ['⚡', 'أزمات مفاجئة', 'قرارات صعبة']].map(([i, t, d]) => `
        <div style="background:var(--card2);border:1px solid var(--border2);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:1.3rem">${i}</div>
          <div style="font-size:.65rem;color:var(--accent);font-weight:700;margin-top:3px">${t}</div>
          <div style="font-size:.58rem;color:var(--muted);margin-top:1px">${d}</div>
        </div>`).join('')}
      </div>
      <button id="start-btn" style="background:linear-gradient(135deg,var(--brand),#16a34a);color:#fff;border:none;border-radius:10px;padding:12px 36px;font-family:'Tajawal',sans-serif;font-size:.95rem;font-weight:800;cursor:pointer;box-shadow:0 0 28px rgba(34,197,94,.3)">
        🚀 ابدأ البناء الآن
      </button>
    </div>`;
      document.body.appendChild(ov);
      document.getElementById('start-btn').addEventListener('click', () => {
        ov.style.opacity = '0'; ov.style.transition = 'opacity .4s'; setTimeout(() => ov.remove(), 420);
      });
    }

    // ─── TUTORIAL TOOLTIP ───
    let tutorialStep = 0;
    const TUTORIAL_STEPS = [
      { target: '#tab-map', msg: '👈 ابدأ هنا — تبويب "خريطة المكتبة"', delay: 1500 },
      { target: '#msb-list', msg: '١. اختر "قسم الإعارة 📤" من هنا', delay: 3500 },
      { target: '#lib-map-canvas', msg: '٢. ثم انقر على أي خلية بالخريطة لتركيبه', delay: 6000 },
      { target: '#tab-hr', msg: '٣. بعدها اذهب لـ "الموارد البشرية" ووظّف مفهرساً', delay: 9000 },
    ];
    function showTutorialStep(step) {
      const existing = document.getElementById('tut-tip');
      if (existing) existing.remove();
      if (step >= TUTORIAL_STEPS.length) return;
      const s = TUTORIAL_STEPS[step];
      const target = document.querySelector(s.target);
      if (!target) return;
      const tip = document.createElement('div');
      tip.id = 'tut-tip';
      tip.style.cssText = `position:fixed;z-index:500;background:var(--brand);color:#000;font-family:'Tajawal',sans-serif;font-size:.75rem;font-weight:800;padding:8px 13px;border-radius:9px;box-shadow:0 0 20px rgba(34,197,94,.5);pointer-events:none;animation:fadeIn .3s ease;max-width:220px;text-align:center;line-height:1.5`;
      tip.textContent = s.msg;
      document.body.appendChild(tip);
      const rect = target.getBoundingClientRect();
      tip.style.top = Math.min(rect.bottom + 8, window.innerHeight - 60) + 'px';
      tip.style.left = Math.max(rect.left, 8) + 'px';
      setTimeout(() => { if (tip.parentNode) { tip.style.opacity = '0'; tip.style.transition = 'opacity .4s'; setTimeout(() => tip.remove(), 420); } }, 3000);
    }
    function runTutorial() {
      if (G.visitorsToday > 0 || G.mapCells.filter(Boolean).length > 2) return; // skip if already playing
      TUTORIAL_STEPS.forEach((_, i) => setTimeout(() => showTutorialStep(i), TUTORIAL_STEPS[i].delay));
    }

    // ─── BOOT ───
    window.addEventListener('DOMContentLoaded', () => {
      initVisitorLayer();
      initSidebarTabs();
      initGame();

      // Naming modal
      const namingOv = document.getElementById('naming-overlay');
      const namingInput = document.getElementById('naming-input');
      const namingBtn = document.getElementById('naming-start-btn');
      function startWithName() {
        const name = (namingInput.value.trim()) || 'مكتبة المستقبل';
        G.libraryName = name;
        const lnEl = document.getElementById('hdr-libname');
        if (lnEl) lnEl.textContent = name;
        addLog('success', `🏛️ مرحباً في "${name}"! ابدأ بتركيب قسم الإعارة وتوظيف مفهرس.`, true);
        namingOv.style.opacity = '0'; namingOv.style.transition = 'opacity .4s';
        setTimeout(() => { namingOv.style.display = 'none'; showWelcome(); runTutorial(); }, 420);
      }
      namingBtn.addEventListener('click', startWithName);
      namingInput.addEventListener('keydown', e => { if (e.key === 'Enter') startWithName(); });

      rotateTip();
      setInterval(rotateTip, 8000);
      setInterval(rotateFooter, 3500);
      setInterval(renderLeaderboard, 5000);
      setTimeout(() => showToast('⌨️ اختصارات: 1-5 تبويبات | P إيقاف | S حفظ | L تحميل | Esc إلغاء', 'info', 6000), 12000);
      // Save / Load buttons
      document.getElementById('save-btn').addEventListener('click', saveGame);
      document.getElementById('load-btn').addEventListener('click', () => {
        if (G.score > 0) {
          const ok = confirm('📂 تحميل اللعبة المحفوظة؟\nسيتم استبدال التقدم الحالي.');
          if (!ok) return;
        }
        loadGame();
      });
      // Keyboard shortcut: S = save, L = load
      document.addEventListener('keydown', e => {
        if (G.gameOver) return;
        if (e.key === 's' || e.key === 'S') saveGame();
        if (e.key === 'l' || e.key === 'L') loadGame();
      });
    });
;
/* Original inline script block 2 */
    // تحديث لوحة الشرف
    document.addEventListener('DOMContentLoaded', async () => {
      const leaderboard = await window.maktabaAuth.getLeaderboard();
      const tbody = document.getElementById('leaderboardBody');

      if (leaderboard.length > 0) {
        tbody.innerHTML = '';
        leaderboard.slice(0, 5).forEach((entry, index) => {
          let rankClass = 'rank-other';
          if (index === 0) rankClass = 'rank-1';
          else if (index === 1) rankClass = 'rank-2';
          else if (index === 2) rankClass = 'rank-3';

          const rankBadge = `<span class="rank-badge ${rankClass}">${index + 1}</span>`;

          tbody.innerHTML += `
                        <tr>
                            <td>${rankBadge}</td>
                            <td style="font-weight: bold; color: white;">${entry.username}</td>
                            <td style="color: var(--accent2); font-weight: 800;">${entry.score} ⭐</td>
                        </tr>
                    `;
        });
      }
    });
;
/* Original inline script block 3 */
  MPGame.init({
    id: 'tycoon',
    title: 'مهندس المكتبة',
    icon: '🏛️',
    field: 'الإدارة والتخطيط',
    tagline: 'من مكتبة مدرسية صغيرة إلى مكتبة وطنية — قراراتك تبني أو تُنهي.',
    intro: 'أدر الميزانية التشغيلية والرأسمالية، وسّع المجموعات، وظّف الموظفين، وواجه الأزمات. كل قرار له أثر تراكمي على الجودة ورضا المستفيدين.',
    defaultLevel: 2,
    levels: [
      { id: 1, label: 'مبتدئ', desc: 'ميزانية مريحة وأزمات أقل' },
      { id: 2, label: 'متوسط', desc: 'توازن الكلفة والخدمة' },
      { id: 3, label: 'متقدم', desc: 'ضغط مالي وأزمات واقعية' }
    ],
    getStatus: () => (window.G ? [
      { label: 'النقاط', value: G.score },
      { label: 'الشهر', value: G.month },
      { label: 'الميزانية', value: Math.round(G.budget) }
    ] : []),
    onPlay: function (opts) {
      const lvl = (opts && opts.level) || 2;
      setTimeout(function () {
        try {
          if (typeof G === 'undefined') return;
          G.budget = lvl === 1 ? 14000 : lvl === 3 ? 7500 : 10000;
          G.satisfaction = lvl === 1 ? 80 : lvl === 3 ? 60 : 70;
          if (typeof renderHUD === 'function') renderHUD();
        } catch (e) { }
      }, 80);
    },
    onRestart: function () {
      const b = document.getElementById('restart-btn');
      if (b) b.click(); else location.reload();
    }
  });
;
/* Original inline script block 4 */
  if (window.ML) {
    ML.tutorial({
      game: 'tycoon',
      title: '🏛️ مهندس المكتبة — أدر مكتبتك',
      subtitle: 'قرارات إدارية بنتائج منطقية في الميزانية والمجموعات والموظفين والخدمات',
      goal: 'إدارة مكتبة متكاملة: تنمية المجموعات، الموظفون، الخدمات، والميزانية، مع مواجهة الأزمات الواقعية.',
      rules: [
        'الميزانية نوعان: تشغيلية (رواتب وصيانة واشتراكات) ورأسمالية (مبانٍ وأثاث وأنظمة جديدة) — لا تُخلط بينهما.',
        'كل قرار اقتناء أو استبعاد أو تدريب يغيّر جودة الخدمة ورضا المستفيد على المدى الطويل.',
        'الأزمات (تعطل النظام، تلف المخطوطات، نقص التمويل، تسريب بيانات) تتطلب استجابة تتناسب مع خطورتها.',
        'الاستبعاد ليس إتلافًا عشوائيًا: يُبنى على معايير الاستخدام والتقادم وحالة المادة.'
      ],
      controls: 'الفأرة أو اللمس للتنقل بين الأقسام واتخاذ القرارات.',
      concepts: ['تنمية المجموعات', 'الاستبعاد', 'الميزانية التشغيلية والرأسمالية', 'خدمات المستفيدين', 'الحفظ والصون'],
      onStart: function () { }
    });
  }

  window.MPHowTo && MPHowTo.init('tycoon');