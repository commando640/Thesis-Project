// ===================================================
//  কালো যাদু PWA — Service Worker
//  Cache-first strategy with network fallback
// ===================================================

const CACHE_NAME = 'kalo-jadu-v1';

// যেসব ফাইল offline-এও কাজ করবে
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ===== INSTALL: অ্যাসেট প্রি-ক্যাশ করুন =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] প্রি-ক্যাশিং শুরু হচ্ছে...');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      console.log('[SW] ✅ ইনস্টল সম্পন্ন।');
      return self.skipWaiting();
    })
  );
});

// ===== ACTIVATE: পুরনো ক্যাশ মুছুন =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] পুরনো ক্যাশ মুছছে:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] ✅ অ্যাক্টিভেট সম্পন্ন।');
      return self.clients.claim();
    })
  );
});

// ===== FETCH: Cache-first, network fallback =====
self.addEventListener('fetch', (event) => {
  // শুধু GET request হ্যান্ডেল করুন
  if (event.request.method !== 'GET') return;

  // Chrome extension বা non-http request বাদ দিন
  if (!event.request.url.startsWith('http')) return;

  // Google Fonts, YouTube, external CDN — network-first
  const externalHosts = ['fonts.googleapis.com', 'fonts.gstatic.com', 'youtube.com', 'youtu.be'];
  const isExternal = externalHosts.some(host => event.request.url.includes(host));

  if (isExternal) {
    // Network-first for external resources
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first for local resources
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;

        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        }).catch(() => {
          // Offline fallback — index.html দেখান
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
    );
  }
});
