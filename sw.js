// sw.js — Rosé Planner
const CACHE = 'rose-v3';
const FILES = ['./', './index.html', './manifest.json', './icon.svg'];

const BACKUP_TAG  = 'rose-backup-weekly';
const ALIGNER_TAG = 'rose-aligner';

// Установка: кладём файлы в кэш. addAll падает целиком, если хоть один файл
// недоступен — поэтому кэшируем поштучно и не роняем установку.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(FILES.map(f => c.add(f).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

// Активация: выносим старые кэши, иначе они копятся навсегда
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Раньше было cache-first: приложение навсегда застревало на старой версии.
// Теперь страница берётся из сети с откатом в кэш, остальное — из кэша с фоновым обновлением.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // шрифты и прочее не трогаем

  const isPage = req.mode === 'navigate' || url.pathname.endsWith('.html');

  if (isPage) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || net;
    })
  );
});

// Клик по уведомлению
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const tag = event.notification.tag;
  const scope = self.registration.scope;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.startsWith(scope) && 'focus' in client) {
          if (tag === BACKUP_TAG) client.postMessage({ action: 'backup-now' });
          return client.focus();
        }
      }
      return self.clients.openWindow(tag === BACKUP_TAG ? scope + '?backup=1' : scope);
    })
  );
});

// Service Worker на iOS не может держать setTimeout сутками,
// поэтому уведомление показываем только по прямой просьбе приложения.
self.addEventListener('message', event => {
  const d = event.data || {};
  if (d.action === 'showImmediateNotif') {
    self.registration.showNotification(d.title || '🦷 Rosé Planner', {
      body: d.body || 'Время проверить элайнеры!',
      icon: 'icon.svg',
      badge: 'icon.svg',
      tag: ALIGNER_TAG,
      requireInteraction: true
    });
  } else if (d.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
