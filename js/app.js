/* ============================================================
   شات برو v2.5.0 - Core Application
   ============================================================ */
'use strict';

// ====================== STATE ======================
const STATE = {
  user: null, partner: null,
  chatMode: 'text', filterGender: 'any', filterInterest: '',
  stats: { chats: 0, messages: 0 },
  settings: {
    sound: true, notifications: false, showTyping: true,
    anonymous: false, accent: '#00d4ff', darkMode: true,
    vibrate: true, blockImages: false, chatTheme: 'default', fontSize: 15
  },
  searching: false, connected: false,
  friends: [], history: [], notifications: [],
  searchTimer: null, searchSeconds: 0,
  durationTimer: null, durationSeconds: 0,
  typingTimer: null, stopTypingTimer: null,
  peer: null, conn: null, localStream: null,
  myPeerId: null, channel: null,
  currentPanel: 'chat',
  selectedAvatar: null,
  sessionMessages: 0,
  botReplyInterval: null
};

// ====================== CHANNEL ======================
function initChannel() {
  try {
    STATE.channel = new BroadcastChannel('chatpro-signal-v3');
    STATE.channel.onmessage = handleSignal;
  } catch(e) {}
}

function sendSignal(data) {
  if (STATE.channel) try { STATE.channel.postMessage(data); } catch(e) {}
}

function handleSignal(event) {
  const msg = event.data;
  if (!msg?.type) return;
  switch (msg.type) {
    case 'SEEKING':
      if (!STATE.searching || STATE.connected || msg.from === STATE.myPeerId) return;
      if (STATE.filterGender !== 'any' && msg.gender !== STATE.filterGender && msg.gender !== 'any') return;
      tryConnectTo(msg.from, msg.name, msg.gender);
      break;
    case 'CONNECTED_ACK':
      if (msg.to !== STATE.myPeerId) return;
      onConnected(msg.from, msg.name, msg.gender);
      break;
    case 'CHAT_MSG':
      if (msg.to !== STATE.myPeerId || !STATE.connected) return;
      if (STATE.settings.blockImages && msg.msgType === 'image') return;
      receiveMessage(msg);
      break;
    case 'TYPING':
      if (msg.to !== STATE.myPeerId || !STATE.connected) return;
      showPartnerTyping(msg.typing);
      break;
    case 'DISCONNECT':
      if (msg.to !== STATE.myPeerId) return;
      partnerDisconnected();
      break;
  }
}

function tryConnectTo(pid, pname, pgender) {
  if (STATE.connected) return;
  STATE.connected = true;
  STATE.partner = { id: pid, name: pname, gender: pgender };
  sendSignal({ type: 'CONNECTED_ACK', from: STATE.myPeerId, to: pid, name: getDisplayName(), gender: STATE.user.gender });
  onConnected(pid, pname, pgender);
}

// ====================== PEER.JS ======================
function initPeer() {
  try {
    const pid = 'cp-' + genId();
    STATE.myPeerId = pid;
    STATE.peer = new Peer(pid, { host: '0.peerjs.com', port: 443, secure: true, debug: 0 });
    STATE.peer.on('connection', conn => { if (!STATE.connected && STATE.searching) { STATE.conn = conn; setupConn(conn); } });
    STATE.peer.on('call', call => { if (STATE.localStream) { call.answer(STATE.localStream); call.on('stream', showRemoteVideo); } });
    STATE.peer.on('error', () => {});
  } catch(e) {}
}

function setupConn(conn) {
  conn.on('data', data => {
    if (data.type === 'msg') receiveMessage(data);
    else if (data.type === 'typing') showPartnerTyping(data.typing);
    else if (data.type === 'disconnect') partnerDisconnected();
  });
}

// ====================== UTILS ======================
function genId() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
function getTime() { return new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }); }
function pad(n) { return String(n).padStart(2, '0'); }
function fmtDuration(s) { return `${pad(Math.floor(s/60))}:${pad(s%60)}`; }
function getDisplayName() { return STATE.settings.anonymous ? 'مجهول' : STATE.user?.name || 'زائر'; }

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'<br>');
}

function vibrate(pattern) {
  if (STATE.settings.vibrate && navigator.vibrate) navigator.vibrate(pattern);
}

// ====================== STORAGE ======================
function saveData() {
  try {
    localStorage.setItem('cp_user', JSON.stringify(STATE.user));
    localStorage.setItem('cp_stats', JSON.stringify(STATE.stats));
    localStorage.setItem('cp_friends', JSON.stringify(STATE.friends));
    localStorage.setItem('cp_history', JSON.stringify(STATE.history));
    localStorage.setItem('cp_settings', JSON.stringify(STATE.settings));
    localStorage.setItem('cp_notifs', JSON.stringify(STATE.notifications));
  } catch(e) {}
}

function loadData() {
  try {
    const u = localStorage.getItem('cp_user');
    const s = localStorage.getItem('cp_stats');
    const f = localStorage.getItem('cp_friends');
    const h = localStorage.getItem('cp_history');
    const st = localStorage.getItem('cp_settings');
    const n = localStorage.getItem('cp_notifs');
    if (u) STATE.user = JSON.parse(u);
    if (s) STATE.stats = { ...STATE.stats, ...JSON.parse(s) };
    if (f) STATE.friends = JSON.parse(f);
    if (h) STATE.history = JSON.parse(h);
    if (st) STATE.settings = { ...STATE.settings, ...JSON.parse(st) };
    if (n) STATE.notifications = JSON.parse(n);
  } catch(e) {}
}

// ====================== TOAST ======================
function toast(msg, type = 'info', dur = 3000) {
  const icons = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info', warning:'fa-triangle-exclamation' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fa-solid ${icons[type]||icons.info}"></i> ${msg}`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => { el.style.animation='toastOut 0.3s ease forwards'; setTimeout(()=>el.remove(),300); }, dur);
}

function pushNotification(msg, type='info') {
  STATE.notifications.unshift({ msg, type, time: getTime(), id: genId() });
  if (STATE.notifications.length > 30) STATE.notifications.pop();
  updateNotifList();
  saveData();
}

