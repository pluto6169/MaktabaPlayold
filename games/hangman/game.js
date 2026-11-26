// ========== كود اللعبة (بدون auth.js) ==========
(function(){
"use strict";

const adminMode = new URLSearchParams(location.search).get('admin') === '1';
if(adminMode) document.documentElement.classList.add('hangman-admin');
if (!window.MPUtils || !window.MPStorage || !window.MPEndScreen || !window.MPSfx) {
  throw new Error('Hangman requires MPUtils, MPStorage, MPEndScreen, and MPSfx.');
}

let data = {
  questions: [
    { word:'الفهرسة', category:'الفهرسة', difficulty:'easy', hint:'عملية وصف الوثيقة ببياناتها الببليوغرافية', hint2:'تشمل التأليف والعنوان والناشر والسنة', hint3:'تنقسم إلى وصفية وموضوعية' },
    { word:'مارك', category:'الفهرسة', difficulty:'medium', hint:'نظام قرأة الحاسوب للتسجيلات الببليوغرافية', hint2:'اختصار Machine-Readable Cataloging', hint3:'طورته مكتبة الكونجرس في الستينيات' },
    { word:'الرقم الدولي', category:'الفهرسة', difficulty:'medium', hint:'معرّف فريد للكتاب مكوّن من 13 رقماً', hint2:'ISBN اختصاره الأجنبي', hint3:'يُطبع عادةً على الغلاف الخلفي للكتاب' },
    { word:'فيبيد', category:'الفهرسة', difficulty:'hard', hint:'قائمة موحدة لرؤوس الموضوعات مكتبة الكونجرس', hint2:'LCSH بالإنجليزية', hint3:'تستخدم لتحديد موضوعات الوثائق توحيداً' },
    { word:'الببليوغرافيا', category:'الببليوغرافيا', difficulty:'medium', hint:'قائمة بمصادر حول موضوع ما', hint2:'تكون وطنية أو موضوعية أو شاملة', hint3:'تشمل بيانات الاستشهاد المرجعي الكامل' },
    { word:'التصنيف', category:'التصنيف', difficulty:'easy', hint:'ترتيب الكتب في مجموعات وفق موضوعاتها', hint2:'يتيح التجاور الموضوعي على الرفوف', hint3:'أشهر نظامين: ديوي والكونجرس' },
    { word:'ديوي', category:'التصنيف', difficulty:'easy', hint:'نظام التصنيف العشري الأشهر في العالم', hint2:'ابتكره ميلفيل ديوي عام 1876', hint3:'يقسم المعرفة إلى 10 فئات رئيسية' },
    { word:'التصنيف العالمي', category:'التصنيف', difficulty:'hard', hint:'نظام يرمز له بـ UDC ويعتمد الأرقام والرموز', hint2:'مشتق من تصنيف ديوي مع توسعات', hint3:'يُستخدم كثيراً في المكتبات العلمية الأوروبية' },
    { word:'الرقم التصنيفي', category:'التصنيف', difficulty:'medium', hint:'الرمز الذي يُخصص لكل كتاب في النظام', hint2:'يحدد موضع الكتاب على الرف', hint3:'يجمع بين حروف وأرقام عادةً' },
    { word:'التكشيف', category:'التكشيف', difficulty:'medium', hint:'تحليل محتوى الوثيقة واستخراج مصطلحاتها', hint2:'يُنتج مداخل لنظم الاسترجاع', hint3:'يقسم إلى مفهومي ودلالي' },
    { word:'الكشاف', category:'التكشيف', difficulty:'medium', hint:'دليل يرشد للمواضع الواردة في الوثيقة', hint2:'يكون في نهاية الكتاب أو مستقلاً', hint3:'يشمل المصطلحات الرئيسية وأرقام صفحاتها' },
    { word:'المصطلح الدال', category:'التكشيف', difficulty:'hard', hint:'الكلمة التي تعبر عن مفهوم في نظام التكشيف', hint2:'يسمى Descriptor بالإنجليزية', hint3:'يُستخدم في قواعد البيانات البيبليوغرافية' },
    { word:'الثيسوروس', category:'التكشيف', difficulty:'hard', hint:'أداة ضبط استخدام المصطلحات في التكشيف', hint2:'يُظهر علاقات التكافؤ والتراتب والترابط', hint3:'من أشهره ERIC في مجال التربية' },
    { word:'الاستخلاص', category:'الاستخلاص', difficulty:'medium', hint:'تقليص وثيقة إلى ملخص موجز', hint2:'يُسهّل الحكم على أهمية الوثيقة', hint3:'أنواعه: إعلامي وإرشادي ونقدي' },
    { word:'الملخص الإعلامي', category:'الاستخلاص', difficulty:'hard', hint:'نوع يعرض النتائج والمعطيات الرئيسية', hint2:'يُغني غالباً عن قراءة الوثيقة الأصل', hint3:'يُستخدم في الأبحاث العلمية والتقنية' },
    { word:'الخلاصة التحليلية', category:'الاستخلاص', difficulty:'hard', hint:'ملخص يتضمن تقييم الوثيقة ونقدها', hint2:'أقل شيوعاً من الإعلامي والإرشادي', hint3:'يتطلب خبرة موضوعية من المُخلِّص' },
    { word:'المخطوط', category:'المخطوطات', difficulty:'easy', hint:'كتاب مكتوب بخط اليد قبل الطباعة', hint2:'يدرسه علم الكوديكولوجيا', hint3:'تمتلك مصر مئات الآلاف منه' },
    { word:'التحقيق', category:'المخطوطات', difficulty:'medium', hint:'دراسة النص المخطوط ونقده وإصداره', hint2:'يشمل المقارنة بين النسخ المختلفة', hint3:'ينتهي بطبعة انتقادية محققة' },
    { word:'الكولوفون', category:'المخطوطات', difficulty:'hard', hint:'معلومات في نهاية المخطوط عن الناسخ والتاريخ', hint2:'يساعد في تأريخ المخطوط ومعرفة ناسخه', hint3:'كلمة يونانية تعني "الفطرة النهائية"' },
    { word:'الوراقة', category:'المخطوطات', difficulty:'hard', hint:'حرفة النسخ والتصحيح والتجليد عند العرب', hint2:'مزجت بين الصناعة والعلم والتجارة', hint3:'ارتبطت بازدهار الحضارة العربية الإسلامية' },
    { word:'الترميم', category:'الحفظ والصون', difficulty:'medium', hint:'إعادة الوثيقة التالفة إلى حالتها الأصلية', hint2:'يختلف عن التجديد والتحويل الرقمي', hint3:'يتطلب مواد وكيماويات خاصة' },
    { word:'الرقمنة', category:'الرقمنة', difficulty:'easy', hint:'تحويل المواد الورقية إلى صيغة رقمية', hint2:'تتيح الوصول البعيد للمجموعات', hint3:'تساعد في الحفظ والصون على المدى الطويل' },
    { word:'الإعارة', category:'خدمات المعلومات', difficulty:'easy', hint:'إتاحة الكتب للمستفيدين مؤقتاً', hint2:'تكون داخلية وخارجية وبين المكتبات', hint3:'من أقدم وأهم خدمات المكتبة' },
    { word:'الببليوجرافي', category:'الببليوغرافيا', difficulty:'medium', hint:'الشخص المتخصص في إعداد القوائم المرجعية', hint2:'يتمتع بمعرفة واسعة بأدبيات الموضوع', hint3:'يعمل في مراكز المعلومات الوطنية' },
    { word:'الاسترجاع', category:'خدمات المعلومات', difficulty:'medium', hint:'عملية الحصول على المعلومات من مصادرها', hint2:'يرتبط بفعالية نظام التكشيف والتصنيف', hint3:'يُقاس بالدقة والشمول' },
    { word:'الحاجة المعلوماتية', category:'خدمات المعلومات', difficulty:'hard', hint:'الفجوة بين ما يعرفه المستفيد وما يحتاجه', hint2:'تحديدها هو الخطوة الأولى في خدمة المرجع', hint3:'يصعب صياغتها في استعلام بحثي أحياناً' }
  ],
  gameHistory:[],
  stats:{ gamesPlayed:0, gamesWon:0 },
  streak:0
};

const SVG_PARTS = ['svg-head','svg-body','svg-larm','svg-rarm','svg-lleg','svg-rleg'];
const arabicLetters = 'ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي ء أ إ آ ؤ ئ ة ى'.split(' ');
function normalizedLetter(value){
  const normalized = window.MPUtils.normalizeArabic(value);
  return /^[\u0621-\u064A]$/.test(normalized) ? normalized : '';
}
function wordLetterKeys(word){
  return Array.from(word || '').map(normalizedLetter).filter(Boolean);
}
function isGameModalOpen(){
  return Boolean(document.querySelector('.mp-overlay[aria-modal="true"], .hangman-modal.show, .auth-modal-overlay.show, [role="dialog"][aria-modal="true"]'));
}
const contentData = `<div class="content-section"><h3>📘 الفهرسة الوصفية</h3><p><strong>تعريفها:</strong> وصف الوثيقة وصفاً ببليوغرافياً دقيقاً يشمل العنوان والمؤلف والناشر وبيانات الطبعة والحجم.</p><p><strong>نظام MARC:</strong> نظام "قرأة الحاسوب للتسجيلات الببليوغرافية" الذي طورته مكتبة الكونجرس ليتيح تبادل البيانات بين المكتبات إلكترونياً.</p><p><strong>ISBD:</strong> الوصف الببليوغرافي المتدول المعياري، وهو قواعد دولية موحدة لوصف أوعية المعلومات المختلفة.</p></div><div class="content-section"><h3>🔢 نظم التصنيف</h3><p><strong>تصنيف ديوي العشري (DDC):</strong> ابتكره ميلفيل ديوي عام 1876، يقسّم المعرفة إلى 10 فئات رئيسية (000–900) وينقسم كل منها إلى 10 أقسام فرعية.</p><p><strong>التصنيف العالمي للمعلومات (UDC):</strong> مشتق من نظام ديوي مع إضافة رموز لاحقة لتفصيل الموضوع، ويشيع في المكتبات العلمية والتقنية.</p><p><strong>تصنيف الكونجرس (LC):</strong> يعتمد الحروف والأرقام، ويُستخدم في المكتبات الجامعية الكبرى.</p></div><div class="content-section"><h3>🔍 التكشيف والاستخلاص</h3><p><strong>التكشيف:</strong> تحليل محتوى الوثيقة واستخراج مصطلحاتها الدالة لتمثيلها في نظام الاسترجاع. يُعتمد الثيسوروس أداةً لضبط المصطلحات.</p><p><strong>الاستخلاص:</strong> إعداد ملخص موجز للوثيقة؛ الإعلامي يعرض النتائج، والإرشادي يصف محتوى الوثيقة دون تفصيل البيانات.</p></div><div class="content-section"><h3>📜 المخطوطات</h3><p><strong>الكوديكولوجيا:</strong> علم دراسة المخطوط كوعاء مادي (الورق، الحبر، التجليد، الزخرفة).</p><p><strong>تحقيق المخطوطات:</strong> منهج علمي لجمع نسخ المخطوط ومقارنتها وإخراج نص محقق موثوق.</p><p><strong>الكولوفون:</strong> ما يدونه الناسخ في نهاية المخطوط من اسمه وتاريخ الفراغ ومكانه.</p></div><div class="content-section"><h3>💾 الرقمنة والحفظ</h3><p><strong>الرقمنة:</strong> تحويل المجموعات المادية إلى صيغة رقمية لتوسيع نطاق الوصول وضمان الحفظ على المدى البعيد.</p><p><strong>الترميم:</strong> إعادة المواد التالفة إلى حالتها الأصلية باستخدام مواد وتقنيات متخصصة.</p></div>`;

const sections = document.querySelectorAll('.hangman-section');
const navItems = document.querySelectorAll('.hangman-nav-item');
const confirmModal = document.getElementById('confirmModal');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const confirmBtn = document.getElementById('confirmBtn');
const addQuestionForm = document.getElementById('addQuestionForm');

function closeModal(){ confirmModal.classList.remove('show'); }
window.closeModal = closeModal;

function getDifficultyText(d){ return {easy:'سهل',medium:'متوسط',hard:'صعب'}[d]||'-'; }

function updateDashboard(){
  document.getElementById('totalQuestions').textContent = Array.isArray(data.questions) ? data.questions.length : 0;
  document.getElementById('gamesPlayed').textContent = data.stats.gamesPlayed;
  document.getElementById('gamesWon').textContent = data.stats.gamesWon;
  const rate = data.stats.gamesPlayed ? Math.round((data.stats.gamesWon/data.stats.gamesPlayed)*100) : 0;
  document.getElementById('winRate').textContent = rate+'%';
}

function updateStats(){
  document.getElementById('statsTotal').textContent = data.stats.gamesPlayed;
  document.getElementById('statsWon').textContent = data.stats.gamesWon;
  document.getElementById('statsLost').textContent = data.stats.gamesPlayed - data.stats.gamesWon;
  const ht = document.getElementById('historyTable');
  if(!ht) return;
  if(!data.gameHistory.length){ ht.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--muted)">لا توجد جولات بعد</td></tr>'; return; }
  ht.innerHTML = data.gameHistory.slice().reverse().map((h,i)=>`<tr><td>${i+1}</td><td>${h.word}</td><td>${h.won?'✅':'❌'}</td><td>${h.errors}</td><td>${h.time}</td></tr>`).join('');
}

function renderQuestionsTable(){
  const qt = document.getElementById('questionsTable');
  if(!qt) return;
  if(!data.questions.length){ qt.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--muted)">لا توجد أسئلة</td></tr>'; return; }
  qt.innerHTML = data.questions.map((q,i)=>`<tr>
    <td>${i+1}</td>
    <td><strong style="color:white;">${q.word}</strong></td>
    <td><span class="difficulty-badge" style="background:rgba(6,182,212,0.1);color:var(--brand-2);">${q.category}</span></td>
    <td><span class="difficulty ${q.difficulty}">${getDifficultyText(q.difficulty)}</span></td>
    <td style="font-size:13px;color:var(--muted);">${q.hint}</td>
    <td><button class="hangman-btn hangman-btn-secondary" style="padding:6px 12px;" data-index="${i}">🗑️</button></td>
  </tr>`).join('');
  qt.querySelectorAll('button[data-index]').forEach(btn=>{
    btn.addEventListener('click',function(){
      const idx = parseInt(this.dataset.index);
      confirmTitle.textContent='تأكيد الحذف';
      confirmMessage.textContent=`هل أنت متأكد من حذف "${data.questions[idx].word}"؟`;
      confirmBtn.onclick=()=>{ 
        data.questions.splice(idx,1); 
        closeModal(); 
        renderQuestionsTable(); 
        updateDashboard();
        if(game && !game.gameOver) game.reset(); 
      };
      confirmModal.classList.add('show');
    });
  });
}

if(addQuestionForm){
  addQuestionForm.addEventListener('submit',function(e){
    e.preventDefault();
    const word=document.getElementById('newWord').value.trim();
    const cat=document.getElementById('newCategory').value;
    const diff=document.getElementById('newDifficulty').value;
    const hint=document.getElementById('newHint').value.trim();
    const hint2=document.getElementById('newHint2').value.trim();
    const hint3=document.getElementById('newHint3').value.trim();
    if(!word||!cat||!diff||!hint){ alert('⚠️ الرجاء ملء الحقول الإلزامية'); return; }
    data.questions.push({word,category:cat,difficulty:diff,hint,hint2:hint2||null,hint3:hint3||null});
    this.reset();
    alert('✅ تمت إضافة السؤال بنجاح');
    updateDashboard();
    if(game && !game.gameOver) game.reset();
  });
}

document.getElementById('exportBtn')?.addEventListener('click',()=>{
  if(!data.questions.length){ alert('لا توجد أسئلة للتصدير'); return; }
  const csv='الكلمة,الفئة,الصعوبة,التلميح\n'+data.questions.map(q=>`"${q.word}","${q.category}","${getDifficultyText(q.difficulty)}","${q.hint}"`).join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  a.download='questions.csv';
  a.click();
});

document.getElementById('clearHistoryBtn')?.addEventListener('click',()=>{
  if(confirm('هل تريد مسح جميع السجلات؟')){ data.gameHistory=[]; data.stats={gamesPlayed:0,gamesWon:0}; data.streak=0; updateStats(); updateDashboard(); if(game) game.reset(); }
});

function launchConfetti(){
  const colors=['#22c55e','#06b6d4','#f59e0b','#a78bfa','#fb7185'];
  for(let i=0;i<60;i++){
    const el=document.createElement('div');
    el.className='confetti-piece';
    el.style.cssText=`left:${Math.random()*100}vw;background:${colors[~~(Math.random()*colors.length)]};width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;border-radius:${Math.random()>0.5?'50%':'2px'};animation-duration:${1.2+Math.random()*1.5}s;animation-delay:${Math.random()*0.5}s;`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 3500);
  }
}
function launchFirework(x,y){
  const fw=document.createElement('div'); fw.className='firework'; fw.style.cssText=`left:${x}px;top:${y}px;`;
  const colors=['#22c55e','#06b6d4','#f59e0b','#a78bfa'];
  for(let i=0;i<12;i++){
    const s=document.createElement('div'); s.className='spark';
    const angle=(i/12)*360; const dist=40+Math.random()*30; const rad=angle*(Math.PI/180);
    s.style.cssText=`background:${colors[~~(Math.random()*colors.length)]};--tx:${Math.cos(rad)*dist}px;--ty:${Math.sin(rad)*dist}px;animation-delay:${Math.random()*0.1}s;`;
    fw.appendChild(s);
  }
  document.body.appendChild(fw);
  setTimeout(()=>fw.remove(),1200);
}

class HangmanGame {
  constructor(){
    this.timer=null;
    this.timeLeft=60;
    this.timerDuration=60;
    this.hintsShown=0;
    this.hintPenalty=0;
    this.gameOver=true;
    this.won=false;
    this.diffLevel=2;
    this.guessedLetters=new Set();
    this.wrongGuesses=new Set();
    this.resultRecorded=false;
  }

  reset(){
    if(!data.questions.length){ 
      alert('⚠️ لا توجد أسئلة! أضف سؤالاً أولاً.');
      this.gameOver=true;
      return; 
    }
    clearInterval(this.timer);
    let pool = data.questions;
    if (this.diffLevel && pool.length) {
      const want = this.diffLevel === 3 ? 'hard' : this.diffLevel === 1 ? 'easy' : 'medium';
      const filtered = pool.filter(q => q.difficulty === want);
      if (filtered.length) pool = filtered;
    }
    this.currentQuestion = pool[Math.floor(Math.random()*pool.length)];
    this.word = this.currentQuestion.word;
    this.guessedLetters = new Set();
    this.wrongGuesses = new Set();
    this.gameOver = false;
    this.won = false;
    this.hintsShown = 0;
    this.hintPenalty = 0;
    this.resultRecorded = false;
    this.timerDuration = 30 + 6 * wordLetterKeys(this.word).length;
    this.timeLeft = this.timerDuration;
    this.startTimer();
    this.render();
  }

  startTimer(){
    clearInterval(this.timer);
    this.timer = setInterval(()=>{
      if(this.gameOver) return;
      this.timeLeft--;
      const bar = document.getElementById('timerBar');
      const disp = document.getElementById('timerDisplay');
      if(disp) disp.textContent = this.timeLeft;
      if(bar){
        const pct = (this.timeLeft/this.timerDuration)*100;
        bar.style.width = pct+'%';
        bar.className = 'timer-bar' + (pct<30?' danger':pct<60?' warning':'');
      }
      if(this.timeLeft<=0 && !this.gameOver){
        this.finishRound(false);
      }
    },1000);
  }

  guess(letter){
    const key = normalizedLetter(letter);
    if(this.gameOver || !key || this.guessedLetters.has(key)) return;
    this.guessedLetters.add(key);
    const matches = wordLetterKeys(this.word).includes(key);
    if(!matches){
      this.wrongGuesses.add(key);
      this.updateSVG();
      window.MPSfx.play('wrong');
    } else {
      window.MPSfx.play('correct');
      this.animateRevealedLetters(key);
    }
    this.renderLetters();
    this.checkGameState();
    this.renderStatus();
  }

  animateRevealedLetters(letter){
    document.querySelectorAll('.word-letter[data-normalized-char]').forEach(el=>{
      if(el.dataset.normalizedChar !== letter) return;
      el.classList.remove('hidden');
      el.classList.add('revealed');
      setTimeout(()=>el.classList.remove('revealed'),600);
    });
  }

  attemptsUsed(){
    return this.wrongGuesses.size + this.hintPenalty;
  }

  remainingAttempts(){
    return Math.max(0, 6 - this.attemptsUsed());
  }

  updateSVG(){
    const n = Math.min(SVG_PARTS.length, this.attemptsUsed());
    SVG_PARTS.forEach((id,i)=>{
      const el=document.getElementById(id);
      if(!el) return;
      if(i<n){ el.setAttribute('opacity','1'); el.setAttribute('stroke', i>=4?'#ef4444':'#06b6d4'); }
      else el.setAttribute('opacity','0');
    });
    const svg=document.getElementById('hangmanSVG');
    if(svg){ svg.style.transform='translateX(-4px)'; setTimeout(()=>svg.style.transform='',200); }
  }

  checkGameState(){
    const keys = wordLetterKeys(this.word);
    const isWon = keys.every(letter => this.guessedLetters.has(letter));
    const isLost = this.remainingAttempts() <= 0;
    if(isWon || isLost) this.finishRound(isWon);
  }

  finishRound(won){
    if(this.gameOver) return;
    clearInterval(this.timer);
    this.gameOver=true;
    this.won=won;
    if(this.won){
      launchConfetti();
      setTimeout(()=>launchFirework(window.innerWidth/2,window.innerHeight/3),200);
      data.streak=(data.streak||0)+1;
      window.MPSfx.play('win');
    } else {
      data.streak=0;
      window.MPSfx.play('lose');
    }
    document.getElementById('streakCount').textContent = data.streak;
    this.render();
    this.recordGame();
  }

  recordGame(){
    if(this.resultRecorded) return;
    this.resultRecorded=true;
    data.gameHistory.push({ word:this.word, won:this.won, errors:this.attemptsUsed(), time:new Date().toLocaleTimeString('ar-EG') });
    data.stats.gamesPlayed++;
    if(this.won) data.stats.gamesWon++;
    updateDashboard();
    const roundScore = this.won ? Math.max(0, 100 - this.wrongGuesses.size * 10 - this.hintPenalty * 5) : 0;
    const stored = window.MPStorage.saveResult('hangman', {
      score: roundScore,
      correct: this.won ? 1 : 0,
      total: 1,
      durationSec: Math.max(0, this.timerDuration - this.timeLeft)
    });
    const term = this.getTermDetails(this.currentQuestion);
    if(window.ML){
      const lvl = this.currentQuestion.difficulty === 'hard' ? 3 : this.currentQuestion.difficulty === 'medium' ? 2 : 1;
      ML.progress.record('hangman', { score: roundScore, correct: this.won ? 1 : 0, total: 1, level: lvl });
      if(!this.won) ML.review.add('hangman', { key: this.word, concept: this.currentQuestion.category + ' — ' + this.word, why: this.currentQuestion.hint });
    }
    window.MPEndScreen.show({
      gameId: 'hangman',
      score: roundScore,
      correct: this.won ? 1 : 0,
      total: 1,
      newBest: stored.newBest,
      newBadges: stored.newBadges,
      reviewList: this.won ? [] : [{ word: this.word, why: this.currentQuestion.hint }],
      details: { word: this.word, definition: term.definition, source: term.source },
      onReplay: () => this.reset()
    });
  }

  showHint(){
    if(this.gameOver) return;
    const nextLevel = this.hintsShown + 1;
    if(nextLevel > 3) return;
    if(nextLevel === 2 && this.remainingAttempts() < 1) {
      this.showHintMessage('لا توجد محاولة كافية للتلميح الثاني.');
      return;
    }
    if(nextLevel === 3 && this.remainingAttempts() < 2) {
      this.showHintMessage('تحتاج إلى محاولتين للتلميح الثالث.');
      return;
    }

    if(nextLevel === 1){
      this.hintsShown=1;
      this.addHintCard(1, this.currentQuestion.hint);
    } else if(nextLevel === 2){
      this.hintPenalty++;
      this.hintsShown=2;
      this.addHintCard(2, this.currentQuestion.hint2 || this.currentQuestion.hint3 || 'لا يوجد تلميح إضافي.');
      this.updateSVG();
      this.renderStatus();
      this.checkGameState();
    } else {
      const unrevealed = Array.from(new Set(wordLetterKeys(this.word))).filter(letter => !this.guessedLetters.has(letter));
      if(!unrevealed.length) return;
      const letter = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      this.hintPenalty += 2;
      this.hintsShown=3;
      this.guessedLetters.add(letter);
      this.addHintCard(3, `كُشف لك الحرف: ${letter}`);
      this.updateSVG();
      this.renderLetters();
      this.animateRevealedLetters(letter);
      this.renderStatus();
      this.checkGameState();
    }
    if(!this.gameOver) window.MPSfx.play('click');
  }

  addHintCard(level, text){
    const container=document.getElementById('progressiveHints');
    if(!container) return;
    const labels=['التلميح الأول — مجاني','التلميح الثاني — يكلف محاولة','التلميح الثالث — يكلف محاولتين'];
    const div=document.createElement('div');
    div.className='prog-hint';
    const number=document.createElement('span');
    number.className='ph-num';
    number.textContent=labels[level-1];
    const content=document.createElement('span');
    content.className='ph-text';
    content.textContent=text;
    div.append(number, content);
    container.appendChild(div);
    requestAnimationFrame(()=>{ requestAnimationFrame(()=>div.classList.add('visible')); });
  }

  showHintMessage(text){
    const message=document.getElementById('gameMessage');
    if(message) message.textContent=text;
  }

  getTermDetails(question){
    const map = {
      'الفهرسة':'cataloging','مارك':'marc21','الرقم الدولي':'std-isbn','فيبيد':'lcsh-heading',
      'الببليوغرافيا':'bibliography','التصنيف':'classification','ديوي':'ddc',
      'التصنيف العالمي':'udc','الرقم التصنيفي':'class-number','التكشيف':'indexing',
      'الكشاف':'kwic','المصطلح الدال':'descriptor','الثيسوروس':'thesaurus',
      'الاستخلاص':'abstract','الملخص الإعلامي':'abstract','الخلاصة التحليلية':'abstract',
      'المخطوط':'manuscript','التحقيق':'manuscript-editing','الكولوفون':'colophon',
      'الوراقة':'wiraqa','الترميم':'conservation','الرقمنة':'digitization',
      'الإعارة':'ill','الببليوجرافي':'bibliography','الاسترجاع':'retrieval',
      'الحاجة المعلوماتية':'information-need'
    };
    const term = window.LIBRARY_TERM_BY_ID && window.LIBRARY_TERM_BY_ID[map[question.word]]
      || (window.LIBRARY_TERMS || []).find(item =>
        window.MPUtils.normalizeArabic(item.ar).replace(/\s/g, '') === window.MPUtils.normalizeArabic(question.word).replace(/\s/g, '')
      );
    if(!term || !term.def) {
      console.warn(`No library-term definition found for Hangman term: ${question.word}`);
    }
    return {
      definition: term && term.def || 'لا يتوفر تعريف لهذا المصطلح بعد.',
      source: term && term.src || 'لا يتوفر مصدر لهذا المصطلح بعد.'
    };
  }

  renderStatus(){
    const rem=document.getElementById('remaining');
    const wrg=document.getElementById('wrong');
    if(rem) rem.textContent=this.remainingAttempts();
    if(wrg) wrg.textContent=this.wrongGuesses.size;
  }

  render(){
    if(!this.word) return;
    SVG_PARTS.forEach(id=>{ const el=document.getElementById(id); if(el) el.setAttribute('opacity','0'); });
    const wordEl=document.getElementById('word');
    if(wordEl){
      wordEl.replaceChildren();
      Array.from(this.word).forEach(character=>{
        const key=normalizedLetter(character);
        const span=document.createElement('span');
        span.className='word-letter';
        if(key){
          span.dataset.normalizedChar=key;
          if(!this.guessedLetters.has(key) && !(this.gameOver && !this.won)) span.classList.add('hidden');
        } else {
          span.classList.add('word-space');
        }
        span.textContent=character;
        wordEl.appendChild(span);
      });
    }
    const catEl=document.getElementById('gameCategory');
    const diffEl=document.getElementById('gameDifficulty');
    if(catEl) catEl.textContent=this.currentQuestion.category;
    if(diffEl) diffEl.innerHTML=`<span class="difficulty ${this.currentQuestion.difficulty}">${getDifficultyText(this.currentQuestion.difficulty)}</span>`;
    this.renderStatus();
    const msgEl=document.getElementById('gameMessage');
    if(msgEl){ msgEl.textContent=''; msgEl.className=''; }
    const phEl=document.getElementById('progressiveHints');
    if(phEl) phEl.replaceChildren();
    const hintBox=document.getElementById('hintBox');
    if(hintBox) hintBox.classList.remove('show');
    document.getElementById('streakCount').textContent = data.streak||0;
    const bar=document.getElementById('timerBar'); const disp=document.getElementById('timerDisplay');
    if(bar){ bar.style.width='100%'; bar.className='timer-bar'; }
    if(disp) disp.textContent=this.gameOver ? this.timeLeft : this.timerDuration;
    this.renderLetters();
    this.updateSVG();
  }

  renderLetters(){
    const container=document.getElementById('letters');
    if(!container) return;
    container.innerHTML='';
    arabicLetters.forEach(letter=>{
      const key=normalizedLetter(letter);
      const btn=document.createElement('button');
      btn.type='button';
      btn.textContent=letter;
      btn.dataset.letter=letter;
      btn.className='hangman-letter-btn';
      btn.disabled=this.gameOver;
      if(this.guessedLetters.has(key)){
        btn.disabled=true;
        btn.classList.add(this.wrongGuesses.has(key)?'wrong':'correct');
      }
      btn.addEventListener('click',()=>this.guess(letter));
      container.appendChild(btn);
    });
  }
}

function showPage(pageId){
  if(!adminMode && pageId !== 'game') return;
  const section = document.getElementById(pageId);
  if(!section) return;
  sections.forEach(s=>s.classList.remove('active'));
  section.classList.add('active');
  navItems.forEach(i=>i.classList.remove('active'));
  const an = Array.from(navItems).find(i=>i.dataset.page===pageId);
  if(an) an.classList.add('active');
  if(pageId==='questions') renderQuestionsTable();
  else if(pageId==='results') updateStats();
  else if(pageId==='content') document.getElementById('contentContainer').innerHTML = contentData;
}

const game = new HangmanGame();
document.getElementById('hintBtn')?.addEventListener('click',()=>game.showHint());
document.getElementById('resetGameBtn')?.addEventListener('click',()=>game.reset());
document.addEventListener('keydown',event=>{
  if(isGameModalOpen() || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
  if(event.target instanceof HTMLElement && (
    event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)
  )) return;
  const key = normalizedLetter(event.key);
  if(key) game.guess(key);
});
navItems.forEach(item=>{ item.addEventListener('click',function(){ const p=this.dataset.page; if(p) showPage(p); }); });
document.querySelectorAll('button[data-page]').forEach(btn=>{ btn.addEventListener('click',function(){ const p=this.dataset.page; if(p) showPage(p); }); });
updateDashboard();
document.getElementById('contentContainer').innerHTML = contentData;
if(!adminMode) showPage('game');

function mountSoundToggle(){
  const actions=document.querySelector('.mp-header__actions');
  if(!actions || document.getElementById('mpSoundToggle')) return;
  const button=document.createElement('button');
  button.type='button';
  button.id='mpSoundToggle';
  button.className='mp-icon-btn';
  function update(){
    const muted=window.MPSfx.isMuted();
    button.textContent=muted?'🔇':'🔊';
    button.setAttribute('aria-label',muted?'تشغيل الصوت':'كتم الصوت');
    button.title=muted?'تشغيل الصوت':'كتم الصوت';
  }
  button.addEventListener('click',()=>{
    window.MPSfx.toggleMute();
    update();
  });
  update();
  actions.insertBefore(button,actions.querySelector('.mp-back'));
}

MPGame.init({
  id: 'hangman',
  title: 'هانج مان المكتبات',
  icon: '📜',
  field: 'مصطلحات وتاريخ',
  tagline: 'اكشف المصطلح المكتبي قبل أن ينفد الوقت وتفقد المخطوط.',
  intro: 'اقرأ التلميح والفئة، ثم اختر الحروف. كل خطأ يرسم جزءًا من المخطوط، وكل جولة تنتهي بتعريف المصطلح ومرجعه.',
  defaultLevel: 2,
  levels: [
    { id: 1, label: 'سهل', desc: 'مصطلحات شائعة وتعريف واضح' },
    { id: 2, label: 'متوسط', desc: 'مصطلحات فهرسة وتصنيف' },
    { id: 3, label: 'صعب', desc: 'مصطلحات دقيقة وتلميحات متدرجة' }
  ],
  getStatus: () => [
    { label: 'السلسلة', value: (data.streak || 0) },
    { label: 'الأخطاء', value: game && game.wrongGuesses ? game.wrongGuesses.size : 0 },
    { label: 'المحاولات', value: game && game.word ? game.remainingAttempts() : 6 }
  ],
  onPlay: function (opts) {
    game.diffLevel = (opts && opts.level) || 2;
    showPage('game');
    game.reset();
  },
  onRestart: function () {
    showPage('game');
    game.reset();
  }
});
mountSoundToggle();

if(window.ML){
  ML.tutorial({
    game: 'hangman',
    title: '🎩 هانج مان المكتبات — خمّن المصطلح',
    subtitle: 'مصطلحات موثّقة من ODLIS مع تعريف ومثال بعد كل جولة',
    goal: 'اكتشاف المصطلح المكتبي من حروفه بعد قراءة التلميحات، ثم فهم تعريفه وتطبيقه.',
    rules: [
      'لك 6 محاولات، ويُحدد الوقت بحسب طول المصطلح.',
      'التلميح الأول مجاني، والثاني يستهلك محاولة، والثالث يكشف حرفًا ويستهلك محاولتين.',
      'بعد كل جولة يظهر تعريف المصطلح ومثال تطبيقي ومصدره من ODLIS.',
      'المصطلحات التي تخطئ فيها تُسجّل في قائمة المراجعة أسفل صفحة النتائج.'
    ],
    controls: 'اضغط الحروف العربية أو استخدم لوحة المفاتيح.',
    concepts: Object.values(window.LIBRARY_FIELDS || {}),
    onStart: function () { }
  });
}

window.MPHowTo && MPHowTo.init('hangman');
})();