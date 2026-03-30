const CACHE_NAME = 'kashafa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  // سيتم إضافة ملفات الـ JS والـ CSS تلقائياً عبر Vite في الإنتاج، 
  // ولكن هنا سنعتمد على التخزين الديناميكي
];

// استراتيجيات التخزين
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // التعامل مع طلبات الـ API والـ WebSocket
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws/') || url.pathname.includes('supabase.co')) {
    // طلبات الكتابة (POST, PUT, DELETE, PATCH) يجب أن تمر دائماً للشبكة
    if (event.request.method !== 'GET') {
      event.respondWith(
        fetch(event.request).catch(() => {
          // إذا فشل الاتصال بالشبكة لطلب كتابة، نرجع استجابة خطأ مخصصة
          // ليتمكن الكود في الواجهة من التقاطها وحفظ العملية في الطابور
          return new Response(JSON.stringify({ 
            error: 'Network failure', 
            offline: true 
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
      );
      return;
    }
    // طلبات الـ GET للـ API نتركها تمر للشبكة (المزامنة تتم عبر syncEngine)
    return;
  }

  // استراتيجية Stale-While-Revalidate للأصول الثابتة (فقط لطلبات GET)
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          return cachedResponse;
        });

        return cachedResponse || fetchPromise;
      })
    );
  }
});
