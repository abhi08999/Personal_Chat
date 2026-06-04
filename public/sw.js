// Service Worker — Rummy private chat
// Shows disguised notifications so no one knows what this app is.

// Force the SW to activate immediately on install, then claim all open
// pages. Without this a new SW version stays "waiting" and won't
// intercept push events until every tab is closed and reopened.
self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', function (event) {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { return; }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'msg',
      renotify: true,
      silent: false,
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.includes('/chat')) return list[i].focus();
      }
      return clients.openWindow('/chat');
    })
  );
});
