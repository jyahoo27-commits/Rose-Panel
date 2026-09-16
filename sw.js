// sw.js
const CACHE = 'sentinel-v2';
const FILES = ['./index.html', './manifest.json', './icon.svg'];

const BACKUP_TAG = 'rose-backup-weekly';
const ALIGNER_TAG = 'rose-aligner';

// Установка и кэширование
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

// Обработка клика по уведомлениям
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.notification.tag === BACKUP_TAG) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        // Пытаемся найти уже открытое окно приложения
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            client.postMessage({ action: 'backup-now' });
            return client.focus();
          }
        }
        return clients.openWindow(`${self.registration.scope}?backup=1`);
      })
    );
  } else if (event.notification.tag === ALIGNER_TAG) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(self.registration.scope);
      })
    );
  }
});

// Service Worker на iOS не может держать setTimeout днями.
// Поэтому мы просто слушаем, не нужно ли показать локальное уведомление ПРЯМО СЕЙЧАС (если приложение было открыто).
// Для отложенных напоминаний используем новую кнопку "Добавить в календарь" в приложении.
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'showImmediateNotif') {
    self.registration.showNotification(event.data.title || '🦷 Rosé Planner', {
      body: event.data.body || 'Время проверить элайнеры!',
      icon: 'icon.svg',
      badge: 'icon.svg',
      tag: ALIGNER_TAG,
      requireInteraction: true
    });
  }
});