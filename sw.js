const CACHE_NAME = 'makmus-v1.3'; // On monte la version
const ASSETS = [
  './', // Chemin relatif au dossier actuel
  './index.html',
  './mon-activite.html', // N'oublie pas ta nouvelle page !
  './redaction.html',
  './style.css',
  './redaction.css',
  './script.js',
  './redaction.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✅ Service Worker : Mise en cache des fichiers');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ Service Worker : Nettoyage ancien cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  // 1. Priorité au réseau pour Supabase (données en temps réel)
  if (e.request.url.includes('supabase.co')) {
    return; // On laisse le navigateur gérer normalement
  }

  // 2. Stratégie Stale-While-Revalidate (Cache d'abord, puis mise à jour)
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        // On ne met en cache que les réponses valides (200)
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Optionnel : retourner une page hors-ligne ici si fetch échoue
      });

      return cachedResponse || fetchPromise;
    })
  );
});
