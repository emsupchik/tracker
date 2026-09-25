/* Mountain Safe service worker: офлайн-первый для оболочки приложения, кэш карт по мере просмотра. */
const VERSION='ms-109a23c796';
const TILE_CACHE='ms-tiles-v1';
const TILE_HOST='tile.openstreetmap.org';
const TILE_LIMIT=800;
const SHELL=["./",".nojekyll","css/styles.css","fonts/jetbrains-mono-latin-500-normal.woff2","fonts/jetbrains-mono-latin-700-normal.woff2","fonts/onest-cyrillic-400-normal.woff2","fonts/onest-cyrillic-600-normal.woff2","fonts/onest-cyrillic-700-normal.woff2","fonts/onest-cyrillic-800-normal.woff2","fonts/onest-latin-400-normal.woff2","fonts/onest-latin-600-normal.woff2","fonts/onest-latin-700-normal.woff2","fonts/onest-latin-800-normal.woff2","fonts/unbounded-cyrillic-700-normal.woff2","fonts/unbounded-latin-700-normal.woff2","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","index.html","js/config.js","js/core.js","js/data.js","js/landing.js","js/lib.js","js/services.js","js/views.js","manifest.webmanifest","vendor/leaflet/images/layers-2x.png","vendor/leaflet/images/layers.png","vendor/leaflet/images/marker-icon-2x.png","vendor/leaflet/images/marker-icon.png","vendor/leaflet/images/marker-shadow.png","vendor/leaflet/leaflet.css","vendor/leaflet/leaflet.js","vendor/qrcode.js"];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)));
});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    for(const k of await caches.keys())if(k!==VERSION&&k!==TILE_CACHE)await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting()});

async function trim(name,max){const c=await caches.open(name),ks=await c.keys();for(let i=0;i<ks.length-max;i++)await c.delete(ks[i])}

self.addEventListener('fetch',e=>{
  const req=e.request,url=new URL(req.url);
  if(req.method!=='GET')return;
  if(url.hostname===TILE_HOST){
    e.respondWith((async()=>{
      const c=await caches.open(TILE_CACHE),hit=await c.match(req);
      if(hit)return hit;
      try{const r=await fetch(req);if(r.ok){c.put(req,r.clone());trim(TILE_CACHE,TILE_LIMIT)}return r}
      catch(err){return new Response('',{status:504})}
    })());return;
  }
  if(url.origin!==location.origin||url.pathname.startsWith('/api/'))return;
  /* оболочка: сначала кэш, параллельно обновляем */
  e.respondWith((async()=>{
    const c=await caches.open(VERSION);
    const key=req.mode==='navigate'?'./':req;
    const hit=await c.match(key,{ignoreSearch:true});
    const net=fetch(req).then(r=>{if(r.ok)c.put(req.mode==='navigate'?'./':req,r.clone());return r}).catch(()=>null);
    if(hit){e.waitUntil(net);return hit}
    return (await net)||new Response('Офлайн',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  })());
});
