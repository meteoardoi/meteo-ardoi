// Utilidades compartidas del archivo histórico (Netlify Blobs)
import { getStore } from "@netlify/blobs";

const store = () => getStore("meteo");

export async function loadDays() {
  return (await store().get("days", { type: "json" })) || {};
}
export async function saveDays(days) {
  await store().setJSON("days", days);
}

// Fecha de hoy en Madrid (YYYY-MM-DD)
export function todayMadrid() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
}
export function addDays(iso, n) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Descarga el resumen de un día de Weather Underground
export async function fetchDay(iso) {
  const p = new URLSearchParams({
    stationId: process.env.WU_STATION_ID, format: "json", units: "m",
    numericPrecision: "decimal", date: iso.replace(/-/g, ""), apiKey: process.env.WU_API_KEY
  });
  const r = await fetch("https://api.weather.com/v2/pws/history/daily?" + p.toString());
  if (r.status === 429) throw new Error("LIMITE");
  if (r.status === 204) return { empty: true };
  if (!r.ok) throw new Error("HTTP " + r.status);
  const t = await r.text();
  if (!t) return { empty: true };
  const obs = (JSON.parse(t).observations || [])[0];
  if (!obs || !obs.metric) return { empty: true };
  const m = obs.metric;
  return {
    tmax: m.tempHigh, tmin: m.tempLow, tavg: m.tempAvg,
    hmax: obs.humidityHigh, hmin: obs.humidityLow, havg: obs.humidityAvg,
    gust: m.windgustHigh, wavg: m.windspeedAvg, rain: m.precipTotal
  };
}
