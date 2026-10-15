/* Barra flotante para saltar entre plantillas mientras se comparan. Solo existe en las vistas previas. */
(function(){
  var cur=document.currentScript&&document.currentScript.dataset.current;
  var list=[["musgo","Musgo"],["pizarra","Pizarra"],["sotobosque","Sotobosque"],["","Todas"]];
  var bar=document.createElement("nav");
  bar.className="tplswitch"; bar.setAttribute("aria-label","Plantillas");
  bar.innerHTML='<span>Plantilla</span>'+list.map(function(t){
    var href=t[0]?"plantillas/"+t[0]+"/index.html":"plantillas/index.html";
    return '<a href="'+href+'"'+(t[0]===cur?' aria-current="page"':'')+'>'+t[1]+'</a>';
  }).join("");
  var css=document.createElement("style");
  css.textContent=".tplswitch{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(var(--tplb,14px) + env(safe-area-inset-bottom,0px));z-index:4000;display:flex;gap:2px;align-items:center;padding:4px;border-radius:999px;background:rgba(24,24,24,.86);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font:600 12.5px system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.25)}"+
    ".tplswitch span{color:#bbb;padding:0 8px 0 10px}.tplswitch a{color:#fff;text-decoration:none;padding:6px 11px;border-radius:999px}.tplswitch a[aria-current]{background:#fff;color:#111}"+
    "@media (max-width:600px){.tplswitch span{display:none}}";
  document.head.appendChild(css); document.body.appendChild(bar);
})();
