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
  const db={
    doc(path){
      const seg=path.split("/");
      if(path==="forecast/latest") return { onSnapshot(fn,err){ json("data/forecast.json").then(d=>fn(snap(true,d))).catch(e=>err&&err(e)); return ()=>{}; }, get:()=>json("data/forecast.json").then(d=>snap(true,d)) };
      if(seg[0]==="data"&&seg[1]==="users"&&seg.length===4){ const id=seg[3];
        return { get:async()=>{ const o=store(); return snap(id in o,o[id]); },
                 set:async v=>{ const o=store(); o[id]=v; save(o); setTimeout(fire,0); },
                 update:async v=>{ const o=store(); o[id]={...(o[id]||{}),...v}; save(o); setTimeout(fire,0); },
                 delete:async()=>{ const o=store(); delete o[id]; save(o); setTimeout(fire,0); },
                 onSnapshot(fn){ const o=store(); fn(snap(id in o,o[id])); return ()=>{}; } }; }
      return { get:async()=>snap(false,null), set:refused, update:refused, delete:refused, onSnapshot(fn){ fn(snap(false,null)); return ()=>{}; } };
    },
    collection(path){
      const q={ orderBy:()=>q, limit:()=>q, where:()=>q,
        onSnapshot(fn,err){
          if(path==="history"){ json("data/history.json").then(a=>fn({docs:a.map(v=>({id:v.d,data:()=>v}))})).catch(()=>fn({docs:[]})); }
          else if(path.startsWith("data/users/")){ userSubs.push(fn); setTimeout(fire,0); }
          else setTimeout(()=>fn({docs:[]}),0);
          return ()=>{}; },
        get:async()=>({docs:[]}), doc:(id)=>db.doc(path+"/"+id) };
      return q;
    }
  };
  const user={ id:async()=>uid, me:async()=>({id:uid}), canEdit:async()=>false, isOwner:async()=>false, can:async()=>false, profiles:async()=>({}) };
  window.BCL={ use: async n=> n==="db"?db : n==="user"?user : null };
})();
