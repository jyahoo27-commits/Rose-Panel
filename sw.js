// sw.js
const CACHE = 'sentinel-v1';
const FILES = ['./index.html', './manifest.json', './icon.svg'];

const BACKUP_TAG = 'rose-backup-weekly';
const ALIGNER_TAG = 'rose-aligner';

// Установка и кэширование
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

// Обработка клика по уведомлениям (бэкап и элайнеры)
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
        // Если окно не найдено — открываем новое с параметром, который запустит бэкап
        return clients.openWindow(`${self.registration.scope}?backup=1`);
      })
    );
  } else if (event.notification.tag === ALIGNER_TAG) {
    // При клике на уведомление элайнеров — просто открываем приложение
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

// Получение сообщений от основного скрипта для планирования уведомлений элайнеров
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'scheduleAlignerNotifs') {
    const { at20, at22 } = event.data;
    const now = Date.now();
    
    // Планируем уведомление за 2 часа до замены (20:00)
    if (at20 && at20 > now) {
      const delay20 = at20 - now;
      setTimeout(() => {
        self.registration.showNotification('🦷 Rosé Planner', {
          body: 'Через 2 часа нужно поменять элайнеры! Готовься 🌸',
          icon: 'icon.svg',
          badge: 'icon.svg',
          tag: ALIGNER_TAG,
          requireInteraction: true,
          vibrate: [200, 100, 200]
        });
      }, delay20);
    }

    // Планируем основное уведомление в 22:00
    if (at22 && at22 > now) {
      const delay22 = at22 - now;
      setTimeout(() => {
        self.registration.showNotification('🦷 Rosé Planner', {
          body: 'Время менять элайнеры на следующую пару! 🦷',
          icon: 'icon.svg',
          badge: 'icon.svg',
          tag: ALIGNER_TAG,
          requireInteraction: true,
          vibrate: [200, 100, 200]
        });
      }, delay22);
    }
  }
});