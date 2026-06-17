/* ============================================
   心情音乐盒(手机版) - API 调用模块
   使用 Railway 公网 API，手机无需连接电脑
   ============================================ */

// Railway 公网网易云 API
const NETEASE_BASE = 'https://netease-api-production-3325.up.railway.app';

// DeepSeek API（不变）
const DEEPSEEK_KEY = 'sk-2d83c1e64a26481cbcc26872df4dad30';
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

const SYSTEM_PROMPT = `你是一个专业的音乐推荐助手，名叫"小乐"。你的特点：

1. **分析心情**：用户告诉你他的心情或状态，你分析并推荐合适的歌曲
2. **直接搜歌**：用户说想听某首歌或某个歌手的歌，你帮他找
3. **简短回复**：每次回复控制在3-5句话以内，不要长篇大论
4. **心情匹配**：每次回复开头先用一行标记用户的心情（只选最匹配的一个）：
   [MOOD:开心/难过/疲惫/焦虑/兴奋/浪漫/平静/失落/愤怒/思念]

   心情→音乐风格对照表：
   - 开心 → 欢快流行、节奏明快的歌曲
   - 难过 → 抒情慢歌、治愈系歌曲
   - 疲惫 → 轻柔舒缓、放松纯音乐
   - 焦虑 → 安静钢琴、自然白噪音
   - 兴奋 → 电子舞曲、高能量摇滚
   - 浪漫 → 爵士情歌、R&B
   - 平静 → 轻音乐、新世纪音乐
   - 失落 → 温暖民谣、励志歌曲
   - 愤怒 → 重金属、硬摇滚
   - 思念 → 怀旧金曲、深情情歌
5. **推荐格式**：推荐歌曲时用以下格式（方便程序解析成卡片）：
   [MUSIC]
   歌名1 - 歌手1
   歌名2 - 歌手2
   [/MUSIC]
6. 优先推荐华语歌曲，风格要严格按心情对照表匹配

记住：你是在跟用户聊天，语气轻松友好，多用 emoji。`;

async function deepseekChat(messages) {
  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_KEY}` },
    body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages], temperature: 0.8, max_tokens: 600 })
  });
  if (!response.ok) throw new Error(`DeepSeek API ${response.status}`);
  const data = await response.json();
  const reply = data.choices[0].message.content;

  // 解析心情标记
  const mood = parseMoodBlock(reply);
  // 解析歌曲推荐
  const songs = parseMusicBlock(reply);
  // 去掉标记块，只保留聊天文字
  let cleanReply = reply.replace(/\[MUSIC\][\s\S]*?\[\/MUSIC\]/g, '').trim();
  cleanReply = cleanReply.replace(/\[MOOD:[^\]]+\]/g, '').trim();

  return { reply: cleanReply, songs, mood };
}

/**
 * 从 AI 回复中提取心情标记
 */
function parseMoodBlock(text) {
  const match = text.match(/\[MOOD:([^\]]+)\]/);
  if (!match) return null;
  return match[1].trim();
}

function parseMusicBlock(text) {
  const match = text.match(/\[MUSIC\]([\s\S]*?)\[\/MUSIC\]/);
  if (!match) return [];
  return match[1].trim().split('\n').map(line => {
    const parts = line.trim().split(/[-—–]/);
    return parts.length >= 2 ? { name: parts[0].trim(), artist: parts.slice(1).join('-').trim() } : null;
  }).filter(Boolean);
}

async function searchSongs(keyword) {
  const res = await fetch(`${NETEASE_BASE}/search?keywords=${encodeURIComponent(keyword)}&limit=8`);
  const data = await res.json();
  if (data.code !== 200 || !data.result?.songs) return [];
  return data.result.songs.map(s => ({
    id: s.id, name: s.name,
    artist: (s.artists || []).map(a => a.name).join(' / '),
    album: (s.album || {}).name || '',
    picUrl: (s.album || {}).picUrl || ''
  }));
}

async function getSongUrl(id) {
  // Railway API 版本较老，部分歌曲拿不到直链
  // 优先尝试 API，失败则走 iframe 播放
  try {
    const res = await fetch(`${NETEASE_BASE}/song/url?id=${id}`);
    const data = await res.json();
    if (data.code === 200 && data.data?.[0]?.url) {
      return data.data[0].url;
    }
  } catch (e) { /* fallthrough */ }
  return null;
}

async function getLyrics(id) {
  const res = await fetch(`${NETEASE_BASE}/lyric?id=${id}`);
  const data = await res.json();
  if (data.code !== 200 || !data.lrc?.lyric) return [];
  return parseLyric(data.lrc.lyric);
}

function parseLyric(lrcText) {
  const lines = [];
  const regex = /\[(\d{2}):(\d{2})[.:](\d{1,3})\](.*)/g;
  let match;
  while ((match = regex.exec(lrcText)) !== null) {
    const time = parseInt(match[1]) * 60 + parseInt(match[2]) + (match[3].length === 2 ? parseInt(match[3]) / 100 : parseInt(match[3]) / 1000);
    const text = match[4].trim();
    if (text) lines.push({ time, text });
  }
  return lines;
}
