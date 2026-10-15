// Genera plantillas/<id>/index.html a partir del index.html de la raíz.
// Cada copia es la app completa (misma lógica y datos) con la hoja de estilo
// y el script de su plantilla encima. Uso: node plantillas/build.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "..", "index.html"), "utf8");
const ids = ["musgo", "pizarra", "sotobosque"];

function must(s, needle) { if (!s.includes(needle)) throw new Error("No encuentro " + needle); return s; }

for (const id of ids) {
  if (!existsSync(join(here, id, "theme.css"))) continue;
  let html = src;
  // <base> hace que todas las rutas relativas (datos, scripts, imágenes) apunten a la raíz.
  html = must(html, "<head>").replace("<head>", '<head><base href="../../"><meta name="robots" content="noindex">');
  html = must(html, '<div class="wrap">').replace('<div class="wrap">',
    `<link rel="stylesheet" href="plantillas/${id}/theme.css">\n<div class="wrap">`);
  html = must(html, "</body>").replace("</body>",
    `<script src="plantillas/${id}/theme.js"></script>\n<script src="plantillas/switcher.js" data-current="${id}"></script>\n</body>`);
  writeFileSync(join(here, id, "index.html"), html);
  console.log("ok", id);
}
