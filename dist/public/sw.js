// AUTO-INJECTED: These values are automatically updated during build by scripts/inject-version.js
const VERSION = '5.4.2'; // Injected from package.json
const BUILD_TIME = '2025-10-26T12:15:41.506Z'; // Injected at build time
const BUILD_TIMESTAMP = 1761480941507; // Injected at build time (used for cache busting)
const CACHE_NAME = `mesc-v${VERSION}-${BUILD_TIMESTAMP}`;

// Lista de URLs para pré-cachear (apenas essenciais)
const urlsToCache = [
  '/manifest.json',
  '/sjtlogo.png',
  '/version.json'
];

// Build info for debugging
const BUILD_INFO = {
  version: VERSION,
  buildTime: BUILD_TIME,
  buildTimestamp: BUILD_TIMESTAMP,
  cacheName: CACHE_NAME
};

console.log('[SW] Initializing Service Worker:', BUILD_INFO);

// Auto-reload quando service worker atualiza
let RELOAD_ON_UPDATE = true;

// Configuração de auto-update
const CHECK_UPDATE_INTERVAL = 30000; // 30 segundos
const FORCE_UPDATE_ROUTES = ['/api/schedules', '/api/ministers']; // APIs críticas sempre frescas

// Install service worker and cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        self.skipWaiting();
      })
  );
});

// Network-first strategy for API calls, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-only for critical API endpoints (NEVER cache - always fresh data)
  const isCriticalAPI = FORCE_UPDATE_ROUTES.some(route => url.pathname.includes(route)) ||
                        url.pathname === '/api/users' || 
                        url.pathname === '/api/auth/me' || 
                        url.pathname === '/api/auth/user';
  
  if (isCriticalAPI) {
    event.respondWith(
      fetch(request).catch(() => {
        // For critical endpoints, if network fails, return proper error (no stale cache)
        return new Response(JSON.stringify({ error: 'Network unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Network-first for other API calls (cache only as fallback)
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache GET requests only as offline fallback
          if (request.method === 'GET' && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache (works for GET only)
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
              console.log('[SW] Serving stale data (offline):', url.pathname);
              return cachedResponse;
            }
            return new Response(JSON.stringify({ error: 'Network unavailable' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Network-first for JS/CSS to always get latest version
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.jsx') || url.pathname.endsWith('.tsx')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If network fails, try cache as fallback
          return caches.match(request);
        })
    );
    return;
  }

  // Cache-first for images and other static resources
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        });
      })
  );
});

// Clean up old caches and force activation
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new service worker, version:', VERSION);

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // LIMPEZA AGRESSIVA: Deleta TODOS os caches antigos
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // CRÍTICO: Limpa TODOS os caches de API
      return caches.open(CACHE_NAME).then(cache => {
        return cache.keys().then(requests => {
          return Promise.all(
            requests.map(request => {
              if (request.url.includes('/api/')) {
                return cache.delete(request);
              }
            })
          );
        });
      });
    }).then(() => {
      console.log('[SW] All old caches cleared, claiming clients');
      // Force immediate control of all clients
      return self.clients.claim();
    }).then(() => {
      // Notify all clients about the update and force reload
      return self.clients.matchAll().then(clients => {
        console.log(`[SW] Notifying ${clients.length} clients about update`);
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: VERSION,
            buildTime: BUILD_TIME,
            cacheCleared: true,
            forceReload: RELOAD_ON_UPDATE
          });
        });
      });
    })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    let data;
    try {
      data = event.data.json();
    } catch (error) {
      console.warn('[SW] Push payload is not JSON:', error);
      data = { title: event.data.text(), body: event.data.text() };
    }

    const options = {
      body: data.body,
      icon: '/images/icon-192.png',
      badge: '/images/icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey || 1,
        url: data.url || '/communication',
        ...data.data
      },
      actions: [
        {
          action: 'explore',
          title: 'Ver detalhes',
          icon: '/images/icon-192.png'
        },
        {
          action: 'close',
          title: 'Fechar',
          icon: '/images/icon-192.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'MESC - Nova Notificação', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'PUSH_NAVIGATION', url: targetUrl });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] pushsubscriptionchange event', event);
});

// Handle app update available and force refresh
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'FORCE_UPDATE') {
    // Clear all caches and force update
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }).then(() => {
      self.skipWaiting();
    });
  }
});
