/* Boletaire – versión web pública: sustituye a la plataforma de Claude.
   Previsión e historial: archivos estáticos en data/. Datos personales: solo en este dispositivo (localStorage). */
window.BOLETAIRE_WEB = true;
(function(){
  const CFG = window.WEBCFG || {};
  const LS = (()=>{ try{ const k="__t"; localStorage.setItem(k,"1"); localStorage.removeItem(k); return localStorage; }catch(e){ const m={}; return {getItem:k=>m[k]??null,setItem:(k,v)=>{m[k]=String(v)},removeItem:k=>{delete m[k]}}; } })();
  // Cuentas (Supabase Auth): el enlace del correo vuelve con la sesión en el #hash
  const AUTHK="boletaire.auth";
  const jwt=t=>{ try{ return JSON.parse(decodeURIComponent(escape(atob(t.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))))); }catch(e){ return {}; } };
  const mkSes=(at,rt,exp)=>{ const p=jwt(at); return {access_token:at,refresh_token:rt,expires_at:exp||p.exp||Math.floor(Date.now()/1000)+3600,id:p.sub,email:p.email||""}; };
  let SES=null; try{ SES=JSON.parse(LS.getItem(AUTHK)||"null"); }catch(e){}
  (function(){ const h=location.hash||""; if(!/access_token=|error_description=/.test(h)) return;
    const p=new URLSearchParams(h.slice(1));
    if(p.get("access_token")){ SES=mkSes(p.get("access_token"),p.get("refresh_token"),+p.get("expires_at")||0); if(SES.id){ LS.setItem(AUTHK,JSON.stringify(SES)); window.BOLETAIRE_JUST_LOGGED=true; } else SES=null; }
    else window.BOLETAIRE_AUTH_ERR=p.get("error_description")||"error";
    try{ history.replaceState(null,"",location.pathname+location.search); }catch(e){} })();
  let uid = LS.getItem("boletaire.uid"); if(!uid){ uid="web_"+Math.random().toString(36).slice(2,12); LS.setItem("boletaire.uid",uid); }
  if(SES&&SES.id) uid=SES.id;
  const store = ()=>{ try{ return JSON.parse(LS.getItem("boletaire.userdata")||"{}"); }catch(e){ return {}; } };
  const save = o=>{ LS.setItem("boletaire.userdata",JSON.stringify(o)); if(window.BAUTH) window.BAUTH._dirty(); };
  const DELK="boletaire.deleted"; const dels=()=>{ try{ return JSON.parse(LS.getItem(DELK)||"[]"); }catch(e){ return []; } };
  const addDel=id=>{ const d=dels().filter(x=>x!==id); d.unshift(id); LS.setItem(DELK,JSON.stringify(d.slice(0,400))); };
  const userSubs=[];
  const fire=()=>{ const o=store(); const docs=Object.entries(o).map(([id,v])=>({id,data:()=>v})); userSubs.forEach(f=>f({docs})); };
  const json=(u)=>fetch(u,{cache:"no-cache"}).then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); });
  const refused=()=>Promise.reject(Object.assign(new Error("no disponible en la versión web"),{code:"web"}));
  const snap=(exists,v)=>({exists,data:()=>v});
  // fotos del diario: en IndexedDB (no caben en localStorage)
  const idb=()=>new Promise((res,rej)=>{ const r=indexedDB.open("boletaire",1); r.onupgradeneeded=()=>r.result.createObjectStore("photos"); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
  const idbOp=(mode,fn)=>idb().then(d=>new Promise((res,rej)=>{ const tx=d.transaction("photos",mode); const q=fn(tx.objectStore("photos")); tx.oncomplete=()=>res(q&&q.result); tx.onerror=()=>rej(tx.error); }));
  // Avisos entre usuarios: Supabase (si está configurado en config.js)
  const SB = CFG.supabaseUrl && CFG.supabaseKey ? { u: CFG.supabaseUrl.replace(/\/$/,""), k: CFG.supabaseKey } : null;
  const sbH = ()=>({ apikey: SB.k, Authorization: "Bearer "+SB.k, "Content-Type": "application/json" });
  async function token(){
    if(!SES) return null;
    if(SES.expires_at-Date.now()/1000>90) return SES.access_token;
    try{ const r=await fetch(SB.u+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{apikey:SB.k,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:SES.refresh_token})});
      if(r.ok){ const j=await r.json(); SES=mkSes(j.access_token,j.refresh_token,j.expires_at); LS.setItem(AUTHK,JSON.stringify(SES)); return SES.access_token; }
      if(r.status>=400&&r.status<500){ SES=null; LS.removeItem(AUTHK); location.reload(); } }catch(e){}
    return SES&&SES.access_token; }
  const needLogin=()=>Promise.reject(Object.assign(new Error("inicia sesión"),{code:"login"}));
  async function rpc(fn,args){ const t=await token(); if(!t) return needLogin();
    const r=await fetch(SB.u+"/rest/v1/rpc/"+fn,{method:"POST",headers:{...sbH(),Authorization:"Bearer "+t},body:JSON.stringify(args)});
    if(!r.ok){ let m=""; try{ m=(await r.json()).message||""; }catch(e){} throw Object.assign(new Error(m||("supabase "+r.status)),{code:/bloqueada/.test(m)?"banned":"sb"}); }
    const tx=await r.text(); return tx?JSON.parse(tx):null; }
  const repSubs=[]; let repDocs=[];
  const repLoad=()=>fetch(SB.u+"/rest/v1/reports?select=uid,items,updated_at&order=updated_at.desc&limit=500",{headers:sbH()})
    .then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); })
    .then(a=>{ repDocs=a.map(v=>({id:v.uid,data:()=>({items:v.items,updatedAt:v.updated_at})})); repSubs.forEach(f=>f({docs:repDocs})); })
    .catch(()=>{ repSubs.forEach(f=>f({docs:repDocs})); });
  if(SB) setInterval(()=>{ if(repSubs.length&&document.visibilityState==="visible") repLoad(); }, 5*60e3);
  window.BOLETAIRE_REPORTS = !!SB;
  // Comunidad (foro y «Estoy aquí»): tabla genérica docs(coll, uid, data)
  const SHARED={forum:true,checkins:true}; const colSubs={forum:[],checkins:[]}; const colDocs={forum:[],checkins:[]};
  const colLoad=c=>fetch(SB.u+`/rest/v1/docs?select=uid,data,updated_at&coll=eq.${c}&order=updated_at.desc&limit=400`,{headers:sbH()})
    .then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); })
    .then(a=>{ colDocs[c]=a.map(v=>({id:v.uid,data:()=>v.data})); colSubs[c].forEach(f=>f({docs:colDocs[c]})); })
    .catch(()=>{ colSubs[c].forEach(f=>f({docs:colDocs[c]})); });
  if(SB) setInterval(()=>{ if(document.visibilityState!=="visible") return; for(const c in colSubs) if(colSubs[c].length) colLoad(c); }, 90e3);
  const db={
    doc(path){
      const seg=path.split("/");
      if(path==="forecast/latest") return { onSnapshot(fn,err){ json("data/forecast.json").then(d=>fn(snap(true,d))).catch(e=>err&&err(e)); return ()=>{}; }, get:()=>json("data/forecast.json").then(d=>snap(true,d)) };
      if(seg[0]==="data"&&seg[1]==="users"&&seg.length===4){ const id=seg[3];
        return { get:async()=>{ const o=store(); if(id in o) return snap(true,o[id]); try{ const v=await idbOp("readonly",st=>st.get(id)); return snap(!!v,v); }catch(e){ return snap(false,null); } },
                 set:async v=>{ if(v&&v.type==="photo"){ await idbOp("readwrite",st=>st.put(v,id)); return; } const o=store(); o[id]=v; save(o); setTimeout(fire,0); },
                 update:async v=>{ const o=store(); o[id]={...(o[id]||{}),...v}; save(o); setTimeout(fire,0); },
                 delete:async()=>{ try{ await idbOp("readwrite",st=>st.delete(id)); }catch(e){} addDel(id); const o=store(); delete o[id]; save(o); setTimeout(fire,0); },
                 onSnapshot(fn){ const o=store(); fn(snap(id in o,o[id])); return ()=>{}; } }; }
      if(SHARED[seg[0]]&&seg.length===2&&SB){ const c=seg[0]; return { get:async()=>{ const d=colDocs[c].find(x=>x.id===seg[1]); return snap(!!d,d?d.data():null); }, onSnapshot(fn){ fn(snap(false,null)); return ()=>{}; }, update:refused, delete:refused,
        set:async v=>{ if(!SES) return needLogin();
          if(seg[1]===uid) await rpc("put_my_doc",{p_coll:c,p_data:v});
          else if(await isAdmin()) await rpc("mod_put_doc",{p_coll:c,p_uid:seg[1],p_data:v});
          else return refused();
          await colLoad(c); } }; }
      if(seg[0]==="reports"&&seg.length===2&&SB){ return { get:async()=>snap(false,null), onSnapshot(fn){ fn(snap(false,null)); return ()=>{}; }, update:refused, delete:refused,
        set:async v=>{ if(!SES) return needLogin(); if(seg[1]!==uid) return refused(); await rpc("post_my_report",{p_items:v.items||[]}); await repLoad(); } }; }
      return { get:async()=>snap(false,null), set:refused, update:refused, delete:refused, onSnapshot(fn){ fn(snap(false,null)); return ()=>{}; } };
    },
    collection(path){
      const q={ orderBy:()=>q, limit:()=>q, where:()=>q,
        onSnapshot(fn,err){
          if(path==="history"){ json("data/history.json").then(a=>fn({docs:a.map(v=>({id:v.d,data:()=>v}))})).catch(()=>fn({docs:[]})); }
          else if(path.startsWith("data/users/")){ userSubs.push(fn); setTimeout(fire,0); }
          else if(path==="reports"&&SB){ repSubs.push(fn); repLoad(); }
          else if(SHARED[path]&&SB){ colSubs[path].push(fn); colLoad(path); }
          else setTimeout(()=>fn({docs:[]}),0);
          return ()=>{}; },
        get:async()=>({docs:[]}), doc:(id)=>db.doc(path+"/"+id) };
      return q;
    }
  };
  let ADM=null; async function isAdmin(){ if(!SES||!SB) return false; if(ADM===null){ try{ ADM=!!(await rpc("is_admin",{})); }catch(e){ return false; } } return ADM; }
  // Sincronizar «Mis salidas» y demás datos personales con la cuenta
  let pushT=null, syncState={at:null,err:false,busy:false};
  const syncFire=()=>window.dispatchEvent(new Event("boletaire-sync"));
  async function pushData(){ if(!SES||!SB) return; syncState.busy=true;
    try{ const at=await rpc("put_my_data",{p_data:{docs:store(),deleted:dels()}}); syncState={at:at||new Date().toISOString(),err:false,busy:false}; }
    catch(e){ syncState.err=true; syncState.busy=false; } syncFire(); }
  async function pullData(){ if(!SES||!SB) return;
    try{ const t=await token(); const r=await fetch(SB.u+"/rest/v1/user_data?select=data,updated_at",{headers:{...sbH(),Authorization:"Bearer "+t}});
      if(!r.ok) throw new Error(r.status); const a=await r.json(); const rem=a[0]?.data||{}; const local=store();
      const del=new Set([...dels(),...(rem.deleted||[])]); LS.setItem(DELK,JSON.stringify([...del].slice(0,400)));
      const merged={...(rem.docs||{}),...local}; for(const k of del) delete merged[k];
      const changed=JSON.stringify(merged)!==JSON.stringify(local);
      LS.setItem("boletaire.userdata",JSON.stringify(merged)); if(changed) fire();
      if(changed||JSON.stringify(merged)!==JSON.stringify(rem.docs||{})) await pushData(); else { syncState={at:a[0]?.updated_at||null,err:false,busy:false}; syncFire(); } }
    catch(e){ syncState.err=true; syncFire(); } }
  window.BAUTH={
    enabled:!!SB, user:()=>SES?{id:SES.id,email:SES.email}:null, isAdmin, sync:()=>syncState,
    justLogged:!!window.BOLETAIRE_JUST_LOGGED, error:window.BOLETAIRE_AUTH_ERR||null,
    _dirty(){ if(!SES) return; clearTimeout(pushT); pushT=setTimeout(pushData,1500); },
    async signIn(email){ const back=location.origin+location.pathname;
      const r=await fetch(SB.u+"/auth/v1/otp?redirect_to="+encodeURIComponent(back),{method:"POST",headers:{apikey:SB.k,"Content-Type":"application/json"},body:JSON.stringify({email,create_user:true})});
      if(r.ok) return true; let j={}; try{ j=await r.json(); }catch(e){}
      throw Object.assign(new Error(j.msg||j.message||j.error_description||"error"),{status:r.status}); },
    async signOut(){ clearTimeout(pushT); await pushData(); if(!syncState.err){ LS.removeItem("boletaire.userdata"); LS.removeItem(DELK); }
      try{ const t=await token(); if(t) await fetch(SB.u+"/auth/v1/logout",{method:"POST",headers:{apikey:SB.k,Authorization:"Bearer "+t}}); }catch(e){}
      SES=null; LS.removeItem(AUTHK); location.reload(); },
    async deleteAccount(){ await rpc("delete_me",{}); SES=null; LS.removeItem(AUTHK); LS.removeItem(DELK); location.reload(); },
    pull:pullData,
    async ban(id){ await rpc("mod_ban",{p_uid:id,p_ban:true,p_reason:"comunidad"}); for(const c in colSubs) await colLoad(c); await repLoad(); }
  };
  if(SES&&SB){ pullData(); setInterval(()=>{ if(document.visibilityState==="visible") token(); }, 10*60e3); }
  const user={ id:async()=>uid, me:async()=>({id:uid}), canEdit:async()=>false, isOwner:isAdmin, can:async()=>false, profiles:async()=>({}) };
  window.BCL={ use: async n=> n==="db"?db : n==="user"?user : null };
})();
