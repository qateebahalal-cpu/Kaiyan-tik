/* ============================================================
   شات برو v4.0.0 - ميزات جديدة احترافية
   ============================================================
   1. رسائل صوتية (Voice Messages)
   2. غرف الاهتمامات (Interest Rooms)
   3. تحديات كاسر الجليد (Ice Breaker Challenges)
   4. منشئ الثيم المتقدم (Advanced Theme Builder)
   5. ردود الفعل على الرسائل (Message Reactions)
   6. بطاقة تحليلات المحادثة (Chat Analytics)
   7. فلاتر الفيديو (Video Filters)
   8. اقتراحات الكتابة (Typing Suggestions)
   9. زر التمرير للأسفل (Scroll-to-Bottom)
   ============================================================ */

'use strict';

/* ============================================================
   1. رسائل صوتية - VOICE MESSAGES
   ============================================================ */
const VOICE_STATE = {
  recorder: null,
  chunks: [],
  isRecording: false,
  startTime: null,
  timerInterval: null,
  stream: null,
  analyser: null,
  audioCtx: null
};

function initVoiceMessages() {
  const voiceNoteBtn = document.getElementById('voice-note-btn');
  if (!voiceNoteBtn) return;

  let pressTimer = null;
  let isPressing = false;

  voiceNoteBtn.addEventListener('mousedown', startRecordPress);
  voiceNoteBtn.addEventListener('touchstart', e => { e.preventDefault(); startRecordPress(); }, { passive: false });
  voiceNoteBtn.addEventListener('mouseup', endRecordPress);
  voiceNoteBtn.addEventListener('touchend', e => { e.preventDefault(); endRecordPress(); }, { passive: false });
  voiceNoteBtn.addEventListener('mouseleave', () => { if (isPressing) cancelRecord(); });

  function startRecordPress() {
    isPressing = true;
    pressTimer = setTimeout(async () => {
      if (!isPressing) return;
      await startRecording();
    }, 200);
  }

  function endRecordPress() {
    isPressing = false;
    clearTimeout(pressTimer);
    if (VOICE_STATE.isRecording) {
      stopAndSendRecording();
    }
  }

  function cancelRecord() {
    isPressing = false;
    clearTimeout(pressTimer);
    if (VOICE_STATE.isRecording) {
      cancelRecording();
    }
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    VOICE_STATE.stream = stream;
    VOICE_STATE.chunks = [];
    VOICE_STATE.isRecording = true;
    VOICE_STATE.startTime = Date.now();

    // AudioContext for live visualization
    VOICE_STATE.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    VOICE_STATE.analyser = VOICE_STATE.audioCtx.createAnalyser();
    const source = VOICE_STATE.audioCtx.createMediaStreamSource(stream);
    source.connect(VOICE_STATE.analyser);

    const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? { mimeType: 'audio/webm;codecs=opus' }
      : {};

    VOICE_STATE.recorder = new MediaRecorder(stream, options);
    VOICE_STATE.recorder.ondataavailable = e => { if (e.data.size > 0) VOICE_STATE.chunks.push(e.data); };
    VOICE_STATE.recorder.start(100);

    showRecordPanel();
    startRecordTimer();
  } catch (e) {
    showToastV4('لا يمكن الوصول إلى الميكروفون', 'error');
  }
}

function stopAndSendRecording() {
  if (!VOICE_STATE.recorder) return;
  VOICE_STATE.recorder.onstop = () => {
    const blob = new Blob(VOICE_STATE.chunks, { type: VOICE_STATE.recorder.mimeType || 'audio/webm' });
    if (blob.size < 1000) { cancelRecording(); return; }
    const duration = Math.round((Date.now() - VOICE_STATE.startTime) / 1000);
    sendVoiceMessage(blob, duration);
    cleanupRecording();
  };
  VOICE_STATE.recorder.stop();
  hideRecordPanel();
}

function cancelRecording() {
  if (VOICE_STATE.recorder && VOICE_STATE.isRecording) {
    VOICE_STATE.recorder.stop();
  }
  cleanupRecording();
  hideRecordPanel();
  showToastV4('تم إلغاء التسجيل', 'info');
}

function cleanupRecording() {
  VOICE_STATE.isRecording = false;
  clearInterval(VOICE_STATE.timerInterval);
  if (VOICE_STATE.stream) {
    VOICE_STATE.stream.getTracks().forEach(t => t.stop());
    VOICE_STATE.stream = null;
  }
  if (VOICE_STATE.audioCtx) {
    VOICE_STATE.audioCtx.close();
    VOICE_STATE.audioCtx = null;
  }
}

function startRecordTimer() {
  const timerEl = document.getElementById('voice-rec-timer');
  let secs = 0;
  VOICE_STATE.timerInterval = setInterval(() => {
    secs++;
    if (timerEl) timerEl.textContent = formatDur(secs);
    if (secs >= 120) stopAndSendRecording(); // max 2 min
  }, 1000);
}

function showRecordPanel() {
  const panel = document.getElementById('voice-record-panel');
  if (panel) panel.classList.add('active');
  const btn = document.getElementById('voice-note-btn');
  if (btn) btn.style.color = '#ef4444';
}

function hideRecordPanel() {
  const panel = document.getElementById('voice-record-panel');
  if (panel) panel.classList.remove('active');
  const btn = document.getElementById('voice-note-btn');
  if (btn) btn.style.color = '';
}

function sendVoiceMessage(blob, duration) {
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const bars = generateWaveformBars();
    const msgData = {
      type: 'CHAT_MSG',
      from: window.STATE?.myPeerId,
      to: window.STATE?.partner?.id,
      msgType: 'voice',
      audio: dataUrl,
      duration: duration,
      bars: bars,
      name: window.STATE?.user?.name || 'أنت',
      time: new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })
    };
    // Render locally
    renderVoiceMessage(msgData, true);
    // Send via signal
    if (window.sendSignal) sendSignal(msgData);
    // Update stats
    if (window.STATE?.stats) window.STATE.stats.messages++;
    updateAnalytics({ type: 'voice' });
  };
  reader.readAsDataURL(blob);
}

function generateWaveformBars() {
  const bars = [];
  for (let i = 0; i < 30; i++) {
    bars.push(Math.random() * 0.9 + 0.1);
  }
  return bars;
}

