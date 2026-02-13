const CACHE_NAME = 'makmus-v1.2';
const ASSETS = [
  '/',
  '/index.html',
  '/redaction.html',
  '/style.css',
  '/redaction.css',
  '/script.js', // N'oublie pas ton fichier JS principal !
  '/redaction.js',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // Force la mise à jour immédiate
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  // On ne met pas en cache les requêtes vers Supabase (toujours live)
  if (e.request.url.includes('supabase.co')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Pour le reste (CSS, JS, Images locales)
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        // On met à jour le cache silencieusement pour la prochaine fois
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, networkResponse.clone());
        });
        return networkResponse;
      });
      // On retourne le cache immédiatement s'il existe, sinon le réseau
      return cachedResponse || fetchPromise;
    })
  );
});
