/* Plantilla «Pizarra»: mete las secciones dentro de la cabecera fija como pestañas. */
(function(){
  var head=document.querySelector("header.top"), nav=document.querySelector("nav.views");
  if(head&&nav) head.appendChild(nav);
})();