function renderVoiceMessage(data, isMine) {
  const container = document.getElementById('messages-container');
  if (!container) return;

  const bars = data.bars || generateWaveformBars();
  const duration = data.duration || 0;

  const wrap = document.createElement('div');
  wrap.className = `message ${isMine ? 'mine' : 'them'} message-wrap`;
  wrap.dataset.msgId = 'vm_' + Date.now();

  const barsHtml = bars.map((h, i) =>
    `<div class="voice-bar" data-idx="${i}" style="height:${Math.round(h * 24)}px"></div>`
  ).join('');

  wrap.innerHTML = `
    <div class="voice-msg-bubble ${isMine ? 'mine' : ''}">
      <button class="voice-play-btn" data-audio="${data.audio || ''}" data-duration="${duration}">
        <i class="fa-solid fa-play"></i>
      </button>
      <div class="voice-waveform">${barsHtml}</div>
      <span class="voice-duration">${formatDur(duration)}</span>
    </div>
    <div class="msg-meta"><span class="msg-time">${data.time || ''}</span></div>
    <div class="msg-reactions"></div>
  `;

  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;

  // Play button logic
  const playBtn = wrap.querySelector('.voice-play-btn');
  let currentAudio = null;
  let playInterval = null;

  playBtn.addEventListener('click', () => {
    if (currentAudio && !currentAudio.paused) {
      currentAudio.pause();
      playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      playBtn.classList.remove('playing');
      clearInterval(playInterval);
      return;
    }

    const audio = new Audio(data.audio);
    currentAudio = audio;
    playBtn.innerHTML = '<i class="fa-solid fa-stop"></i>';
    playBtn.classList.add('playing');

    const voiceBars = wrap.querySelectorAll('.voice-bar');
    let idx = 0;
    playInterval = setInterval(() => {
      if (idx < voiceBars.length) {
        voiceBars[idx].classList.add('played');
        idx++;
      }
    }, (duration * 1000) / bars.length);

    audio.play();
    audio.onended = () => {
      playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      playBtn.classList.remove('playing');
      clearInterval(playInterval);
      voiceBars.forEach(b => b.classList.remove('played'));
    };
  });

  // Long press for reactions
  initMessageLongPress(wrap);
}

function formatDur(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/* ============================================================
   2. غرف الاهتمامات - INTEREST ROOMS
   ============================================================ */
const ROOMS_DATA = [
  { id: 'tech', name: 'التقنية والبرمجة', emoji: '💻', color: 'rgba(0,212,255,0.15)', colorSolid: '#00d4ff', category: 'tech', members: Math.floor(Math.random()*200)+50, live: true },
  { id: 'music', name: 'الموسيقى والفن', emoji: '🎵', color: 'rgba(124,58,237,0.15)', colorSolid: '#7c3aed', category: 'arts', members: Math.floor(Math.random()*150)+30 },
  { id: 'games', name: 'الألعاب', emoji: '🎮', color: 'rgba(16,185,129,0.15)', colorSolid: '#10b981', category: 'entertainment', members: Math.floor(Math.random()*300)+100, live: true },
  { id: 'movies', name: 'الأفلام والمسلسلات', emoji: '🎬', color: 'rgba(245,158,11,0.15)', colorSolid: '#f59e0b', category: 'entertainment', members: Math.floor(Math.random()*180)+60 },
  { id: 'sports', name: 'الرياضة', emoji: '⚽', color: 'rgba(239,68,68,0.15)', colorSolid: '#ef4444', category: 'sports', members: Math.floor(Math.random()*250)+80, live: true },
  { id: 'travel', name: 'السفر والمغامرة', emoji: '✈️', color: 'rgba(6,182,212,0.15)', colorSolid: '#06b6d4', category: 'lifestyle', members: Math.floor(Math.random()*120)+20 },
  { id: 'cooking', name: 'الطبخ والأكل', emoji: '🍳', color: 'rgba(249,115,22,0.15)', colorSolid: '#f97316', category: 'lifestyle', members: Math.floor(Math.random()*90)+15 },
  { id: 'books', name: 'الكتب والقراءة', emoji: '📚', color: 'rgba(168,85,247,0.15)', colorSolid: '#a855f7', category: 'education', members: Math.floor(Math.random()*80)+10 },
  { id: 'health', name: 'الصحة واللياقة', emoji: '💪', color: 'rgba(16,185,129,0.15)', colorSolid: '#10b981', category: 'health', members: Math.floor(Math.random()*110)+25 },
  { id: 'random', name: 'دردشة عشوائية', emoji: '🎲', color: 'rgba(236,72,153,0.15)', colorSolid: '#ec4899', category: 'fun', members: Math.floor(Math.random()*400)+200, live: true },
  { id: 'study', name: 'الدراسة والعلم', emoji: '🎓', color: 'rgba(99,102,241,0.15)', colorSolid: '#6366f1', category: 'education', members: Math.floor(Math.random()*130)+40 },
  { id: 'business', name: 'الأعمال والريادة', emoji: '💼', color: 'rgba(245,158,11,0.15)', colorSolid: '#f59e0b', category: 'business', members: Math.floor(Math.random()*95)+20 },
];

const ROOM_CHAT_STATE = {
  currentRoom: null,
  messages: {},
  myName: '',
  myAvatar: '😊'
};

function initRoomsPanel() {
  renderRooms('all');
  setupRoomSearch();
  setupRoomCategories();
  setupRoomChatUI();
}

function renderRooms(category) {
  const grid = document.getElementById('rooms-grid') || document.querySelector('#panel-rooms-inner .rooms-grid');
  if (!grid) return;

  const filtered = category === 'all'
    ? ROOMS_DATA
    : ROOMS_DATA.filter(r => r.category === category);

  grid.innerHTML = filtered.map(room => `
    <div class="room-card" data-room-id="${room.id}"
         style="--room-color:${room.color};--room-color-solid:${room.colorSolid}">
      ${room.live ? '<span class="room-live-badge">LIVE</span>' : ''}
      <span class="room-emoji">${room.emoji}</span>
      <div class="room-name">${room.name}</div>
      <div class="room-members"><span>${room.members}</span> متصل الآن</div>
    </div>
  `).join('');

  grid.querySelectorAll('.room-card').forEach(card => {
    card.addEventListener('click', () => {
      const roomId = card.dataset.roomId;
      const room = ROOMS_DATA.find(r => r.id === roomId);
      if (room) openRoomChat(room);
    });
  });
}

function setupRoomSearch() {
  const input = document.getElementById('rooms-search-input');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    document.querySelectorAll('.room-card').forEach(card => {
      const name = card.querySelector('.room-name').textContent.toLowerCase();
      card.style.display = name.includes(q) ? '' : 'none';
    });
  });
}

