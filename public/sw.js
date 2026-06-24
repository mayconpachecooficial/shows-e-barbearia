self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("barbearia-pro-v1").then((cache) => cache.addAll(["./", "manifest.json", "icon.svg"]))
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
