// This is a dummy service worker to silence 404 errors.
// It does not perform any caching or offline logic.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
