/* Boletaire – funciona sin conexión: guarda la app, la última previsión y las zonas que hayas visto */
const V="boletaire-v5", KEEP="boletaire-zonas";
const CORE=["./","index.html","config.js","manifest.webmanifest","icon-192.png","icon-512.png","shim.js","web.js","relief.jpg","i18n_ca.js","cat.png","bosque.png","data/forecast.json","data/history.json",
  "lib/leaflet.js"];
self.addEventListener("install",e=>{ e.waitUntil(caches.open(V).then(c=>Promise.all(CORE.map(u=>c.add(u).catch(()=>{}))))); self.skipWaiting(); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==KEEP).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url); if(e.request.method!=="GET") return;
  const net1st = /\/data\/|index\.html$|\/$|\.js$/.test(u.pathname);
  if(net1st){ e.respondWith(fetch(e.request).then(r=>{ const c=r.clone(); caches.open(V).then(x=>x.put(e.request,c)); return r; }).catch(()=>caches.match(e.request))); return; }
  if(u.origin===location.origin||u.hostname==="cdnjs.cloudflare.com"){
    e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request).then(r=>{ if(r.ok){ const c=r.clone(); caches.open(V).then(x=>x.put(e.request,c)); } return r; })));
  }
});
