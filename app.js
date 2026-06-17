/* ============================================
   心情音乐盒 - 核心逻辑
   ============================================ */

// ==================== DOM 元素缓存 ====================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// 页面
const loginPage = $('#login-page');
const mainPage = $('#main-page');

// 登录表单
const nicknameInput = $('#nickname-input');
const passwordInput = $('#password-input');
const loginMsg = $('#login-msg');
const btnLogin = $('#btn-login');
const btnRegister = $('#btn-register');
const btnGuest = $('#btn-guest');

// Tab
const tabChat = $('#tab-chat');
const tabPlayer = $('#tab-player');
const tabFavorites = $('#tab-favorites');
const navItems = $$('.nav-item');

// 聊天
const chatMessages = $('#chat-messages');
const chatInput = $('#chat-input');
const btnSend = $('#btn-send');
const btnVoice = $('#btn-voice');

// 播放器
const audioPlayer = $('#audio-player');
const btnPlay = $('#btn-play');
const btnPrev = $('#btn-prev');
const btnNext = $('#btn-next');
const progressBar = $('#progress-bar');
const progressFill = $('#progress-fill');
const progressThumb = $('#progress-thumb');
const timeCurrent = $('#time-current');
const timeTotal = $('#time-total');
const songName = $('#song-name');
const songArtist = $('#song-artist');
const playerCover = $('#player-cover');
const lyricsContainer = $('#lyrics-container');
const btnFavorite = $('#btn-favorite');
const volumeSlider = $('#volume-slider');
const tabPlaylist = $('#tab-playlist');
const playlistPageList = $('#playlist-page-list');
const playlistCount = $('#playlist-count');

// 心情标签/播放模式
const moodTag = $('#mood-tag');
const btnMode = $('#btn-mode');

// 收藏 / 个人中心
const favoritesList = $('#favorites-list');
const profileName = $('#profile-name');
const profileType = $('#profile-type');
const btnLogout = $('#btn-logout');
const profileMain = $('#profile-main');
const profileFavView = $('#profile-fav-view');
const btnGoFav = $('#btn-go-fav');
const btnGoPlaylist = $('#btn-go-playlist');
const btnFavBack = $('#btn-fav-back');

// ==================== 状态管理 ====================
let currentUser = null;          // 当前登录用户
let currentSong = null;          // 当前播放歌曲
let playlist = [];               // 播放列表
let playlistIndex = -1;          // 当前播放索引
let favorites = [];              // 收藏列表
let chatHistory = [];            // DeepSeek 对话历史
let isAIThinking = false;        // AI 是否正在回复
let currentMood = null;          // 当前检测到的心情
let playMode = 0;                // 播放模式：0=列表循环 1=单曲循环 2=随机

// 心情→展示映射表
const MOOD_DISPLAY = {
  '开心': { emoji: '😊', color: '#FFD700' },
  '难过': { emoji: '😢', color: '#87CEEB' },
  '疲惫': { emoji: '😫', color: '#A9A9A9' },
  '焦虑': { emoji: '😰', color: '#DDA0DD' },
  '兴奋': { emoji: '🤩', color: '#FF6347' },
  '浪漫': { emoji: '🥰', color: '#FF69B4' },
  '平静': { emoji: '😌', color: '#98FB98' },
  '失落': { emoji: '😞', color: '#B0C4DE' },
  '愤怒': { emoji: '😤', color: '#FF4500' },
  '思念': { emoji: '🥺', color: '#F0E68C' },
};

// ==================== Toast 提示 ====================
function showToast(text) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = text;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// ==================== 初始化 ====================
function init() {
  // 显示二维码（如果有）
  if (typeof QR_BASE64 !== 'undefined' && QR_BASE64) {
    const qrSection = document.getElementById('qr-section');
    const qrImage = document.getElementById('qr-image');
    const qrUrl = document.getElementById('qr-url');
    if (qrSection && qrImage) {
      qrImage.src = 'data:image/png;base64,' + QR_BASE64;
      qrUrl.textContent = typeof QR_IP !== 'undefined' ? QR_IP : '';
      qrSection.style.display = 'block';
    }
  }

  // 检查是否有上次登录
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    currentUser = savedUser;
    showMainPage();
  }
}

