const CACHE_NAME = 'konan-pwa-v1.0.0';

// التثبيت والإجبار على التفعيل الفوري
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// التفعيل ومسح أي كاش قديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// جلب الموارد من الشبكة أولاً مع دعم الكاش الاحتياطي
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
