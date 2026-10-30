/*
 * Añadido al service worker de Workbox (`importScripts` en vite.config.js).
 * Tocar la notificación del modo viaje ("Prepárate para bajar") la cierra y
 * trae vBus al frente (o la abre si ya no estaba).
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => 'focus' in client);
      return open ? open.focus() : self.clients.openWindow('/');
    }),
  );
});