// ====================== SPLASH ======================
function initSplash() {
  setTimeout(() => {
    loadData();
    applySettings();
    if (STATE.user) showApp();
    else showScreen('setup-screen');
  }, 2500);
}

function showScreen(id) {
  ['splash','setup-screen','app'].forEach(s => { const el=document.getElementById(s); if(el) el.classList.add('hidden'); });
  const t = document.getElementById(id);
  if (t) t.classList.remove('hidden');
}

// ====================== SETUP STEPS ======================
let setupStep = 1;
let selectedGender = 'male';
let selectedAge = '18-24';
let selectedInterests = new Set();
let selectedAvatar = null;

function initSetup() {
  // Gender
  document.querySelectorAll('.gender-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gender-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active'); selectedGender = btn.dataset.gender;
    });
  });
  // Age
  document.querySelectorAll('.age-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.age-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active'); selectedAge = btn.dataset.age;
    });
  });
  // Interests
  document.querySelectorAll('.interest-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      tag.classList.toggle('active');
      if(selectedInterests.has(tag.dataset.tag)) selectedInterests.delete(tag.dataset.tag);
      else selectedInterests.add(tag.dataset.tag);
    });
  });
  // Step navigation
  document.getElementById('next-step-btn').addEventListener('click', () => {
    const name = document.getElementById('username-input').value.trim();
    if (!name) { toast('يرجى إدخال اسمك', 'error'); return; }
    goToStep(2);
  });
  document.getElementById('prev-step-btn').addEventListener('click', () => goToStep(1));
  document.getElementById('next-step-2-btn').addEventListener('click', () => goToStep(3));
  document.getElementById('prev-step-2-btn').addEventListener('click', () => goToStep(2));
  // Accept rules
  document.getElementById('accept-rules').addEventListener('change', function() {
    document.getElementById('start-btn').disabled = !this.checked;
  });
  // Start
  document.getElementById('start-btn').addEventListener('click', () => {
    const name = document.getElementById('username-input').value.trim();
    STATE.user = { name, gender: selectedGender, age: selectedAge, lang: document.getElementById('lang-select').value, interests: [...selectedInterests], id: genId(), joinDate: new Date().toLocaleDateString('ar'), avatar: selectedAvatar };
    saveData(); showApp(); toast('مرحباً بك ' + name + '! 🎉', 'success');
  });
}

function goToStep(n) {
  [1,2,3].forEach(i => {
    const el = document.getElementById('setup-step-'+i);
    if (el) el.classList.toggle('hidden', i !== n);
    const dot = document.getElementById('sdot'+i);
    if (dot) { dot.classList.toggle('active', i===n); dot.classList.toggle('done', i<n); }
  });
  setupStep = n;
}

// ====================== APP ======================
function showApp() {
  showScreen('app');
  updateSidebarUser();
  updateStats();
  updateFriendsList();
  updateHistoryList();
  updateNotifList();
  updateSettingsStats();
  applySettings();
  initPeer();
  initChannel();
  startOnlineCounter();
  updateQuickStats();
  setInterval(updateQuickStats, 20000);
  window.addEventListener('online', () => document.getElementById('conn-status').classList.add('hidden'));
  window.addEventListener('offline', () => document.getElementById('conn-status').classList.remove('hidden'));
}

function updateSidebarUser() {
  if (!STATE.user) return;
  document.getElementById('sidebar-name').textContent = getDisplayName();
  const av = document.getElementById('sidebar-avatar');
  av.innerHTML = STATE.user.avatar ? STATE.user.avatar : '<i class="fa-solid fa-user"></i>';
  av.style.fontSize = STATE.user.avatar ? '1.6rem' : '';
}

function updateStats() {
  document.getElementById('stat-chats').textContent = STATE.stats.chats;
  document.getElementById('stat-msgs').textContent = STATE.stats.messages;
}

function updateSettingsStats() {
  const tc = document.getElementById('total-chats-stat');
  const tm = document.getElementById('total-msgs-stat');
  const tf = document.getElementById('total-friends-stat');
  if (tc) tc.textContent = STATE.stats.chats;
  if (tm) tm.textContent = STATE.stats.messages;
  if (tf) tf.textContent = STATE.friends.length;
}

function updateQuickStats() {
  const online = 380 + Math.floor(Math.random() * 900);
  const chats = Math.floor(online * 0.3);
  const qo = document.getElementById('qs-online');
  const qc = document.getElementById('qs-chats');
  if (qo) qo.textContent = online.toLocaleString('ar');
  if (qc) qc.textContent = chats.toLocaleString('ar');
}

// ====================== NAVIGATION ======================
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      switchPanel(item.dataset.panel);
      if (window.innerWidth < 768) closeSidebar();
    });
  });
  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.remove('hidden');
  });
  document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
  document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.add('hidden');
}

function switchPanel(name) {
  STATE.currentPanel = name;
  document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.panel===name));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id==='panel-'+name));
  const titles = {
    chat:'محادثة عشوائية', friends:'الأصدقاء', history:'السجل',
    notifications:'الإشعارات', achievements:'الإنجازات', settings:'الإعدادات',
    rooms:'غرف الاهتمامات 🚪'
  };
  document.getElementById('topbar-title').innerHTML = `<i class="fa-solid fa-comments"></i><span>${titles[name]||name}</span>`;
  if (name === 'settings') updateSettingsStats();
  if (name === 'rooms' && window.initRoomsPanel) {
    // init rooms on first visit
    if (!window._roomsInited) { window._roomsInited = true; window.initRoomsPanel(); }
  }
}

// ====================== MOOD ======================
function initMood() {
  document.querySelectorAll('.mood-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.mood-opt').forEach(o=>o.classList.remove('active'));
      opt.classList.add('active');
      const mood = opt.dataset.mood;
      document.getElementById('user-mood-display').textContent = mood;
      if (STATE.user) { STATE.user.mood = mood; saveData(); }
    });
  });
  // Restore mood
  if (STATE.user?.mood) {
    const el = document.querySelector(`[data-mood="${STATE.user.mood}"]`);
    if (el) { document.querySelectorAll('.mood-opt').forEach(o=>o.classList.remove('active')); el.classList.add('active'); }
    const md = document.getElementById('user-mood-display');
    if (md) md.textContent = STATE.user.mood;
  }
}

