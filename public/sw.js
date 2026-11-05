// Service worker: shows calendar reminders pushed by the server, and opens the
// calendar when one is tapped.

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const message = event.data.json();
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: message.tag,
      data: { url: message.url || "/growth/calendar" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/growth/calendar", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      // Use an open window of the app if there is one.
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && "navigate" in client) {
          return client.focus().then(() => client.navigate(url));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