function setupRoomCategories() {
  document.querySelectorAll('.room-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.room-cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderRooms(btn.dataset.cat);
    });
  });
}

function openRoomChat(room) {
  ROOM_CHAT_STATE.currentRoom = room;
  ROOM_CHAT_STATE.myName = (window.STATE?.user?.name) || 'زائر';
  ROOM_CHAT_STATE.myAvatar = (window.STATE?.selectedAvatar) || '😊';

  if (!ROOM_CHAT_STATE.messages[room.id]) {
    ROOM_CHAT_STATE.messages[room.id] = generateRoomHistory(room);
  }

  const overlay = document.getElementById('room-chat-overlay');
  const emojiEl = document.getElementById('room-chat-emoji');
  const nameEl = document.getElementById('room-chat-name');
  const countEl = document.getElementById('room-chat-count');
  const membersBar = document.getElementById('room-members-bar');
  const msgContainer = document.getElementById('room-messages');

  if (emojiEl) emojiEl.textContent = room.emoji;
  if (nameEl) nameEl.textContent = room.name;
  if (countEl) countEl.textContent = `${room.members} متصل`;
  if (membersBar) membersBar.innerHTML = generateRoomMembers();
  if (msgContainer) {
    msgContainer.innerHTML = '';
    ROOM_CHAT_STATE.messages[room.id].forEach(m => appendRoomMessage(m, false));
    setTimeout(() => { msgContainer.scrollTop = msgContainer.scrollHeight; }, 50);
  }

  if (overlay) overlay.classList.add('open');

  // Simulate other users
  startRoomSimulation(room);
}

function generateRoomHistory(room) {
  const names = ['أحمد', 'سارة', 'محمد', 'منى', 'علي', 'نور', 'كريم'];
  const avatars = ['😎', '🦁', '🌺', '⚡', '🎭', '🌟', '🦊'];
  const msgs = [
    'السلام عليكم 👋',
    'كيف حال الجميع؟',
    'أهلاً بكم في الغرفة 🎉',
    `موضوع اليوم: ${room.name}`,
    'ما رأيكم؟',
    'شاركونا أفكاركم!',
  ];
  return msgs.map((text, i) => ({
    id: Date.now() + i,
    name: names[i % names.length],
    avatar: avatars[i % avatars.length],
    text, mine: false,
    time: new Date(Date.now() - (msgs.length - i) * 90000)
      .toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })
  }));
}

function generateRoomMembers() {
  const names = ['أحمد', 'سارة', 'محمد', 'نور', 'علي'];
  return names.map(n =>
    `<div class="room-member-chip"><div class="dot"></div>${n}</div>`
  ).join('') + `<div class="room-member-chip" style="color:#888">+${Math.floor(Math.random()*50)+10} آخرون</div>`;
}

function appendRoomMessage(msg, scroll = true) {
  const container = document.getElementById('room-messages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `room-msg${msg.mine ? ' mine' : ''}`;
  div.innerHTML = `
    <div class="room-msg-avatar">${msg.avatar || '👤'}</div>
    <div class="room-msg-body">
      ${!msg.mine ? `<div class="room-msg-name">${msg.name}</div>` : ''}
      <div class="room-msg-text">${escapeHtml(msg.text)}</div>
    </div>
  `;
  container.appendChild(div);
  if (scroll) container.scrollTop = container.scrollHeight;
}

let roomSimInterval = null;
function startRoomSimulation(room) {
  clearInterval(roomSimInterval);
  const botMsgs = [
    'هذا الموضوع رائع 👌',
    'وافقت على ذلك تماماً!',
    '😂😂 صحيح',
    'أنا جديد هنا، أهلاً بالجميع 👋',
    'هل هناك أحد من اليمن؟ 🇾🇪',
    'يمكنني المساعدة في هذا!',
    '🔥🔥🔥',
  ];
  const names = ['فيصل', 'ريم', 'تامر', 'هند', 'خالد'];
  const avatars = ['🐺', '🌹', '🎯', '💫', '🦅'];
  let i = 0;

  roomSimInterval = setInterval(() => {
    if (!ROOM_CHAT_STATE.currentRoom || ROOM_CHAT_STATE.currentRoom.id !== room.id) {
      clearInterval(roomSimInterval); return;
    }
    const msg = {
      id: Date.now(), mine: false,
      name: names[i % names.length],
      avatar: avatars[i % avatars.length],
      text: botMsgs[i % botMsgs.length],
      time: new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })
    };
    ROOM_CHAT_STATE.messages[room.id].push(msg);
    appendRoomMessage(msg);
    i++;
  }, 8000 + Math.random() * 12000);
}

function setupRoomChatUI() {
  const closeBtn = document.getElementById('room-close-btn');
  const sendBtn = document.getElementById('room-send-btn');
  const input = document.getElementById('room-input');

  closeBtn?.addEventListener('click', () => {
    document.getElementById('room-chat-overlay')?.classList.remove('open');
    ROOM_CHAT_STATE.currentRoom = null;
    clearInterval(roomSimInterval);
  });

  const sendMsg = () => {
    const text = input?.value?.trim();
    if (!text || !ROOM_CHAT_STATE.currentRoom) return;
    input.value = '';
    const msg = {
      id: Date.now(), mine: true,
      name: ROOM_CHAT_STATE.myName,
      avatar: ROOM_CHAT_STATE.myAvatar,
      text,
      time: new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })
    };
    ROOM_CHAT_STATE.messages[ROOM_CHAT_STATE.currentRoom.id]?.push(msg);
    appendRoomMessage(msg);
  };

  sendBtn?.addEventListener('click', sendMsg);
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });
}

/* ============================================================
   3. تحديات كاسر الجليد - ICE BREAKER CHALLENGES
   ============================================================ */
