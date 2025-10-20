// TODO 需要测试
const MODEL_VERSION = '20251022';
const CACHE_NAME = `hula-model-cache-${MODEL_VERSION}`;
const MODEL_ORIGIN = 'https://cdn.hulaspark.com';
const MODEL_PATH = '/models/hula.glb';
const MODEL_URL = `${MODEL_ORIGIN}${MODEL_PATH}?v=${MODEL_VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(MODEL_URL)).catch(() => Promise.resolve())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('hula-model-cache-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin === MODEL_ORIGIN && requestUrl.pathname === MODEL_PATH) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(MODEL_URL);
        if (cached) {
          fetch(event.request)
            .then((response) => {
              if (response && response.ok) {
                cache.put(MODEL_URL, response.clone());
              }
            })
            .catch(() => void 0);
          return cached;
        }
        return fetch(event.request).then((response) => {
          if (response && response.ok) {
            cache.put(MODEL_URL, response.clone());
          }
          return response;
        });
      })
    );
  }
});
