/* ============================================================
   شات برو - الوحدات المتقدمة
   reactions, voice messages, stickers, gif, themes, games
   ============================================================ */

'use strict';

// ====================== REACTIONS SYSTEM ======================
const REACTIONS = ['❤️','😂','😮','😢','😡','👍','👎','🔥'];

function attachReactionMenu(bubbleEl, side) {
  const btn = document.createElement('button');
  btn.className = 'react-btn';
  btn.innerHTML = '<i class="fa-regular fa-face-smile-plus"></i>';
  btn.title = 'تفاعل';

  const menu = document.createElement('div');
  menu.className = 'reaction-menu hidden';
  menu.innerHTML = REACTIONS.map(r =>
    `<span class="reaction-emoji" data-emoji="${r}">${r}</span>`
  ).join('');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.reaction-menu').forEach(m => {
      if (m !== menu) m.classList.add('hidden');
    });
    menu.classList.toggle('hidden');
  });

  menu.querySelectorAll('.reaction-emoji').forEach(span => {
    span.addEventListener('click', (e) => {
      e.stopPropagation();
      addReaction(bubbleEl, span.dataset.emoji);
      menu.classList.add('hidden');
    });
  });

  document.addEventListener('click', () => menu.classList.add('hidden'));

  bubbleEl.appendChild(btn);
  bubbleEl.appendChild(menu);
}

function addReaction(bubbleEl, emoji) {
  let reactBar = bubbleEl.querySelector('.react-bar');
  if (!reactBar) {
    reactBar = document.createElement('div');
    reactBar.className = 'react-bar';
    bubbleEl.appendChild(reactBar);
  }

  const existing = reactBar.querySelector(`[data-emoji="${emoji}"]`);
  if (existing) {
    const count = parseInt(existing.dataset.count || 1) + 1;
    existing.dataset.count = count;
    existing.querySelector('.react-count').textContent = count;
  } else {
    const chip = document.createElement('span');
    chip.className = 'react-chip';
    chip.dataset.emoji = emoji;
    chip.dataset.count = 1;
    chip.innerHTML = `${emoji}<span class="react-count">1</span>`;
    chip.addEventListener('click', () => {
      const count = parseInt(chip.dataset.count) + 1;
      chip.dataset.count = count;
      chip.querySelector('.react-count').textContent = count;
    });
    reactBar.appendChild(chip);
  }
}

// ====================== VOICE MESSAGE SYSTEM ======================
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingSeconds = 0;

function initVoiceRecorder() {
  const voiceBtn = document.getElementById('voice-btn');
  if (!voiceBtn) return;

  let isRecording = false;

  voiceBtn.addEventListener('mousedown', startRecording);
  voiceBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startRecording(); });
  voiceBtn.addEventListener('mouseup', stopRecording);
  voiceBtn.addEventListener('touchend', stopRecording);
  voiceBtn.addEventListener('mouseleave', () => { if (isRecording) stopRecording(); });
}

async function startRecording() {
  if (!STATE.connected) { toast('لست متصلاً بأحد', 'error'); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      sendVoiceMessage(blob);
    };
    mediaRecorder.start();

    recordingSeconds = 0;
    document.getElementById('voice-indicator').classList.remove('hidden');
    recordingTimer = setInterval(() => {
      recordingSeconds++;
      document.getElementById('recording-time').textContent =
        pad(Math.floor(recordingSeconds / 60)) + ':' + pad(recordingSeconds % 60);
      if (recordingSeconds >= 60) stopRecording();
    }, 1000);

    document.getElementById('voice-btn').classList.add('recording');
    toast('🎙️ جاري التسجيل... أفلت للإرسال', 'info', 1500);
  } catch(e) {
    toast('تعذر الوصول للميكروفون', 'error');
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  clearInterval(recordingTimer);
  document.getElementById('voice-indicator').classList.add('hidden');
  const btn = document.getElementById('voice-btn');
  if (btn) btn.classList.remove('recording');
}

