const CACHE_NAME = 'makmus-v1.4'; // On change de version pour forcer la mise à jour
const ASSETS = [
  './', 
  './index.html',
  './mon-activite.html', 
  './redaction.html',
  './style.css',
  './redaction.css',
  './script.js',
  './redaction.js',
  './manifest.json'
];

// INSTALLATION : Mise en cache initiale
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✅ SW: Mise en cache des assets');
      // On utilise addAll mais on pourrait utiliser Map/Settled pour ignorer les fichiers manquants
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// ACTIVATION : Nettoyage des vieux caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ SW: Suppression ancien cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// FETCH : Gestion des requêtes
self.addEventListener('fetch', (e) => {
  const url = e.request.url;

  // 1. FILTRE DE SÉCURITÉ (Crucial pour éviter ton erreur TypeError)
  // On ignore tout ce qui n'est pas HTTP ou HTTPS (ex: chrome-extension://)
  if (!url.startsWith('http')) return;

  // 2. EXCEPTION SUPABASE
  // On ne met jamais Supabase en cache pour avoir les news en temps réel
  if (url.includes('supabase.co')) return;

  // 3. STRATÉGIE : Cache First (pour la vitesse) avec mise à jour en arrière-plan
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        // Mise à jour du cache uniquement si la réponse est valide et vient de notre domaine
        if (networkResponse && networkResponse.status === 200 && url.startsWith(self.location.origin)) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline : On pourrait ici retourner une page d'erreur offline
      });

      return cachedResponse || fetchPromise;
    })
  );
});
