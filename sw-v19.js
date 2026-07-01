const CACHE_NAME = 'tjcpm-offline-v19';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://tjcpm109.github.io/tjcpm/logo.png',
  'https://tjcpm109.github.io/tjcpm/APP%20logo.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => {
        if (k !== CACHE_NAME) return caches.delete(k);
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        if (response.status === 200) {
          const cacheCopy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, cacheCopy));
        }
        return response;
      }).catch(() => {
        return new Response('<div style=\"padding:20px;text-align:center;font-family:sans-serif;\"><h3>⚠️ 離線狀態且無此快取頁面</h3><p>請確認網路連線後再試。</p></div>', {\n          headers: { 'Content-Type': 'text/html; charset=utf-8' }\n        });
      });
    })
  );
});
