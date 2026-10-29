// FORÇA 92 V8 — service worker
// App abre offline; atualiza sozinho quando há internet.
const VERSION = 'forca92-v8.1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const RUNTIME_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);
  const same = url.origin === location.origin;

  // Página: rede primeiro (pega atualização), cache se estiver sem internet
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html').then(x => x || caches.match('./')))
    );
    return;
  }

  // Fotos e ícones do próprio app: cache primeiro
  if (same) {
    e.respondWith(
      caches.match(r).then(hit => hit || fetch(r).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(r, copy)); }
        return res;
      }))
    );
    return;
  }

  // Biblioteca Supabase e fonte: rede primeiro, cache como reserva (nunca a API/dados)
  if (RUNTIME_HOSTS.includes(url.hostname)) {
    e.respondWith(
      fetch(r).then(res => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(r, copy)); }
        return res;
      }).catch(() => caches.match(r))
    );
  }
});
