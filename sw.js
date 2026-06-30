/* Offline-cache voor de Voedingscoach.
   Netwerk-eerst voor eigen bestanden, zodat updates altijd doorkomen;
   valt terug op cache als je offline bent. Verhoog CACHE bij elke update. */
const CACHE = "voedingscoach-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=6",
  "./app.js?v=6",
  "./coach.jpg",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return; // POST naar de API nooit aanraken
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // externe verzoeken (API) overslaan
  // Netwerk-eerst: altijd de verse versie, cache als terugval bij offline.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match("./index.html")))
  );
});