// ====================== CHAT PANEL ======================
function initChatPanel() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active'); STATE.chatMode = btn.dataset.mode;
    });
  });
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active'); STATE.filterGender = btn.dataset.filterGender;
    });
  });
  document.getElementById('interest-filter').addEventListener('change', function() { STATE.filterInterest = this.value; });
  document.getElementById('find-btn').addEventListener('click', startSearch);
  document.getElementById('cancel-search-btn').addEventListener('click', cancelSearch);
  document.getElementById('next-btn').addEventListener('click', startSearch);
  document.getElementById('back-home-btn').addEventListener('click', goHome);
  document.getElementById('skip-btn').addEventListener('click', skipPartner);
  document.getElementById('add-friend-btn').addEventListener('click', addFriend);
  document.getElementById('report-btn').addEventListener('click', () => openModal('report-modal'));
  document.getElementById('submit-report-btn').addEventListener('click', submitReport);
  document.getElementById('export-chat-btn').addEventListener('click', exportChat);
  document.getElementById('send-btn').addEventListener('click', sendMessage);
  document.getElementById('clear-history-btn').addEventListener('click', clearHistory);
  document.getElementById('clear-notif-btn').addEventListener('click', clearNotifications);

  const msgInput = document.getElementById('msg-input');
  msgInput.addEventListener('keydown', e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
  msgInput.addEventListener('input', function() {
    this.style.height='auto'; this.style.height=Math.min(this.scrollHeight,140)+'px';
    const cc = document.getElementById('char-count');
    if (cc) cc.textContent = `${this.value.length}/1000`;
    sendTypingIndicator(true);
  });

  document.getElementById('attach-btn').addEventListener('click', () => document.getElementById('file-input').click());
  document.getElementById('file-input').addEventListener('change', handleImageUpload);
  document.getElementById('emoji-btn').addEventListener('click', e => { e.stopPropagation(); togglePanel('emoji-picker'); });
  document.getElementById('gif-btn').addEventListener('click', e => { e.stopPropagation(); togglePanel('gif-panel'); });
  document.getElementById('sticker-btn').addEventListener('click', e => { e.stopPropagation(); togglePanel('sticker-panel'); });
  document.getElementById('games-btn').addEventListener('click', e => { e.stopPropagation(); togglePanel('games-panel'); });
  document.getElementById('theme-btn').addEventListener('click', e => { e.stopPropagation(); togglePanel('theme-panel'); });

  document.addEventListener('click', closeAllPanels);
  buildEmojiPicker();

  // Video controls
  document.getElementById('toggle-cam').addEventListener('click', toggleCamera);
  document.getElementById('toggle-mic').addEventListener('click', toggleMic);
  document.getElementById('toggle-screen').addEventListener('click', toggleScreenShare);
  document.getElementById('end-call').addEventListener('click', endVideoCall);

  // Emoji tabs
  document.querySelectorAll('.etab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.etab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active'); buildEmojiPicker(tab.dataset.etab);
    });
  });

  // Image viewer
  document.getElementById('img-close').addEventListener('click', () => closeModal('img-modal'));
  document.getElementById('img-modal').addEventListener('click', e => { if(e.target===e.currentTarget) closeModal('img-modal'); });
}

function togglePanel(id) {
  const panels = ['emoji-picker','gif-panel','sticker-panel','games-panel','theme-panel'];
  panels.forEach(p => { if(p!==id) { const el=document.getElementById(p); if(el) el.classList.add('hidden'); } });
  const el = document.getElementById(id);
  if (el) el.classList.toggle('hidden');
}

