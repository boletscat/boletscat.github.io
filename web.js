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
  reportsBlock=function(){ return `<h3>Avisos de otros boletaires</h3><p class="note" style="margin-top:0">Los avisos entre usuarios llegarán pronto a la versión web.</p>`; };
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
