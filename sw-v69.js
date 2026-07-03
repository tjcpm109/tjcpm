const CACHE_NAME = 'tjcpm-offline-v69';

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

function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
         (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  
  if (isNavigationRequest(e.request)) {
    e.respondWith(
      fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const cacheCopy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, cacheCopy));
        }
        return response;
      }).catch(() =>
        caches.match(e.request).then(cached => cached || caches.match('./index.html') || offlineFallback())
      )
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (response && response.status === 200 && (e.request.url.startsWith('http') || e.request.url.startsWith('https'))) {
            const cacheCopy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, cacheCopy));
          }
          return response;
        });
      })
    );
  }
});

function offlineFallback() {
  return new Response('<h3>離線模式：目前無網際網路連線，且此頁面尚未暫存。</h3>', {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
