/* Boletaire – funciona sin conexión: guarda la app, la última previsión y las zonas que hayas visto */
const V="boletaire-v8", KEEP="boletaire-zonas";
const CORE=["./","index.html","config.js","manifest.webmanifest","icon-192.png","icon-512.png","shim.js","web.js","extras.js","relief.jpg","i18n_ca.js","cat.png","bosque.png","data/forecast.json","data/history.json",
  "lib/leaflet.js"];
self.addEventListener("install",e=>{ e.waitUntil(caches.open(V).then(c=>Promise.all(CORE.map(u=>c.add(u).catch(()=>{}))))); self.skipWaiting(); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==KEEP).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url); if(e.request.method!=="GET") return;
  const net1st = /\/data\/|index\.html$|\/$|\.js$/.test(u.pathname);
  if(net1st){ e.respondWith(fetch(e.request.mode==="navigate"||u.origin!==location.origin?e.request:new Request(e.request.url,{cache:"no-cache"})).then(r=>{ const c=r.clone(); caches.open(V).then(x=>x.put(e.request,c)); return r; }).catch(()=>caches.match(e.request))); return; }
  if(u.origin===location.origin||u.hostname==="cdnjs.cloudflare.com"){
    e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request).then(r=>{ if(r.ok){ const c=r.clone(); caches.open(V).then(x=>x.put(e.request,c)); } return r; })));
  }
});

/* Avisos al móvil */
self.addEventListener("push",e=>{
  let d={}; try{ d=e.data?e.data.json():{}; }catch(err){ d={title:"Boletaire",body:e.data?e.data.text():""}; }
  e.waitUntil(self.registration.showNotification(d.title||"Boletaire",{body:d.body||"",icon:"icon-192.png",badge:"icon-192.png",tag:d.tag||"boletaire",data:{url:d.url||"./"},renotify:false}));
});
self.addEventListener("notificationclick",e=>{
  e.notification.close(); const url=new URL((e.notification.data&&e.notification.data.url)||"./",self.registration.scope).href;
  e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(L=>{ for(const c of L){ if("focus" in c){ c.navigate(url).catch(()=>{}); return c.focus(); } } return clients.openWindow(url); }));
});
