/**
 * GameRadar Service Worker v4.0
 * Estrategia: Cache First con renovación en segundo plano
 * Offline total para assets estáticos + API en caché
 */

const CACHE_VERSION = 'v4';
const CACHE_NAMES = {
  static: `grd-static-${CACHE_VERSION}`,
  api: `grd-api-${CACHE_VERSION}`,
  images: `grd-images-${CACHE_VERSION}`,
  fonts: `grd-fonts-${CACHE_VERSION}`,
  shell: `grd-shell-${CACHE_VERSION}`,
};

// Assets a precachear en instalación
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/vite.svg',
];

// Instalación: Cachear shell + assets críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAMES.shell);
      // Pre-cachear URLs conocidas
      await cache.addAll(PRECACHE_URLS).catch(() => {});
      // Intentar cachear recursos de Vite (se agregarán dinámicamente)
      self.skipWaiting();
    })()
  );
});

// Activación: Limpiar cachés antiguas y tomar control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const validCacheNames = new Set(Object.values(CACHE_NAMES));
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(key => key.startsWith('grd-') && !validCacheNames.has(key))
          .map(key => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// Estrategia: Cache First + renovación en segundo plano
async function cacheFirstRefresh(request, cacheName, maxAge = null) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    // Si hay maxAge y el caché es viejo, renovar en background
    if (maxAge) {
      const cachedDate = cached.headers.get('date');
      if (cachedDate) {
        const age = Date.now() - new Date(cachedDate).getTime();
        if (age > maxAge) {
          // Renovación en segundo plano (no bloquear)
          fetchAndCache(request, cache).catch(() => {});
        }
      }
    }
    return cached;
  }

  // No hay caché, obtener de red
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    // Fallback: devolver offline page o error amigable
    if (request.destination === 'document') return caches.match('/');
    return new Response(
      JSON.stringify({ success: false, error: 'Sin conexión', offline: true }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
  } catch {}
}

// Network First con timeout
async function networkFirstTimeout(request, cacheName, timeout = 3000) {
  const cache = await caches.open(cacheName);

  try {
    const fetchPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), timeout)
    );

    const response = await Promise.race([fetchPromise, timeoutPromise]);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Fallback para API
    return new Response(
      JSON.stringify({ success: false, error: 'Sin conexión', offline: true }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Manejo de fetch con estrategias por tipo
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol === 'chrome-extension:' || url.protocol === 'chrome-extension:') return;

  // Solo manejar requests del mismo origen o CDNs conocidos
  const isSameOrigin = url.origin === self.location.origin;
  const isGoogleFonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  if (!isSameOrigin && !isGoogleFonts) return;

  // API: Network First con timeout de 3s
  if (isSameOrigin && url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstTimeout(request, CACHE_NAMES.api, 3000));
    return;
  }

  // Imágenes: Cache First, renovar en segundo plano cada 1 hora
  if (request.destination === 'image') {
    event.respondWith(cacheFirstRefresh(request, CACHE_NAMES.images, 3600000));
    return;
  }

  // Fuentes: Cache First (casi estáticas)
  if (request.destination === 'font' || isGoogleFonts) {
    event.respondWith(cacheFirstRefresh(request, CACHE_NAMES.fonts));
    return;
  }

  // Scripts y estilos (Vite assets): Cache First con renovación cada 24h
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(cacheFirstRefresh(request, CACHE_NAMES.static, 86400000));
    return;
  }

  // Documentos y otros: Cache First con renovación
  event.respondWith(cacheFirstRefresh(request, CACHE_NAMES.static));
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.notification?.title || 'GameRadar', {
        body: data.notification?.body || '¡Nuevos juegos gratuitos disponibles!',
        icon: data.notification?.icon || '/vite.svg',
        badge: '/vite.svg',
        tag: 'new-games',
        requireInteraction: true,
        vibrate: data.notification?.vibrate || [100, 50, 100],
        actions: [
          { action: 'open', title: 'Ver juegos' },
          { action: 'close', title: 'Cerrar' }
        ]
      })
    );
  } catch {
    // Si no es JSON válido, mostrar el texto plano
    event.waitUntil(
      self.registration.showNotification('GameRadar', {
        body: event.data.text(),
        icon: '/vite.svg',
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;
  if (action === 'open' || !action) {
    event.waitUntil(clients.openWindow('/'));
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CACHE_URLS' && Array.isArray(event.data.urls)) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE_NAMES.static);
        await cache.addAll(event.data.urls).catch(() => {});
      })()
    );
  }
});