function sendVoiceMessage(blob) {
  if (recordingSeconds < 1) return;
  const url = URL.createObjectURL(blob);
  appendVoiceMessage(url, recordingSeconds, 'mine');

  // Convert to base64 for signaling
  const reader = new FileReader();
  reader.onload = () => {
    if (STATE.partner && !STATE.partner.isBot) {
      sendSignal({
        type: 'CHAT_MSG',
        to: STATE.partner.id,
        from: STATE.myPeerId,
        content: reader.result,
        time: getTime(),
        msgType: 'voice',
        duration: recordingSeconds
      });
    }
  };
  reader.readAsDataURL(blob);
  STATE.stats.messages++;
  updateStats();
  saveData();
}

function appendVoiceMessage(src, duration, side) {
  const mc = document.getElementById('messages-container');
  const bubble = document.createElement('div');
  bubble.className = `msg-bubble ${side} voice-bubble`;
  const dur = pad(Math.floor(duration / 60)) + ':' + pad(duration % 60);
  bubble.innerHTML = `
    <div class="voice-msg-wrap">
      <button class="voice-play-btn" onclick="toggleVoicePlay(this, '${src}')">
        <i class="fa-solid fa-play"></i>
      </button>
      <div class="voice-wave">
        ${Array(12).fill(0).map(() =>
          `<span style="height:${8 + Math.random() * 24}px"></span>`
        ).join('')}
      </div>
      <span class="voice-dur">${dur}</span>
    </div>
    <span class="msg-time">${getTime()}</span>
  `;
  attachReactionMenu(bubble, side);
  mc.appendChild(bubble);
  mc.scrollTop = mc.scrollHeight;
}

let currentAudio = null;
window.toggleVoicePlay = function(btn, src) {
  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause();
    document.querySelectorAll('.voice-play-btn i').forEach(i => {
      i.className = 'fa-solid fa-play';
    });
    if (currentAudio.src.includes(src.split('/').pop())) {
      currentAudio = null;
      return;
    }
  }
  const audio = new Audio(src);
  currentAudio = audio;
  btn.querySelector('i').className = 'fa-solid fa-pause';
  audio.play();
  audio.onended = () => {
    btn.querySelector('i').className = 'fa-solid fa-play';
    currentAudio = null;
  };
};

// ====================== GIF SEARCH ======================
async function searchGifs(query) {
  const TENOR_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctR1vTKmYlY';
  try {
    const res = await fetch(
      `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_KEY}&limit=12&media_filter=gif`
    );
    if (!res.ok) throw new Error('Tenor error');
    const data = await res.json();
    return data.results || [];
  } catch(e) {
    // Fallback sample gifs
    return SAMPLE_GIFS.filter(g => !query || g.title.includes(query)).slice(0, 12);
  }
}

const SAMPLE_GIFS = [
  { id: '1', title: 'مرحبا', media_formats: { gif: { url: 'https://media.tenor.com/ZOzznLYE0LoAAAAM/hello.gif' } } },
  { id: '2', title: 'ضحك', media_formats: { gif: { url: 'https://media.tenor.com/4Rj_GbGmpT4AAAAC/laughing.gif' } } },
  { id: '3', title: 'رائع', media_formats: { gif: { url: 'https://media.tenor.com/AbFV8fkbDpkAAAAC/great-excellent.gif' } } },
  { id: '4', title: 'حماس', media_formats: { gif: { url: 'https://media.tenor.com/bxd5rGdlQpMAAAAC/excited-happy.gif' } } }
];

