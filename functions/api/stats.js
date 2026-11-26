// RYOさん専用の集計。合言葉（鍵）がないと何も返さない。
async function sha256(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join('');
}
function jstDay(ms) {
  return new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
});

export async function onRequestGet({ request, env }) {
  const key = request.headers.get('X-Key') || '';
  const row = await env.DB.prepare("SELECT v FROM config WHERE k = 'keyhash'").first();
  if (!key || !row || (await sha256(key)) !== row.v) return json({ error: 'forbidden' }, 403);

  const url = new URL(request.url);
  const days = Math.max(0, Math.min(365, parseInt(url.searchParams.get('days') || '7', 10) || 0));
  const now = Date.now();
  const since = days === 0 ? '0000-00-00' : jstDay(now - (days - 1) * 86400000);
  const chartSince = jstDay(now - 29 * 86400000);
  const db = env.DB;

  const [tot, daily, pages, refs, devs, live, stay] = await db.batch([
    db.prepare("SELECT COUNT(*) pv, COUNT(DISTINCT sid) visits, COALESCE(SUM(sec),0) tsec, SUM(CASE WHEN sec > 0 THEN 1 ELSE 0 END) nsec FROM views WHERE day >= ?").bind(since),
    db.prepare("SELECT day, COUNT(*) pv, COUNT(DISTINCT sid) visits, COALESCE(SUM(sec),0) tsec FROM views WHERE day >= ? GROUP BY day ORDER BY day").bind(chartSince),
    db.prepare("SELECT path, COUNT(*) pv, COUNT(DISTINCT sid) visits, COALESCE(AVG(NULLIF(sec,0)),0) avgsec FROM views WHERE day >= ? GROUP BY path ORDER BY pv DESC LIMIT 60").bind(since),
    db.prepare("SELECT ref, COUNT(DISTINCT sid) visits FROM views WHERE day >= ? AND ref != '' GROUP BY ref ORDER BY visits DESC LIMIT 15").bind(since),
    db.prepare("SELECT dev, COUNT(DISTINCT sid) visits FROM views WHERE day >= ? GROUP BY dev").bind(since),
    db.prepare("SELECT COUNT(DISTINCT sid) n FROM views WHERE last > ?").bind(now - 5 * 60000),
    db.prepare("SELECT b, COUNT(*) n FROM (SELECT CASE WHEN t < 10 THEN 0 WHEN t < 60 THEN 1 WHEN t < 180 THEN 2 WHEN t < 600 THEN 3 ELSE 4 END b FROM (SELECT sid, SUM(sec) t FROM views WHERE day >= ? GROUP BY sid)) GROUP BY b").bind(since),
  ]);

  return json({
    days, since, today: jstDay(now),
    totals: tot.results[0],
    daily: daily.results,
    pages: pages.results,
    refs: refs.results,
    devices: devs.results,
    live: live.results[0].n,
    stay: stay.results,
  });
}
