// Minimal Service Worker: pass-through only to avoid precache issues on GitHub Pages
self.addEventListener('install', (event) => {
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Control existing clients ASAP
  event.waitUntil(self.clients.claim());
});

// Do not intercept; let the network handle everything
self.addEventListener('fetch', (event) => {
  // intentionally no-op
});