function closeAllPanels() {
  ['emoji-picker','gif-panel','sticker-panel','games-panel','theme-panel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
}

// ====================== SEARCH ======================
function startSearch() {
  if (!STATE.user) return;
  disconnectPartner(false);
  STATE.connected = false; STATE.searching = true; STATE.partner = null;
  STATE.sessionMessages = 0;
  showChatSubscreen('searching-screen');
  STATE.searchSeconds = 0;
  clearInterval(STATE.searchTimer);
  STATE.searchTimer = setInterval(() => {
    STATE.searchSeconds++;
    const el = document.getElementById('search-timer-text');
    if (el) el.textContent = fmtDuration(STATE.searchSeconds);
    if (STATE.searchSeconds >= 3 && !STATE.connected) simulateConnection();
  }, 1000);

  sendSignal({ type:'SEEKING', from:STATE.myPeerId, name:getDisplayName(), gender:STATE.user.gender, interests:[...selectedInterests], ts:Date.now() });
}

function cancelSearch() {
  STATE.searching = false;
  clearInterval(STATE.searchTimer);
  showChatSubscreen('waiting-screen');
  toast('تم إلغاء البحث','info');
}

// ====================== BOT SIMULATION ======================
const BOT_NAMES = ['أحمد','محمد','سارة','لين','عمر','نور','خالد','ريم','فارس','هند','ياسر','دانا','زياد','لمى'];
const BOT_GENDERS = ['male','female'];
const BOT_GREETINGS = ['مرحبا! كيف حالك؟ 😊','أهلا! من أين أنت؟','هاي! شو عندك؟','السلام عليكم! كيفك؟','مرحبا بك! 👋','هلا! ما أخبارك؟'];
const BOT_REPLIES = ['جميل! 😊','أوه واو!','هههه 😄','ما شاء الله!','كيف ذلك؟','أنا أيضاً! 🙌','رأيك رائع!','شكراً 😊','حقاً؟','أتفق معك!','😂 صح','وانت؟','نعم! ✅','مثير للاهتمام!','💯 دائماً'];

function simulateConnection() {
  if (STATE.connected) return;
  clearInterval(STATE.searchTimer);
  const name = BOT_NAMES[Math.floor(Math.random()*BOT_NAMES.length)];
  const gender = BOT_GENDERS[Math.floor(Math.random()*BOT_GENDERS.length)];
  STATE.connected = true; STATE.searching = false;
  STATE.partner = { id:'bot-'+genId(), name, gender, isBot:true };
  onConnected(STATE.partner.id, name, gender);
  setTimeout(() => {
    if (!STATE.connected) return;
    showPartnerTyping(true);
    setTimeout(() => {
      showPartnerTyping(false);
      receiveMessage({ content:BOT_GREETINGS[Math.floor(Math.random()*BOT_GREETINGS.length)], time:getTime() });
      setupBotReplies();
    }, 1000 + Math.random()*1000);
  }, 600);
}

function setupBotReplies() {
  clearInterval(STATE.botReplyInterval);
  STATE.botReplyInterval = setInterval(() => {
    if (!STATE.connected || !STATE.partner?.isBot) { clearInterval(STATE.botReplyInterval); return; }
    showPartnerTyping(true);
    setTimeout(() => {
      if (!STATE.connected) return;
      showPartnerTyping(false);
      receiveMessage({ content:BOT_REPLIES[Math.floor(Math.random()*BOT_REPLIES.length)], time:getTime() });
    }, 1000 + Math.random()*1500);
  }, 7000 + Math.random()*8000);
}

// ====================== CONNECTION ======================
function onConnected(partnerId, partnerName, partnerGender) {
  clearInterval(STATE.searchTimer);
  STATE.connected = true; STATE.searching = false;
  if (!STATE.partner) STATE.partner = { id:partnerId, name:partnerName, gender:partnerGender };
  STATE.stats.chats++; STATE.sessionMessages = 0;
  updateStats(); saveData();
  // Reset analytics for new chat session
  if (window.resetAnalytics) window.resetAnalytics();

  showChatSubscreen('chat-area');
  document.getElementById('partner-name').textContent = partnerName || 'شخص مجهول';
  document.getElementById('partner-status').textContent = 'متصل';
  document.getElementById('partner-typing').classList.add('hidden');

  // Avatar emoji based on name
  const avatarEmojis = ['🦁','🐺','🦊','🐉','🦅','🤖','👽','⚡','🎭','🌟'];
  let hash=0; for(let c of (partnerName||'x')) hash=c.charCodeAt(0)+((hash<<5)-hash);
  document.getElementById('partner-avatar-emoji').textContent = avatarEmojis[Math.abs(hash)%avatarEmojis.length];

  document.getElementById('report-btn').classList.remove('hidden');
  document.getElementById('export-chat-btn').classList.remove('hidden');

  const mc = document.getElementById('messages-container');
  mc.innerHTML = '';
  appendSysMsg(`تم الاتصال مع ${partnerName}! قل مرحباً 👋`);

  // Start chat duration
  STATE.durationSeconds = 0;
  clearInterval(STATE.durationTimer);
  STATE.durationTimer = setInterval(() => {
    STATE.durationSeconds++;
    const el = document.getElementById('duration-text');
    if (el) el.textContent = fmtDuration(STATE.durationSeconds);
  }, 1000);

  setTimeout(() => document.getElementById('msg-input')?.focus(), 200);

  if (STATE.settings.notifications) {
    try { new Notification('شات برو', { body:`تم توصيلك مع ${partnerName}!` }); } catch(e) {}
  }

  playSound('connect');
  vibrate([100,50,100]);
  pushNotification(`تم توصيلك مع ${partnerName} 🔗`, 'success');

  if (STATE.chatMode==='video' || STATE.chatMode==='audio') startVideoCall();
}

function disconnectPartner(notify=true) {
  clearInterval(STATE.botReplyInterval);
  clearInterval(STATE.durationTimer);
  if (notify && STATE.connected && STATE.partner) {
    sendSignal({ type:'DISCONNECT', to:STATE.partner.id, from:STATE.myPeerId });
  }
  if (STATE.localStream) { STATE.localStream.getTracks().forEach(t=>t.stop()); STATE.localStream=null; }
  const va = document.getElementById('video-area');
  if (va) va.classList.add('hidden');
  document.getElementById('report-btn').classList.add('hidden');
  document.getElementById('export-chat-btn').classList.add('hidden');
  STATE.connected = false;
  if (STATE.partner) { saveHistory(STATE.partner); updateHistoryList(); }
  STATE.partner = null;
}

function partnerDisconnected() {
  if (!STATE.connected) return;
  const dur = STATE.durationSeconds;
  disconnectPartner(false);
  document.getElementById('disco-duration').textContent = dur;
  document.getElementById('disco-msgs').textContent = STATE.sessionMessages;
  showChatSubscreen('disconnected-screen');
  document.getElementById('disco-reason').textContent = 'قطع الطرف الآخر الاتصال';
  playSound('disconnect'); vibrate([200]);
  toast('انتهت المحادثة','info');
  pushNotification('قطع شريك المحادثة الاتصال','info');
}

function skipPartner() {
  const dur = STATE.durationSeconds;
  disconnectPartner(true);
  document.getElementById('disco-duration').textContent = dur;
  document.getElementById('disco-msgs').textContent = STATE.sessionMessages;
  setTimeout(() => { showChatSubscreen('disconnected-screen'); document.getElementById('disco-reason').textContent='تخطيت هذه المحادثة'; }, 200);
  playSound('disconnect');
}

function goHome() {
  disconnectPartner(false);
  showChatSubscreen('waiting-screen');
}

// ====================== MESSAGES ======================
function sendMessage() {
  document.dispatchEvent(new CustomEvent('messageSent', { detail: { type: 'text' } }));
  if (!STATE.connected) { toast('لست متصلاً بأحد','error'); return; }
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if (!text) return;
  const time = getTime();
  appendMessage(text, 'mine', time, 'text');
  if (STATE.partner && !STATE.partner.isBot) {
    sendSignal({ type:'CHAT_MSG', to:STATE.partner.id, from:STATE.myPeerId, content:text, time, msgType:'text' });
  }
  STATE.stats.messages++; STATE.sessionMessages++;
  updateStats(); saveData();
  // Analytics tracking
  if (window.updateAnalytics) updateAnalytics({ type: 'text', text: text });
  input.value=''; input.style.height='auto';
  const cc = document.getElementById('char-count');
  if (cc) cc.textContent='0/1000';
  clearTypingIndicator();
}

function receiveMessage(data) {
  const type = data.msgType || 'text';
  if (type==='voice') { appendVoiceMessage(data.content, data.duration||0,'theirs'); }
  else { appendMessage(data.content||'','theirs',data.time||getTime(),type); }
  STATE.sessionMessages++;
  playSound('message'); vibrate([50]);
}

function appendMessage(content, side, time, type='text') {
  const mc = document.getElementById('messages-container');
  const bubble = document.createElement('div');
  bubble.className = `msg-bubble ${side}`;
  bubble.style.fontSize = STATE.settings.fontSize+'px';

  if (type==='image') {
    const img = document.createElement('img');
    img.src = content; img.className='msg-img';
    img.onclick = () => showImageViewer(content);
    img.onerror = () => img.style.display='none';
    bubble.appendChild(img);
  } else {
    const textNode = document.createElement('span');
    textNode.innerHTML = escapeHtml(content);
    bubble.appendChild(textNode);
  }

  const tm = document.createElement('span');
  tm.className='msg-time'; tm.textContent=time;
  bubble.appendChild(tm);

  // Reaction button
  if (typeof attachReactionMenu === 'function') attachReactionMenu(bubble, side);
  // Copy button
  if (typeof addCopyBtn === 'function' && type==='text') addCopyBtn(bubble, content);
  // Translate button for received messages
  if (typeof addTranslateBtn === 'function' && side==='theirs' && type==='text') addTranslateBtn(bubble, content);

  const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
  bubble.dataset.msgId = msgId;
  bubble.classList.add('message-wrap');

  // Add reactions container
  const reactionsDiv = document.createElement('div');
  reactionsDiv.className = 'msg-reactions';
  bubble.appendChild(reactionsDiv);

  mc.appendChild(bubble);
  mc.scrollTop = mc.scrollHeight;

  // Attach long press for v4 reactions
  if (window.initMessageLongPress) window.initMessageLongPress(bubble);

  // Show scroll-to-bottom if user scrolled up
  const scrollBtn = document.getElementById('scroll-to-bottom-btn');
  if (scrollBtn) {
    const isNearBottom = mc.scrollHeight - mc.scrollTop - mc.clientHeight < 200;
    if (!isNearBottom) scrollBtn.classList.add('visible');
  }
}

function appendVoiceMessage(src, duration, side) {
  const mc = document.getElementById('messages-container');
  const bubble = document.createElement('div');
  bubble.className = `msg-bubble ${side} voice-bubble`;
  const dur = fmtDuration(duration);
  bubble.innerHTML = `
    <div class="voice-msg-wrap">
      <button class="voice-play-btn" onclick="toggleVoicePlay(this,'${src}')">
        <i class="fa-solid fa-play"></i>
      </button>
      <div class="voice-wave">
        ${Array(12).fill(0).map(()=>`<span style="height:${8+Math.random()*22}px"></span>`).join('')}
      </div>
      <span class="voice-dur">${dur}</span>
    </div>
    <span class="msg-time">${getTime()}</span>
  `;
  mc.appendChild(bubble);
  mc.scrollTop = mc.scrollHeight;
}

window.toggleVoicePlay = function(btn, src) {
  if (window._currentAudio && !window._currentAudio.paused) {
    window._currentAudio.pause();
    document.querySelectorAll('.voice-play-btn i').forEach(i=>i.className='fa-solid fa-play');
    window._currentAudio=null; return;
  }
  const audio = new Audio(src);
  window._currentAudio = audio;
  btn.querySelector('i').className='fa-solid fa-pause';
  audio.play();
  audio.onended=()=>{ btn.querySelector('i').className='fa-solid fa-play'; window._currentAudio=null; };
};

function appendSysMsg(text) {
  const mc = document.getElementById('messages-container');
  const el = document.createElement('div');
  el.className='sys-msg';
  el.innerHTML=`<i class="fa-solid fa-info-circle"></i> ${text}`;
  mc.appendChild(el);
  mc.scrollTop=mc.scrollHeight;
}

// ====================== IMAGE VIEWER ======================
function showImageViewer(src) {
  document.getElementById('img-viewer').src=src;
  document.getElementById('img-download').href=src;
  openModal('img-modal');
}

// ====================== TYPING ======================
function sendTypingIndicator(isTyping) {
  if (!STATE.settings.showTyping || !STATE.connected || !STATE.partner || STATE.partner.isBot) return;
  sendSignal({ type:'TYPING', to:STATE.partner.id, from:STATE.myPeerId, typing:isTyping });
  clearTimeout(STATE.stopTypingTimer);
  if (isTyping) STATE.stopTypingTimer=setTimeout(()=>sendTypingIndicator(false),2000);
}

function clearTypingIndicator() {
  clearTimeout(STATE.typingTimer); clearTimeout(STATE.stopTypingTimer);
  sendTypingIndicator(false);
}

function showPartnerTyping(isTyping) {
  const pt = document.getElementById('partner-typing');
  const ps = document.getElementById('partner-status');
  if (pt) pt.classList.toggle('hidden', !isTyping);
  if (ps) ps.classList.toggle('hidden', isTyping);
}

// ====================== IMAGE UPLOAD ======================
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file || !STATE.connected) return;
  if (file.size > 8*1024*1024) { toast('الصورة كبيرة جداً (الحد 8 ميجابايت)','error'); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    const url = ev.target.result;
    appendMessage(url,'mine',getTime(),'image');
    if (STATE.partner && !STATE.partner.isBot) {
      sendSignal({ type:'CHAT_MSG', to:STATE.partner.id, from:STATE.myPeerId, content:url, time:getTime(), msgType:'image' });
    }
    STATE.stats.messages++; STATE.sessionMessages++;
    updateStats(); saveData();
  };
  reader.readAsDataURL(file);
  e.target.value='';
}

