// Service Worker para MESC - Sistema de Push Notifications
const CACHE_NAME = 'mesc-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache opened');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
  // Ignora requisições não-GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          // Não cacheia respostas não exitosas
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clona a resposta para cache
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Retorna página offline se disponível
        return caches.match('/offline.html');
      })
  );
});

// Push Notifications
self.addEventListener('push', event => {
  console.log('[SW] Push received:', event);

  let notification = {
    title: 'MESC - Santuário São Judas',
    body: 'Nova notificação recebida',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'Ver',
        icon: '/icon-check.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icon-close.png'
      }
    ]
  };

  // Parse dos dados do push
  if (event.data) {
    try {
      const data = event.data.json();
      notification = {
        ...notification,
        title: data.title || notification.title,
        body: data.body || notification.body,
        icon: data.icon || notification.icon,
        badge: data.badge || notification.badge,
        tag: data.tag || 'default',
        requireInteraction: data.requireInteraction || false,
        renotify: data.renotify || false,
        silent: data.silent || false,
        data: {
          ...notification.data,
          ...data.data,
          url: data.url || '/',
          type: data.type || 'general'
        }
      };

      // Personalização por tipo de notificação
      switch (data.type) {
        case 'schedule':
          notification.icon = '/icon-calendar.png';
          notification.badge = '/badge-calendar.png';
          notification.actions = [
            {
              action: 'view-schedule',
              title: 'Ver Escala',
              icon: '/icon-view.png'
            },
            {
              action: 'dismiss',
              title: 'Depois',
              icon: '/icon-later.png'
            }
          ];
          break;
        case 'substitution':
          notification.icon = '/icon-swap.png';
          notification.badge = '/badge-swap.png';
          notification.requireInteraction = true;
          notification.actions = [
            {
              action: 'accept',
              title: 'Aceitar',
              icon: '/icon-check.png'
            },
            {
              action: 'reject',
              title: 'Recusar',
              icon: '/icon-close.png'
            }
          ];
          break;
        case 'reminder':
          notification.icon = '/icon-bell.png';
          notification.badge = '/badge-bell.png';
          notification.vibrate = [500];
          break;
        case 'announcement':
          notification.icon = '/icon-megaphone.png';
          notification.badge = '/badge-megaphone.png';
          notification.requireInteraction = true;
          break;
        case 'formation':
          notification.icon = '/icon-graduation.png';
          notification.badge = '/badge-graduation.png';
          break;
      }
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notification.title, notification)
  );
});

// Clique na notificação
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click received:', event);

  event.notification.close();

  const action = event.action;
  const notification = event.notification;
  const data = notification.data || {};

  let responseUrl = data.url || '/';

  // Tratamento de ações específicas
  switch (action) {
    case 'view':
    case 'view-schedule':
      responseUrl = data.url || '/schedules';
      break;
    case 'accept':
      // Enviar aceitação ao servidor
      fetch('/api/substitutions/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notificationId: data.notificationId,
          substitutionId: data.substitutionId
        })
      });
      responseUrl = '/substitutions';
      break;
    case 'reject':
      // Enviar rejeição ao servidor
      fetch('/api/substitutions/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notificationId: data.notificationId,
          substitutionId: data.substitutionId
        })
      });
      responseUrl = '/substitutions';
      break;
    case 'close':
    case 'dismiss':
      return; // Não abre nenhuma página
  }

  // Abre ou foca na janela
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      // Se já existe uma janela aberta, foca nela
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(responseUrl);
          return;
        }
      }
      // Se não existe janela aberta, abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(responseUrl);
      }
    })
  );
});

// Sincronização em background
self.addEventListener('sync', event => {
  console.log('[SW] Sync event:', event.tag);

  if (event.tag === 'sync-questionnaire') {
    event.waitUntil(syncQuestionnaire());
  } else if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

// Funções auxiliares
async function syncQuestionnaire() {
  try {
    // Obtém respostas pendentes do IndexedDB
    const pendingResponses = await getPendingResponses();

    for (const response of pendingResponses) {
      try {
        const result = await fetch('/api/questionnaires/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(response)
        });

        if (result.ok) {
          await removePendingResponse(response.id);
          await showNotification({
            title: 'Questionário Sincronizado',
            body: 'Suas respostas foram enviadas com sucesso!',
            icon: '/icon-check.png'
          });
        }
      } catch (error) {
        console.error('[SW] Error syncing response:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Error in syncQuestionnaire:', error);
  }
}

async function syncNotifications() {
  try {
    const response = await fetch('/api/notifications/unread');
    if (response.ok) {
      const notifications = await response.json();

      for (const notif of notifications) {
        await showNotification({
          title: notif.title,
          body: notif.message,
          data: notif.data,
          tag: notif.id
        });
      }
    }
  } catch (error) {
    console.error('[SW] Error syncing notifications:', error);
  }
}

async function showNotification(options) {
  return self.registration.showNotification(options.title, {
    body: options.body,
    icon: options.icon || '/icon-192x192.png',
    badge: options.badge || '/badge-72x72.png',
    data: options.data || {},
    tag: options.tag || 'default',
    vibrate: options.vibrate || [200]
  });
}

// IndexedDB helpers
async function getPendingResponses() {
  // Implementação simplificada - deve ser expandida conforme necessário
  return [];
}

async function removePendingResponse(id) {
  // Implementação simplificada - deve ser expandida conforme necessário
  return true;
}

// Mensagens entre SW e app
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('[SW] Cache cleared');
    });
  }
});