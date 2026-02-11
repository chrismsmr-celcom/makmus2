const CACHE_NAME = 'makmus-v1.1'; // On incrémente la version
const ASSETS = [
  '/',
  '/index.html',
  '/redaction.html',
  '/style.css',
  '/redaction.css', // Ajouté !
  '/redaction.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Installation : Mise en cache des fichiers de base
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Mise en cache des ressources');
      return cache.addAll(ASSETS);
    })
  );
});

// Activation : Nettoyage des anciens caches pour éviter les bugs de style
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Suppression de l ancien cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Stratégie : Network First (Priorité au réseau pour les news fraîches)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
