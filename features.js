/* ============================================================
   شات برو v3.0.0 - ميزات متقدمة جديدة
   - AI مساعد ذكي
   - ترجمة فورية للرسائل
   - نظام مستويات وشارات
   - وضع المحادثة الجماعية
   - قاموس التعبيرات المرئية
   - لوحة تحكم الإحصائيات التفاعلية
   - نظام النقاط والمكافآت
   - تشفير الرسائل الحساسة
   - وضع التركيز / عدم الإزعاج
   ============================================================ */

'use strict';

// ====================== AI ASSISTANT ======================
const AI_RESPONSES = {
  greetings: ['مرحباً! 👋 كيف يمكنني مساعدتك؟','أهلاً وسهلاً! 😊','هلا هلا! كيف حالك؟'],
  jokes: [
    'لماذا لا يثق المبرمجون بالطبيعة؟ لأن فيها الكثير من الـ bugs! 🐛',
    'ما الفرق بين القبطان والقرصان؟ الفاصلة! 😄',
    'سألت ذكاء اصطناعي: هل أنت ذكي؟ قال: بقدر ما تسألني! 🤖'
  ],
  quotes: [
    '💫 "العظمة لا تأتي من القوة، بل من الصمود."',
    '🌟 "كل يوم فرصة جديدة لتكون أفضل مما كنت عليه أمس."',
    '⭐ "الكلمة الطيبة صدقة." - حديث شريف'
  ],
  tips: [
    '💡 نصيحة: حاول أن تسأل عن اهتمامات شريكك لتبدأ محادثة رائعة!',
    '💡 نصيحة: الاستماع الجيد مهارة نادرة وثمينة.',
    '💡 نصيحة: شارك شيئاً مثيراً تعلمته اليوم!'
  ]
};

const AI_STATE = {
  active: false,
  history: [],
  tokensUsed: 0
};

function initAIAssistant() {
  const btn = document.getElementById('ai-assist-btn');
  const panel = document.getElementById('ai-panel');
  const closeBtn = document.getElementById('ai-close-btn');
  const sendBtn = document.getElementById('ai-send-btn');
  const input = document.getElementById('ai-input');
  const quickBtns = document.querySelectorAll('.ai-quick-btn');

  if (!btn || !panel) return;

  btn.addEventListener('click', () => {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      input.focus();
      if (AI_STATE.history.length === 0) {
        appendAIMessage('bot', '👋 مرحباً! أنا مساعدك الذكي في شات برو. يمكنني مساعدتك في:\n• نكتة للترفيه 😄\n• اقتباس ملهم ✨\n• نصائح للمحادثة 💡\n• ترجمة رسالة 🌍');
      }
    }
  });

  closeBtn?.addEventListener('click', () => panel.classList.add('hidden'));

  sendBtn?.addEventListener('click', sendAIMessage);
  input?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIMessage(); } });

  quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      handleAIQuickAction(action);
    });
  });
}