const CHALLENGES = {
  dare: [
    { emoji: '🎤', text: 'أرسل رسالة صوتية بصوت كرتوني أو مضحك!' },
    { emoji: '🤸', text: 'أخبر الطرف الآخر بأغرب عادة لديك!' },
    { emoji: '🎭', text: 'قلّد شخصاً مشهوراً في رسالتك القادمة!' },
    { emoji: '📸', text: 'أرسل إيموجي يصف مزاجك الآن بشكل مبالغ!' },
    { emoji: '🎵', text: 'اكتب مقطعاً من أغنيتك المفضلة!' },
  ],
  question: [
    { emoji: '🌍', text: 'ما البلد الذي تحلم بزيارته أكثر من غيره؟' },
    { emoji: '⚡', text: 'إذا استطعت اكتساب قوة خارقة واحدة، ما هي؟' },
    { emoji: '🕐', text: 'إذا سافرت بالزمن، إلى أي حقبة ستذهب ولماذا؟' },
    { emoji: '🎯', text: 'ما الشيء الذي تتمنى لو تعلمته في طفولتك؟' },
    { emoji: '🌅', text: 'كيف يبدو يومك المثالي من الصباح حتى النوم؟' },
    { emoji: '💭', text: 'ما الاختراع الذي تعتقد أن العالم يحتاجه؟' },
  ],
  truth: [
    { emoji: '💫', text: 'ما الشيء الذي تفخر به في نفسك أكثر من أي شيء؟' },
    { emoji: '😳', text: 'ما أكثر موقف محرج مررت به في حياتك؟' },
    { emoji: '🙈', text: 'ما الخطأ الذي تعلمت منه أكثر شيء في حياتك؟' },
    { emoji: '❤️', text: 'ما الشيء الذي يجعلك سعيداً حقاً في الحياة؟' },
    { emoji: '🌙', text: 'ما الحلم الذي تريد تحقيقه قبل نهاية هذا العام؟' },
  ],
  fun: [
    { emoji: '🦁', text: 'لو كنت حيواناً، ما الحيوان الذي ستكونه ولماذا؟' },
    { emoji: '🍕', text: 'لو كان عليك أكل طعام واحد فقط لسنة، ما هو؟' },
    { emoji: '🎮', text: 'أي لعبة فيديو تصف حياتك بشكل أفضل؟' },
    { emoji: '🦸', text: 'أي شخصية خيالية تتمنى أن تكون؟ ولماذا؟' },
    { emoji: '⏰', text: 'إذا كان لديك يوم إضافي في الأسبوع، ماذا ستفعل؟' },
  ]
};

let currentChallenge = null;

function initChallenges() {
  const fab = document.getElementById('challenge-fab');
  const panel = document.getElementById('challenge-panel');
  const closeBtn = document.getElementById('challenge-close');
  const shuffleBtn = document.getElementById('challenge-shuffle');
  const sendBtn = document.getElementById('challenge-send');

  fab?.addEventListener('click', () => {
    panel?.classList.toggle('open');
    if (panel?.classList.contains('open')) shuffleChallenge();
  });

  closeBtn?.addEventListener('click', () => panel?.classList.remove('open'));
  shuffleBtn?.addEventListener('click', shuffleChallenge);
  sendBtn?.addEventListener('click', sendChallengeToChatV4);

  shuffleChallenge();
}

function shuffleChallenge() {
  const types = Object.keys(CHALLENGES);
  const type = types[Math.floor(Math.random() * types.length)];
  const list = CHALLENGES[type];
  const c = list[Math.floor(Math.random() * list.length)];
  currentChallenge = { ...c, type };

  const emojiEl = document.getElementById('challenge-emoji');
  const textEl = document.getElementById('challenge-text');
  const badgeEl = document.getElementById('challenge-type-badge');

  if (emojiEl) emojiEl.textContent = c.emoji;
  if (textEl) textEl.textContent = c.text;
  if (badgeEl) {
    const labels = { dare: 'تحدي', question: 'سؤال', truth: 'حقيقة', fun: 'مرح' };
    badgeEl.textContent = labels[type] || type;
    badgeEl.className = `challenge-type-badge ${type}`;
  }
}

function sendChallengeToChatV4() {
  if (!currentChallenge) return;
  const text = `${currentChallenge.emoji} ${currentChallenge.text}`;

  // Build styled bubble
  const container = document.getElementById('messages-container');
  if (!container) return;

  const wrap = document.createElement('div');
  wrap.className = 'message mine message-wrap';
  wrap.innerHTML = `
    <div class="challenge-msg-bubble">
      <div class="ch-icon">${currentChallenge.emoji}</div>
      <div class="ch-label">${({ dare: '🎯 تحدي', question: '❓ سؤال', truth: '💬 حقيقة', fun: '🎉 مرح' })[currentChallenge.type]}</div>
      <div class="ch-text">${escapeHtml(currentChallenge.text)}</div>
    </div>
    <div class="msg-meta"><span class="msg-time">${new Date().toLocaleTimeString('ar', {hour:'2-digit',minute:'2-digit'})}</span></div>
    <div class="msg-reactions"></div>
  `;
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
  initMessageLongPress(wrap);

  // Also send via signal
  if (window.sendSignal && window.STATE?.connected) {
    sendSignal({
      type: 'CHAT_MSG', msgType: 'challenge',
      from: window.STATE?.myPeerId, to: window.STATE?.partner?.id,
      challenge: currentChallenge,
      time: new Date().toLocaleTimeString('ar', {hour:'2-digit',minute:'2-digit'})
    });
  }

  document.getElementById('challenge-panel')?.classList.remove('open');
  showToastV4('تم إرسال التحدي! 🎯', 'success');
  shuffleChallenge();
}

/* ============================================================
   4. منشئ الثيم المتقدم - ADVANCED THEME BUILDER
   ============================================================ */
const THEME_PRESETS = [
  { name: 'كوني', bg: 'linear-gradient(135deg,#0a0a1a,#12102a)', accent: '#00d4ff', accent2: '#7c3aed' },
  { name: 'غروب', bg: 'linear-gradient(135deg,#1a0a0a,#2a1208)', accent: '#f97316', accent2: '#ef4444' },
  { name: 'غابة', bg: 'linear-gradient(135deg,#0a1a0e,#0d1f12)', accent: '#10b981', accent2: '#059669' },
  { name: 'بنفسجي', bg: 'linear-gradient(135deg,#130a1a,#1e0f2a)', accent: '#a855f7', accent2: '#7c3aed' },
  { name: 'وردي', bg: 'linear-gradient(135deg,#1a0a14,#2a0e1e)', accent: '#ec4899', accent2: '#be185d' },
  { name: 'ذهبي', bg: 'linear-gradient(135deg,#1a1400,#2a1e00)', accent: '#f59e0b', accent2: '#d97706' },
  { name: 'فضائي', bg: 'linear-gradient(135deg,#050510,#0a0520)', accent: '#6366f1', accent2: '#4f46e5' },
  { name: 'جليدي', bg: 'linear-gradient(135deg,#0a1a1a,#0e2020)', accent: '#06b6d4', accent2: '#0891b2' },
];