// ====================== EMOJI PICKER ======================
const EMOJI_SETS = {
  smileys:['😀','😁','😂','🤣','😊','😍','🥰','😎','🤩','😜','🤪','😇','🥳','😢','😭','😡','🤬','😱','🤯','🤔','🤗','😴','🥱','😷','🤒','🤫','🤭','😬','🤑','😈'],
  gestures:['👋','👍','👎','👏','🙌','🤝','🙏','💪','🤞','✌️','🤙','👌','🤟','☝️','👆','👇','👈','👉','🫶','🤲'],
  hearts:['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','🔥','⭐','✨','💫','🌟','💥','🎉','🎊','🎁','✅','❌','💯'],
  nature:['🌹','🌷','🌸','🌺','🌻','🌼','🍀','🌿','🍃','🌱','🌲','🌴','🦁','🐺','🦊','🐉','🦅','🌙','☀️','⛅','🌈','🌊','⚡','🔥','💧','🌍','🇾🇪'],
  symbols:['😀','🎵','🎶','🎸','🎹','🎺','🎻','🥁','🎤','🎧','📱','💻','🖥️','📷','🎮','🏆','⚽','🏀','🎯','🎲','🃏','♟️','🎰','🎱','🎳']
};

function buildEmojiPicker(setName='smileys') {
  const grid = document.getElementById('emoji-grid');
  if (!grid) return;
  grid.innerHTML='';
  const emojis = EMOJI_SETS[setName] || EMOJI_SETS.smileys;
  emojis.forEach(e => {
    const s = document.createElement('span');
    s.className='emoji-item'; s.textContent=e;
    s.addEventListener('click', () => {
      const inp=document.getElementById('msg-input');
      inp.value+=e; inp.focus();
      document.getElementById('emoji-picker')?.classList.add('hidden');
    });
    grid.appendChild(s);
  });
}

