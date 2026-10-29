/* Service worker de Meteo Ardoi
   - Hace la web instalable y permite abrirla sin conexión (muestra la última versión guardada).
   - Los datos meteorológicos (/.netlify/functions/) NUNCA se guardan en caché: siempre van en directo.
   - Si cambias index.html, sube también este archivo cambiando la versión (v1 → v2) para forzar la actualización. */
const CACHE = "meteoardoi-v2";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png",
               "/privacidad.html", "/cookies.html", "/aviso-legal.html"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;   // anuncios, APIs externas: sin tocar
  if (url.pathname.startsWith("/.netlify/")) return;                    // datos en directo: sin caché
  if (req.mode === "navigate" || url.pathname.endsWith(".html")) {      // páginas: primero red, si no hay, caché
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match("/index.html"))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {   // iconos, manifest: primero caché
    if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return r;
  })));
});
