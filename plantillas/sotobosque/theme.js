/* Plantilla «Sotobosque»: añade la portada con el mapa de bosque y mueve allí la fecha de actualización. */
(function(){
  var ca=(window.I18N&&I18N.lang==="ca")||document.documentElement.lang==="ca";
  var t=ca?["On i quan surten bolets a Catalunya","Previsió a deu dies per a cada bosc, amb la pluja real del Meteocat i el terreny de cada zona."]
          :["Dónde y cuándo salen setas en Catalunya","Previsión a diez días para cada bosque, con la lluvia real del Meteocat y el terreno de cada zona."];
  var nav=document.querySelector("nav.views"); if(!nav) return;
  var h=document.createElement("section"); h.className="sb-hero";
  h.innerHTML='<div class="sb-forest" aria-hidden="true"></div><div class="sb-txt"><h2></h2><p></p></div>';
  h.querySelector("h2").textContent=t[0]; h.querySelector("p").textContent=t[1];
  nav.insertAdjacentElement("afterend",h);
  var fr=document.getElementById("fresh"); if(fr) h.querySelector(".sb-txt").appendChild(fr);
  // Solo en el mapa: en las demás secciones la portada se oculta
  function sync(){ var m=document.getElementById("v-map"); h.hidden=!!m&&m.getAttribute("aria-pressed")!=="true"; }
  nav.addEventListener("click",function(){ setTimeout(sync,0); }); sync();
})();
