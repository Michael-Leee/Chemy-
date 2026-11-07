/* Chemy 题目图形本地缓存。
   实测小图片走 ghfast/gh-proxy 镜像反而更慢（代理多一跳 RTT）：
     204B 图形  同源 0.84s / 镜像 1.06s
     577KB Logo 同源 1.79s / 镜像 2.78s
   所以这里不改 URL、不做镜像转发，只缓存同源 assets/ 下的图片，
   让重复访问的题目图形直接命中本地、零网络请求。 */
const CACHE = 'chemy-images-v1';
const MAX_ENTRIES = 400; // 约 8MB，避免把 262MB 图形全塞进浏览器缓存

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(n => n.startsWith('chemy-images-') && n !== CACHE)
      .map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // 跨域（镜像、Supabase、后端）一律放行
  if (!url.pathname.includes('/assets/')) return;    // 只管图片，题库 JSON / Pages 资源不受影响

  event.respondWith((async () => {
    try {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) {
        cache.put(req, res.clone()).then(async () => {
          const keys = await cache.keys();
          if (keys.length > MAX_ENTRIES) await cache.delete(keys[0]);
        }).catch(() => {});
      }
      return res;
    } catch (e) {
      return fetch(req);
    }
  })());
});