const THEME_STATE = {
  bgPreset: 0,
  accent: '#00d4ff',
  accent2: '#7c3aed',
  bubbleRadius: 18,
  bgBlur: 10,
  fontSize: 15,
  animations: true,
  compactMode: false
};

function initThemeBuilder() {
  const openBtn = document.getElementById('open-theme-builder');
  const overlay = document.getElementById('theme-builder-overlay');
  const closeBtn = document.getElementById('theme-builder-close');
  const applyBtn = document.getElementById('tb-apply-btn');

  openBtn?.addEventListener('click', () => {
    overlay?.classList.add('open');
    renderThemeBuilderPresets();
    renderThemeColorSwatches();
    updateThemePreview();
  });

  closeBtn?.addEventListener('click', () => overlay?.classList.remove('open'));
  overlay?.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });

  // Sliders
  const setupSlider = (id, key, unit = '') => {
    const el = document.getElementById(id);
    const valEl = document.getElementById(id + '-val');
    if (!el) return;
    el.value = THEME_STATE[key];
    if (valEl) valEl.textContent = THEME_STATE[key] + unit;
    el.addEventListener('input', () => {
      THEME_STATE[key] = +el.value;
      if (valEl) valEl.textContent = el.value + unit;
      updateThemePreview();
    });
  };
  setupSlider('tb-radius', 'bubbleRadius', 'px');
  setupSlider('tb-blur', 'bgBlur', 'px');
  setupSlider('tb-fontsize', 'fontSize', 'px');

  // Toggles
  setupToggle('tb-animations', 'animations');
  setupToggle('tb-compact', 'compactMode');

  // Custom accent
  const customAccent = document.getElementById('tb-custom-accent');
  customAccent?.addEventListener('input', () => {
    THEME_STATE.accent = customAccent.value;
    updateThemePreview();
  });

  applyBtn?.addEventListener('click', applyTheme);
}

function setupToggle(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  el.checked = THEME_STATE[key];
  el.addEventListener('change', () => { THEME_STATE[key] = el.checked; updateThemePreview(); });
}

function renderThemeBuilderPresets() {
  const grid = document.getElementById('tb-presets-grid');
  if (!grid) return;
  grid.innerHTML = THEME_PRESETS.map((p, i) => `
    <div class="tb-preset ${i === THEME_STATE.bgPreset ? 'active' : ''}"
         data-idx="${i}"
         style="background:${p.bg}">
      <span class="tb-preset-label">${p.name}</span>
    </div>
  `).join('');
  grid.querySelectorAll('.tb-preset').forEach(el => {
    el.addEventListener('click', () => {
      const idx = +el.dataset.idx;
      THEME_STATE.bgPreset = idx;
      THEME_STATE.accent = THEME_PRESETS[idx].accent;
      THEME_STATE.accent2 = THEME_PRESETS[idx].accent2;
      grid.querySelectorAll('.tb-preset').forEach(e => e.classList.remove('active'));
      el.classList.add('active');
      const acc = document.getElementById('tb-custom-accent');
      if (acc) acc.value = THEME_STATE.accent;
      updateThemePreview();
    });
  });
}

const ACCENT_COLORS = [
  '#00d4ff','#7c3aed','#10b981','#f59e0b','#ef4444',
  '#ec4899','#6366f1','#06b6d4','#f97316','#a855f7'
];

function renderThemeColorSwatches() {
  const grid = document.getElementById('tb-color-swatches');
  if (!grid) return;
  grid.innerHTML = ACCENT_COLORS.map(c => `
    <div class="tb-color-swatch ${THEME_STATE.accent === c ? 'active' : ''}"
         data-color="${c}"
         style="background:${c}"></div>
  `).join('');
  grid.querySelectorAll('.tb-color-swatch').forEach(el => {
    el.addEventListener('click', () => {
      THEME_STATE.accent = el.dataset.color;
      grid.querySelectorAll('.tb-color-swatch').forEach(e => e.classList.remove('active'));
      el.classList.add('active');
      const acc = document.getElementById('tb-custom-accent');
      if (acc) acc.value = THEME_STATE.accent;
      updateThemePreview();
    });
  });
}

function updateThemePreview() {
  const preview = document.getElementById('tb-preview');
  if (!preview) return;
  const preset = THEME_PRESETS[THEME_STATE.bgPreset];
  preview.style.setProperty('--accent', THEME_STATE.accent);
  preview.style.setProperty('--accent2', THEME_STATE.accent2);
  preview.style.setProperty('--preview-bg', preset ? preset.bg : '');
  preview.style.background = preset ? preset.bg : '';
  const msgs = preview.querySelectorAll('.tb-preview-msg.me');
  msgs.forEach(m => {
    m.style.background = `linear-gradient(135deg, ${THEME_STATE.accent}, ${THEME_STATE.accent2})`;
    m.style.borderRadius = `${THEME_STATE.bubbleRadius}px ${THEME_STATE.bubbleRadius}px 4px ${THEME_STATE.bubbleRadius}px`;
  });
  const themeMsgs = preview.querySelectorAll('.tb-preview-msg.them');
  themeMsgs.forEach(m => {
    m.style.borderRadius = `4px ${THEME_STATE.bubbleRadius}px ${THEME_STATE.bubbleRadius}px ${THEME_STATE.bubbleRadius}px`;
  });
  preview.querySelectorAll('.tb-preview-msg').forEach(m => {
    m.style.fontSize = THEME_STATE.fontSize + 'px';
  });
}

