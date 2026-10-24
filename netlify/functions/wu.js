// Proxy seguro hacia Weather Underground
// Variables de entorno en Netlify: WU_API_KEY y WU_STATION_ID
const ALLOWED = {
  current:  "v2/pws/observations/current",
  day:      "v2/pws/observations/all/1day",
  daily7:   "v2/pws/dailysummary/7day",
  history:  "v2/pws/history/daily",
  forecast: "v3/wx/forecast/daily/5day"
};
const GEOCODE = "42.789,-1.689"; // centro de Zizur Mayor, no la estación

const json = (code, obj, ttl = 0) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${ttl}` },
  body: JSON.stringify(obj)
});

exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    const path = ALLOWED[q.type];
    if (!path) return json(400, { error: "Tipo no permitido", tipo: q.type || null });

    const key = process.env.WU_API_KEY;
    const st = process.env.WU_STATION_ID;
    if (!key || !st) return json(500, {
      error: "Faltan variables de entorno",
      WU_API_KEY: key ? "OK" : "NO DISPONIBLE (revisa scope Functions)",
      WU_STATION_ID: st ? "OK" : "NO DISPONIBLE"
    });
    if (typeof fetch !== "function") return json(500, { error: "Node antiguo: falta fetch. Pon NODE_VERSION=20" });

    const p = new URLSearchParams({ format: "json", units: "m", apiKey: key });
    if (q.type === "forecast") { p.set("geocode", GEOCODE); p.set("language", "es-ES"); }
    else { p.set("stationId", st); p.set("numericPrecision", "decimal"); }
    if (q.type === "history") {
      if (!/^\d{8}$/.test(q.date || "")) return json(400, { error: "Fecha inválida (AAAAMMDD)" });
      p.set("date", q.date);
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(`https://api.weather.com/${path}?${p}`, { signal: ctrl.signal });
    clearTimeout(timer);

    const text = await r.text();
    if (r.status === 204 || !text) return json(200, {}, 60);
    if (!r.ok) return json(r.status, { error: "Weather Underground respondió con error", status: r.status, detalle: text.slice(0, 300) });

    const ttl = q.type === "history" ? 86400 : q.type === "forecast" ? 1800 : 120;
    return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${ttl}` }, body: text };
  } catch (e) {
    return json(500, { error: "Fallo en la función", detalle: String(e && e.message || e) });
  }
};