function initGifPicker() {
  const gifBtn = document.getElementById('gif-btn');
  const gifPanel = document.getElementById('gif-panel');
  const gifSearch = document.getElementById('gif-search');
  const gifGrid = document.getElementById('gif-grid');

  if (!gifBtn) return;

  gifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    gifPanel.classList.toggle('hidden');
    if (!gifPanel.classList.contains('hidden')) {
      loadGifs('مرحبا');
    }
  });

  let gifTimer;
  gifSearch.addEventListener('input', () => {
    clearTimeout(gifTimer);
    gifTimer = setTimeout(() => loadGifs(gifSearch.value || 'مرحبا'), 500);
  });

  async function loadGifs(q) {
    gifGrid.innerHTML = '<div class="gif-loading"><i class="fa-solid fa-spinner fa-spin"></i></div>';
    const results = await searchGifs(q);
    if (!results.length) {
      gifGrid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px">لا توجد نتائج</p>';
      return;
    }
    gifGrid.innerHTML = '';
    results.forEach(gif => {
      const url = gif.media_formats?.gif?.url || gif.media_formats?.tinygif?.url;
      if (!url) return;
      const img = document.createElement('img');
      img.src = url;
      img.className = 'gif-item';
      img.loading = 'lazy';
      img.addEventListener('click', () => {
        appendMessage(url, 'mine', getTime(), 'image');
        if (STATE.partner && !STATE.partner.isBot) {
          sendSignal({ type: 'CHAT_MSG', to: STATE.partner.id, from: STATE.myPeerId, content: url, time: getTime(), msgType: 'image' });
        }
        gifPanel.classList.add('hidden');
        STATE.stats.messages++;
        updateStats();
        saveData();
      });
      gifGrid.appendChild(img);
    });
  }
}

// ====================== STICKERS ======================
const STICKER_PACKS = {
  'تعبيرات': [
    'https://em-content.zobj.net/source/animated-noto-emoji/356/smiling-face-with-smiling-eyes_1f60a.gif',
    'https://em-content.zobj.net/source/animated-noto-emoji/356/grinning-face_1f600.gif',
    'https://em-content.zobj.net/source/animated-noto-emoji/356/face-with-tears-of-joy_1f602.gif',
    'https://em-content.zobj.net/source/animated-noto-emoji/356/winking-face_1f609.gif',
    'https://em-content.zobj.net/source/animated-noto-emoji/356/smiling-face-with-heart-eyes_1f60d.gif',
    'https://em-content.zobj.net/source/animated-noto-emoji/356/star-struck_1f929.gif',
    'https://em-content.zobj.net/source/animated-noto-emoji/356/partying-face_1f973.gif',
    'https://em-content.zobj.net/source/animated-noto-emoji/356/fire_1f525.gif',
    'https://em-content.zobj.net/source/animated-noto-emoji/356/red-heart_2764-fe0f.gif',
    'https://em-content.zobj.net/source/animated-noto-emoji/356/thumbs-up_1f44d.gif',
    'https://em-content.zobj.net/source/animated-noto-emoji/356/clapping-hands_1f44f.gif',
    'https://em-content.zobj.net/source/animated-noto-emoji/356/rainbow_1f308.gif'
  ]
};

function initStickerPicker() {
  const stickerBtn = document.getElementById('sticker-btn');
  const stickerPanel = document.getElementById('sticker-panel');
  if (!stickerBtn) return;

  stickerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    stickerPanel.classList.toggle('hidden');
    if (!stickerPanel.classList.contains('hidden')) buildStickers();
  });

  function buildStickers() {
    const grid = document.getElementById('sticker-grid');
    if (grid.children.length) return;
    STICKER_PACKS['تعبيرات'].forEach(url => {
      const img = document.createElement('img');
      img.src = url;
      img.className = 'sticker-item';
      img.loading = 'lazy';
      img.onerror = () => img.remove();
      img.addEventListener('click', () => {
        appendMessage(url, 'mine', getTime(), 'image');
        stickerPanel.classList.add('hidden');
        STATE.stats.messages++;
        updateStats();
        saveData();
      });
      grid.appendChild(img);
    });
  }
}

// ====================== QUICK GAMES ======================
const GAMES = {
  dice: {
    name: 'نرد 🎲',
    play: () => {
      const me = Math.ceil(Math.random() * 6);
      const them = Math.ceil(Math.random() * 6);
      const result = me > them ? 'فزت! 🏆' : me < them ? 'خسرت! 😅' : 'تعادل! 🤝';
      return `🎲 رميت النرد!\nأنا: ${me} | الخصم: ${them}\n${result}`;
    }
  },
  rps: {
    name: 'حجر ورقة مقص ✂️',
    play: (choice) => {
      const options = ['حجر 🪨', 'ورقة 📄', 'مقص ✂️'];
      const them = options[Math.floor(Math.random() * 3)];
      const me = choice;
      const wins = { 'حجر 🪨': 'مقص ✂️', 'ورقة 📄': 'حجر 🪨', 'مقص ✂️': 'ورقة 📄' };
      const result = wins[me] === them ? 'فزت! 🏆' : me === them ? 'تعادل! 🤝' : 'خسرت! 😅';
      return `✂️ حجر ورقة مقص!\nأنا: ${me} | الخصم: ${them}\n${result}`;
    }
  },
  number: {
    name: 'خمّن الرقم 🔢',
    play: () => {
      const num = Math.floor(Math.random() * 100) + 1;
      return `🔢 خمّن رقماً بين 1-100\nالرقم الصحيح: ${num}\nهل خمنت صحيحاً؟ 😄`;
    }
  }
};

