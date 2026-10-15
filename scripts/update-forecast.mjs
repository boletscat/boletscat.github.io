// Boletaire – actualiza data/forecast.json y data/history.json para la web pública.
// Lo ejecuta cada mañana la acción de GitHub (.github/workflows/forecast.yml). Node 20+, sin dependencias.
// Fuentes: Meteocat (datos abiertos de la Generalitat, analisi.transparenciacatalunya.cat) y MET Norway (api.met.no).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const UA = "Boletaire/2 (https://github.com/; prevision de setas en Catalunya)";
const TZ = "Europe/Madrid";
const require = createRequire(import.meta.url);
const model = require(path.join(ROOT, "model.js"));
const ZST = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/stations.json"), "utf8")); // id -> código de estación principal

const ymd = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJSON(url, tries = 3) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (!r.ok) throw new Error(r.status + " " + url);
      return await r.json();
    } catch (e) { if (i >= tries - 1) throw e; await sleep(3000 * (i + 1)); }
  }
}

const NOW = new Date();
const HOY = ymd(NOW);
const D21 = addDays(HOY, -21), D7 = addDays(HOY, -8), DT = addDays(HOY, -7);
const [Y, M] = HOY.split("-").map(Number);
const TEMP = `${M >= 9 ? Y : Y - 1}-09-01`;

// ---------- Meteocat ----------
const SOC = "https://analisi.transparenciacatalunya.cat/resource/7bvh-jvq2.json";
const q = (o) => SOC + "?" + Object.entries(o).map(([k, v]) => `$${k}=${encodeURIComponent(v)}`).join("&");
const sumBy = (varc, from) => getJSON(q({ select: "codi_estacio,sum(valor) as s,count(valor) as n", where: `codi_variable='${varc}' AND data_lectura>'${from}'`, group: "codi_estacio", order: "codi_estacio", limit: "1000" }));

async function meteocat() {
  const [r21, r7, t7, last, daily] = await Promise.all([
    sumBy("1300", D21), sumBy("1300", D7), sumBy("1000", DT),
    getJSON(q({ select: "max(data_lectura) as m", where: "codi_variable='1300'" })),
    getJSON(q({ select: "date_trunc_ymd(data_lectura) as d,avg(valor) as v", where: `codi_variable='1300' AND data_lectura>='${TEMP}'`, group: "d", order: "d", limit: "1000" })),
  ]);
  const st = {};
  for (const r of r21) st[r.codi_estacio] = [+(+r.s).toFixed(1), 0, null];
  for (const r of r7) if (st[r.codi_estacio]) st[r.codi_estacio][1] = +(+r.s).toFixed(1);
  for (const r of t7) if (st[r.codi_estacio] && +r.n > 0) st[r.codi_estacio][2] = +(+r.s / +r.n).toFixed(1);
  return {
    stations: st,
    obsUntil: String(last[0]?.m || HOY).slice(0, 10),
    daily: daily.map((r) => [String(r.d).slice(0, 10), r.v]),
  };
}

