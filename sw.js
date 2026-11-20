/* Service worker: hace que la app funcione sin internet.
   Estrategia "primero la red": si hay conexión, siempre carga la versión más
   nueva que hayas subido; si no la hay (o tarda más de 3 s), usa la copia guardada.
   Así, para actualizar basta con subir los archivos nuevos: no hay que tocar este archivo. */
importScripts('./version.js');
const CACHE = 'pinta-y-juega-v1';
const CORE = [
  './', './index.html', './version.js', './manifest.webmanifest', './css/app.css',
  './js/core.js', './js/photos.js', './js/lineart.js', './js/parents.js', './js/main.js',
  './js/data/items.js', './js/data/templates.js',
  './js/games/draw.js', './js/games/pairs.js', './js/games/find.js',
  './fonts/baloo-2-latin-600-normal.woff2', './fonts/baloo-2-latin-800-normal.woff2',
  './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function fromNetwork(req) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), 3000);
    fetch(req, { cache: 'no-cache' }).then(res => {
      clearTimeout(t);
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      resolve(res);
    }, err => { clearTimeout(t); reject(err); });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fromNetwork(req).catch(() =>
      caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
    )
  );
});