// ====================== VIDEO ======================
async function startVideoCall() {
  try {
    const constraints = { video:STATE.chatMode==='video', audio:true };
    STATE.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    document.getElementById('local-video').srcObject=STATE.localStream;
    document.getElementById('video-area').classList.remove('hidden');
    if (STATE.peer && STATE.partner && !STATE.partner.isBot) {
      const call = STATE.peer.call(STATE.partner.id, STATE.localStream);
      call.on('stream', showRemoteVideo);
    }
    toast('تم بدء المكالمة','success');
  } catch(e) { toast('تعذر الوصول للكاميرا/الميكروفون','error'); }
}

function showRemoteVideo(stream) { document.getElementById('remote-video').srcObject=stream; }

function toggleCamera() {
  if (!STATE.localStream) return;
  const t=STATE.localStream.getVideoTracks()[0];
  if (t) { t.enabled=!t.enabled; document.getElementById('toggle-cam').innerHTML=t.enabled?'<i class="fa-solid fa-video"></i>':'<i class="fa-solid fa-video-slash"></i>'; }
}
function toggleMic() {
  if (!STATE.localStream) return;
  const t=STATE.localStream.getAudioTracks()[0];
  if (t) { t.enabled=!t.enabled; document.getElementById('toggle-mic').innerHTML=t.enabled?'<i class="fa-solid fa-microphone"></i>':'<i class="fa-solid fa-microphone-slash"></i>'; }
}
async function toggleScreenShare() {
  try {
    const screen=await navigator.mediaDevices.getDisplayMedia({video:true});
    const sender=STATE.peer?._peerConnections?.[STATE.partner?.id]?.getSenders?.()?.find?.(s=>s.track?.kind==='video');
    if (sender) sender.replaceTrack(screen.getTracks()[0]);
    document.getElementById('toggle-screen').classList.add('active');
    screen.getTracks()[0].onended=()=>document.getElementById('toggle-screen').classList.remove('active');
  } catch(e) { toast('تعذر مشاركة الشاشة','error'); }
}
function endVideoCall() {
  if (STATE.localStream) { STATE.localStream.getTracks().forEach(t=>t.stop()); STATE.localStream=null; }
  document.getElementById('video-area').classList.add('hidden');
  appendSysMsg('انتهت مكالمة الفيديو');
}

// ====================== FRIENDS ======================
function addFriend() {
  document.dispatchEvent(new CustomEvent('friendAdded'));
  if (!STATE.partner) return;
  if (STATE.friends.some(f=>f.name===STATE.partner.name)) { toast('موجود في قائمة أصدقائك','info'); return; }
  STATE.friends.push({ id:STATE.partner.id, name:STATE.partner.name, gender:STATE.partner.gender, addedDate:new Date().toLocaleDateString('ar') });
  updateFriendsList(); saveData();
  toast('تمت إضافة '+STATE.partner.name+' إلى الأصدقاء! 🤝','success');
}

function updateFriendsList() {
  const list = document.getElementById('friends-list');
  const search = document.getElementById('friends-search')?.value?.toLowerCase()||'';
  const filtered = STATE.friends.filter(f=>f.name.toLowerCase().includes(search));
  if (!filtered.length) { list.innerHTML='<div class="empty-state"><i class="fa-solid fa-user-plus"></i><p>لا يوجد أصدقاء</p><small>أضف أشخاصاً من المحادثات</small></div>'; return; }
  list.innerHTML=filtered.map(f=>`
    <div class="friend-item">
      <div class="friend-avatar" style="background:linear-gradient(135deg,${randomGrad(f.name)})">
        <i class="fa-solid fa-user"></i>
      </div>
      <div class="friend-info">
        <span class="friend-name">${f.name}</span>
        <span class="friend-meta">أضيف ${f.addedDate}</span>
      </div>
      <button class="icon-btn danger remove-friend-btn" data-id="${f.id}"><i class="fa-solid fa-trash"></i></button>
    </div>
  `).join('');
  list.querySelectorAll('.remove-friend-btn').forEach(btn=>{
    btn.addEventListener('click',e=>{e.stopPropagation();STATE.friends=STATE.friends.filter(f=>f.id!==btn.dataset.id);updateFriendsList();saveData();toast('تم حذف الصديق','info');});
  });
  const badge=document.getElementById('friends-badge');
  if(badge){badge.textContent=STATE.friends.length;badge.classList.toggle('hidden',!STATE.friends.length);}
  updateSettingsStats();
}

