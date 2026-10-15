# Plantillas de diseño (vista previa)

Tres diseños para elegir, cada uno con la app completa: `musgo/` (Material Design 3), `pizarra/` (shadcn/ui) y `sotobosque/` (revista de naturaleza). La portada `plantillas/index.html` las enseña con capturas.

Cada plantilla es solo `theme.css` + `theme.js`. Su `index.html` es una copia del `index.html` de la raíz con esos dos archivos añadidos; si la app cambia, se regenera con:

    node plantillas/build.mjs

La web publicada (raíz) no cambia. Cuando se elija una, se pasa su `theme.css`/`theme.js` a la raíz y se borra esta carpeta.
