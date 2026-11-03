// Smart Vendas - Service Worker
// Cache seguro: apenas app shell e recursos estáticos (CSS, JS, Fontes, Ícones)
// NUNCA faz cache de dados financeiros sensíveis da API (/api/*)

const CACHE_NAME = 'smart-vendas-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-maskable.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // 1. Downloads diretos (.sql, .zip, .sh, /downloads/*) NUNCA passam pelo service worker
  if (
    requestUrl.pathname.startsWith('/downloads/') ||
    requestUrl.pathname.endsWith('.sql') ||
    requestUrl.pathname.endsWith('.zip') ||
    requestUrl.pathname.endsWith('.tar.gz') ||
    requestUrl.pathname.endsWith('.sh')
  ) {
    return;
  }

  // 2. Chamadas de API (/api/*) NUNCA são armazenadas em cache
  // Garantia de segurança bancária e integridade financeira em tempo real
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({
            error: 'Sem conexão de internet no momento. Reconectando...',
            offline: true
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // 2. Navegação de páginas (HTML) - Network First com fallback de cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 3. Recursos estáticos - Stale While Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
