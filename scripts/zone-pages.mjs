// Boletaire – genera una página estática por zona (zona/<id>/index.html) y sitemap.xml, para que Google las encuentre.
// La llama update-forecast.mjs cada mañana con la previsión del día. También se puede lanzar sola:
//   node scripts/zone-pages.mjs        (usa data/outlook.json y data/history.json)
import fs from "node:fs";
import path from "node:path";

const SITE = "https://boletscat.github.io";
const LABEL = ["Malo", "Flojo", "Bueno", "Muy bueno", "Excelente"];
const BAND = (s) => (s < 25 ? 0 : s < 45 ? 1 : s < 65 ? 2 : s < 80 ? 3 : 4);
const COLOR = ["#3d4a43", "#d9b545", "#ec9440", "#ef6a3f", "#ff8f6a"];
const ED = { excelente: "Comestible excelente", comestible: "Comestible", precaucion: "Comestible con precaución", nocomestible: "No comestible", toxica: "Tóxica", mortal: "Mortal" };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const slug = (s) => s.id;
const DOW = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const fmt = (iso, i) => { const d = new Date(iso + "T12:00:00Z"); return i === 0 ? "Hoy" : i === 1 ? "Mañana" : DOW[d.getUTCDay()] + " " + d.getUTCDate(); };
const fmt2 = (iso, i) => { const d = new Date(iso + "T12:00:00Z"); return (i === 0 ? "Hoy" : i === 1 ? "Mañ." : DOW[d.getUTCDay()]) + "<br>" + d.getUTCDate(); };
const longDate = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const km = (a, b) => { const R = 6371, r = Math.PI / 180, dl = (b.lat - a.lat) * r, dn = (b.lon - a.lon) * r;
  const x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };

