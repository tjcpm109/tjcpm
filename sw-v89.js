// sw-v89.js
const CACHE_NAME = 'tjcpm-cache-v89'; // 💡 升級至 v89，記得同步修改 index.html 內註冊的路徑版本(若有帶版本號)

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://tjcpm109.github.io/tjcpm/logo.png',
  'https://tjcpm109.github.io/tjcpm/APP%20logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 💡 順手把最新抓到的資源寫回快取，離線時才有最新內容可用
        const resClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
