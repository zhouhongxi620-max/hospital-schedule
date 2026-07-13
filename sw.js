// Service Worker - 医院排班助手
const CACHE_NAME = 'hospital-schedule-v3';
const FILES_TO_CACHE = [
  './index.html',
  './manifest.json',
];

// 安装：预缓存核心文件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 请求：缓存优先策略
self.addEventListener('fetch', (event) => {
  // 跳过 chrome-extension 等非 http 请求
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // 缓存命中，返回缓存；同时后台更新
      const fetchPromise = fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => cached); // 网络失败时返回缓存

      return cached || fetchPromise;
    })
  );
});

// 推送通知（预留）
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '🏥 排班提醒';
  const options = {
    body: data.body || '该查看今天的班次了',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🏥</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="%2343A047"/></svg>',
    tag: 'shift-reminder',
    requireInteraction: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