function applyTheme() {
  const preset = THEME_PRESETS[THEME_STATE.bgPreset];
  document.documentElement.style.setProperty('--accent', THEME_STATE.accent);
  document.documentElement.style.setProperty('--accent2', THEME_STATE.accent2);

  // Apply background to body/app
  const app = document.getElementById('app');
  if (app && preset) {
    app.style.background = preset.bg;
  }
  document.body.style.background = preset ? preset.bg : '';

  // Font size
  const msgs = document.getElementById('messages-container');
  if (msgs) msgs.style.fontSize = THEME_STATE.fontSize + 'px';

  // Message border radius
  const styleId = 'dynamic-chat-style';
  let styleEl = document.getElementById(styleId);
  if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = styleId; document.head.appendChild(styleEl); }
  styleEl.textContent = `
    :root {
      --accent: ${THEME_STATE.accent} !important;
      --accent2: ${THEME_STATE.accent2} !important;
    }
    .message.mine .msg-bubble { border-radius: ${THEME_STATE.bubbleRadius}px ${THEME_STATE.bubbleRadius}px 4px ${THEME_STATE.bubbleRadius}px !important; }
    .message.them .msg-bubble { border-radius: 4px ${THEME_STATE.bubbleRadius}px ${THEME_STATE.bubbleRadius}px ${THEME_STATE.bubbleRadius}px !important; }
    #messages-container { font-size: ${THEME_STATE.fontSize}px !important; }
  `;

  // Save
  try { localStorage.setItem('chatpro_theme_v4', JSON.stringify(THEME_STATE)); } catch(e) {}

  document.getElementById('theme-builder-overlay')?.classList.remove('open');
  showToastV4('✨ تم تطبيق الثيم بنجاح!', 'success');
}

function loadSavedTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem('chatpro_theme_v4') || 'null');
    if (saved) { Object.assign(THEME_STATE, saved); applyTheme(); }
  } catch(e) {}
}

/* ============================================================
   5. ردود الفعل - MESSAGE REACTIONS
   ============================================================ */
const REACTION_EMOJIS = ['❤️','😂','😮','😢','😡','👍','🔥','💯'];
const MSG_REACTIONS = {}; // msgId -> { emoji: count }[]

function initMessageLongPress(msgEl) {
  if (!msgEl) return;
  let pressTimer;
  const trigger = () => {
    const rect = msgEl.getBoundingClientRect();
    showReactionBar(msgEl);
  };
  msgEl.addEventListener('contextmenu', e => { e.preventDefault(); trigger(); });
  msgEl.addEventListener('touchstart', () => {
    pressTimer = setTimeout(trigger, 500);
  }, { passive: true });
  msgEl.addEventListener('touchend', () => clearTimeout(pressTimer));
  msgEl.addEventListener('touchmove', () => clearTimeout(pressTimer));
}

function showReactionBar(msgEl) {
  // Remove any existing reaction bars
  document.querySelectorAll('.reaction-bar').forEach(b => b.remove());

  const bar = document.createElement('div');
  bar.className = 'reaction-bar';
  bar.innerHTML = REACTION_EMOJIS.map(e =>
    `<button class="reaction-btn" data-emoji="${e}">${e}</button>`
  ).join('');

  // Position relative to message
  msgEl.style.position = 'relative';
  msgEl.appendChild(bar);

  bar.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      addReaction(msgEl, btn.dataset.emoji);
      bar.remove();
    });
  });

  // Auto-close
  setTimeout(() => bar.remove(), 4000);

  // Click outside
  const handler = e => {
    if (!bar.contains(e.target)) { bar.remove(); document.removeEventListener('click', handler); }
  };
  setTimeout(() => document.addEventListener('click', handler), 100);
}

function addReaction(msgEl, emoji) {
  const msgId = msgEl.dataset.msgId || (msgEl.dataset.msgId = 'msg_' + Date.now());
  if (!MSG_REACTIONS[msgId]) MSG_REACTIONS[msgId] = {};
  MSG_REACTIONS[msgId][emoji] = (MSG_REACTIONS[msgId][emoji] || 0) + 1;

  renderReactions(msgEl, msgId);
  showReactionToast(emoji);

  // Send to partner
  if (window.sendSignal && window.STATE?.connected) {
    sendSignal({
      type: 'MSG_REACTION',
      to: window.STATE?.partner?.id,
      msgId, emoji,
      from: window.STATE?.myPeerId
    });
  }
}

function renderReactions(msgEl, msgId) {
  const reactions = MSG_REACTIONS[msgId] || {};
  let reactEl = msgEl.querySelector('.msg-reactions');
  if (!reactEl) {
    reactEl = document.createElement('div');
    reactEl.className = 'msg-reactions';
    msgEl.appendChild(reactEl);
  }
  reactEl.innerHTML = Object.entries(reactions)
    .filter(([,count]) => count > 0)
    .map(([emoji, count]) => `
      <span class="msg-reaction-chip my-reaction">
        ${emoji} <span class="r-count">${count}</span>
      </span>
    `).join('');
}

