/* Boletaire – ajustes de la versión web pública */
(function(){
  const CFG=window.WEBCFG||{};
  const amz=(q)=>`https://www.amazon.es/s?k=${encodeURIComponent(q)}${CFG.amazonTag?`&tag=${encodeURIComponent(CFG.amazonTag)}`:""}`;
  const GEAR=[
    ["Cesta de mimbre","Deja caer las esporas y no aplasta las setas.","cesta mimbre setas"],
    ["Navaja con cepillo","Para cortar la seta y limpiarla en el sitio.","navaja setas cepillo"],
    ["Guía de setas","Una buena guía de campo de la península.","guia de setas peninsula iberica"],
    ["Botas de montaña","Impermeables: el bosque está mojado justo cuando salen.","botas montaña impermeables"],
    ["Chaleco de color vivo","Imprescindible los días de batida.","chaleco alta visibilidad senderismo"],
    ["Batería externa","El GPS del móvil gasta mucho en el monte.","bateria externa 10000mah"]
  ];
  function gearHtml(){
    return `<details class="card gear" ${CFG.gearOpen?"open":""}><summary>Material recomendado</summary>
      <ul class="gearl">${GEAR.map(([n,d,q])=>`<li><div><b>${n}</b><span>${d}</span></div><a class="btn small ghost" href="${amz(q)}" target="_blank" rel="noopener sponsored">Ver en Amazon</a></li>`).join("")}</ul>
      <p class="note">${CFG.amazonTag?"Enlaces de afiliado: si compras a través de ellos, Boletaire recibe una pequeña comisión sin coste para ti.":"Enlaces a Amazon."}</p></details>`;
  }
  // Guía: añade el material recomendado
  const _rg=renderGuide; renderGuide=function(){ _rg(); const c=document.getElementById("cards"); if(c&&!c.querySelector(".gear")){ const r=c.querySelector(".idkrules"); (r||c.firstChild)?.insertAdjacentHTML(r?"afterend":"beforebegin",gearHtml()); } };
  // Avisos entre usuarios: aún no disponibles en la web
  if(!window.BOLETAIRE_REPORTS) reportsBlock=function(){ return `<h3>Avisos de otros boletaires</h3><p class="note" style="margin-top:0">Los avisos entre usuarios llegarán pronto a la versión web.</p>`; };
  // Avisar de un error: por correo
  bugFormHtml=function(ctx){
    if(!CFG.contact) return "";
    return `<details class="card bugbox" id="bugBox"><summary>Avisar de un error</summary>
      <form id="bugForm" class="bugform">
        <label class="bl">Qué pasa<select id="bugType">${BUGTYPES.map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select></label>
        <label class="bl">Cuéntalo en una frase<textarea id="bugText" rows="3" maxlength="600"></textarea></label>
        <p class="note" style="margin:0">Se abrirá tu correo con el aviso, la zona y el día ya escritos.</p>
        <div class="actions"><button class="btn small" type="submit">Preparar correo</button><span class="note" id="bugMsg" role="status"></span></div></form></details>`;
  };
  wireBug=function(root){
    const f=root.querySelector("#bugForm"); if(!f) return;
    f.onsubmit=e=>{ e.preventDefault(); const ctx=bugContext(); const t=f.querySelector("#bugType"); const txt=f.querySelector("#bugText").value.trim();
      if(txt.length<4){ f.querySelector("#bugMsg").textContent="Escribe qué has visto."; return; }
      const body=`${txt}\n\n— Tipo: ${t.options[t.selectedIndex].text}\n— Zona: ${ctx.zone||"-"}\n— Día: ${ctx.day||"-"}\n— Dispositivo: ${navigator.userAgent}\n— Pantalla: ${innerWidth}x${innerHeight}\n— Fallos: ${ERRLOG.join(" | ")||"ninguno"}`;
      location.href=`mailto:${CFG.contact}?subject=${encodeURIComponent("Boletaire: aviso de error")}&body=${encodeURIComponent(body)}`; };
  };
  // Zona sin cobertura: guarda en el móvil la imagen, los caminos, el relieve y las fichas de la zona
  const OFFC="boletaire-zonas", OFFK="boletaire.offline";
  const offList=()=>{ try{ return JSON.parse(localStorage.getItem(OFFK)||"{}"); }catch(e){ return {}; } };
  const offSave=o=>{ try{ localStorage.setItem(OFFK,JSON.stringify(o)); }catch(e){} };
  const offUrls=s=>{ const sp=[...new Set([...(s.sp||[]),...(s.tx||[])])];
    return ["index.html","i18n_ca.js","relief.jpg","cat.png","bosque.png","data/forecast.json",`z/${s.id}.jpg`,`w/${s.id}.json`,`wr/${s.id}.png`,`e/${s.id}.json`,...sp.map(id=>`g/${id}.jpg`)]; };
  const mb=n=>(n/1048576).toLocaleString(LOCALE,{maximumFractionDigits:1})+" MB";
  function offHtml(s){
    if(!("caches" in window)) return "";
    const o=offList()[s.id];
    return `<div class="offbox" data-off="${s.id}"><b>Sin cobertura</b>
      ${o?`<span class="note"><span>Zona guardada en este móvil</span> <span>(${new Date(o.d).toLocaleDateString(LOCALE,{day:"numeric",month:"short"})} · ${mb(o.b)})</span>. <span>El mapa, los caminos, los puntos y las fichas funcionan sin internet.</span></span>
        <div class="actions"><button class="btn small ghost" data-offsave="${s.id}">Actualizar</button><button class="btn small ghost" data-offdel="${s.id}">Borrar</button></div>`
      :`<span class="note">Guarda la zona antes de salir: el mapa, los caminos, los puntos y las fichas funcionarán aunque no haya internet en el bosque.</span>
        <div class="actions"><button class="btn small" data-offsave="${s.id}">Guardar zona para usar sin cobertura</button></div>`}
      <span class="note" data-offmsg role="status"></span></div>`;
  }
  async function offStore(id,btn){
    const s=SITES.find(z=>z.id===id); if(!s) return; const box=btn.closest(".offbox"), msg=box&&box.querySelector("[data-offmsg]");
    btn.disabled=true; if(msg) msg.textContent="Guardando…";
    try{ const c=await caches.open(OFFC); let b=0, ok=0; const L=offUrls(s);
      for(const u of L){ try{ const r=await fetch(u,{cache:"reload"}); if(r.ok){ const bl=await r.clone().blob(); b+=bl.size; await c.put(u,r); ok++; } }catch(e){} if(msg) msg.textContent=`Guardando… ${ok}/${L.length}`; }
      const o=offList(); o[id]={d:new Date().toISOString(),b}; offSave(o);
      renderDetail();
    }catch(e){ btn.disabled=false; if(msg) msg.textContent="No se ha podido guardar. Prueba con buena conexión."; }
  }
  async function offDelete(id){
    const s=SITES.find(z=>z.id===id); const c=await caches.open(OFFC);
    const others=Object.keys(offList()).filter(k=>k!==id).map(k=>SITES.find(z=>z.id===k)).filter(Boolean).flatMap(offUrls);
    for(const u of offUrls(s)) if(!others.includes(u)) await c.delete(u);
    const o=offList(); delete o[id]; offSave(o); renderDetail();
  }
  document.addEventListener("click",e=>{ const a=e.target.closest("[data-offsave]"), d=e.target.closest("[data-offdel]");
    if(a){ e.preventDefault(); offStore(a.dataset.offsave,a); } else if(d){ e.preventDefault(); offDelete(d.dataset.offdel); } });
  const _fb=fieldBlock; fieldBlock=function(s){ return _fb(s).replace(/<p class="note">El GPS del móvil funciona sin cobertura[^<]*<\/p>/,'<p class="note">El GPS del móvil funciona sin cobertura.</p>')+offHtml(s); };
  // Pie: donaciones, aviso legal y créditos
  function footer(){
    if(document.getElementById("webfoot")) return;
    const d=document.createElement("footer"); d.id="webfoot"; d.className="webfoot";
    d.innerHTML=`${CFG.kofi?`<a class="btn" href="${CFG.kofi}" target="_blank" rel="noopener">☕ Invítame a un café</a><p class="note">Boletaire es gratis. Si te ha ayudado a encontrar setas, puedes apoyarlo.</p>`:""}
      <p class="note"><a href="legal.html">Aviso legal y privacidad</a> · <a href="legal.html#creditos">Créditos y licencias de datos</a></p>`;
    document.body.appendChild(d);
  }
  if(document.readyState!=="loading") footer(); else document.addEventListener("DOMContentLoaded",footer);
  // App instalable y sin conexión
  if("serviceWorker" in navigator) addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
  try{ renderGuide(); }catch(e){}
})();
