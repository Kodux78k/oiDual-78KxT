const CACHE_NAME='infodose-chat-v1';

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE_NAME).then(c=>c.addAll(['/','/index.html','/manifest.webmanifest']))
  );
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME&&caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch',e=>{
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
