const CACHE = 'my-web-game-v1';
const FILES = [
  './',              // pwa/
  '../',             // 根
  '../index.html',
  '../sketch.js',
  './manifest.webmanifest',
  // RNBO（如果你已经放了就会缓存，否则忽略）
  '../audio/rnbo.min.js',
  '../audio/patch.export.json',
  '../audio/dependencies.json',
  '../audio/patch.export.license',
  // 资源
  '../assets/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES).catch(() => {}))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