function showReactionToast(emoji) {
  const existing = document.querySelector('.reaction-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'reaction-toast';
  toast.innerHTML = `<span style="font-size:24px">${emoji}</span><span>أضفت ردّ فعل</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

/* ============================================================
   6. تحليلات المحادثة - CHAT ANALYTICS
   ============================================================ */
const ANALYTICS = {
  msgCount: 0,
  wordCount: 0,
  voiceCount: 0,
  imageCount: 0,
  emojiCount: 0,
  avgResponseSecs: [],
  lastMsgTime: null,
  startTime: null,
  words: [],
};

function updateAnalytics(data) {
  if (!ANALYTICS.startTime) ANALYTICS.startTime = Date.now();

  switch(data.type) {
    case 'text':
      ANALYTICS.msgCount++;
      const words = (data.text || '').split(/\s+/).filter(Boolean);
      ANALYTICS.wordCount += words.length;
      ANALYTICS.words.push(...words.filter(w => w.length > 2));
      // emoji detection
      const emojiMatch = (data.text || '').match(/\p{Emoji}/gu);
      if (emojiMatch) ANALYTICS.emojiCount += emojiMatch.length;
      break;
    case 'voice': ANALYTICS.voiceCount++; break;
    case 'image': ANALYTICS.imageCount++; break;
  }
  if (ANALYTICS.lastMsgTime) {
    ANALYTICS.avgResponseSecs.push((Date.now() - ANALYTICS.lastMsgTime) / 1000);
  }
  ANALYTICS.lastMsgTime = Date.now();
}

function resetAnalytics() {
  Object.assign(ANALYTICS, {
    msgCount: 0, wordCount: 0, voiceCount: 0, imageCount: 0, emojiCount: 0,
    avgResponseSecs: [], lastMsgTime: null, startTime: Date.now(), words: []
  });
}

function renderAnalyticsPanel() {
  const panel = document.getElementById('analytics-panel-content');
  if (!panel) return;

  const total = ANALYTICS.msgCount + ANALYTICS.voiceCount + ANALYTICS.imageCount + ANALYTICS.emojiCount || 1;
  const avgResp = ANALYTICS.avgResponseSecs.length
    ? Math.round(ANALYTICS.avgResponseSecs.reduce((a,b)=>a+b,0) / ANALYTICS.avgResponseSecs.length)
    : 0;
  const durationMin = ANALYTICS.startTime
    ? Math.round((Date.now() - ANALYTICS.startTime) / 60000)
    : 0;

  // Word frequency
  const wordFreq = {};
  ANALYTICS.words.forEach(w => { const k = w.replace(/[^\u0600-\u06FF\u0041-\u007A]/g,''); if(k.length > 2) wordFreq[k] = (wordFreq[k]||0)+1; });
  const topWords = Object.entries(wordFreq).sort((a,b)=>b[1]-a[1]).slice(0,10);

  // Sentiment (simple heuristic)
  const positiveWords = ['رائع','جميل','ممتاز','شكراً','يسعدني','حلو','أحب','سعيد','ممتاز','مرحبا'];
  const negativeWords = ['سيء','كره','غاضب','تعبان','ضجر','مزعج','لا','أكره'];
  let pos = 0, neg = 0;
  ANALYTICS.words.forEach(w => {
    if (positiveWords.some(p => w.includes(p))) pos++;
    if (negativeWords.some(n => w.includes(n))) neg++;
  });
  const neut = Math.max(0, ANALYTICS.msgCount - pos - neg);
  const posP = Math.round((pos / (pos+neg+neut||1)) * 100);
  const negP = Math.round((neg / (pos+neg+neut||1)) * 100);
  const neutP = 100 - posP - negP;

  panel.innerHTML = `
    <div class="analytics-card">
      <div class="analytics-card-title">📊 إحصائيات المحادثة</div>
      <div class="analytics-row"><span class="analytics-label">إجمالي الرسائل</span><span class="analytics-val">${ANALYTICS.msgCount}</span></div>
      <div class="analytics-row"><span class="analytics-label">عدد الكلمات</span><span class="analytics-val">${ANALYTICS.wordCount}</span></div>
      <div class="analytics-row"><span class="analytics-label">رسائل صوتية</span><span class="analytics-val">${ANALYTICS.voiceCount}</span></div>
      <div class="analytics-row"><span class="analytics-label">صور مُرسلة</span><span class="analytics-val">${ANALYTICS.imageCount}</span></div>
      <div class="analytics-row"><span class="analytics-label">إيموجي</span><span class="analytics-val">${ANALYTICS.emojiCount}</span></div>
      <div class="analytics-row"><span class="analytics-label">متوسط وقت الرد</span><span class="analytics-val">${avgResp}ث</span></div>
      <div class="analytics-row"><span class="analytics-label">مدة المحادثة</span><span class="analytics-val">${durationMin} دقيقة</span></div>
    </div>
    <div class="analytics-card">
      <div class="analytics-card-title">💬 تحليل المزاج</div>
      <div class="sentiment-bar">
        <div class="sentiment-positive" style="flex:${posP}"></div>
        <div class="sentiment-neutral" style="flex:${neutP}"></div>
        <div class="sentiment-negative" style="flex:${negP}"></div>
      </div>
      <div class="sentiment-labels">
        <span>😊 إيجابي ${posP}%</span>
        <span>😐 محايد ${neutP}%</span>
        <span>😟 سلبي ${negP}%</span>
      </div>
    </div>
    ${topWords.length ? `
    <div class="analytics-card">
      <div class="analytics-card-title">🔤 الكلمات الأكثر استخداماً</div>
      <div class="word-cloud-container">
        ${topWords.map(([w, c]) => `<span class="word-tag" title="${c} مرات">${w}</span>`).join('')}
      </div>
    </div>` : ''}
  `;
}

/* ============================================================
   7. فلاتر الفيديو - VIDEO FILTERS
   ============================================================ */
const VIDEO_FILTERS = [
  { id: 'none', label: 'طبيعي', emoji: '📷' },
  { id: 'grayscale', label: 'أبيض وأسود', emoji: '⬛' },
  { id: 'sepia', label: 'خمري', emoji: '🟤' },
  { id: 'warm', label: 'دافئ', emoji: '🔶' },
  { id: 'cool', label: 'بارد', emoji: '🔷' },
  { id: 'glow', label: 'مضيء', emoji: '✨' },
  { id: 'vintage', label: 'كلاسيكي', emoji: '📸' },
  { id: 'neon', label: 'نيون', emoji: '🌈' },
];

function initVideoFilters() {
  const strip = document.getElementById('video-filters-strip');
  if (!strip) return;

  strip.innerHTML = VIDEO_FILTERS.map(f => `
    <div class="filter-chip ${f.id === 'none' ? 'active' : ''}" data-filter="${f.id}">
      <span>${f.emoji}</span>${f.label}
    </div>
  `).join('');

  strip.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const filterId = chip.dataset.filter;
      const localVid = document.getElementById('local-video');
      if (!localVid) return;
      // Remove all filter classes
      VIDEO_FILTERS.forEach(f => localVid.classList.remove('filter-' + f.id));
      if (filterId !== 'none') localVid.classList.add('filter-' + filterId);
      strip.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });
}

/* ============================================================
   8. اقتراحات الكتابة - TYPING SUGGESTIONS
   ============================================================ */
const TYPING_SUGGESTIONS_LIST = [
  ['كيف حالك؟ 😊', 'ما الجديد؟', 'من أين أنت؟', 'ما اهتماماتك؟'],
  ['هههه 😂', 'موافق 👍', 'رائع جداً! 🔥', 'شكراً لك ❤️'],
  ['حسناً، وأنت؟', 'مثير للاهتمام!', 'لم أفكر بذلك', 'أخبرني أكثر'],
  ['أوافقك تماماً!', 'أختلف معك قليلاً', 'سؤال ممتاز!', 'جيد جداً 👌'],
];

let suggestionSet = 0;

function initTypingSuggestions() {
  const bar = document.getElementById('typing-suggestions-bar-inline') || document.getElementById('typing-suggestions-bar');
  if (!bar) return;

  renderSuggestions(bar);

  // Rotate suggestions every 30s
  setInterval(() => {
    suggestionSet = (suggestionSet + 1) % TYPING_SUGGESTIONS_LIST.length;
    renderSuggestions(bar);
  }, 30000);

  // When user types, change suggestions
  const input = document.getElementById('msg-input');
  input?.addEventListener('input', () => {
    const val = input.value;
    if (!val) renderSuggestions(bar);
  });
}

function renderSuggestions(bar) {
  const list = TYPING_SUGGESTIONS_LIST[suggestionSet];
  bar.innerHTML = `<div class="typing-suggestions">${list.map(s =>
    `<span class="suggestion-chip">${s}</span>`
  ).join('')}</div>`;
  bar.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const input = document.getElementById('msg-input');
      if (input) { input.value = chip.textContent; input.focus(); }
    });
  });
}

/* ============================================================
   9. زر التمرير للأسفل - SCROLL TO BOTTOM
   ============================================================ */
function initScrollToBottom() {
  const container = document.getElementById('messages-container');
  const btn = document.getElementById('scroll-to-bottom-btn');
  if (!container || !btn) return;

  container.addEventListener('scroll', () => {
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    btn.classList.toggle('visible', !isNearBottom);
  });

  btn.addEventListener('click', () => {
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  });
}

/* ============================================================
   UTILITIES
   ============================================================ */
function escapeHtml(text) {
  const map = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' };
  return (text || '').replace(/[&<>"']/g, m => map[m]);
}

function showToastV4(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: 'fa-check-circle', error: 'fa-circle-xmark', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' };
  const colors = { success: '#10b981', error: '#ef4444', info: '#00d4ff', warning: '#f59e0b' };
  const toast = document.createElement('div');
  toast.className = 'toast show';
  toast.style.borderColor = colors[type] || colors.info;
  toast.innerHTML = `<i class="fa-solid ${icons[type]||icons.info}" style="color:${colors[type]||colors.info}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3000);
}

/* ============================================================
   INIT - تهيئة جميع الميزات الجديدة
   ============================================================ */
function initNewFeaturesV4() {
  initVoiceMessages();
  initRoomsPanel();
  initChallenges();
  initThemeBuilder();
  initVideoFilters();
  initTypingSuggestions();
  initScrollToBottom();
  loadSavedTheme();

  // Hook into existing signal handler for new msg types
  const origHandleSignal = window.handleSignal;
  if (origHandleSignal) {
    window.handleSignal = function(event) {
      const msg = event.data;
      if (msg?.type === 'MSG_REACTION') {
        const msgEl = document.querySelector(`[data-msg-id="${msg.msgId}"]`);
        if (msgEl) {
          if (!MSG_REACTIONS[msg.msgId]) MSG_REACTIONS[msg.msgId] = {};
          MSG_REACTIONS[msg.msgId][msg.emoji] = (MSG_REACTIONS[msg.msgId][msg.emoji] || 0) + 1;
          renderReactions(msgEl, msg.msgId);
        }
        return;
      }
      if (msg?.msgType === 'voice' && msg?.to === window.STATE?.myPeerId) {
        renderVoiceMessage(msg, false);
        return;
      }
      if (msg?.msgType === 'challenge' && msg?.to === window.STATE?.myPeerId) {
        const container = document.getElementById('messages-container');
        if (!container) return;
        const wrap = document.createElement('div');
        wrap.className = 'message them message-wrap';
        wrap.dataset.msgId = 'msg_' + Date.now();
        const c = msg.challenge;
        wrap.innerHTML = `
          <div class="challenge-msg-bubble">
            <div class="ch-icon">${c.emoji}</div>
            <div class="ch-label">${({dare:'🎯 تحدي',question:'❓ سؤال',truth:'💬 حقيقة',fun:'🎉 مرح'})[c.type]||'تحدي'}</div>
            <div class="ch-text">${escapeHtml(c.text)}</div>
          </div>
          <div class="msg-meta"><span class="msg-time">${msg.time||''}</span></div>
          <div class="msg-reactions"></div>
        `;
        container.appendChild(wrap);
        container.scrollTop = container.scrollHeight;
        initMessageLongPress(wrap);
        return;
      }
      origHandleSignal.call(this, event);
    };
  }

  // Hook into analytics
  const origReceive = window.receiveMessage;
  if (origReceive) {
    window.receiveMessage = function(data) {
      updateAnalytics({ type: data.msgType || 'text', text: data.text });
      origReceive.call(this, data);
      // Long press for reactions
      setTimeout(() => {
        const container = document.getElementById('messages-container');
        const last = container?.lastElementChild;
        if (last && !last._lpInit) { last._lpInit = true; initMessageLongPress(last); }
      }, 100);
    };
  }

  // Open analytics panel
  const analyticsBtn = document.getElementById('analytics-panel-btn');
  analyticsBtn?.addEventListener('click', () => {
    renderAnalyticsPanel();
    document.getElementById('analytics-modal')?.classList.remove('hidden');
  });

  // Open theme builder from settings
  const themeBuilderBtn = document.getElementById('open-theme-builder');
  if (!themeBuilderBtn) {
    // Try to find settings panel and add button
    const settingsPanel = document.getElementById('panel-settings');
    if (settingsPanel) {
      const btn = document.createElement('button');
      btn.className = 'theme-builder-btn';
      btn.id = 'open-theme-builder';
      btn.innerHTML = '<i class="fa-solid fa-paintbrush"></i> منشئ الثيم المتقدم';
      settingsPanel.appendChild(btn);
      btn.addEventListener('click', () => {
        document.getElementById('theme-builder-overlay')?.classList.add('open');
        renderThemeBuilderPresets();
        renderThemeColorSwatches();
        updateThemePreview();
      });
    }
  }

  console.log('[شات برو v4.0.0] ✅ تم تهيئة جميع الميزات الجديدة');

  // Expose globals for cross-file access
  window.initRoomsPanel = initRoomsPanel;
  window.updateAnalytics = updateAnalytics;
  window.resetAnalytics = resetAnalytics;
  window.renderAnalyticsPanel = renderAnalyticsPanel;
  window.initMessageLongPress = initMessageLongPress;
  window.cancelRecording = cancelRecording;
  window.sendVoiceMessage = sendVoiceMessage;
  window.renderVoiceMessage = renderVoiceMessage;
}

// Auto-init after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(initNewFeaturesV4, 500));
} else {
  setTimeout(initNewFeaturesV4, 500);
}