// ---------- MET Norway ----------
async function metno(s) {
  const j = await getJSON(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${s.lat.toFixed(3)}&lon=${s.lon.toFixed(3)}&altitude=${Math.round(s.alt)}`);
  const ts = j.properties.timeseries;
  const days = new Map();
  ts.forEach((e, i) => {
    const t = new Date(e.time), d = ymd(t);
    if (d < HOY) return;
    const nx = ts[i + 1] ? (new Date(ts[i + 1].time) - t) / 36e5 : 6;
    const det = e.data.instant.details;
    const o = days.get(d) || { lo: 99, hi: -99, r: 0, hum: [], wind: [], gust: 0 };
    o.lo = Math.min(o.lo, det.air_temperature); o.hi = Math.max(o.hi, det.air_temperature);
    if (e.data.next_1_hours && nx <= 1.01) o.r += e.data.next_1_hours.details.precipitation_amount || 0;
    else if (e.data.next_6_hours && nx >= 5.9) o.r += e.data.next_6_hours.details.precipitation_amount || 0;
    else if (e.data.next_1_hours) o.r += (e.data.next_1_hours.details.precipitation_amount || 0) * nx;
    o.hum.push(det.relative_humidity); o.wind.push(det.wind_speed * 3.6); o.gust = Math.max(o.gust, det.wind_speed * 3.6);
    days.set(d, o);
  });
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  return [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, 10).filter(([, o]) => o.hum.length >= 2).map(([d, o]) => ({
    d, lo: +o.lo.toFixed(1), hi: +o.hi.toFixed(1), r: +o.r.toFixed(1), hum: Math.round(avg(o.hum)), wind: Math.round(avg(o.wind)), gust: Math.round(o.gust),
  }));
}

async function main() {
  const obs = await meteocat();
  if (Object.keys(obs.stations).length < 120) throw new Error("Pocas estaciones de Meteocat: " + Object.keys(obs.stations).length);
  const sites = {};
  const SITES = model.SITES;
  for (let i = 0; i < SITES.length; i += 6) {
    await Promise.all(SITES.slice(i, i + 6).map(async (s) => {
      try { const fc = await metno(s); if (fc.length >= 7) sites[s.id] = { fc }; } catch (e) { console.warn("met.no", s.id, e.message); }
    }));
    await sleep(400);
  }
  // zonas sin previsión: la de la más cercana (la página corrige por altura)
  for (const s of SITES) {
    const code = ZST[s.id]; const so = code && obs.stations[code];
    if (!sites[s.id]) {
      let best = null, bd = 1e9;
      for (const z of SITES) if (sites[z.id] && z.id !== s.id) { const d = Math.hypot(z.lat - s.lat, (z.lon - s.lon) * 0.75); if (d < bd) { bd = d; best = z; } }
      if (!best) continue; sites[s.id] = { fc: sites[best.id].fc };
    }
    Object.assign(sites[s.id], { r21: so ? so[0] : 0, r7: so ? so[1] : 0, t: so ? so[2] : null });
  }
  const n = Object.keys(sites).length;
  if (n < SITES.length * 0.8) throw new Error("Previsión incompleta: " + n + " zonas");
  const data = { updatedAt: NOW.toISOString(), obsUntil: obs.obsUntil, sites, stations: obs.stations, season: { daily: obs.daily.map(([d, v]) => [d, +(+v).toFixed(2)]) } };
  const dir = path.join(ROOT, "data");
  fs.writeFileSync(path.join(dir, "forecast.json"), JSON.stringify(data));

  // historial: nota de hoy de cada zona (últimos 120 días)
  const scores = {};
  const outlook = { updatedAt: data.updatedAt, days: [], z: {} };
  const errs = {};
  for (const s of SITES) {
    try {
      const r = model.computeSite(s, model.zoneWeather(s, data), 0);
      if (r[0]) scores[s.id] = r[0].score;
      if (!outlook.days.length) outlook.days = r.map((x) => x.d);
      outlook.z[s.id] = r.map((x) => x.score);
    } catch (e) { errs[e.message] = (errs[e.message] || 0) + 1; }
  }
  // Si el modelo falla en muchas zonas, mejor que la acción falle y avise por correo que guardar un historial vacío
  if (Object.keys(scores).length < SITES.length * 0.8) throw new Error("Notas incompletas (" + Object.keys(scores).length + " zonas): " + JSON.stringify(errs));
  fs.writeFileSync(path.join(dir, "outlook.json"), JSON.stringify(outlook));
  const hp = path.join(dir, "history.json");
  let hist = []; try { hist = JSON.parse(fs.readFileSync(hp, "utf8")); } catch (e) {}
  hist = hist.filter((h) => h.d !== HOY); hist.push({ d: HOY, scores }); hist.sort((a, b) => a.d.localeCompare(b.d));
  fs.writeFileSync(hp, JSON.stringify(hist.slice(-120)));
  const top = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => k + " " + v).join(", ");
  // páginas de cada zona para Google (zona/<id>/index.html) y sitemap.xml
  try { const { buildZonePages } = await import("./zone-pages.mjs"); buildZonePages(ROOT, model, outlook, hist); } catch (e) { console.warn("páginas de zona:", e.message); }
  console.log(`OK ${HOY}: ${n} zonas, ${Object.keys(obs.stations).length} estaciones, observado hasta ${obs.obsUntil}. Mejores: ${top}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
