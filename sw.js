const CACHE_NAME = 'tjcpm-cache-v36'; // 🟢 V36 獨立快取金鑰
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://tjcpm109.github.io/tjcpm/APP%20logo.png',
  'https://tjcpm109.github.io/tjcpm/logo.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).catch(err => {
      console.error('Service Worker install cache failed:', err);
    })
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // 排除 Google Script API 與 JSONP 請求，僅對靜態 PWA 資源快取
  if (url.hostname.includes('script.google.com') || url.search.includes('callback=')) {
    return fetch(e.request);
  }
  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // 離線回退
        return caches.match('./index.html');
      });
    })
  );
});