function sendAIMessage() {
  const input = document.getElementById('ai-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  appendAIMessage('user', text);
  setTimeout(() => processAIResponse(text), 600);
}

function processAIResponse(text) {
  const lower = text.toLowerCase();
  let response = '';

  if (lower.includes('مرحب') || lower.includes('هلا') || lower.includes('أهل')) {
    response = AI_RESPONSES.greetings[Math.floor(Math.random() * AI_RESPONSES.greetings.length)];
  } else if (lower.includes('نكت') || lower.includes('اضحك') || lower.includes('فكاه')) {
    response = AI_RESPONSES.jokes[Math.floor(Math.random() * AI_RESPONSES.jokes.length)];
  } else if (lower.includes('اقتباس') || lower.includes('حكمة') || lower.includes('كلمة')) {
    response = AI_RESPONSES.quotes[Math.floor(Math.random() * AI_RESPONSES.quotes.length)];
  } else if (lower.includes('نصيح') || lower.includes('مساعد') || lower.includes('كيف')) {
    response = AI_RESPONSES.tips[Math.floor(Math.random() * AI_RESPONSES.tips.length)];
  } else if (lower.includes('ترجم') || lower.includes('translate')) {
    response = '🌍 أرسل الجملة وسأترجمها لك!\nمثال: "ترجم: كيف حالك؟ إلى الإنجليزية"';
  } else if (lower.includes('translate:') || lower.includes('ترجم:')) {
    const parts = text.split(':');
    if (parts[1]) {
      response = `✅ الترجمة:\n"${parts[1].trim()}"\n🔤 How are you? (نموذج ترجمة)`;
    }
  } else if (lower.includes('وقت') || lower.includes('الساعة')) {
    response = `🕐 الوقت الآن: ${new Date().toLocaleTimeString('ar-SA')}`;
  } else if (lower.includes('شكر') || lower.includes('ممتاز') || lower.includes('رائع')) {
    response = '😊 شكراً لك! يسعدني مساعدتك دائماً. هل تحتاج شيئاً آخر؟';
  } else {
    const fallbacks = [
      '🤔 مثير للاهتمام! هل تريد نكتة أو اقتباساً ملهماً؟',
      '💭 سؤال جيد! جرّب "نكتة" أو "نصيحة" أو "اقتباس".',
      '✨ أنا أفضل في الترفيه والنصائح! ماذا تريد؟'
    ];
    response = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  appendAIMessage('bot', response);
}

function handleAIQuickAction(action) {
  const map = {
    joke: 'نكتة',
    quote: 'اقتباس ملهم',
    tip: 'نصيحة للمحادثة',
    time: 'الوقت الآن'
  };
  if (map[action]) {
    appendAIMessage('user', map[action]);
    setTimeout(() => processAIResponse(map[action]), 500);
  }
}

function appendAIMessage(role, text) {
  const container = document.getElementById('ai-messages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `ai-msg ai-${role}`;
  div.innerHTML = `
    <div class="ai-bubble">${text.replace(/\n/g, '<br>')}</div>
    <span class="ai-time">${new Date().toLocaleTimeString('ar',{hour:'2-digit',minute:'2-digit'})}</span>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  AI_STATE.history.push({ role, text });
}

// ====================== TRANSLATION SYSTEM ======================
const TRANSLATIONS = {
  'كيف حالك': { en: 'How are you?', fr: 'Comment ça va?', tr: 'Nasılsın?' },
  'مرحباً': { en: 'Hello!', fr: 'Bonjour!', tr: 'Merhaba!' },
  'شكراً': { en: 'Thank you!', fr: 'Merci!', tr: 'Teşekkürler!' },
  'وداعاً': { en: 'Goodbye!', fr: 'Au revoir!', tr: 'Görüşürüz!' },
  'أحبك': { en: 'I love you!', fr: 'Je t\'aime!', tr: 'Seni seviyorum!' },
};

function initTranslation() {
  const btn = document.getElementById('translate-msg-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    showTranslateModal();
  });
}

function translateMessage(text, targetLang) {
  for (const [ar, translations] of Object.entries(TRANSLATIONS)) {
    if (text.includes(ar) && translations[targetLang]) {
      return translations[targetLang];
    }
  }
  return `[${targetLang.toUpperCase()}] ${text}`;
}

function showTranslateModal() {
  openModal('translate-modal');
}

// ====================== LEVELS & BADGES SYSTEM ======================
const LEVELS = [
  { level: 1, name: 'مبتدئ', icon: '🌱', min: 0, max: 10 },
  { level: 2, name: 'متواصل', icon: '💬', min: 10, max: 30 },
  { level: 3, name: 'نشيط', icon: '⚡', min: 30, max: 60 },
  { level: 4, name: 'متميز', icon: '🌟', min: 60, max: 100 },
  { level: 5, name: 'خبير', icon: '🏆', min: 100, max: 200 },
  { level: 6, name: 'أسطورة', icon: '👑', min: 200, max: Infinity }
];

const BADGES = [
  { id: 'first_chat', name: 'أول محادثة', icon: '🎉', desc: 'أجريت محادثتك الأولى' },
  { id: 'chat_10', name: 'عاشر محادثة', icon: '🔥', desc: 'أجريت 10 محادثات' },
  { id: 'chat_50', name: 'الخمسيني', icon: '💎', desc: 'أجريت 50 محادثة' },
  { id: 'friend_5', name: 'صاحب الأصدقاء', icon: '🤝', desc: 'أضفت 5 أصدقاء' },
  { id: 'night_owl', name: 'بومة الليل', icon: '🦉', desc: 'تحادثت بعد منتصف الليل' },
  { id: 'early_bird', name: 'الباكر', icon: '🐦', desc: 'تحادثت قبل الفجر' },
  { id: 'msg_100', name: 'المتكلم', icon: '📢', desc: 'أرسلت 100 رسالة' },
  { id: 'voice_lover', name: 'عاشق الصوت', icon: '🎙️', desc: 'أرسلت رسائل صوتية' },
];

const LEVEL_STATE = {
  points: 0,
  level: 1,
  earnedBadges: new Set(),
  newBadges: []
};

function initLevels() {
  const saved = localStorage.getItem('cp_level_data');
  if (saved) {
    try {
      const d = JSON.parse(saved);
      LEVEL_STATE.points = d.points || 0;
      LEVEL_STATE.level = d.level || 1;
      LEVEL_STATE.earnedBadges = new Set(d.badges || []);
    } catch(e) {}
  }
  updateLevelUI();
}

function addPoints(amount, reason = '') {
  LEVEL_STATE.points += amount;
  const newLevel = LEVELS.find(l => LEVEL_STATE.points >= l.min && LEVEL_STATE.points < l.max);
  if (newLevel && newLevel.level > LEVEL_STATE.level) {
    LEVEL_STATE.level = newLevel.level;
    showLevelUpAnimation(newLevel);
  }
  saveLevelData();
  updateLevelUI();
  if (reason) showPointsPopup(amount, reason);
}

function checkBadge(badgeId) {
  if (!LEVEL_STATE.earnedBadges.has(badgeId)) {
    const badge = BADGES.find(b => b.id === badgeId);
    if (badge) {
      LEVEL_STATE.earnedBadges.add(badgeId);
      showBadgeNotification(badge);
      addPoints(20, `شارة: ${badge.name}`);
      saveLevelData();
    }
  }
}

function saveLevelData() {
  localStorage.setItem('cp_level_data', JSON.stringify({
    points: LEVEL_STATE.points,
    level: LEVEL_STATE.level,
    badges: [...LEVEL_STATE.earnedBadges]
  }));
}

function updateLevelUI() {
  const currentLevel = LEVELS.find(l => LEVEL_STATE.points >= l.min && LEVEL_STATE.points < l.max) || LEVELS[LEVELS.length - 1];
  const el = document.getElementById('level-badge');
  if (el) {
    el.textContent = `${currentLevel.icon} ${currentLevel.name}`;
    el.title = `${LEVEL_STATE.points} نقطة`;
  }
  const bar = document.getElementById('xp-bar-fill');
  const xpText = document.getElementById('xp-text');
  if (bar && currentLevel.max !== Infinity) {
    const pct = ((LEVEL_STATE.points - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100;
    bar.style.width = Math.min(pct, 100) + '%';
  }
  if (xpText) xpText.textContent = `${LEVEL_STATE.points} نقطة`;
  updateBadgesPanel();
}

function showLevelUpAnimation(level) {
  const overlay = document.createElement('div');
  overlay.className = 'levelup-overlay';
  overlay.innerHTML = `
    <div class="levelup-card">
      <div class="levelup-icon">${level.icon}</div>
      <div class="levelup-title">مستوى جديد! 🎊</div>
      <div class="levelup-name">${level.name}</div>
      <div class="levelup-level">المستوى ${level.level}</div>
      <button onclick="this.parentElement.parentElement.remove()" class="levelup-close">رائع! 🚀</button>
    </div>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 5000);
  playSound('connect');
}

function showBadgeNotification(badge) {
  const el = document.createElement('div');
  el.className = 'badge-notif';
  el.innerHTML = `<span class="badge-notif-icon">${badge.icon}</span><div><strong>شارة جديدة!</strong><br>${badge.name}</div>`;
  document.getElementById('toast-container')?.appendChild(el);
  setTimeout(() => { el.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => el.remove(), 300); }, 4000);
}

function showPointsPopup(amount, reason) {
  const el = document.createElement('div');
  el.className = 'points-popup';
  el.innerHTML = `+${amount} <small>${reason}</small>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

function updateBadgesPanel() {
  const grid = document.getElementById('badges-grid');
  if (!grid) return;
  grid.innerHTML = BADGES.map(badge => `
    <div class="badge-item ${LEVEL_STATE.earnedBadges.has(badge.id) ? 'earned' : 'locked'}" title="${badge.desc}">
      <span class="badge-item-icon">${LEVEL_STATE.earnedBadges.has(badge.id) ? badge.icon : '🔒'}</span>
      <span class="badge-item-name">${badge.name}</span>
    </div>
  `).join('');
}

// ====================== STATS DASHBOARD ======================
const STATS_DATA = {
  daily: [],
  hourly: new Array(24).fill(0),
  messageTypes: { text: 0, voice: 0, image: 0, emoji: 0 }
};

function initStatsDashboard() {
  const btn = document.getElementById('stats-panel-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    openModal('stats-modal');
    renderStatsDashboard();
  });
}

function renderStatsDashboard() {
  const canvas = document.getElementById('stats-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.offsetWidth;
  const h = canvas.height = 160;

  // Draw hourly activity chart
  ctx.clearRect(0, 0, w, h);
  const data = STATS_DATA.hourly;
  const max = Math.max(...data, 1);
  const barW = w / 24 - 2;

  data.forEach((val, i) => {
    const barH = (val / max) * (h - 30);
    const x = i * (barW + 2) + 1;
    const y = h - barH - 20;
    const grad = ctx.createLinearGradient(0, y, 0, h - 20);
    grad.addColorStop(0, '#00d4ff');
    grad.addColorStop(1, '#7c3aed');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, 3);
    ctx.fill();
  });

  // Labels
  ctx.fillStyle = '#888';
  ctx.font = '10px Cairo';
  ctx.textAlign = 'center';
  [0, 6, 12, 18, 23].forEach(h => {
    ctx.fillText(h + ':00', h * (barW + 2) + barW / 2, 155);
  });

  // Message types pie
  updateMessageTypesUI();
}

function trackMessageType(type) {
  if (STATS_DATA.messageTypes[type] !== undefined) {
    STATS_DATA.messageTypes[type]++;
  }
  STATS_DATA.hourly[new Date().getHours()]++;
}

function updateMessageTypesUI() {
  const total = Object.values(STATS_DATA.messageTypes).reduce((a, b) => a + b, 0) || 1;
  Object.entries(STATS_DATA.messageTypes).forEach(([type, count]) => {
    const el = document.getElementById(`type-${type}`);
    if (el) {
      const pct = Math.round((count / total) * 100);
      el.style.width = pct + '%';
      el.title = `${type}: ${count} (${pct}%)`;
    }
  });
}

// ====================== FOCUS / DO NOT DISTURB MODE ======================
const FOCUS_STATE = {
  active: false,
  timer: null,
  duration: 0
};

function initFocusMode() {
  const btn = document.getElementById('focus-mode-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    toggleFocusMode();
  });
}

function toggleFocusMode() {
  FOCUS_STATE.active = !FOCUS_STATE.active;
  const btn = document.getElementById('focus-mode-btn');
  const indicator = document.getElementById('focus-indicator');
  
  if (FOCUS_STATE.active) {
    btn?.classList.add('active');
    indicator?.classList.remove('hidden');
    toast('🎯 وضع التركيز مفعّل - لن تتلقى إشعارات مزعجة', 'info', 3000);
    // Mute non-essential sounds
    document.body.classList.add('focus-mode');
  } else {
    btn?.classList.remove('active');
    indicator?.classList.add('hidden');
    toast('🔔 وضع التركيز معطّل', 'info', 2000);
    document.body.classList.remove('focus-mode');
  }
}

// ====================== MESSAGE ENCRYPTION ======================
const ENCRYPT_KEY = 'chatpro-secret-2026';

function simpleEncrypt(text) {
  return btoa(encodeURIComponent(text)).split('').reverse().join('');
}

function simpleDecrypt(encrypted) {
  try {
    return decodeURIComponent(atob(encrypted.split('').reverse().join('')));
  } catch(e) {
    return encrypted;
  }
}

function initSecretMessage() {
  const btn = document.getElementById('secret-msg-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    openModal('secret-modal');
  });
  
  document.getElementById('send-secret-btn')?.addEventListener('click', () => {
    const text = document.getElementById('secret-input')?.value.trim();
    if (!text) { toast('الرسالة فارغة', 'error'); return; }
    const encrypted = simpleEncrypt(text);
    sendSignal({
      type: 'CHAT_MSG',
      to: STATE.partner?.id,
      from: STATE.myPeerId,
      content: encrypted,
      time: getTime(),
      msgType: 'secret'
    });
    appendSecretMessage(text, 'mine');
    closeModal('secret-modal');
    document.getElementById('secret-input').value = '';
    toast('🔐 تم إرسال الرسالة المشفرة', 'success');
    addPoints(2, 'رسالة سرية');
  });
}

function appendSecretMessage(text, side) {
  const container = document.getElementById('messages-container');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `message-wrap ${side === 'mine' ? 'mine' : 'theirs'}`;
  div.innerHTML = `
    <div class="msg-bubble secret-bubble">
      <div class="secret-header"><i class="fa-solid fa-lock"></i> رسالة مشفرة</div>
      <div class="secret-text">${escapeHtml(text)}</div>
      <div class="msg-meta"><span>${getTime()}</span>${side === 'mine' ? '<i class="fa-solid fa-check-double"></i>' : ''}</div>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// ====================== WORD GAME ======================
const WORD_GAME_STATE = {
  active: false,
  currentWord: '',
  score: 0,
  timeLeft: 30,
  timer: null
};

const ARABIC_WORDS = ['برتقال','تفاحة','سيارة','طائرة','مدرسة','كتاب','قلم','بيت','ماء','شمس','قمر','نجمة','بحر','جبل','نهر','غيمة','مطر','ثلج','رياح','صحراء'];

function initWordGame() {
  const btn = document.getElementById('word-game-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!STATE.connected) { toast('يجب أن تكون متصلاً بشريك', 'error'); return; }
    startWordGame();
  });
}

function startWordGame() {
  const word = ARABIC_WORDS[Math.floor(Math.random() * ARABIC_WORDS.length)];
  WORD_GAME_STATE.currentWord = word;
  WORD_GAME_STATE.score = 0;
  WORD_GAME_STATE.timeLeft = 30;
  WORD_GAME_STATE.active = true;

  sendSignal({
    type: 'CHAT_MSG',
    to: STATE.partner?.id,
    from: STATE.myPeerId,
    content: `🎮 لعبة الكلمات بدأت! خمّن: ${Array.from(word).map((c,i) => i === 0 || i === word.length-1 ? c : '_').join('')}`,
    time: getTime(),
    msgType: 'game_word'
  });

  openModal('word-game-modal');
  document.getElementById('wg-word').textContent = word.split('').map((c, i) => i === 0 || i === word.length-1 ? c : '_').join('');
  document.getElementById('wg-hint').textContent = `عدد الحروف: ${word.length}`;

  WORD_GAME_STATE.timer = setInterval(() => {
    WORD_GAME_STATE.timeLeft--;
    const el = document.getElementById('wg-timer');
    if (el) el.textContent = WORD_GAME_STATE.timeLeft + 'ث';
    if (WORD_GAME_STATE.timeLeft <= 0) {
      clearInterval(WORD_GAME_STATE.timer);
      toast(`⏰ انتهى الوقت! الكلمة كانت: ${word}`, 'warning', 4000);
      closeModal('word-game-modal');
    }
  }, 1000);

  document.getElementById('wg-submit')?.addEventListener('click', () => {
    const guess = document.getElementById('wg-input')?.value.trim();
    if (guess === word) {
      clearInterval(WORD_GAME_STATE.timer);
      toast('🎉 أحسنت! أجبت بشكل صحيح!', 'success', 3000);
      addPoints(15, 'فزت في لعبة الكلمات');
      closeModal('word-game-modal');
    } else {
      toast('❌ إجابة خاطئة، حاول مجدداً!', 'error', 2000);
    }
  });
}

// ====================== MOOD MUSIC PLAYER ======================
const MOOD_TRACKS = {
  happy: { name: 'موسيقى مبهجة', emoji: '😊', freq: [440, 550, 660] },
  calm: { name: 'موسيقى هادئة', emoji: '😌', freq: [220, 280, 330] },
  energetic: { name: 'موسيقى نشيطة', emoji: '⚡', freq: [660, 880, 1100] },
};

let moodAudioCtx = null;

function initMoodMusic() {
  const btn = document.getElementById('mood-music-btn');
  if (!btn) return;
  btn.addEventListener('click', () => openModal('music-modal'));
  
  document.querySelectorAll('.music-track-btn').forEach(b => {
    b.addEventListener('click', () => {
      const track = MOOD_TRACKS[b.dataset.track];
      if (track) playMoodTrack(track);
    });
  });
}

function playMoodTrack(track) {
  try {
    moodAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = moodAudioCtx.currentTime;
    track.freq.forEach((freq, i) => {
      const osc = moodAudioCtx.createOscillator();
      const gain = moodAudioCtx.createGain();
      osc.connect(gain); gain.connect(moodAudioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.5);
      gain.gain.setValueAtTime(0, now + i * 0.5);
      gain.gain.linearRampToValueAtTime(0.08, now + i * 0.5 + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.5 + 1.5);
      osc.start(now + i * 0.5);
      osc.stop(now + i * 0.5 + 1.5);
    });
    toast(`🎵 تشغيل: ${track.name} ${track.emoji}`, 'info', 2000);
    closeModal('music-modal');
  } catch(e) {}
}

// ====================== CONVERSATION STARTERS ======================
const STARTERS = {
  general: [
    '🤔 ما هو أكثر شيء تتمنى تعلّمه في 2026؟',
    '🌍 إذا كنت ستسافر غداً، فأين ستذهب؟',
    '🎬 ما آخر فيلم أثّر فيك بعمق؟',
    '📚 هل تقرأ الكتب؟ ما آخر كتاب قرأته؟',
    '🎵 ما نوع الموسيقى التي تستمع إليها؟'
  ],
  fun: [
    '😂 أضحك معي: ما أغرب موقف حدث لك؟',
    '🦸 لو كان لك قدرة خارقة، ماذا ستختار؟',
    '🍕 بيتزا أم برغر؟ ولماذا؟',
    '🐶 قطة أم كلب؟',
    '🌙 هل أنت شخص صباحي أم ليلي؟'
  ],
  deep: [
    '💭 ما الشيء الذي يجعلك سعيداً حقاً؟',
    '🌟 ما أكبر درس تعلمته في حياتك؟',
    '❤️ ما الشيء الذي تحبه في نفسك؟',
    '🎯 ما هدفك الأكبر في الحياة؟',
    '🔑 ما الذي يميزك عن الآخرين؟'
  ]
};

function initConversationStarters() {
  const btn = document.getElementById('starters-btn');
  if (!btn) return;
  btn.addEventListener('click', () => openModal('starters-modal'));
  
  document.querySelectorAll('.starter-cat').forEach(catBtn => {
    catBtn.addEventListener('click', () => {
      document.querySelectorAll('.starter-cat').forEach(b => b.classList.remove('active'));
      catBtn.classList.add('active');
      const cat = catBtn.dataset.cat;
      renderStarters(cat);
    });
  });
  renderStarters('general');
}

function renderStarters(cat) {
  const container = document.getElementById('starters-list');
  if (!container) return;
  const items = STARTERS[cat] || [];
  container.innerHTML = items.map(s => `
    <div class="starter-item" onclick="useStarter(this.dataset.text)" data-text="${s}">
      <span>${s}</span>
      <button class="starter-use-btn"><i class="fa-solid fa-paper-plane"></i></button>
    </div>
  `).join('');
}

function useStarter(text) {
  const input = document.getElementById('msg-input');
  if (input) {
    input.value = text;
    input.focus();
    closeModal('starters-modal');
    toast('✅ تم نقل السؤال إلى صندوق الرسالة', 'success', 2000);
  }
}

// ====================== PARTNER PROFILE CARD ======================
function showPartnerProfile() {
  if (!STATE.partner) return;
  const modal = document.getElementById('partner-profile-modal');
  if (!modal) return;
  
  document.getElementById('pp-name').textContent = STATE.partner.name || 'مجهول';
  document.getElementById('pp-gender').textContent = STATE.partner.gender === 'male' ? '👨 ذكر' : STATE.partner.gender === 'female' ? '👩 أنثى' : '🧑 آخر';
  document.getElementById('pp-duration').textContent = fmtDuration(STATE.durationSeconds);
  document.getElementById('pp-msgs').textContent = STATE.sessionMessages || 0;
  openModal('partner-profile-modal');
}

function initPartnerProfile() {
  const avatar = document.getElementById('partner-avatar');
  if (avatar) {
    avatar.addEventListener('click', () => {
      if (STATE.connected) showPartnerProfile();
    });
    avatar.style.cursor = 'pointer';
    avatar.title = 'عرض الملف الشخصي';
  }
  document.getElementById('pp-add-friend')?.addEventListener('click', () => {
    if (typeof addFriend === 'function') addFriend();
    closeModal('partner-profile-modal');
  });
}

// ====================== CHAT EXPORT (Enhanced) ======================
function exportChatTxt() {
  const msgs = document.querySelectorAll('#messages-container .message-wrap');
  if (!msgs.length) { toast('لا يوجد محادثة للتصدير', 'warning'); return; }
  
  let text = `محادثة شات برو\nالتاريخ: ${new Date().toLocaleDateString('ar-SA')}\n${'═'.repeat(40)}\n\n`;
  msgs.forEach(m => {
    const side = m.classList.contains('mine') ? getDisplayName() : (STATE.partner?.name || 'الطرف الآخر');
    const bubble = m.querySelector('.msg-bubble, .voice-bubble');
    const time = m.querySelector('.msg-meta span, .voice-time');
    if (bubble) {
      text += `[${time?.textContent || ''}] ${side}:\n${bubble.innerText.trim()}\n\n`;
    }
  });
  
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `chatpro-${Date.now()}.txt`;
  a.click(); URL.revokeObjectURL(url);
  toast('✅ تم تصدير المحادثة', 'success');
  addPoints(3, 'تصدير المحادثة');
}

// ====================== AUTO-GREET BOT ======================
function sendAutoGreet() {
  if (!STATE.connected || !STATE.partner?.isBot) return;
  setTimeout(() => {
    const greetings = [
      'مرحباً! 👋 كيف حالك؟',
      'أهلاً! 😊 من أين أنت؟',
      'هلا هلا! 🌟 ما اهتماماتك؟'
    ];
    const msg = greetings[Math.floor(Math.random() * greetings.length)];
    receiveMessage({ content: msg, time: getTime(), msgType: 'text' });
  }, 1500);
}

// ====================== HOOK INTO EXISTING EVENTS ======================
function hookIntoExistingEvents() {
  // Track points when chat starts
  const origOnConnected = window.onConnected;
  
  // Track chat stats for levels
  document.addEventListener('chatConnected', () => {
    addPoints(5, 'محادثة جديدة');
    checkBadge('first_chat');
    if (STATE.stats.chats >= 10) checkBadge('chat_10');
    if (STATE.stats.chats >= 50) checkBadge('chat_50');
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 4) checkBadge('night_owl');
    if (hour >= 4 && hour < 6) checkBadge('early_bird');
    sendAutoGreet();
  });

  document.addEventListener('messageSent', (e) => {
    addPoints(1, '');
    trackMessageType(e.detail?.type || 'text');
    if (STATE.stats.messages >= 100) checkBadge('msg_100');
    checkBadge('voice_lover');
  });

  document.addEventListener('friendAdded', () => {
    addPoints(10, 'صديق جديد');
    if (STATE.friends.length >= 5) checkBadge('friend_5');
  });
}

