// ═══════════════════════════════════════════════
//  ARDAX FOOTBALL BETTING — sw.js
//  Service Worker per PWA e cache offline
// ═══════════════════════════════════════════════

const CACHE_NAME = 'ardax-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/config.js',
  '/auth.js',
  '/api.js',
  '/ai.js',
  '/data.js',
  '/app.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap',
];

// Installazione: pre-cache assets statici
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Attivazione: rimuovi cache vecchie
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first per assets, network-first per API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API calls → network first, fallback cache
  if (url.hostname.includes('api-sports') || url.hostname.includes('groq') || url.hostname.includes('open-meteo')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Assets statici → cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

// Push notifications
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Ardax Football Betting', {
      body: data.body || 'Nuova schedina VIP disponibile!',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'ardax-notification',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
