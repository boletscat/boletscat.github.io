// Boletaire – avisos al móvil (notificaciones web).
// GET                         -> { key }  clave pública VAPID para suscribirse
// POST {action:"sub", sub, zones, min, lang}   guarda o actualiza la suscripción
// POST {action:"unsub", endpoint}              la borra
// POST {action:"test", endpoint}               manda un aviso de prueba a ese móvil (como mucho 1 cada 10 min)
// POST {action:"daily", key}                   lo llama pg_cron cada mañana: avisa de las zonas que superan el umbral
// Las claves VAPID se crean solas la primera vez y se guardan en public.push_config (solo accesible con la service role).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SITE = "https://boletscat.github.io";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

async function cfg(k: string) { const { data } = await db.from("push_config").select("v").eq("k", k).maybeSingle(); return data?.v as string | undefined; }
async function vapid() {
  let pub = await cfg("vapid_public"), priv = await cfg("vapid_private");
  if (!pub || !priv) {
    const k = webpush.generateVAPIDKeys(); pub = k.publicKey; priv = k.privateKey;
    await db.from("push_config").upsert([{ k: "vapid_public", v: pub }, { k: "vapid_private", v: priv }], { onConflict: "k", ignoreDuplicates: true });
    pub = (await cfg("vapid_public"))!; priv = (await cfg("vapid_private"))!;   // por si otra llamada las creó a la vez
  }
  webpush.setVapidDetails("mailto:avisos@boletscat.github.io", pub, priv);
  return pub;
}

const ZONE_RE = /^[a-z0-9]{2,24}$/;
const DOW_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DOW_CA = ["diumenge", "dilluns", "dimarts", "dimecres", "dijous", "divendres", "dissabte"];
const dayName = (iso: string, i: number, ca: boolean) => i === 0 ? (ca ? "avui" : "hoy") : i === 1 ? (ca ? "demà" : "mañana") : (ca ? DOW_CA : DOW_ES)[new Date(iso + "T12:00:00Z").getUTCDay()];

async function send(row: { endpoint: string; p256dh: string; auth: string }, payload: Record<string, unknown>) {
  try {
    await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify(payload), { TTL: 6 * 3600, urgency: "normal" });
    return "ok";
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) { await db.from("push_subs").delete().eq("endpoint", row.endpoint); return "gone"; }
    return "err";
  }
}

async function daily() {
  const r = await fetch(SITE + "/data/outlook.json?t=" + Date.now()); if (!r.ok) return { error: "sin previsión" };
  const out = await r.json() as { days: string[]; z: Record<string, number[]> };
  const names = await fetch(SITE + "/data/zones.json?t=" + Date.now()).then((x) => x.ok ? x.json() : {}).catch(() => ({})) as Record<string, string>;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
  const { data: subs } = await db.from("push_subs").select("*").limit(5000);
  let sent = 0, gone = 0;
  for (const s of subs || []) {
    if (s.last_sent === today) continue;
    const ca = s.lang === "ca", min = s.min || 70;
    let best: { z: string; i: number; v: number } | null = null;
    for (const z of (s.zones || []) as string[]) {
      const sc = out.z[z]; if (!sc) continue;
      for (let i = 0; i < Math.min(7, sc.length); i++) if (sc[i] >= min && (!best || sc[i] > best.v || (sc[i] === best.v && i < best.i))) best = { z, i, v: sc[i] };
    }
    if (!best) continue;
    const zn = (names[best.z] || best.z).split(" – ")[0];
    const msg = `${best.z}|${out.days[best.i]}|${best.v}`;
    if (msg === s.last_msg) continue;   // no repetir el mismo aviso día tras día
    const when = dayName(out.days[best.i], best.i, ca);
    const title = ca ? `${zn}: ${best.v} ${when}` : `${zn}: ${best.v} ${when}`;
    const body = ca ? `Bon dia per anar a buscar bolets${best.i ? " " + when : ""}. Toca per veure on buscar i on aparcar.` : `Buen día para ir a por setas${best.i ? " el " + when : ""}. Toca para ver dónde buscar y dónde aparcar.`;
    const res = await send(s, { title, body, url: `/?z=${best.z}&d=${best.i}`, tag: "boletaire-" + best.z });
    if (res === "ok") { sent++; await db.from("push_subs").update({ last_sent: today, last_msg: msg }).eq("endpoint", s.endpoint); }
    else if (res === "gone") gone++;
  }
  return { sent, gone, total: subs?.length || 0 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const key = await vapid();
    if (req.method === "GET") return json({ key });
    const b = await req.json().catch(() => ({}));
    if (b.action === "sub") {
      const sub = b.sub || {}; const ep = String(sub.endpoint || "");
      if (!/^https:\/\/[^\s]{10,600}$/.test(ep) || !sub.keys?.p256dh || !sub.keys?.auth) return json({ error: "suscripción no válida" }, 400);
      const zones = (Array.isArray(b.zones) ? b.zones : []).filter((z: unknown) => typeof z === "string" && ZONE_RE.test(z)).slice(0, 20);
      const min = [60, 70, 80, 90].includes(+b.min) ? +b.min : 70;
      const { error } = await db.from("push_subs").upsert({ endpoint: ep, p256dh: String(sub.keys.p256dh).slice(0, 200), auth: String(sub.keys.auth).slice(0, 100), zones, min, lang: b.lang === "ca" ? "ca" : "es", updated_at: new Date().toISOString() }, { onConflict: "endpoint" });
      return error ? json({ error: error.message }, 500) : json({ ok: true, zones: zones.length });
    }
    if (b.action === "unsub") { await db.from("push_subs").delete().eq("endpoint", String(b.endpoint || "")); return json({ ok: true }); }
    if (b.action === "test") {
      const { data: s } = await db.from("push_subs").select("*").eq("endpoint", String(b.endpoint || "")).maybeSingle();
      if (!s) return json({ error: "no suscrito" }, 404);
      if (s.last_test && Date.now() - new Date(s.last_test).getTime() < 10 * 60e3) return json({ error: "espera unos minutos" }, 429);
      await db.from("push_subs").update({ last_test: new Date().toISOString() }).eq("endpoint", s.endpoint);
      const ca = s.lang === "ca";
      const r = await send(s, { title: ca ? "Avisos activats 🍄" : "Avisos activados 🍄", body: ca ? "Et direm quan una de les teves zones passi de " + s.min + "." : "Te avisaremos cuando una de tus zonas pase de " + s.min + ".", url: "/" });
      return json({ ok: r === "ok" });
    }
    if (b.action === "daily") {
      if (!b.key || b.key !== await cfg("cron_key")) return json({ error: "no autorizado" }, 403);
      return json(await daily());
    }
    return json({ error: "acción desconocida" }, 400);
  } catch (e) { return json({ error: String((e as Error).message || e) }, 500); }
});