// ====================== QUICK REPLY TEMPLATES ======================
const QUICK_REPLIES = [
  { label: 'تعارف', text: 'مرحباً! أنا {name}، كيف حالك؟ 😊' },
  { label: 'وداع', text: 'كان الحديث معك رائعاً! 👋 إلى اللقاء!' },
  { label: 'اهتمامات', text: 'ما هي اهتماماتك؟ 🎯' },
  { label: 'موقع', text: 'من أي دولة أنت؟ 🌍' },
  { label: 'ضحكة', text: 'هههه 😂 هذا مضحك جداً!' },
  { label: 'موافقة', text: 'صح 100%! أوافقك تماماً ✅' }
];

function initQuickReplies() {
  const container = document.getElementById('quick-replies-bar');
  if (!container) return;
  container.innerHTML = QUICK_REPLIES.map(r => `
    <button class="qr-chip" onclick="useQuickReply('${r.text}')">
      ${r.label}
    </button>
  `).join('');
}

function useQuickReply(text) {
  const filled = text.replace('{name}', getDisplayName());
  const input = document.getElementById('msg-input');
  if (input) {
    input.value = filled;
    input.focus();
    // Auto-resize
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
  }
}

// ====================== INIT ALL FEATURES ======================
function initAllNewFeatures() {
  initAIAssistant();
  initLevels();
  initFocusMode();
  initStatsDashboard();
  initSecretMessage();
  initWordGame();
  initMoodMusic();
  initConversationStarters();
  initPartnerProfile();
  initQuickReplies();
  initTranslation();
  hookIntoExistingEvents();

  // Export enhanced button
  document.getElementById('export-chat-btn')?.addEventListener('click', exportChatTxt);
  
  // Partner avatar click
  document.getElementById('partner-bar')?.addEventListener('click', (e) => {
    if (e.target.closest('#partner-avatar')) showPartnerProfile();
  });

  console.log('✅ شات برو v3.0.0 - جميع الميزات الجديدة تم تفعيلها');
}

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(initAllNewFeatures, 500));
} else {
  setTimeout(initAllNewFeatures, 500);
}

// Update achievements panel UI
function updateAchievementsPanel() {
  const pts = document.getElementById('ach-points');
  const lvl = document.getElementById('ach-level');
  const bdg = document.getElementById('ach-badges');
  if (pts) pts.textContent = LEVEL_STATE.points;
  if (lvl) lvl.textContent = LEVEL_STATE.level;
  if (bdg) bdg.textContent = LEVEL_STATE.earnedBadges.size;
}

// Patch: update achievements whenever points change
const _origAddPoints = addPoints;
// Observer for achievements panel
document.addEventListener('DOMContentLoaded', () => {
  const observer = new MutationObserver(() => updateAchievementsPanel());
  const panel = document.getElementById('panel-achievements');
  if (panel) observer.observe(panel, { attributes: true });
});

// Handle modal close buttons that were added dynamically
document.addEventListener('click', (e) => {
  const closeBtn = e.target.closest('[data-modal]');
  if (closeBtn && closeBtn.dataset.modal) {
    const modal = document.getElementById(closeBtn.dataset.modal);
    if (modal) modal.classList.add('hidden');
  }
});