// ==================== 页面切换 ====================
function showLoginPage() {
  loginPage.classList.add('active');
  mainPage.classList.remove('active');
}

function showMainPage() {
  loginPage.classList.remove('active');
  mainPage.classList.add('active');
  updateProfile();
  loadFavorites();
  restoreLastPlay();
}

function updateProfile() {
  if (!currentUser) return;
  profileName.textContent = currentUser;
  profileType.textContent = currentUser.startsWith('游客_') ? '游客模式' : '注册用户';
}

// 退出登录
btnLogout.addEventListener('click', () => {
  if (confirm('确定要退出登录吗？')) {
    audioPlayer.pause();
    audioPlayer.src = '';
    localStorage.removeItem('currentUser');
    currentUser = null;
    playlist = [];
    playlistIndex = -1;
    currentSong = null;
    favorites = [];
    showLoginPage();
  }
});

// 菜单导航
btnGoFav.addEventListener('click', () => {
  profileMain.style.display = 'none';
  profileFavView.style.display = 'flex';
  loadFavorites();
});

btnFavBack.addEventListener('click', () => {
  profileMain.style.display = 'flex';
  profileFavView.style.display = 'none';
});

btnGoPlaylist.addEventListener('click', () => {
  switchTab('playlist');
  renderPlaylist();
});

// ==================== 登录逻辑 ====================

// 显示消息
function showLoginMsg(text, isError = true) {
  loginMsg.textContent = text;
  loginMsg.style.color = isError ? 'var(--accent)' : '#4caf84';
  setTimeout(() => { loginMsg.textContent = ''; }, 3000);
}

// 获取所有注册账号
function getAccounts() {
  const data = localStorage.getItem('accounts');
  return data ? JSON.parse(data) : {};
}

// 保存账号
function saveAccounts(accounts) {
  localStorage.setItem('accounts', JSON.stringify(accounts));
}

// 生成随机游客昵称
function generateGuestName() {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `游客_${num}`;
}

// 注册
btnRegister.addEventListener('click', () => {
  const nickname = nicknameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!nickname) {
    showLoginMsg('请输入昵称');
    return;
  }
  if (!password) {
    showLoginMsg('请输入密码');
    return;
  }
  if (password.length < 3) {
    showLoginMsg('密码至少3位');
    return;
  }

  const accounts = getAccounts();
  if (accounts[nickname]) {
    showLoginMsg('该昵称已被注册，换一个吧');
    return;
  }

  accounts[nickname] = { password };
  saveAccounts(accounts);
  showLoginMsg(`注册成功！欢迎你，${nickname} 🎉`, false);

  // 自动登录
  currentUser = nickname;
  localStorage.setItem('currentUser', currentUser);
  setTimeout(() => showMainPage(), 500);
});

// 登录
btnLogin.addEventListener('click', () => {
  const nickname = nicknameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!nickname) {
    showLoginMsg('请输入昵称');
    return;
  }
  if (!password) {
    showLoginMsg('请输入密码');
    return;
  }

  const accounts = getAccounts();
  if (!accounts[nickname]) {
    showLoginMsg('该账号不存在，请先注册');
    return;
  }
  if (accounts[nickname].password !== password) {
    showLoginMsg('密码错误');
    return;
  }

  currentUser = nickname;
  localStorage.setItem('currentUser', currentUser);
  showLoginMsg(`欢迎回来，${nickname}！🎵`, false);
  setTimeout(() => showMainPage(), 500);
});

// 游客模式
btnGuest.addEventListener('click', () => {
  currentUser = generateGuestName();
  localStorage.setItem('currentUser', currentUser);
  showMainPage();
});

// 回车登录
passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    btnLogin.click();
  }
});
nicknameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    passwordInput.focus();
  }
});

// ==================== Tab 切换 ====================
navItems.forEach(item => {
  item.addEventListener('click', () => {
    const target = item.dataset.tab;
    switchTab(target);
  });
});

