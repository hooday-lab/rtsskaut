/* RTS Skaut: prosty service worker (sieć najpierw, pamięć podręczna jako zapas) */
const C='rtsskaut-v2';
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==C)await caches.delete(k);await self.clients.claim()})())});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith((async()=>{try{const n=await fetch(r);const c=await caches.open(C);c.put(r,n.clone());return n}catch(err){const m=await caches.match(r);if(m)return m;throw err}})());
});
