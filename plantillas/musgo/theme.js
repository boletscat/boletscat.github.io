/* Plantilla «Musgo»: añade los iconos de Material Symbols (Apache 2.0) a la navegación. */
(function(){
  var ic={
    "v-map":'<path d="m15 5.1-6-2.1-6 2v16l6-2.1 6 2.1 6-2V3Zm-1 13.6-4-1.4V5.3l4 1.4Z" fill="currentColor"/>',
    "v-guide":'<path d="M12 3C6.5 3 3 6.6 3 11c0 .8.6 1.5 1.4 1.5h15.2c.8 0 1.4-.7 1.4-1.5 0-4.4-3.5-8-9-8Zm-2.5 11 .5 5.5c.1.9.9 1.5 2 1.5s1.9-.6 2-1.5l.5-5.5Z" fill="currentColor"/>',
    "v-trips":'<path d="M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3A7.3 7.3 0 0 0 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6Z" fill="currentColor"/>',
    "v-forum":'<path d="M4 4h16v12H5.2L4 17.2Zm-2-2v20l4-4h16V2Z" fill="currentColor"/>',
    "v-how":'<path d="M11 17h2v-6h-2Zm1-15a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm-1-11h2V7h-2Z" fill="currentColor"/>'
  };
  function add(){ Object.keys(ic).forEach(function(id){
    var b=document.getElementById(id); if(!b||b.querySelector("svg")) return;
    b.insertAdjacentHTML("afterbegin",'<svg viewBox="0 0 24 24" aria-hidden="true">'+ic[id]+'</svg>');
  }); }
  add(); document.addEventListener("DOMContentLoaded",add); addEventListener("load",add);
})();