function switchTab(target) {
  // 更新导航高亮
  navItems.forEach(n => n.classList.remove('active'));
  const targetNav = document.querySelector(`.nav-item[data-tab="${target}"]`);
  if (targetNav) targetNav.classList.add('active');

  // 切换页面
  tabChat.classList.remove('active');
  tabPlayer.classList.remove('active');
  tabPlaylist.classList.remove('active');
  tabFavorites.classList.remove('active');

  if (target === 'chat') tabChat.classList.add('active');
  else if (target === 'player') tabPlayer.classList.add('active');
  else if (target === 'playlist') { tabPlaylist.classList.add('active'); renderPlaylist(); }
  else if (target === 'favorites') {
    tabFavorites.classList.add('active');
    profileMain.style.display = 'flex';
    profileFavView.style.display = 'none';
    updateProfile();
  }
}

// ==================== 聊天功能 ====================
btnSend.addEventListener('click', () => {
  sendMessage();
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

// ==================== 语音输入 ====================
// 诊断：打印浏览器支持的 API
console.log('🔍 语音 API 检测:');
console.log('  window.SpeechRecognition:', typeof window.SpeechRecognition, window.SpeechRecognition);
console.log('  window.webkitSpeechRecognition:', typeof window.webkitSpeechRecognition, window.webkitSpeechRecognition);
console.log('  navigator.mediaDevices:', !!navigator.mediaDevices);
console.log('  navigator.userAgent:', navigator.userAgent);

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

function stopVoiceListening() {
  isListening = false;
  btnVoice.textContent = '🎤';
  btnVoice.style.animation = '';
  chatInput.placeholder = '说说你的心情，或者想听什么歌...';
}

if (SpeechRecognitionAPI) {
  try {
    recognition = new SpeechRecognitionAPI();
  } catch (e) {
    console.error('创建语音识别对象失败:', e);
    recognition = null;
  }
  if (recognition) {
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript.trim();
      if (text) {
        chatInput.value = text;
        sendMessage();
      }
    };

    let recognitionEnded = false;
    recognition.onerror = (event) => {
      console.error('语音识别错误:', event.error);
      stopVoiceListening();
      if (event.error === 'not-allowed') {
        alert('麦克风权限被拒绝');
      } else if (event.error === 'no-speech') {
        // 没检测到语音，静默处理
      } else {
        alert('语音错误: ' + event.error);
      }
    };

    recognition.onend = () => {
      recognitionEnded = true;
      stopVoiceListening();
    };
  }
}

if (!recognition) {
  btnVoice.style.display = 'none';
  console.log('⚠️ 语音识别不可用，按钮已隐藏');
}

btnVoice.addEventListener('click', () => {
  console.log('语音按钮被点击, recognition:', !!recognition, 'isAIThinking:', isAIThinking, 'isListening:', isListening);
  if (!recognition) {
    alert('你的浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器。');
    return;
  }
  if (isAIThinking) return;
  if (isListening) {
    try { recognition.stop(); } catch(e) {}
    stopVoiceListening();
    return;
  }
  try {
    try { recognition.abort(); } catch(e) {}
    recognition.start();
    isListening = true;
    btnVoice.textContent = '🔴';
    btnVoice.style.animation = 'pulse 0.8s infinite';
    chatInput.placeholder = '正在聆听...';
    console.log('语音识别已启动');
    // 10 秒超时自动停止
    setTimeout(() => {
      if (isListening) {
        try { recognition.stop(); } catch(e) {}
        stopVoiceListening();
      }
    }, 10000);
  } catch (e) {
    console.error('启动语音失败:', e);
    alert('启动语音识别失败：' + e.message);
  }
});

// ==================== 聊天核心 ====================
async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || isAIThinking) return;

  // 添加用户消息到聊天区
  addMessage('user', text);
  chatInput.value = '';

  // 保存到对话历史
  chatHistory.push({ role: 'user', content: text });

  // 限制历史长度（最近20条，避免 token 超限）
  if (chatHistory.length > 20) {
    chatHistory = chatHistory.slice(-20);
  }

  // 显示"正在输入..."
  isAIThinking = true;
  btnSend.style.opacity = '0.5';
  const thinkingBubble = addThinkingBubble();

  try {
    // 调用 DeepSeek API
    const { reply, songs, mood } = await deepseekChat(chatHistory);

    // 移除"正在输入..."
    thinkingBubble.remove();

    // 更新心情显示
    if (mood && MOOD_DISPLAY[mood]) {
      currentMood = mood;
      updateMoodTag(mood);
    }

    // 构建回复内容
    let replyHTML = '';
    if (mood && MOOD_DISPLAY[mood]) {
      const m = MOOD_DISPLAY[mood];
      replyHTML += `<span class="mood-badge" style="background:${m.color}22;color:${m.color};border:1px solid ${m.color}44">${m.emoji} 心情：${mood}</span><br>`;
    }
    replyHTML += escapeHTML(reply);

    // 如果有歌曲推荐，添加卡片 + 自动搜索加入播放列表
    if (songs.length > 0) {
      replyHTML += '<div class="song-cards">';
      for (const song of songs) {
        replyHTML += `
          <div class="song-card" onclick="searchAndPlay('${escapeAttr(song.name)}', '${escapeAttr(song.artist)}')">
            <div class="song-card-cover">🎵</div>
            <div class="song-card-info">
              <div class="song-card-name">${escapeHTML(song.name)}</div>
              <div class="song-card-artist">${escapeHTML(song.artist)}</div>
            </div>
            <div class="song-card-play">▶</div>
          </div>
        `;
      }
      replyHTML += '</div>';

      // 后台自动搜索所有推荐歌曲，加入播放列表
      preloadToPlaylist(songs);
    }

    // 添加 AI 回复
    addMessage('bot', replyHTML);

    // 保存 AI 回复到历史
    chatHistory.push({ role: 'assistant', content: reply });

  } catch (error) {
    thinkingBubble.remove();
    console.error('API 调用失败:', error);
    addMessage('bot', '😅 抱歉，我暂时无法回复…<br><small style="color:#999">可能是网络问题或 API Key 无效，请检查。</small>');
  }

  isAIThinking = false;
  btnSend.style.opacity = '1';
}

