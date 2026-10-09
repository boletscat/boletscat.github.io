/* Boletaire – versión web pública: sustituye a la plataforma de Claude.
   Previsión e historial: archivos estáticos en data/. Datos personales: solo en este dispositivo (localStorage). */
window.BOLETAIRE_WEB = true;
(function(){
  const CFG = window.WEBCFG || {};
  const LS = (()=>{ try{ const k="__t"; localStorage.setItem(k,"1"); localStorage.removeItem(k); return localStorage; }catch(e){ const m={}; return {getItem:k=>m[k]??null,setItem:(k,v)=>{m[k]=String(v)},removeItem:k=>{delete m[k]}}; } })();
  let uid = LS.getItem("boletaire.uid"); if(!uid){ uid="web_"+Math.random().toString(36).slice(2,12); LS.setItem("boletaire.uid",uid); }
  const store = ()=>{ try{ return JSON.parse(LS.getItem("boletaire.userdata")||"{}"); }catch(e){ return {}; } };
  const save = o=>LS.setItem("boletaire.userdata",JSON.stringify(o));
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
  let tok = LS.getItem("boletaire.token"); if(!tok){ tok = Array.from(crypto.getRandomValues(new Uint8Array(18)),b=>b.toString(16).padStart(2,"0")).join(""); LS.setItem("boletaire.token",tok); }
  const sbH = ()=>({ apikey: SB.k, Authorization: "Bearer "+SB.k, "Content-Type": "application/json" });
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
                 delete:async()=>{ try{ await idbOp("readwrite",st=>st.delete(id)); }catch(e){} const o=store(); delete o[id]; save(o); setTimeout(fire,0); },
                 onSnapshot(fn){ const o=store(); fn(snap(id in o,o[id])); return ()=>{}; } }; }
      if(SHARED[seg[0]]&&seg.length===2&&SB){ const c=seg[0]; return { get:async()=>{ const d=colDocs[c].find(x=>x.id===seg[1]); return snap(!!d,d?d.data():null); }, onSnapshot(fn){ fn(snap(false,null)); return ()=>{}; }, update:refused, delete:refused,
        set:async v=>{ if(seg[1]!==uid) return refused(); const r=await fetch(SB.u+"/rest/v1/rpc/put_doc",{method:"POST",headers:sbH(),body:JSON.stringify({p_coll:c,p_uid:uid,p_token:tok,p_data:v})}); if(!r.ok) throw new Error("supabase "+r.status); await colLoad(c); } }; }
      if(seg[0]==="reports"&&seg.length===2&&SB){ return { get:async()=>snap(false,null), onSnapshot(fn){ fn(snap(false,null)); return ()=>{}; }, update:refused, delete:refused,
        set:async v=>{ if(seg[1]!==uid) return refused(); const r=await fetch(SB.u+"/rest/v1/rpc/post_report",{method:"POST",headers:sbH(),body:JSON.stringify({p_uid:uid,p_token:tok,p_items:v.items||[]})}); if(!r.ok) throw new Error("supabase "+r.status); await repLoad(); } }; }
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
  const user={ id:async()=>uid, me:async()=>({id:uid}), canEdit:async()=>false, isOwner:async()=>false, can:async()=>false, profiles:async()=>({}) };
  window.BCL={ use: async n=> n==="db"?db : n==="user"?user : null };
})();
