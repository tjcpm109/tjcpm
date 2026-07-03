const CACHE_NAME = 'tjcpm-offline-v58';

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

// 💡 V47: 判斷是否為「網頁殼」(HTML 導覽) 請求 — 這類請求改用 network-first，
// 避免使用者在部署新版後，仍因舊快取而卡在舊版介面上；靜態資源則維持 cache-first 加速載入。
function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
         (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  
  if (isNavigationRequest(e.request)) {
    // Network-first：優先取得最新版本網頁殼，離線或逾時才退回快取
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
    return;
  }
  
  // 靜態資源（圖片、manifest 等）：cache-first，加速載入並節省流量
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        if (response.status === 200) {
          const cacheCopy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, cacheCopy));
        }
        return response;
      }).catch(() => offlineFallback());
    })
  );
});

function offlineFallback() {
  return new Response('<div style="padding:20px;text-align:center;font-family:sans-serif;"><h3>⚠️ 離線狀態且無此快取頁面</h3><p>請確認網路連線後再試。</p></div>', {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
