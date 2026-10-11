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
      const o=offList(); o[id]={d:new Date().toISOString(),b}; offSave(o); window.BOLETAIRE_EVENT&&window.BOLETAIRE_EVENT("sin-cobertura/"+id,"Zona guardada sin cobertura");
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
  // Contador de visitas sin cookies: páginas vistas y qué zonas se abren (sin datos personales)
  (function(){
    if(CFG.goatcounter){
      window.goatcounter={no_onload:false};
      const s=document.createElement("script"); s.async=true; s.src="https://gc.zgo.at/count.js";
      s.dataset.goatcounter=`https://${CFG.goatcounter}.goatcounter.com/count`; document.head.appendChild(s);
      let last=null; const ev=(path,title)=>{ try{ window.goatcounter&&window.goatcounter.count&&window.goatcounter.count({path,title,event:true}); }catch(e){} };
      document.addEventListener("click",()=>setTimeout(()=>{ try{ if(sel&&sel!==last){ last=sel; const z=SITES.find(x=>x.id===sel); ev("zona/"+sel, z?z.n:sel); } }catch(e){} },300),true);
      window.BOLETAIRE_EVENT=ev;
    } else if(CFG.cloudflareToken){
      const s=document.createElement("script"); s.defer=true; s.src="https://static.cloudflareinsights.com/beacon.min.js";
      s.dataset.cfBeacon=JSON.stringify({token:CFG.cloudflareToken}); document.head.appendChild(s);
    }
  })();
  // Pie: donaciones, aviso legal y créditos
  function footer(){
    if(document.getElementById("webfoot")) return;
    const d=document.createElement("footer"); d.id="webfoot"; d.className="webfoot";
    d.innerHTML=`${CFG.kofi?`<a class="btn" href="${CFG.kofi}" target="_blank" rel="noopener">☕ Invítame a un café</a><p class="note">Boletaire es gratis. Si te ha ayudado a encontrar setas, puedes apoyarlo.</p>`:""}
      <p class="note"><a href="legal.html">Aviso legal y privacidad</a> · <a href="legal.html#creditos">Créditos y licencias de datos</a></p>`;
    document.body.appendChild(d);
  }
  if(document.readyState!=="loading") footer(); else document.addEventListener("DOMContentLoaded",footer);

  // ---------- Cuentas: entrar con el correo para publicar y guardar tus salidas en la nube ----------
  if(window.BAUTH&&BAUTH.enabled){
    const A=BAUTH;
    const st=document.createElement("style");
    st.textContent=`.acct{border:1px solid var(--line);background:var(--surface);color:var(--fg);font:700 12.5px var(--body);padding:6px 12px;border-radius:999px;cursor:pointer;align-self:center;white-space:nowrap}
      .acct.in{background:var(--moss);color:var(--moss-ink);border-color:transparent;width:32px;height:32px;padding:0;display:grid;place-items:center;font-size:14px}
      @media (max-width:599px){header.top{position:relative}.acct{position:absolute;top:10px;right:0}}
      .acctbox .lead{color:var(--muted);font-size:14px}
      .acctbox .row{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
      .acctbox .ok{background:var(--surface-2);border-radius:10px;padding:10px 12px;margin:8px 0;font-size:14px;line-height:1.45}
      .acctbox .danger{color:#b3261e;border-color:#b3261e55}
      .gbtn{min-height:44px;display:flex;justify-content:center;margin:6px 0 2px}
      .orsep{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:12.5px;margin:10px 0}.orsep:before,.orsep:after{content:"";flex:1;border-top:1px solid var(--line)}
      .loginask{background:var(--surface-2);border:1px dashed var(--line);border-radius:12px;padding:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:space-between}
      .loginask span{font-size:14px;flex:1 1 200px}
      .webtoast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:var(--fg);color:var(--bg);padding:10px 14px;border-radius:12px;font:600 14px var(--body);z-index:6000;max-width:calc(100% - 32px);box-shadow:0 6px 20px rgba(0,0,0,.25)}`;
    document.head.appendChild(st);
    const toast=(t,ms=4500)=>{ const d=document.createElement("div"); d.className="webtoast"; d.setAttribute("role","status"); d.textContent=t; document.body.appendChild(d); setTimeout(()=>d.remove(),ms); };
    const nickGet=()=>{ try{ return localStorage.getItem("boletaire.nick")||""; }catch(e){ return ""; } };
    function modal(html){
      document.getElementById("acctModal")?.remove();
      const o=document.createElement("div"); o.id="acctModal"; o.className="welcome"; o.setAttribute("role","dialog"); o.setAttribute("aria-modal","true");
      o.innerHTML=`<div class="wcard acctbox">${html}</div>`; document.body.appendChild(o);
      const esc_=e=>{ if(e.key==="Escape") close(); };
      const close=()=>{ o.remove(); document.removeEventListener("keydown",esc_); };
      o.addEventListener("click",e=>{ if(e.target===o||e.target.closest("[data-close]")) close(); });
      document.addEventListener("keydown",esc_);
      return o;
    }
    window.openLogin=function(reason){
      const o=modal(`<h2>Entrar en Boletaire</h2>
        ${reason?`<p><b>${reason}</b></p>`:""}
        ${A.google?`<div id="gBtn" class="gbtn"></div><p class="note" id="gMsg" role="status"></p><div class="orsep"><span>o con tu correo</span></div>`:""}
        <p class="lead">Sin contraseñas: te enviamos un enlace y entras tocándolo.</p>
        <form id="loginForm"><input type="email" id="loginEmail" autocomplete="email" placeholder="tu@correo.com" required>
          <div class="row"><button class="btn" type="submit">Enviarme el enlace</button><button class="btn ghost" type="button" data-close>Ahora no</button></div>
          <p class="note" id="loginMsg" role="status"></p></form>
        <p class="note">Con la cuenta puedes preguntar y responder en la comunidad, avisar de setas, marcar «Estoy aquí» y tener tus salidas en todos tus dispositivos. Ver el mapa y la previsión no necesita cuenta.</p>`);
      const f=o.querySelector("#loginForm"), m=o.querySelector("#loginMsg"), inp=o.querySelector("#loginEmail");
      if(A.google) googleButton(o.querySelector("#gBtn"), o.querySelector("#gMsg")); else setTimeout(()=>inp.focus(),50);
      f.onsubmit=async e=>{ e.preventDefault(); const email=inp.value.trim().toLowerCase(); if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ m.textContent="Escribe un correo válido."; return; }
        const b=f.querySelector("button[type=submit]"); b.disabled=true; m.textContent="Enviando…";
        try{ await A.signIn(email);
          o.querySelector(".acctbox").innerHTML=`<h2>Revisa tu correo</h2><p>Te hemos enviado un enlace a tu correo:</p><p><b>${esc(email)}</b></p><p>Ábrelo en este mismo móvil y entrarás en Boletaire.</p>
            <p class="note">Puede tardar un minuto. Si no lo ves, mira en la carpeta de spam o promociones. El correo llega en inglés («Confirm your email address» o «Your sign-in link»).</p>
            <div class="row"><button class="btn" data-close>Entendido</button></div>`;
        }catch(err){ b.disabled=false;
          m.textContent=err.status===429?"Se han enviado demasiados correos. Prueba de nuevo dentro de un rato.":"No se ha podido enviar el correo. Revisa la dirección y la conexión."; } };
    };
    // Botón oficial de Google (Google Identity Services): Google nos da un token y Supabase lo comprueba
    let gsiP=null;
    const loadGsi=()=>gsiP||(gsiP=new Promise((res,rej)=>{ if(window.google&&google.accounts&&google.accounts.id) return res();
      const sc=document.createElement("script"); sc.src="https://accounts.google.com/gsi/client"; sc.async=true; sc.onload=()=>res(); sc.onerror=()=>{ gsiP=null; rej(new Error("gsi")); }; document.head.appendChild(sc); }));
    async function googleButton(box,msg){
      if(!box) return;
      box.innerHTML=`<span class="note">Cargando Google…</span>`;
      try{ await loadGsi();
        const raw=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,"0")).join("");
        const hashed=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw))),b=>b.toString(16).padStart(2,"0")).join("");
        google.accounts.id.initialize({client_id:A.google,nonce:hashed,ux_mode:"popup",auto_select:false,itp_support:true,use_fedcm_for_button:true,
          callback:async resp=>{ if(msg) msg.textContent="Entrando…"; try{ await A.signInGoogle(resp.credential,raw); }catch(e){ if(msg) msg.textContent="No se ha podido entrar con Google. Prueba con tu correo."; } } });
        box.innerHTML=""; google.accounts.id.renderButton(box,{type:"standard",theme:"outline",size:"large",text:"continue_with",shape:"pill",logo_alignment:"left",width:Math.min(320,box.clientWidth||300),locale:(window.I18N&&I18N.lang==="ca")?"ca":"es"});
      }catch(e){ box.innerHTML=""; if(msg) msg.textContent="No se ha podido cargar el botón de Google. Entra con tu correo."; }
    }
    function openAccount(){
      const u=A.user(); if(!u) return openLogin();
      const sy=A.sync();
      const o=modal(`<h2>Tu cuenta</h2>
        <p class="lead">${esc(u.email)}</p>
        <label class="bl">Nombre que verán los demás en la comunidad<input id="acNick" maxlength="24" value="${esc(nickGet())}" placeholder="Tu nombre o apodo"></label>
        <div class="ok" id="acSync">${sy.busy?"Guardando tus salidas…":sy.err?"No se han podido guardar tus salidas en la cuenta. Se reintentará al volver a tener conexión.":"Tus salidas, rutas y notas se guardan en tu cuenta: las verás en cualquier móvil u ordenador donde entres. Las fotos se quedan en este dispositivo."}</div>
        <div class="row"><button class="btn" id="acSave">Guardar</button><button class="btn ghost" id="acOut">Cerrar sesión</button></div>
        <details><summary class="note">Borrar mi cuenta</summary>
          <p class="note">Se borran tu cuenta, tus mensajes y avisos de la comunidad y las salidas guardadas en la nube. Las de este móvil se quedan aquí.</p>
          <button class="btn small ghost danger" id="acDel">Borrar mi cuenta para siempre</button> <span class="note" id="acMsg" role="status"></span></details>
        <p class="note"><a href="legal.html#privacidad">Qué datos guardamos</a></p>`);
      o.querySelector("#acSave").onclick=()=>{ try{ localStorage.setItem("boletaire.nick",o.querySelector("#acNick").value.trim()); }catch(e){} o.remove(); toast("Guardado"); try{ renderForum(); }catch(e){} };
      o.querySelector("#acOut").onclick=async e=>{ e.target.disabled=true; e.target.textContent="Cerrando…"; await A.signOut(); };
      let armed=false; o.querySelector("#acDel").onclick=async e=>{ const m=o.querySelector("#acMsg");
        if(!armed){ armed=true; e.target.textContent="Pulsa otra vez para confirmar"; return; }
        e.target.disabled=true; m.textContent="Borrando…"; try{ await A.deleteAccount(); }catch(err){ e.target.disabled=false; m.textContent="No se ha podido borrar. Prueba más tarde."; } };
    }
    function acctBtn(){
      const h=document.querySelector("header.top"); if(!h) return;
      let b=document.getElementById("acctBtn"); if(!b){ b=document.createElement("button"); b.id="acctBtn"; h.appendChild(b); b.onclick=()=>A.user()?openAccount():openLogin(); }
      const u=A.user(); b.className="acct"+(u?" in":"");
      if(u){ const n=nickGet()||u.email; b.textContent=n.trim().charAt(0).toUpperCase(); b.title="Tu cuenta"; b.setAttribute("aria-label","Tu cuenta"); }
      else { b.textContent="Entrar"; b.title=""; b.setAttribute("aria-label","Entrar"); }
    }
    if(document.readyState!=="loading") acctBtn(); else document.addEventListener("DOMContentLoaded",acctBtn);
    window.addEventListener("boletaire-sync",()=>{ const el=document.getElementById("acSync"); const sy=A.sync(); if(el&&!sy.busy&&!sy.err) el.textContent="Tus salidas, rutas y notas se guardan en tu cuenta: las verás en cualquier móvil u ordenador donde entres. Las fotos se quedan en este dispositivo."; });
    if(A.justLogged) setTimeout(()=>toast("Has entrado como "+A.user().email+". Ya puedes publicar en la comunidad."),1200);
    if(A.error) setTimeout(()=>toast("El enlace ha caducado o ya se usó. Pide uno nuevo desde «Entrar».",6000),1200);
    // Comunidad: sin cuenta se puede leer, pero para escribir hay que entrar
    const _rf=renderForum; renderForum=function(){ _rf(); const el=document.getElementById("forumBox"); if(!el) return;
      if(!A.user()){
        const f=el.querySelector("#fForm"); if(f) f.outerHTML=`<div class="loginask"><span>Para preguntar o responder en la comunidad, entra con tu correo. Leer es libre.</span><button class="btn small" data-login>Entrar</button></div>`;
        el.querySelectorAll(".freply").forEach(fr=>{ fr.outerHTML=`<div class="loginask"><span>Entra para responder.</span><button class="btn small" data-login>Entrar</button></div>`; });
      } else { const n=el.querySelector("#fNick"); if(n&&!n.value){ n.value=nickGet(); } }
      el.querySelectorAll("[data-login]").forEach(b=>b.onclick=()=>openLogin("Para participar en la comunidad necesitas entrar."));
      // moderación: el administrador puede bloquear a quien moleste
      if(IS_OWNER) el.querySelectorAll("[data-fdel]").forEach(b=>{ const p=FORUM.find(x=>x.gid===b.dataset.fdel); if(!p||p.uid===UID||p.ai||p.uid==="claude") return;
        const k=document.createElement("button"); k.className="flink"; k.textContent="Bloquear usuario"; k.style.marginLeft="10px";
        k.onclick=async()=>{ if(k.dataset.arm!=="1"){ k.dataset.arm="1"; k.textContent="Pulsa otra vez: se borra todo lo suyo"; return; }
          try{ await A.ban(p.uid); toast("Usuario bloqueado y sus mensajes borrados"); }catch(e){ toast("No se ha podido bloquear"); } };
        b.after(k); });
    };
    const _ci=checkIn; checkIn=function(site){ if(!A.user()) return openLogin("Para marcar que estás buscando aquí, entra con tu correo."); return _ci(site); };
    const _wr=wireReports; wireReports=function(el,s){ _wr(el,s); const o=el.querySelector("#repOpen"); if(o&&!A.user()) o.onclick=()=>openLogin("Para avisar a los demás de lo que has encontrado, entra con tu correo."); };
  }
  // App instalable y sin conexión
  if("serviceWorker" in navigator) addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
  try{ renderGuide(); }catch(e){}
})();