document.addEventListener('DOMContentLoaded',()=>{
  const fs=document.getElementById('friends-search');
  if(fs) fs.addEventListener('input',updateFriendsList);
});

function randomGrad(seed) {
  const grads=['#00d4ff,#0066ff','#7c3aed,#0066ff','#f59e0b,#ef4444','#10b981,#0066ff','#ec4899,#8b5cf6'];
  let h=0; for(let c of seed) h=c.charCodeAt(0)+((h<<5)-h);
  return grads[Math.abs(h)%grads.length];
}

// ====================== HISTORY ======================
function saveHistory(partner) {
  STATE.history.unshift({ id:partner.id, name:partner.name, gender:partner.gender, date:new Date().toLocaleDateString('ar'), time:getTime(), duration:fmtDuration(STATE.durationSeconds), msgs:STATE.sessionMessages });
  if(STATE.history.length>100) STATE.history.pop();
  saveData();
}

function updateHistoryList() {
  const list=document.getElementById('history-list');
  if(!STATE.history.length){list.innerHTML='<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>لا يوجد سجل بعد</p></div>';return;}
  list.innerHTML=STATE.history.slice(0,50).map(h=>`
    <div class="history-item">
      <div class="history-avatar"><i class="fa-solid fa-user-secret"></i></div>
      <div class="history-info">
        <span class="history-name">${h.name}</span>
        <span class="history-sub">${h.date} · ${h.time} · ${h.duration||'--'} · ${h.msgs||0} رسائل</span>
      </div>
    </div>
  `).join('');
}

function clearHistory() { STATE.history=[]; updateHistoryList(); saveData(); toast('تم مسح السجل','success'); }

// ====================== NOTIFICATIONS ======================
function updateNotifList() {
  const list=document.getElementById('notif-list');
  if(!list) return;
  if(!STATE.notifications.length){list.innerHTML='<div class="empty-state"><i class="fa-regular fa-bell-slash"></i><p>لا توجد إشعارات</p></div>';return;}
  const icons={success:'fa-circle-check',error:'fa-circle-xmark',info:'fa-circle-info'};
  list.innerHTML=STATE.notifications.slice(0,30).map(n=>`
    <div class="notif-item">
      <i class="fa-solid ${icons[n.type]||icons.info}"></i>
      <span class="notif-text">${n.msg}</span>
      <span class="notif-time">${n.time}</span>
    </div>
  `).join('');
  const badge=document.getElementById('notif-badge');
  if(badge){badge.textContent=STATE.notifications.length;badge.classList.toggle('hidden',!STATE.notifications.length);}
}

function clearNotifications() { STATE.notifications=[]; updateNotifList(); saveData(); toast('تم مسح الإشعارات','success'); }

// ====================== REPORT ======================
function submitReport() {
  const r=document.querySelector('input[name="report-reason"]:checked');
  if(!r){toast('اختر سبب البلاغ','error');return;}
  closeModal('report-modal'); skipPartner();
  pushNotification('تم إرسال البلاغ بنجاح 🛡️','success');
  toast('تم إرسال البلاغ. شكراً! 🛡️','success');
}

// ====================== EXPORT ======================
function exportChat() {
  const mc=document.getElementById('messages-container');
  const msgs=[];
  mc.querySelectorAll('.msg-bubble').forEach(b=>{
    const side=b.classList.contains('mine')?getDisplayName():(STATE.partner?.name||'الطرف الآخر');
    const text=b.querySelector('.voice-msg-wrap')?'[رسالة صوتية]':b.childNodes[0]?.textContent?.trim()||'';
    const tm=b.querySelector('.msg-time')?.textContent||'';
    if(text) msgs.push(`[${tm}] ${side}: ${text}`);
  });
  if(!msgs.length){toast('لا توجد رسائل للتصدير','info');return;}
  const content=`شات برو - تصدير المحادثة\n${new Date().toLocaleString('ar')}\n${'='.repeat(40)}\n\n${msgs.join('\n')}`;
  const blob=new Blob([content],{type:'text/plain;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`chatpro-${Date.now()}.txt`; a.click();
  toast('تم التصدير بنجاح','success');
}

// ====================== SETTINGS ======================
function initSettings() {
  document.getElementById('dark-mode-toggle').addEventListener('change',function(){STATE.settings.darkMode=this.checked;applySettings();saveData();});
  document.getElementById('sound-toggle').addEventListener('change',function(){STATE.settings.sound=this.checked;saveData();});
  document.getElementById('typing-toggle').addEventListener('change',function(){STATE.settings.showTyping=this.checked;saveData();});
  document.getElementById('anon-toggle').addEventListener('change',function(){STATE.settings.anonymous=this.checked;updateSidebarUser();saveData();});
  document.getElementById('notif-toggle').addEventListener('change',function(){
    STATE.settings.notifications=this.checked;
    if(this.checked) Notification.requestPermission().then(p=>{if(p!=='granted'){this.checked=false;STATE.settings.notifications=false;toast('لم يُمنح إذن الإشعارات','error');}});
    saveData();
  });
  const vt=document.getElementById('vibrate-toggle');
  if(vt) vt.addEventListener('change',function(){STATE.settings.vibrate=this.checked;saveData();});
  const bi=document.getElementById('block-img-toggle');
  if(bi) bi.addEventListener('change',function(){STATE.settings.blockImages=this.checked;saveData();});

  document.querySelectorAll('.color-preset').forEach(p=>{
    p.addEventListener('click',()=>{
      document.querySelectorAll('.color-preset').forEach(x=>x.classList.remove('active'));
      p.classList.add('active');
      STATE.settings.accent=p.dataset.color;
      document.documentElement.style.setProperty('--accent',STATE.settings.accent);
      document.documentElement.style.setProperty('--accent-glow',STATE.settings.accent+'4d');
      document.documentElement.style.setProperty('--accent-dark',STATE.settings.accent+'cc');
      saveData();
    });
  });

  document.querySelectorAll('.fs-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.fs-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      STATE.settings.fontSize=parseInt(btn.dataset.size);
      saveData();
    });
  });

  // Edit profile
  document.getElementById('edit-profile-btn').addEventListener('click',()=>{
    document.getElementById('edit-username').value=STATE.user?.name||'';
    document.getElementById('edit-gender').value=STATE.user?.gender||'male';
    document.getElementById('edit-bio').value=STATE.user?.bio||'';
    // Mark current avatar
    document.querySelectorAll('.av-opt').forEach(a=>a.classList.toggle('active',a.dataset.avatar===STATE.user?.avatar));
    const ap=document.getElementById('avatar-preview');
    if(ap) ap.innerHTML=STATE.user?.avatar||'<i class="fa-solid fa-user fa-2x"></i>';
    openModal('profile-modal');
  });

  document.querySelectorAll('.av-opt').forEach(opt=>{
    opt.addEventListener('click',()=>{
      document.querySelectorAll('.av-opt').forEach(o=>o.classList.remove('active'));
      opt.classList.add('active'); selectedAvatar=opt.dataset.avatar;
      const ap=document.getElementById('avatar-preview');
      if(ap) ap.textContent=opt.dataset.avatar;
    });
  });

  document.getElementById('save-profile-btn').addEventListener('click',()=>{
    const name=document.getElementById('edit-username').value.trim();
    if(!name){toast('الاسم مطلوب','error');return;}
    STATE.user.name=name;
    STATE.user.gender=document.getElementById('edit-gender').value;
    STATE.user.bio=document.getElementById('edit-bio').value;
    if(selectedAvatar) STATE.user.avatar=selectedAvatar;
    updateSidebarUser(); saveData(); closeModal('profile-modal');
    toast('تم تحديث الملف الشخصي ✅','success');
  });

  // Logout
  ['logout-btn','logout-btn-2'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('click',()=>{
      if(confirm('هل تريد الخروج؟')){
        disconnectPartner(true); localStorage.clear(); location.reload();
      }
    });
  });
}