function initGamesPanel() {
  const gamesBtn = document.getElementById('games-btn');
  const gamesPanel = document.getElementById('games-panel');
  if (!gamesBtn) return;

  gamesBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    gamesPanel.classList.toggle('hidden');
  });

  document.getElementById('play-dice').addEventListener('click', () => {
    const result = GAMES.dice.play();
    appendMessage(result, 'mine', getTime());
    gamesPanel.classList.add('hidden');
    if (STATE.partner && !STATE.partner.isBot) {
      sendSignal({ type: 'CHAT_MSG', to: STATE.partner.id, from: STATE.myPeerId, content: result, time: getTime() });
    }
  });

  document.querySelectorAll('.rps-choice').forEach(btn => {
    btn.addEventListener('click', () => {
      const result = GAMES.rps.play(btn.dataset.choice);
      appendMessage(result, 'mine', getTime());
      gamesPanel.classList.add('hidden');
    });
  });

  document.getElementById('play-number').addEventListener('click', () => {
    const result = GAMES.number.play();
    appendMessage(result, 'mine', getTime());
    gamesPanel.classList.add('hidden');
  });
}

// ====================== TRANSLATION ======================
async function translateMessage(text, targetLang = 'ar') {
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    );
    const data = await res.json();
    return data[0].map(t => t[0]).join('');
  } catch(e) {
    return null;
  }
}

function addTranslateBtn(bubbleEl, text) {
  const btn = document.createElement('button');
  btn.className = 'translate-btn';
  btn.innerHTML = '<i class="fa-solid fa-language"></i>';
  btn.title = 'ترجمة';
  btn.addEventListener('click', async () => {
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    const translated = await translateMessage(text);
    if (translated && translated !== text) {
      let transEl = bubbleEl.querySelector('.translation');
      if (!transEl) {
        transEl = document.createElement('div');
        transEl.className = 'translation';
        bubbleEl.insertBefore(transEl, bubbleEl.querySelector('.msg-time'));
      }
      transEl.textContent = '🌐 ' + translated;
      btn.innerHTML = '<i class="fa-solid fa-language"></i>';
    } else {
      btn.innerHTML = '<i class="fa-solid fa-language"></i>';
      toast('تعذرت الترجمة', 'error');
    }
  });
  bubbleEl.appendChild(btn);
}

// ====================== CHAT THEMES ======================
const CHAT_THEMES = {
  default: { bg: 'transparent', pattern: 'none' },
  stars: {
    bg: 'var(--bg)',
    pattern: `radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)`,
    size: '30px 30px'
  },
  waves: {
    bg: 'var(--bg)',
    pattern: `repeating-linear-gradient(45deg, rgba(0,212,255,0.03) 0px, rgba(0,212,255,0.03) 1px, transparent 1px, transparent 10px)`
  },
  sunset: {
    bg: 'linear-gradient(180deg, #1a0a2e 0%, #16213e 50%, #0f3460 100%)',
    pattern: 'none'
  },
  forest: {
    bg: 'linear-gradient(180deg, #0d1b0e 0%, #1a2e1b 100%)',
    pattern: 'none'
  }
};

function applyTheme(name) {
  const theme = CHAT_THEMES[name] || CHAT_THEMES.default;
  const mc = document.getElementById('messages-container');
  if (mc) {
    mc.style.background = theme.bg;
    if (theme.pattern && theme.pattern !== 'none') {
      mc.style.backgroundImage = theme.pattern;
      mc.style.backgroundSize = theme.size || 'auto';
    }
  }
  STATE.settings.chatTheme = name;
  saveData();
}

