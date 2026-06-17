// 心情音乐盒 - Service Worker（离线缓存）
const CACHE = 'moodmusic-v2';
const FILES = [
  '/mood-music-box/',
  '/mood-music-box/index.html',
  '/mood-music-box/style.css',
  '/mood-music-box/app.js',
  '/mood-music-box/api.js',
  '/mood-music-box/manifest.json',
  '/mood-music-box/icon-192.png',
  '/mood-music-box/icon-512.png'
];

// 安装时缓存核心文件
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
  self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 网络优先，失败时用缓存
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(res => res)
      .catch(() => caches.match(e.request))
  );
});