function page(s, model, out, hist, all) {
  const sc = out.z[s.id] || [], days = out.days || [];
  const today = sc[0], b = today != null ? BAND(today) : 0;
  const best = sc.slice(0, 7).reduce((m, v, i) => (v > (sc[m] ?? -1) ? i : m), 0);
  const SP = model.SP || {};
  const sp = (s.sp || []).map((id) => SP[id] && { ...SP[id], id }).filter(Boolean);
  const tx = (s.tx || []).map((id) => SP[id] && { ...SP[id], id }).filter(Boolean);
  const name = s.n, short = s.n.split(" – ")[0];
  const near = all.filter((z) => z.id !== s.id).map((z) => ({ z, d: km(s, z) })).sort((a, b2) => a.d - b2.d).slice(0, 6);
  const past = hist.filter((h) => h.scores && h.scores[s.id] != null).slice(-14);
  const upd = out.updatedAt ? out.updatedAt.slice(0, 10) : days[0];
  const spNames = sp.slice(0, 4).map((x) => x.ca).join(", ");
  const desc = today != null
    ? `Previsión de setas en ${name} (${s.c}): hoy ${today}/100 (${LABEL[b].toLowerCase()}). ${spNames ? "Especies: " + spNames + ". " : ""}Lluvia real del Meteocat y previsión a 9 días. Actualizado cada mañana.`
    : `Previsión de setas en ${name} (${s.c}), con lluvia real del Meteocat y previsión a 9 días.`;
  const title = `Setas en ${short} (${s.c}) – previsión de hoy | Boletaire`;
  const url = `${SITE}/zona/${slug(s)}/`;
  const bars = days.map((d, i) => { const v = sc[i] ?? 0; return `<li${i === best ? ' class="best"' : ""}><span class="bar" style="height:${Math.max(6, v)}%;background:${COLOR[BAND(v)]}"></span><b>${v}</b><span>${fmt2(d, i)}</span></li>`; }).join("");
  const ld = { "@context": "https://schema.org", "@type": "Place", name, description: desc, geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lon, elevation: s.alt }, containedInPlace: { "@type": "AdministrativeArea", name: s.c + ", Catalunya" }, url };
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Boletaire"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/z/${s.id}.jpg"><meta property="og:locale" content="es_ES">
<meta name="theme-color" content="#06110d"><link rel="icon" href="/icon-192.png"><link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Inter:wght@400;600&display=swap">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
:root{--bg:#06110d;--glass:rgba(13,29,23,.66);--line:rgba(170,240,210,.1);--fg:#e9f3ee;--mu:#8fa89c;--grad:linear-gradient(100deg,#34d399,#2dd4bf 45%,#22d3ee)}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(900px 520px at 8% -6%,rgba(52,211,153,.13),transparent 60%),var(--bg);color:var(--fg);font:16px/1.6 Inter,system-ui,sans-serif}
a{color:#5eead4}.w{max-width:860px;margin:0 auto;padding:16px 16px 60px}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:6px 0 18px}
.brand{display:flex;align-items:center;gap:8px;color:var(--fg);text-decoration:none;font:800 20px "Plus Jakarta Sans",sans-serif}
.cta{background:var(--grad);color:#03140d;font-weight:700;text-decoration:none;padding:10px 18px;border-radius:999px;white-space:nowrap}
.crumbs{font-size:13px;color:var(--mu)}.crumbs a{color:var(--mu)}
h1{font:800 clamp(30px,6vw,46px)/1.05 "Plus Jakarta Sans",sans-serif;letter-spacing:-.03em;margin:8px 0 6px}
h2{font:800 22px/1.2 "Plus Jakarta Sans",sans-serif;margin:0 0 12px;letter-spacing:-.02em}
.sub{color:var(--mu);margin:0 0 20px}
.card{background:var(--glass);border:1px solid var(--line);border-radius:22px;padding:20px;margin:0 0 16px}
.now{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.big{width:96px;height:96px;border-radius:50%;display:grid;place-items:center;font:800 38px "Plus Jakarta Sans",sans-serif;color:#fff;flex:none}
.now p{margin:2px 0}.now b.l{font:800 22px "Plus Jakarta Sans",sans-serif}
ol.days{list-style:none;display:grid;grid-template-columns:repeat(9,1fr);gap:6px;padding:0;margin:8px 0 0;height:170px;align-items:end}
ol.days li{line-height:1.25;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;font-size:12px;color:var(--mu)}
ol.days .bar{width:70%;border-radius:6px 6px 2px 2px}ol.days b{color:var(--fg);font-size:13px;margin-top:4px}
ol.days li.best b{color:#5eead4}
.sp{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;list-style:none;padding:0;margin:0}
.sp li{display:flex;gap:12px;align-items:center;background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:14px;padding:10px}
.sp img{width:60px;height:60px;object-fit:cover;border-radius:10px;flex:none}.sp small{display:block;color:var(--mu)}
.tag{display:inline-block;font-size:11.5px;font-weight:600;border-radius:999px;padding:1px 8px;margin-top:3px;border:1px solid currentColor}
.ok{color:#4ade80}.bad{color:#ff7d70}
dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 16px;margin:0}dt{color:var(--mu)}dd{margin:0}
.near{display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:0}.near a{display:inline-block;padding:6px 12px;border:1px solid var(--line);border-radius:999px;text-decoration:none;color:var(--fg);font-size:14px}
.warn{border-left:3px solid #ff7d70;padding:10px 14px;background:rgba(255,125,112,.06);border-radius:12px;font-size:14px}
footer{color:var(--mu);font-size:13px;margin-top:26px}
@media (max-width:560px){ol.days{gap:3px}ol.days li{font-size:10.5px}}
</style></head><body><div class="w">
<header><a class="brand" href="/"><svg width="28" height="28" viewBox="0 0 40 40" aria-hidden="true"><path d="M4 21C4 11 11 5 20 5s16 6 16 16c0 2-1 3-3 3H7c-2 0-3-1-3-3Z" fill="#ef6a3f"/><path d="M15 24h10l1 10c0 2-2 3-6 3s-6-1-6-3Z" fill="#3c5d4f"/></svg>Boletaire</a><a class="cta" href="/?z=${s.id}">Ver en el mapa</a></header>
<nav class="crumbs"><a href="/">Boletaire</a> › <a href="/zona/">Zonas</a> › ${esc(s.c)}</nav>
<h1>Setas en ${esc(name)}</h1>
<p class="sub">${esc(s.c)} · ${s.alt} m · ${esc(s.h)}. Previsión actualizada el ${esc(longDate(upd))}.</p>
<section class="card"><div class="now"><div class="big" style="background:${COLOR[b]}">${today ?? "–"}</div><div><b class="l">${today != null ? LABEL[b] : "Sin datos"} hoy</b><p>Nota de 0 a 100 según la lluvia de las últimas semanas, la temperatura y el terreno.</p>${best > 0 && sc[best] > (today ?? 0) ? `<p>Mejor día de la semana: <b>${esc(fmt(days[best], best))}</b> (${sc[best]}).</p>` : ""}</div></div>
<ol class="days" aria-label="Previsión a 9 días">${bars}</ol></section>
${sp.length ? `<section class="card"><h2>Qué setas salen aquí</h2><ul class="sp">${sp.map((x) => `<li><img src="/g/${x.id}.jpg" alt="${esc(x.ca)}" loading="lazy" width="60" height="60"><div><b>${esc(x.ca)}</b> <small>${esc(x.es)} · <i>${esc(x.lat)}</i></small><span class="tag ok">${esc(ED[x.ed] || x.ed)}</span></div></li>`).join("")}</ul></section>` : ""}
${tx.length ? `<section class="card"><h2>Cuidado con estas</h2><ul class="sp">${tx.map((x) => `<li><img src="/g/${x.id}.jpg" alt="${esc(x.ca)}" loading="lazy" width="60" height="60"><div><b>${esc(x.ca)}</b> <small>${esc(x.es)} · <i>${esc(x.lat)}</i></small><span class="tag bad">${esc(ED[x.ed] || x.ed)}</span></div></li>`).join("")}</ul><p class="warn" style="margin:12px 0 0"><b>No comas ninguna seta sin identificación segura.</b> Ante la duda, llévala a una asociación micológica. Urgencias por intoxicación: 112.</p></section>` : ""}
<section class="card"><h2>La zona</h2><dl><dt>Comarca</dt><dd>${esc(s.c)}</dd><dt>Altitud</dt><dd>${s.alt} m</dd><dt>Bosque</dt><dd>${esc(s.h)}</dd><dt>Coordenadas</dt><dd>${s.lat.toFixed(3)}, ${s.lon.toFixed(3)} · <a href="https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lon}" rel="nofollow">Google Maps</a></dd>${past.length > 2 ? `<dt>Últimos días</dt><dd>${past.map((h) => h.scores[s.id]).join(" · ")}</dd>` : ""}</dl>
<p style="margin:14px 0 0">En la app tienes los puntos concretos donde buscar, los aparcamientos, las rutas a pie y las normas de recolección. <a href="/?z=${s.id}">Abrir ${esc(short)} en Boletaire →</a></p></section>
<section class="card"><h2>Zonas cercanas</h2><ul class="near">${near.map(({ z, d }) => `<li><a href="/zona/${z.id}/">${esc(z.n.split(" – ")[0])} · ${out.z[z.id]?.[0] ?? "–"} <small style="color:var(--mu)">(${Math.round(d)} km)</small></a></li>`).join("")}</ul></section>
<footer>Datos: Meteocat (XEMA, dades obertes de la Generalitat) y MET Norway. Es una estimación, no una garantía. Respeta las normas de cada zona. · <a href="/legal.html">Aviso legal</a></footer>
</div></body></html>`;
}

function indexPage(all, out) {
  const rows = [...all].sort((a, b) => (out.z[b.id]?.[0] ?? 0) - (out.z[a.id]?.[0] ?? 0));
  const byC = {}; rows.forEach((s) => (byC[s.c] ??= []).push(s));
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Zonas de setas en Catalunya – previsión de hoy | Boletaire</title><meta name="description" content="Las ${all.length} zonas de setas de Catalunya ordenadas por la previsión de hoy: Montseny, Guilleries, Berguedà, Ripollès, Pirineo y más. Actualizado cada mañana."><link rel="canonical" href="${SITE}/zona/">
<meta name="theme-color" content="#06110d"><link rel="icon" href="/icon-192.png">
<style>body{margin:0;background:#06110d;color:#e9f3ee;font:16px/1.6 Inter,system-ui,sans-serif}.w{max-width:860px;margin:0 auto;padding:20px 16px 60px}a{color:#e9f3ee}h1{font:800 34px/1.1 system-ui,sans-serif;letter-spacing:-.02em}h2{font-size:15px;letter-spacing:.12em;text-transform:uppercase;color:#8fa89c;margin:24px 0 8px}ul{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:6px}li a{display:flex;justify-content:space-between;gap:10px;padding:8px 12px;border:1px solid rgba(170,240,210,.1);border-radius:12px;text-decoration:none;background:rgba(13,29,23,.66)}b{color:#5eead4}</style></head>
<body><div class="w"><p><a href="/">← Boletaire</a></p><h1>Zonas de setas en Catalunya</h1><p style="color:#8fa89c">Ordenadas por la nota de hoy. Se actualiza cada mañana con la lluvia real del Meteocat.</p>
${Object.entries(byC).sort().map(([c, L]) => `<h2>${esc(c)}</h2><ul>${L.map((s) => `<li><a href="/zona/${s.id}/"><span>${esc(s.n)}</span><b>${out.z[s.id]?.[0] ?? "–"}</b></a></li>`).join("")}</ul>`).join("")}
</div></body></html>`;
}

export function buildZonePages(ROOT, model, outlook, hist) {
  const all = model.SITES;
  const dir = path.join(ROOT, "zona");
  fs.mkdirSync(dir, { recursive: true });
  for (const s of all) { const d = path.join(dir, slug(s)); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, "index.html"), page(s, model, outlook, hist || [], all)); }
  fs.writeFileSync(path.join(dir, "index.html"), indexPage(all, outlook));
  const day = (outlook.updatedAt || new Date().toISOString()).slice(0, 10);
  const urls = [`${SITE}/`, `${SITE}/zona/`, ...all.map((s) => `${SITE}/zona/${slug(s)}/`)];
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${day}</lastmod><changefreq>daily</changefreq></url>`).join("\n")}\n</urlset>\n`);
  return all.length;
}

// Ejecución directa
if (import.meta.url === `file://${process.argv[1]}`) {
  const { createRequire } = await import("node:module");
  const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const model = createRequire(import.meta.url)(path.join(ROOT, "model.js"));
  const out = JSON.parse(fs.readFileSync(path.join(ROOT, "data/outlook.json"), "utf8"));
  const hist = JSON.parse(fs.readFileSync(path.join(ROOT, "data/history.json"), "utf8"));
  console.log("páginas:", buildZonePages(ROOT, model, out, hist));
}