// 显示"正在输入中..."动画
function addThinkingBubble() {
  const div = document.createElement('div');
  div.className = 'chat-bubble bot';
  div.id = 'thinking-bubble';
  div.innerHTML = `
    <div class="bubble-avatar">🤖</div>
    <div class="bubble-text thinking-dots">
      <span>.</span><span>.</span><span>.</span>
    </div>
  `;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

// 后台预加载 AI 推荐的歌到播放列表
async function preloadToPlaylist(songs) {
  for (const s of songs) {
    try {
      const results = await searchSongs(`${s.name} ${s.artist}`);
      if (results.length > 0) {
        const song = results[0];
        if (!playlist.find(p => p.id === song.id)) {
          playlist.push(song);
        }
      }
    } catch (e) {
      // 预加载失败不影响主流程
    }
  }
  renderPlaylist();
}

// 搜索并播放（点击歌曲卡片时调用）
async function searchAndPlay(songName, artist) {
  console.log('searchAndPlay called:', songName, artist);
  switchTab('player');
  songName.textContent = '搜索中...';
  songArtist.textContent = `${songName} - ${artist}`;

  const keyword = `${songName} ${artist}`;
  console.log('搜索关键词:', keyword);

  try {
    const songs = await searchSongs(keyword);
    console.log('搜索结果:', songs.length, '首');

    if (songs.length === 0) {
      songName.textContent = '未找到歌曲';
      songArtist.textContent = '换个关键词试试';
      return;
    }

    // 去重后加入播放列表
    for (const s of songs) {
      if (!playlist.find(p => p.id === s.id)) {
        playlist.push(s);
      }
    }

    // 找到新加的第一首的索引并播放
    playlistIndex = playlist.findIndex(p => p.id === songs[0].id);
    if (playlistIndex < 0) playlistIndex = playlist.length - 1;

    renderPlaylist();
    playSong(playlist[playlistIndex]);
  } catch (err) {
    console.error('搜索失败:', err);
    songName.textContent = '搜索失败';
    songArtist.textContent = err.message || '网络错误';
  }
}

// ==================== 播放列表 ====================

function renderPlaylist() {
  // 更新计数
  if (playlistCount) playlistCount.textContent = playlist.length + ' 首';

  if (playlist.length === 0) {
    playlistPageList.innerHTML = '<p class="empty-state">播放列表为空<br>去聊天页让 AI 推荐歌吧~ 🎵</p>';
    return;
  }

  playlistPageList.innerHTML = playlist.map((s, i) => {
    const isPlaying = i === playlistIndex;
    const isFav = favorites.some(f => f.id === s.id);
    return `
      <div class="playlist-item ${isPlaying ? 'playing' : ''}" onclick="playlistPlay(${i})">
        ${s.picUrl
          ? `<img class="playlist-item-cover" src="${s.picUrl}" alt="">`
          : `<span class="playlist-item-cover empty">🎵</span>`
        }
        <div class="playlist-item-info">
          <div class="playlist-item-name">${escapeHTML(s.name)}</div>
          <div class="playlist-item-artist">${escapeHTML(s.artist)}</div>
        </div>
        <div class="playlist-item-btns">
          <button class="playlist-item-btn" onclick="event.stopPropagation(); playlistPlay(${i})" title="播放">▶</button>
          <button class="playlist-item-btn" onclick="event.stopPropagation(); playlistToggleFav(${i})" title="收藏">${isFav ? '❤️' : '🤍'}</button>
          <button class="playlist-item-btn btn-del" onclick="event.stopPropagation(); playlistRemove(${i})" title="删除">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

// 从列表播放
function playlistPlay(index) {
  if (index >= 0 && index < playlist.length) {
    playlistIndex = index;
    playSong(playlist[index]);
    renderPlaylist();
  }
}

// 列表中的收藏切换
function playlistToggleFav(index) {
  if (index >= 0 && index < playlist.length) {
    toggleFavorite(playlist[index]);
    renderPlaylist();
    renderFavorites();
  }
}

// 从列表删除
function playlistRemove(index) {
  if (index < 0 || index >= playlist.length) return;
  const removed = playlist[index];
  playlist.splice(index, 1);
  if (currentSong && currentSong.id === removed.id) {
    audioPlayer.pause();
    audioPlayer.src = '';
    audioPlayer.removeAttribute('src');
    currentSong = null;
    playerCover.classList.remove('rotating');
    btnPlay.textContent = '▶';
    songName.textContent = '未在播放';
    songArtist.textContent = '搜索歌曲开始播放';
    lyricsContainer.innerHTML = '<p class="lyrics-placeholder">歌词将在这里显示</p>';
    playlistIndex = -1;
  } else if (index < playlistIndex) {
    playlistIndex--;
  }
  renderPlaylist();
  showToast('已从列表删除');
}

// HTML 转义（防 XSS）
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
function escapeAttr(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ==================== 聊天消息 ====================
function addMessage(type, text) {
  const div = document.createElement('div');
  div.className = `chat-bubble ${type}`;

  const avatar = document.createElement('div');
  avatar.className = 'bubble-avatar';
  avatar.textContent = type === 'user' ? '😊' : '🤖';

  const bubble = document.createElement('div');
  bubble.className = 'bubble-text';
  bubble.innerHTML = text;

  div.appendChild(avatar);
  div.appendChild(bubble);
  chatMessages.appendChild(div);

  // 滚动到底部
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ==================== 播放器 ====================

/**
 * 播放指定歌曲
 * @param {Object} song - { id, name, artist, picUrl }
 */
// 播放请求序号，防止快速切歌时旧请求覆盖新请求
let playRequestId = 0;

async function playSong(song) {
  if (!song || !song.id) return;

  // 立即停掉当前播放
  audioPlayer.pause();
  audioPlayer.src = '';
  audioPlayer.removeAttribute('src');
  lyricsContainer.innerHTML = '<p class="lyrics-placeholder">加载中...</p>';
  timeCurrent.textContent = '0:00';
  timeTotal.textContent = '0:00';
  progressFill.style.width = '0%';
  progressThumb.style.left = '0%';

  // 标记载入中
  btnPlay.textContent = '⏳';
  songName.textContent = song.name;
  songArtist.textContent = song.artist;

  // 封面
  if (song.picUrl) {
    playerCover.innerHTML = `<img src="${song.picUrl}" alt="${song.name}">`;
  } else {
    playerCover.innerHTML = '<span class="cover-placeholder">🎵</span>';
  }

  currentSong = song;
  updateFavoriteBtn();

  // 生成新的请求ID，旧请求回来后会被忽略
  const reqId = ++playRequestId;

  // 获取播放直链
  try {
    const url = await getSongUrl(song.id);

    // 如果在这期间又点了别的歌，忽略这个结果
    if (reqId !== playRequestId) return;

    if (url) {
      audioPlayer.src = url;
      await audioPlayer.play();
      if (reqId === playRequestId) {
        btnPlay.textContent = '⏸';
      }
    } else {
      if (reqId !== playRequestId) return;
      songArtist.textContent += ' (iframe播放)';
      lyricsContainer.innerHTML = `
        <div style="width:100%;max-width:400px;margin:0 auto">
          <iframe frameborder="no" border="0" marginwidth="0" marginheight="0"
            width="100%" height="86"
            src="https://music.163.com/outchain/player?type=2&id=${song.id}&auto=1&height=66"
            style="border-radius:8px">
          </iframe>
        </div>
      `;
      btnPlay.textContent = '▶';
    }
  } catch (e) {
    if (reqId !== playRequestId) return;
    console.error('播放失败:', e);
    songArtist.textContent = '播放失败，请重试';
    btnPlay.textContent = '▶';
  }

  // 获取歌词
  try {
    const lyrics = await getLyrics(song.id);
    if (reqId !== playRequestId) return; // 又被切歌了，不渲染旧歌词
    if (lyrics.length > 0) {
      const lyricsHTML = lyrics.map((l, i) =>
        `<p class="lyric-line" data-time="${l.time}" data-index="${i}">${escapeHTML(l.text)}</p>`
      ).join('');
      lyricsContainer.innerHTML = lyricsHTML;
    }
  } catch (e) {
    // 歌词加载失败不影响播放
  }

  saveLastPlay();
}

function updateFavoriteBtn() {
  if (!currentSong) return;
  const isFav = favorites.some(f => f.id === currentSong.id);
  btnFavorite.textContent = isFav ? '❤️' : '🤍';
}

function renderLyrics(lyrics) {
  if (lyrics.length === 0) {
    lyricsContainer.innerHTML = '<p class="lyrics-placeholder">暂无歌词</p>';
    return;
  }

  lyricsContainer.innerHTML = lyrics.map((l, i) =>
    `<p class="lyric-line" data-time="${l.time}" data-index="${i}">${escapeHTML(l.text)}</p>`
  ).join('');
}

// 播放/暂停
btnPlay.addEventListener('click', () => {
  if (!currentSong) return;
  if (audioPlayer.paused) {
    audioPlayer.play();
    btnPlay.textContent = '⏸';
    playerCover.classList.add('rotating');
  } else {
    audioPlayer.pause();
    btnPlay.textContent = '▶';
    playerCover.classList.remove('rotating');
  }
});

// 封面旋转跟随播放状态
audioPlayer.addEventListener('play', () => playerCover.classList.add('rotating'));
audioPlayer.addEventListener('pause', () => playerCover.classList.remove('rotating'));
audioPlayer.addEventListener('ended', () => playerCover.classList.remove('rotating'));

// 进度条 + 歌词同步
audioPlayer.addEventListener('timeupdate', () => {
  if (!audioPlayer.duration) return;
  const ct = audioPlayer.currentTime;
  const pct = (ct / audioPlayer.duration) * 100;
  progressFill.style.width = pct + '%';
  progressThumb.style.left = pct + '%';
  timeCurrent.textContent = formatTime(ct);

  // 歌词高亮
  const lines = lyricsContainer.querySelectorAll('.lyric-line');
  if (!lines.length) return;
  let active = -1;
  for (let i = 0; i < lines.length; i++) {
    if (parseFloat(lines[i].dataset.time) <= ct) active = i;
    else break;
  }
  if (active !== currentLyricIndex) {
    if (currentLyricIndex >= 0) lines[currentLyricIndex]?.classList.remove('active');
    if (active >= 0) {
      lines[active].classList.add('active');
      lines[active].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    currentLyricIndex = active;
  }
});

let currentLyricIndex = -1;

// 总时长
audioPlayer.addEventListener('loadedmetadata', () => {
  timeTotal.textContent = formatTime(audioPlayer.duration);
});

// 进度条拖拽
function seekTo(e) {
  if (!audioPlayer.duration) return;
  const rect = progressBar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audioPlayer.currentTime = pct * audioPlayer.duration;
}

let isDragging = false;
progressBar.addEventListener('mousedown', (e) => {
  isDragging = true;
  seekTo(e);
});
document.addEventListener('mousemove', (e) => {
  if (isDragging) seekTo(e);
});
document.addEventListener('mouseup', () => {
  isDragging = false;
});
// 触摸支持
progressBar.addEventListener('touchstart', (e) => {
  isDragging = true;
  seekTo(e.touches[0]);
});
document.addEventListener('touchmove', (e) => {
  if (isDragging) seekTo(e.touches[0]);
});
document.addEventListener('touchend', () => {
  isDragging = false;
});

// 播放结束自动下一首
audioPlayer.addEventListener('ended', () => {
  playNext();
});

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// 更新播放页心情标签
function updateMoodTag(mood) {
  if (!moodTag) return;
  const info = MOOD_DISPLAY[mood];
  if (info) {
    moodTag.textContent = `${info.emoji} ${mood}`;
    moodTag.style.background = info.color + '22';
    moodTag.style.color = info.color;
    moodTag.style.borderColor = info.color + '44';
    moodTag.style.display = 'inline-block';
  } else {
    moodTag.style.display = 'none';
  }
}

function playNext() {
  if (playlist.length === 0) return;
  if (playMode === 1) {
    // 单曲循环：重播当前
    playSong(playlist[playlistIndex]);
  } else if (playMode === 2) {
    // 随机播放
    playlistIndex = Math.floor(Math.random() * playlist.length);
    playSong(playlist[playlistIndex]);
  } else {
    // 列表循环
    playlistIndex = (playlistIndex + 1) % playlist.length;
    playSong(playlist[playlistIndex]);
  }
  renderPlaylist();
}

// 播放模式按钮
const MODE_ICONS = ['🔁', '🔂', '🔀'];
const MODE_LABELS = ['列表循环', '单曲循环', '随机播放'];
const modeLabel = $('#mode-label');
btnMode.addEventListener('click', () => {
  playMode = (playMode + 1) % 3;
  btnMode.textContent = MODE_ICONS[playMode];
  modeLabel.textContent = MODE_LABELS[playMode];
});

function playPrev() {
  if (playlist.length === 0) return;
  playlistIndex = (playlistIndex - 1 + playlist.length) % playlist.length;
  playSong(playlist[playlistIndex]);
  renderPlaylist();
}

btnNext.addEventListener('click', playNext);
btnPrev.addEventListener('click', playPrev);

// ==================== 音量控制 ====================
audioPlayer.volume = 0.7;
volumeSlider.addEventListener('input', () => {
  audioPlayer.volume = volumeSlider.value / 100;
  // 根据音量换图标
  const icons = document.querySelector('.volume-icon');
  const v = volumeSlider.value;
  if (v == 0) icons.textContent = '🔇';
  else if (v < 50) icons.textContent = '🔉';
  else icons.textContent = '🔊';
});

// ==================== 收藏管理（Step 6 完善） ====================

function getFavoritesKey() {
  return `favorites_${currentUser}`;
}

function loadFavorites() {
  if (!currentUser) return;
  const data = localStorage.getItem(getFavoritesKey());
  favorites = data ? JSON.parse(data) : [];
  renderFavorites();
}

function saveFavorites() {
  localStorage.setItem(getFavoritesKey(), JSON.stringify(favorites));
}

function toggleFavorite(song) {
  if (!song) return;
  const index = favorites.findIndex(f => f.id === song.id);
  if (index === -1) {
    favorites.unshift({ id: song.id, name: song.name, artist: song.artist, picUrl: song.picUrl || '' });
    btnFavorite.textContent = '❤️';
    btnFavorite.classList.add('favorited');
    setTimeout(() => btnFavorite.classList.remove('favorited'), 400);
    saveFavorites();
    showToast('❤️ 已收藏');
  } else {
    favorites.splice(index, 1);
    btnFavorite.textContent = '🤍';
    saveFavorites();
    showToast('已取消收藏');
  }
}

btnFavorite.addEventListener('click', () => {
  if (!currentSong) return;
  toggleFavorite(currentSong);
  renderFavorites();
});

function renderFavorites() {
  if (favorites.length === 0) {
    favoritesList.innerHTML = '<p class="empty-state">还没有收藏歌曲<br>去聊天页搜歌吧~ 🎵</p>';
    return;
  }

  favoritesList.innerHTML = favorites.map(f => `
    <div class="favorite-item">
      <img class="fav-cover" src="${f.picUrl || ''}" alt="" onerror="this.style.display='none'">
      <div class="fav-info">
        <div class="fav-name">${f.name}</div>
        <div class="fav-artist">${f.artist}</div>
      </div>
      <button class="fav-play" data-id="${f.id}">▶</button>
      <button class="fav-delete" data-id="${f.id}">✕</button>
    </div>
  `).join('');
}

// 收藏页事件委托
favoritesList.addEventListener('click', (e) => {
  const id = e.target.dataset.id;
  if (!id) return;

  if (e.target.classList.contains('fav-delete')) {
    // 删除收藏
    favorites = favorites.filter(f => f.id != id);
    saveFavorites();
    renderFavorites();
  } else if (e.target.classList.contains('fav-play')) {
    // 播放收藏的歌曲
    const fav = favorites.find(f => f.id == id);
    if (!fav) return;
    // 如果不在播放列表里，加进去
    if (!playlist.find(p => p.id === fav.id)) {
      playlist.push(fav);
    }
    playlistIndex = playlist.findIndex(p => p.id === fav.id);
    playSong(playlist[playlistIndex]);
    renderPlaylist();
    switchTab('player');
  }
});

// ==================== 记忆播放（Step 9 完善） ====================
function saveLastPlay() {
  if (!currentSong) return;
  const lastPlay = {
    songId: currentSong.id,
    songName: currentSong.name,
    artist: currentSong.artist || '',
    currentTime: audioPlayer.currentTime || 0,
    picUrl: currentSong.picUrl || '',
    volume: audioPlayer.volume,
  };
  localStorage.setItem('lastPlay', JSON.stringify(lastPlay));
}

async function restoreLastPlay() {
  const data = localStorage.getItem('lastPlay');
  if (!data) return;
  try {
    const last = JSON.parse(data);

    // 先显示基本信息
    songName.textContent = last.songName;
    songArtist.textContent = last.artist;
    if (last.picUrl) {
      playerCover.innerHTML = `<img src="${last.picUrl}" alt="${last.songName}">`;
    }

    // 恢复音量
    if (last.volume !== undefined) {
      audioPlayer.volume = last.volume;
      volumeSlider.value = last.volume * 100;
    }

    // 重建 currentSong 对象
    currentSong = {
      id: last.songId,
      name: last.songName,
      artist: last.artist,
      picUrl: last.picUrl
    };

    // 加入播放列表
    if (!playlist.find(p => p.id === currentSong.id)) {
      playlist.unshift(currentSong);
      playlistIndex = 0;
    }

    // 重新获取播放链接
    const url = await getSongUrl(currentSong.id);
    if (url) {
      audioPlayer.src = url;
      // 恢复到上次播放位置
      audioPlayer.currentTime = last.currentTime || 0;
      btnPlay.textContent = '▶'; // 不自动播放，等用户点
      timeTotal.textContent = formatTime(audioPlayer.duration || 0);
    }

    // 获取歌词
    const lyrics = await getLyrics(currentSong.id);
    if (lyrics.length > 0) {
      lyricsContainer.innerHTML = lyrics.map((l, i) =>
        `<p class="lyric-line" data-time="${l.time}" data-index="${i}">${escapeHTML(l.text)}</p>`
      ).join('');
    }

    updateFavoriteBtn();
    renderPlaylist();
    console.log('已恢复上次播放:', last.songName, '位置:', formatTime(last.currentTime));
  } catch (e) {
    console.error('恢复播放失败:', e);
  }
}

// 退出前保存
window.addEventListener('beforeunload', saveLastPlay);

// ==================== 启动 ====================
init();

// ==================== PWA Service Worker ====================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
