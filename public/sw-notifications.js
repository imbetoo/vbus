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

/*
 * Al activarse una versión nueva (tras "Actualizar"): fuera cualquier caché
 * que no sea la del build actual (precache de Workbox, que ya se poda solo)
 * o la de las fuentes. Así no queda nada de versiones antiguas.
 */
const KEEP_CACHES = [/^workbox-precache/, /^google-fonts$/];
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.filter((name) => !KEEP_CACHES.some((keep) => keep.test(name))).map((name) => caches.delete(name)),
        ),
      ),
  );
});