function initThemePicker() {
  const themeBtn = document.getElementById('theme-btn');
  const themePanel = document.getElementById('theme-panel');
  if (!themeBtn) return;

  themeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    themePanel.classList.toggle('hidden');
  });

  document.querySelectorAll('.theme-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyTheme(btn.dataset.theme);
      themePanel.classList.add('hidden');
      toast('تم تغيير خلفية المحادثة', 'success');
    });
  });
}

// ====================== NOTIFICATIONS CENTER ======================
const NOTIF_CENTER = {
  items: [],
  add(msg, type = 'info') {
    this.items.unshift({ msg, type, time: getTime(), id: genId() });
    if (this.items.length > 20) this.items.pop();
    this.updateBadge();
  },
  updateBadge() {
    const badge = document.getElementById('notif-badge');
    if (badge) {
      badge.textContent = this.items.length;
      badge.style.display = this.items.length ? 'inline' : 'none';
    }
  }
};

// ====================== ONLINE USERS COUNTER (Advanced) ======================
let onlineUsers = [];
const FAKE_USERS = [
  'أحمد م.', 'محمد س.', 'سارة ع.', 'لين م.', 'عمر خ.', 'نور ف.', 'خالد ي.',
  'ريم أ.', 'فارس م.', 'هند ن.', 'ياسر ع.', 'دانا ق.', 'زياد م.', 'لمى ر.',
  'بدر ح.', 'سلمى ع.', 'وليد م.', 'رنا س.', 'ماجد ف.', 'أمل ي.'
];

function updateOnlineUsers() {
  const count = 380 + Math.floor(Math.random() * 900);
  const el = document.getElementById('online-count');
  const statEl = document.getElementById('stat-online');
  if (el) el.textContent = count.toLocaleString('ar');
  if (statEl) statEl.textContent = count.toLocaleString('ar');
}

// ====================== COPY MESSAGE ======================
function addCopyBtn(bubbleEl, text) {
  const btn = document.createElement('button');
  btn.className = 'copy-msg-btn';
  btn.innerHTML = '<i class="fa-regular fa-copy"></i>';
  btn.title = 'نسخ';
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      btn.innerHTML = '<i class="fa-solid fa-check"></i>';
      setTimeout(() => btn.innerHTML = '<i class="fa-regular fa-copy"></i>', 1500);
      toast('تم النسخ', 'success', 1500);
    } catch(e) {}
  });
  bubbleEl.appendChild(btn);
}

// ====================== EXPORT CHAT ======================
function exportChat() {
  const mc = document.getElementById('messages-container');
  const messages = [];
  mc.querySelectorAll('.msg-bubble').forEach(b => {
    const side = b.classList.contains('mine') ? STATE.user?.name || 'أنا' : (STATE.partner?.name || 'الطرف الآخر');
    const text = b.querySelector('.voice-msg-wrap') ? '[رسالة صوتية]' : b.childNodes[0]?.textContent?.trim() || '';
    const time = b.querySelector('.msg-time')?.textContent || '';
    if (text) messages.push(`[${time}] ${side}: ${text}`);
  });

  if (!messages.length) { toast('لا توجد رسائل للتصدير', 'info'); return; }

  const content = `شات برو - تصدير المحادثة\n${new Date().toLocaleString('ar')}\n${'='.repeat(40)}\n\n${messages.join('\n')}`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `chat-${Date.now()}.txt`;
  a.click();
  toast('تم تصدير المحادثة', 'success');
}

// ====================== INIT ADVANCED ======================
function initAdvanced() {
  initVoiceRecorder();
  initGifPicker();
  initStickerPicker();
  initGamesPanel();
  initThemePicker();

  // Export chat button
  const exportBtn = document.getElementById('export-chat-btn');
  if (exportBtn) exportBtn.addEventListener('click', exportChat);

  // Close panels on outside click
  document.addEventListener('click', () => {
    ['gif-panel', 'sticker-panel', 'games-panel', 'theme-panel'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  });

  // Apply saved theme
  if (STATE.settings.chatTheme) applyTheme(STATE.settings.chatTheme);
}

// Auto init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdvanced);
} else {
  setTimeout(initAdvanced, 500);
}
