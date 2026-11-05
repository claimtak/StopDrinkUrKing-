const CACHE = 'stop-king-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './stop-logo.png',
  './start-logo.png',
  './icon-192.png',
  './icon-512.png'
];

/* प्रत्येक फाइल वेगळी घेऊन cache करतो; एखादी फाइल नसली तरी install थांबत नाही */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(ASSETS.map(u =>
        fetch(u, { cache: 'no-store' })
          .then(r => (r.ok ? c.put(u, r) : null))
          .catch(() => null)
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function putCopy(req, res) {
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy));
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  /* Firebase व इतर बाहेरील विनंत्या cache करू नका */
  if (url.origin !== self.location.origin) return;

  /* HTML: आधी नेटवर्क (नवीन आवृत्ती लगेच), नसेल तर cache (offline) */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => putCopy(req, res))
        .catch(() => caches.match(req).then(m => m || caches.match('./index.html')))
    );
    return;
  }

  /* बाकी फाइल्स: आधी cache, नसेल तर नेटवर्क */
  e.respondWith(
    caches.match(req).then(m => m || fetch(req).then(res => putCopy(req, res)))
  );
});
