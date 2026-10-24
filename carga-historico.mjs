import { loadDays, saveDays, fetchDay, todayMadrid, addDays } from "../lib/archivo.mjs";

const LOTE = 5; // días por llamada (la página espera entre lotes: límite WU 30 llamadas/min)

export default async (req) => {
  const u = new URL(req.url);
  if (!process.env.ADMIN_KEY || u.searchParams.get("key") !== process.env.ADMIN_KEY)
    return Response.json({ error: "Clave de administración incorrecta" }, { status: 401 });

  const start = u.searchParams.get("start") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return Response.json({ error: "Fecha de inicio inválida" }, { status: 400 });

  const days = await loadDays();
  const yesterday = addDays(todayMadrid(), -1);
  const pending = [];
  for (let d = start; d <= yesterday; d = addDays(d, 1)) if (!days[d]) pending.push(d);

  let done = 0, limit = false, error = null;
  for (const d of pending.slice(0, LOTE)) {
    try { days[d] = await fetchDay(d); done++; }
    catch (e) { if (e.message === "LIMITE") limit = true; else error = e.message; break; }
  }
  if (done) await saveDays(days);

  const total = Object.keys(days).length;
  const withData = Object.values(days).filter(v => !v.empty).length;
  return Response.json({ done, remaining: pending.length - done, limit, error, total, withData,
    last: pending[done - 1] || null });
};