function applySettings() {
  document.body.classList.toggle('light',!STATE.settings.darkMode);
  document.documentElement.style.setProperty('--accent',STATE.settings.accent||'#00d4ff');
  document.documentElement.style.setProperty('--accent-glow',(STATE.settings.accent||'#00d4ff')+'4d');
  const dm=document.getElementById('dark-mode-toggle'); if(dm) dm.checked=STATE.settings.darkMode;
  const st=document.getElementById('sound-toggle'); if(st) st.checked=STATE.settings.sound;
  const tt=document.getElementById('typing-toggle'); if(tt) tt.checked=STATE.settings.showTyping;
  const at=document.getElementById('anon-toggle'); if(at) at.checked=STATE.settings.anonymous;
  const vt=document.getElementById('vibrate-toggle'); if(vt) vt.checked=STATE.settings.vibrate;
  const bi=document.getElementById('block-img-toggle'); if(bi) bi.checked=STATE.settings.blockImages;
  // Font size
  document.querySelectorAll('.fs-btn').forEach(b=>b.classList.toggle('active',parseInt(b.dataset.size)===STATE.settings.fontSize));
  // Color
  document.querySelectorAll('.color-preset').forEach(p=>p.classList.toggle('active',p.dataset.color===STATE.settings.accent));
}

// ====================== ONLINE COUNT ======================
function startOnlineCounter() {
  updateOnlineCount();
  setInterval(updateOnlineCount,25000);
}

function updateOnlineCount() {
  const n=420+Math.floor(Math.random()*800);
  const el=document.getElementById('online-count');
  const se=document.getElementById('stat-online');
  if(el) el.textContent=n.toLocaleString('ar');
  if(se) se.textContent=n.toLocaleString('ar');
}

// ====================== SOUND ======================
function playSound(type) {
  if (!STATE.settings.sound) return;
  try {
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    const now=ctx.currentTime;
    if(type==='message'){osc.frequency.setValueAtTime(880,now);osc.frequency.exponentialRampToValueAtTime(660,now+0.1);gain.gain.setValueAtTime(0.08,now);gain.gain.exponentialRampToValueAtTime(0.001,now+0.15);osc.start(now);osc.stop(now+0.2);}
    else if(type==='connect'){osc.frequency.setValueAtTime(440,now);osc.frequency.exponentialRampToValueAtTime(880,now+0.25);gain.gain.setValueAtTime(0.12,now);gain.gain.exponentialRampToValueAtTime(0.001,now+0.35);osc.start(now);osc.stop(now+0.4);}
    else if(type==='disconnect'){osc.frequency.setValueAtTime(660,now);osc.frequency.exponentialRampToValueAtTime(220,now+0.35);gain.gain.setValueAtTime(0.1,now);gain.gain.exponentialRampToValueAtTime(0.001,now+0.45);osc.start(now);osc.stop(now+0.5);}
  } catch(e) {}
}

// ====================== MODALS ======================
function openModal(id) { const el=document.getElementById(id); if(el) el.classList.remove('hidden'); }
function closeModal(id) { const el=document.getElementById(id); if(el) el.classList.add('hidden'); }

// ====================== SUBSCREEN ======================
function showChatSubscreen(id) {
  ['waiting-screen','searching-screen','chat-area','disconnected-screen'].forEach(s=>{
    const el=document.getElementById(s); if(el) el.classList.add('hidden');
  });
  const t=document.getElementById(id); if(t) t.classList.remove('hidden');
}

// ====================== INIT ======================
function init() {
  initSetup();
  initNavigation();
  initChatPanel();
  initSettings();
  initMood();
  initSplash();

  // Modal closes
  document.querySelectorAll('.modal-close, [data-modal]').forEach(btn=>{
    btn.addEventListener('click',()=>{ const id=btn.dataset.modal; if(id) closeModal(id); });
  });
  document.querySelectorAll('.modal-overlay').forEach(ov=>{
    ov.addEventListener('click',e=>{ if(e.target===ov) ov.classList.add('hidden'); });
  });
}

if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
else init();
