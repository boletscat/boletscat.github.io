/* Boletaire – extras de la web pública (octubre 2026):
   1) Avisos al móvil (notificaciones web) para tus zonas.
   2) Compartir el plan como imagen para el grupo de WhatsApp.
   Se carga después del script principal y de web.js; usa sus funciones globales (SITES, RES, DAYS, dayIdx, sel, FAVS…). */
(function(){
  const CFG=window.WEBCFG||{};
  const T=t=>(typeof i18nText==="function"?i18nText(t):t);
  const CA=()=>typeof I18N!=="undefined"&&I18N.lang==="ca";
  const LS={get(k,d){ try{ const v=localStorage.getItem(k); return v==null?d:JSON.parse(v); }catch(e){ return d; } }, set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }, del(k){ try{ localStorage.removeItem(k); }catch(e){} }};
  const esc_=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const short=s=>s.n.split(" – ")[0];

  function modal(html,cls){
    document.getElementById("xModal")?.remove();
    const o=document.createElement("div"); o.id="xModal"; o.className="welcome"; o.setAttribute("role","dialog"); o.setAttribute("aria-modal","true");
    o.innerHTML=`<div class="wcard ${cls||""}"><button class="xclose" data-close aria-label="${T("Cerrar")}">×</button>${html}</div>`; document.body.appendChild(o);
    const esc=e=>{ if(e.key==="Escape") close(); }; const close=()=>{ o.remove(); document.removeEventListener("keydown",esc); };
    o.addEventListener("click",e=>{ if(e.target===o||e.target.closest("[data-close]")) close(); }); document.addEventListener("keydown",esc);
    return {o,close};
  }

  /* ================= 1) Avisos al móvil ================= */
  const FN=(CFG.supabaseUrl||"").replace(/\/$/,"")+"/functions/v1/avisos";
  const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
  const canPush=()=>!!(CFG.supabaseUrl&&CFG.supabaseKey&&"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window);
  const api=body=>fetch(FN,{method:body?"POST":"GET",headers:{"Content-Type":"application/json",apikey:CFG.supabaseKey,Authorization:"Bearer "+CFG.supabaseKey},body:body?JSON.stringify(body):undefined})
    .then(async r=>{ const j=await r.json().catch(()=>({})); if(!r.ok) throw Object.assign(new Error(j.error||("error "+r.status)),{status:r.status}); return j; });
  const b64u=s=>{ const p="=".repeat((4-s.length%4)%4), b=atob((s+p).replace(/-/g,"+").replace(/_/g,"/")); return Uint8Array.from(b,c=>c.charCodeAt(0)); };
  const state=()=>LS.get("boletaire.push",null);   // {zones,min} si este móvil está suscrito
  async function currentSub(){ try{ const reg=await navigator.serviceWorker.ready; return await reg.pushManager.getSubscription(); }catch(e){ return null; } }
  async function subscribe(zones,min){
    const perm=await Notification.requestPermission(); if(perm!=="granted") throw Object.assign(new Error("permiso"),{code:"perm"});
    const reg=await navigator.serviceWorker.ready; const {key}=await api();
    let sub=await reg.pushManager.getSubscription();
    if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(key)});
    await api({action:"sub",sub:sub.toJSON(),zones,min,lang:CA()?"ca":"es"});
    LS.set("boletaire.push",{zones,min}); return sub;
  }
  async function unsubscribe(){ const sub=await currentSub(); if(sub){ try{ await api({action:"unsub",endpoint:sub.endpoint}); }catch(e){} try{ await sub.unsubscribe(); }catch(e){} } LS.del("boletaire.push"); }
  // Si marcas o desmarcas una favorita con los avisos activados, se añade o se quita de los avisos
  window.boletairePushSync=async function(id,added){ const st=state(); if(!st||!canPush()) return; const sub=await currentSub(); if(!sub) return;
    const set=new Set(st.zones||[]); added?set.add(id):set.delete(id); const zones=[...set].slice(0,20); if(!zones.length) return;
    try{ await api({action:"sub",sub:sub.toJSON(),zones,min:st.min,lang:CA()?"ca":"es"}); LS.set("boletaire.push",{...st,zones}); }catch(e){} };

  window.openPush=function(siteId){
    const st=state();
    const pre=new Set(st?st.zones:[...FAVS]); if(siteId) pre.add(siteId);
    const list=SITES.filter(s=>pre.has(s.id)||FAVS.has(s.id)).sort((a,b)=>(b.id===siteId)-(a.id===siteId)||a.n.localeCompare(b.n));
    let note="";
    if(!canPush()) note=isIOS&&!standalone()
      ? `<div class="pushwarn"><b>${T("En el iPhone, primero añade Boletaire a la pantalla de inicio.")}</b> ${T("En Safari, pulsa Compartir → «Añadir a pantalla de inicio» y abre la app desde ese icono. Después vuelve aquí y activa los avisos.")}</div>`
      : `<div class="pushwarn">${T("Este navegador no permite avisos. Prueba con Chrome, Edge o Firefox, o en el iPhone desde la app añadida a la pantalla de inicio.")}</div>`;
    const {o,close}=modal(`<h2>🔔 ${T("Avisos al móvil")}</h2>
      <p class="lead">${T("Te avisamos por la mañana cuando una de tus zonas vaya a tener buena nota en los próximos 7 días. Como mucho un aviso al día.")}</p>
      ${note}
      <fieldset class="pushz"><legend>${T("Zonas")}</legend>${list.map(s=>`<label><input type="checkbox" value="${s.id}" ${pre.has(s.id)?"checked":""}> ${esc_(s.n)}</label>`).join("")||`<p class="note">${T("Marca alguna zona como favorita (☆) para elegirla aquí.")}</p>`}</fieldset>
      <label class="pushmin">${T("Avisar a partir de")} <select id="pmin">${[60,70,80,90].map(v=>`<option value="${v}" ${(st?.min||70)===v?"selected":""}>${v}</option>`).join("")}</select></label>
      <div class="row">${canPush()?`<button class="btn" id="pOn">${st?T("Guardar cambios"):T("Activar avisos")}</button>${st?`<button class="btn ghost" id="pTest">${T("Enviar un aviso de prueba")}</button><button class="btn ghost danger" id="pOff">${T("Desactivar")}</button>`:""}`:""}</div>
      <p class="note" id="pMsg" role="status"></p>
      <p class="note">${T("No hace falta cuenta. Solo guardamos las zonas elegidas y la dirección técnica del aviso de este móvil.")}</p>`,"pushbox");
    const msg=t=>{ o.querySelector("#pMsg").textContent=t; };
    const zones=()=>[...o.querySelectorAll(".pushz input:checked")].map(i=>i.value);
    o.querySelector("#pOn")?.addEventListener("click",async e=>{ const z=zones(); if(!z.length){ msg(T("Elige al menos una zona.")); return; }
      e.target.disabled=true; msg(T("Activando…"));
      try{ await subscribe(z,+o.querySelector("#pmin").value); msg(T("¡Listo! Te avisaremos cuando toque.")); setTimeout(()=>{ close(); window.openPush(siteId); },900); }
      catch(err){ e.target.disabled=false; msg(err.code==="perm"?T("Has bloqueado los avisos para esta web. Actívalos en los ajustes del navegador y vuelve a probar."):T("No se ha podido activar ahora. Prueba más tarde.")+" ("+err.message+")"); } });
    o.querySelector("#pTest")?.addEventListener("click",async e=>{ e.target.disabled=true; const sub=await currentSub(); if(!sub){ msg(T("Este móvil ya no está suscrito. Vuelve a activar los avisos.")); return; }
      try{ await api({action:"test",endpoint:sub.endpoint}); msg(T("Enviado. Debería llegarte en unos segundos.")); }catch(err){ msg(err.status===429?T("Espera unos minutos para otra prueba."):T("No se ha podido enviar.")); } });
    o.querySelector("#pOff")?.addEventListener("click",async e=>{ e.target.disabled=true; await unsubscribe(); msg(T("Avisos desactivados.")); setTimeout(close,700); refreshBell(); });
  };
  function refreshBell(){ const b=document.getElementById("pushBtn"); if(b) b.setAttribute("aria-pressed",!!state()); }
  window.boletaireBell=refreshBell;

  /* ================= 2) Compartir el plan como imagen ================= */
  const SH={
    cep:'<path d="M23 34h18c2 9 3 16 1 21-2 4-18 4-20 0-2-5-1-12 1-21Z" fill="#efe1c6"/><path d="M6 33C6 18 18 8 32 8s26 10 26 25c0 3-2 4-5 4H11c-3 0-5-1-5-4Z" fill="#8a4f24"/><path d="M14 22c4-6 10-9 17-9" stroke="#b9773f" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
    rov:'<path d="M27 34h10l2 18c0 3-3 4-7 4s-7-1-7-4Z" fill="#e8873a"/><path d="M6 24c0-4 12-9 26-9s26 5 26 9c0 7-12 12-26 12S6 31 6 24Z" fill="#f08a3c"/><ellipse cx="32" cy="22" rx="17" ry="4.2" fill="none" stroke="#c9652a" stroke-width="1.8"/><ellipse cx="32" cy="21" rx="8" ry="2" fill="#b85521"/>',
    ros:'<path d="M8 16c6 6 15 8 24 8s18-2 24-8c1 6-4 12-14 16-3 8-4 16-3 24-5 2-9 2-14 0 1-8 0-16-3-24C12 28 7 22 8 16Z" fill="#f5b52e"/><path d="M8 16c6 6 15 8 24 8s18-2 24-8" fill="none" stroke="#d68e14" stroke-width="2.2" stroke-linecap="round"/>'
  };
  const svgImg=k=>new Promise(res=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>res(null); i.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${SH[k]}</svg>`); });
  const RAMPC=["#3d4a43","#d9b545","#ec9440","#ef6a3f","#ff8f6a"]; const bandC=v=>RAMPC[v<25?0:v<45?1:v<65?2:v<80?3:4];
  function wrap(g,text,x,y,maxW,lh,maxLines){ const w=String(text).split(" "); let line="",n=0; for(let i=0;i<w.length;i++){ const t=line?line+" "+w[i]:w[i]; if(g.measureText(t).width>maxW&&line){ g.fillText(line,x,y); y+=lh; line=w[i]; if(++n>=maxLines-1){ line=w.slice(i).join(" "); while(g.measureText(line+"…").width>maxW&&line.length>3) line=line.slice(0,-1); if(line!==w.slice(i).join(" ")) line+="…"; break; } } else line=t; } g.fillText(line,x,y); return y+lh; }
  function rr(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }

  async function planImage(s,r,di){
    try{ await document.fonts.ready; }catch(e){}
    const W=1080,H=1350, c=document.createElement("canvas"); c.width=W; c.height=H; const g=c.getContext("2d");
    const ca=CA(), F=(w,sz)=>`${w} ${sz}px "Plus Jakarta Sans", Inter, system-ui, sans-serif`, B=(w,sz)=>`${w} ${sz}px Inter, system-ui, sans-serif`;
    // fondo
    const bg=g.createLinearGradient(0,0,0,H); bg.addColorStop(0,"#0a1f18"); bg.addColorStop(1,"#04100c"); g.fillStyle=bg; g.fillRect(0,0,W,H);
    const gl=g.createRadialGradient(880,180,20,880,180,620); gl.addColorStop(0,"rgba(34,211,238,.22)"); gl.addColorStop(1,"rgba(34,211,238,0)"); g.fillStyle=gl; g.fillRect(0,0,W,H);
    const gl2=g.createRadialGradient(120,1250,20,120,1250,600); gl2.addColorStop(0,"rgba(52,211,153,.18)"); gl2.addColorStop(1,"rgba(52,211,153,0)"); g.fillStyle=gl2; g.fillRect(0,0,W,H);
    // setas decorativas
    const [ic1,ic2,ic3]=await Promise.all([svgImg("cep"),svgImg("rov"),svgImg("ros")]);
    const deco=[[ic1,860,1040,190,-.12,1],[ic3,700,1120,120,.15,1],[ic2,960,1150,110,.2,1],[ic2,880,90,90,.25,.35],[ic3,1000,205,60,-.3,.3]];
    for(const [im,x,y,sz,rot,a] of deco){ if(!im) continue; g.save(); g.globalAlpha=a; g.translate(x,y); g.rotate(rot); g.drawImage(im,-sz/2,-sz/2,sz,sz); g.restore(); }
    // marca
    g.fillStyle="#ef6a3f"; g.beginPath(); g.moveTo(80,124); g.bezierCurveTo(80,96,100,82,124,82); g.bezierCurveTo(148,82,168,96,168,124); g.lineTo(80,124); g.fill();
    g.fillStyle="#3c5d4f"; rr(g,110,124,28,28,6); g.fill();
    g.fillStyle="#e9f3ee"; g.font=F(800,44); g.fillText("Boletaire",186,132);
    // etiqueta
    g.font=B(600,26); g.fillStyle="#7fe9c3"; g.fillText((ca?"PLA PER ANAR A BUSCAR BOLETS":"PLAN PARA IR A POR SETAS"),80,250);
    // zona
    g.fillStyle="#f1f7f3"; g.font=F(800,84); let y=wrap(g,s.n,80,350,920,92,3);
    g.font=B(500,32); g.fillStyle="#a9c7b9"; g.fillText(`${s.c} · ${s.alt} m`,80,y+4); y+=70;
    // día y nota
    const dname=(typeof fmtDay==="function"?fmtDay(r.d,di):r.d), dd=(typeof fmtDate==="function"?fmtDate(r.d):"");
    rr(g,80,y,920,250,36); g.fillStyle="rgba(13,29,23,.75)"; g.fill(); g.strokeStyle="rgba(170,240,210,.18)"; g.lineWidth=2; g.stroke();
    g.fillStyle=bandC(r.score); g.beginPath(); g.arc(205,y+125,92,0,Math.PI*2); g.fill();
    g.fillStyle=r.score>=25&&r.score<65?"#1b1406":"#fff"; g.font=F(800,88); g.textAlign="center"; g.fillText(String(r.score),205,y+156); g.textAlign="left";
    g.fillStyle="#f1f7f3"; g.font=F(800,50); g.fillText((dname.charAt(0).toUpperCase()+dname.slice(1))+" "+dd,330,y+100);
    g.font=B(600,34); g.fillStyle="#7fe9c3"; g.fillText(T(LABEL[band(r.score)])+(ca?" per buscar bolets":" para buscar setas"),330,y+152);
    g.font=B(400,30); g.fillStyle="#a9c7b9"; g.fillText(`${Math.round(r.lo)}–${Math.round(r.hi)} °C${r.rain>1?` · ${Math.round(r.rain)} mm`:""}`,330,y+198);
    y+=300;
    // especies
    const sp=(r.sp||[]).slice(0,3).map(x=>SP[x.id]?.ca).filter(Boolean);
    if(sp.length){ g.font=B(600,26); g.fillStyle="#8fb0a2"; g.fillText(ca?"QUÈ HI POT SORTIR":"QUÉ PUEDE SALIR",80,y); y+=50; g.font=F(700,40); g.fillStyle="#e9f3ee"; y=wrap(g,sp.join(" · "),80,y,900,50,2)+10; }
    // aparcamiento
    let P=null; try{ P=mainPark(s,r); }catch(e){}
    g.font=B(600,26); g.fillStyle="#8fb0a2"; g.fillText(ca?"QUEDEM A":"QUEDAMOS EN",80,y+10); y+=58;
    g.font=F(700,36); g.fillStyle="#e9f3ee";
    const startTxt=(typeof START!=="undefined"&&START[s.id])?START[s.id]:(P?(ca?"Aparcament de la zona":"Aparcamiento de la zona"):short(s));
    y=wrap(g,"🅿️ "+startTxt,80,y,620,46,2);
    // semana
    const all=RES[s.id]||[]; const n=Math.min(7,all.length), bx=80, by=H-200, bw=56, gap=18;
    for(let i=0;i<n;i++){ const v=all[i].score, h=Math.max(10,v*1.1); g.globalAlpha=i===di?1:.55; g.fillStyle=bandC(v); rr(g,bx+i*(bw+gap),by-h,bw,h,10); g.fill(); g.globalAlpha=1;
      g.font=B(i===di?700:500,22); g.fillStyle=i===di?"#e9f3ee":"#8fa89c"; g.textAlign="center"; g.fillText((typeof fmtDay==="function"?fmtDay(all[i].d,i):"").slice(0,4),bx+i*(bw+gap)+bw/2,by+34); g.textAlign="left"; }
    // pie
    g.font=B(600,28); g.fillStyle="#5eead4"; g.fillText("boletscat.github.io",80,H-70);
    g.font=B(400,22); g.fillStyle="#6f8c80"; g.fillText(ca?"Previsió estimada. No mengis cap bolet que no coneguis.":"Previsión estimada. No comas ninguna seta que no conozcas.",80,H-34);
    return await new Promise(res=>c.toBlob(res,"image/png"));
  }

  window.sharePlan=async function(btn){
    const s=SITES.find(x=>x.id===sel); if(!s) return; const di=dayIdx, r=RES[s.id]?.[di]; if(!r) return;
    const url=`${location.origin}${location.pathname.replace(/[^/]*$/,"")}?z=${s.id}&f=${r.d}`;
    const txt=(typeof shareText==="function"?shareText(s,r):s.n)+"\n"+url;
    const old=btn?btn.textContent:""; if(btn){ btn.disabled=true; btn.textContent=T("Preparando…"); }
    try{
      const blob=await planImage(s,r,di); const file=new File([blob],`boletaire-${s.id}-${r.d}.png`,{type:"image/png"});
      if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:"Boletaire: "+s.n,text:txt}); }
      else {
        const u=URL.createObjectURL(blob);
        const {o}=modal(`<h2>${T("Compartir el plan")}</h2><img src="${u}" alt="" style="width:100%;border-radius:14px;margin:6px 0 10px">
          <div class="row"><a class="btn" href="${u}" download="boletaire-${s.id}-${r.d}.png">${T("Descargar imagen")}</a><button class="btn ghost" id="cpTxt">${T("Copiar texto y enlace")}</button>
          <a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">WhatsApp</a></div><p class="note" id="cpMsg" role="status"></p>`,"sharebox");
        o.querySelector("#cpTxt").onclick=async()=>{ try{ await navigator.clipboard.writeText(txt); o.querySelector("#cpMsg").textContent=T("Copiado."); }catch(e){ o.querySelector("#cpMsg").textContent=T("No se ha podido copiar."); } };
      }
    }catch(e){ if(!(e&&e.name==="AbortError")) console.warn("sharePlan",e); }
    finally{ if(btn){ btn.disabled=false; btn.textContent=old; } }
  };

  // Enlace compartido con fecha (?f=AAAA-MM-DD): abre ese día si está en la previsión
  const F_=new URLSearchParams(location.search).get("f");
  if(F_){ const t=setInterval(()=>{ if(typeof DAYS!=="undefined"&&DAYS.length){ clearInterval(t); const i=DAYS.indexOf(F_); if(i>=0&&i!==dayIdx){ dayIdx=i; renderAll(); } } },300); setTimeout(()=>clearInterval(t),20000); }

  // Botones en la ficha de la zona (se añaden cada vez que se pinta)
  const det=document.getElementById("detail");
  if(det) new MutationObserver(()=>{
    const hb=det.querySelector(".hdbtns"); if(!hb||hb.querySelector("#planShareBtn")) return;
    const sb=document.createElement("button"); sb.className="star"; sb.id="planShareBtn"; sb.title=T("Compartir el plan con tu grupo"); sb.innerHTML="📤<span class=\"bl2\"> "+T("Compartir")+"</span>"; sb.setAttribute("aria-label",T("Compartir"));
    sb.onclick=()=>window.sharePlan(sb); hb.prepend(sb);
    const pb=document.createElement("button"); pb.className="star"; pb.id="pushBtn"; pb.title=T("Avisos al móvil para esta zona"); pb.textContent="🔔"; pb.setAttribute("aria-label",T("Avisos al móvil"));
    pb.setAttribute("aria-pressed",!!state()); pb.onclick=()=>window.openPush(sel); hb.append(pb);
  }).observe(det,{childList:true});
})();
