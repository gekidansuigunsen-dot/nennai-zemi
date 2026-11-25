// アクセス計測の受け口。Cookie なし・IP や端末情報は保存しない。
// 保存するのは「ページ」「来た元のサイト名」「スマホかPCか」「表示していた秒数」と、
// タブを閉じると消えるランダムな番号だけ。
const ID = /^[a-z0-9]{8,40}$/;
const MAX_SEC = 3600;

function jstDay(ms) {
  return new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function cleanPath(p) {
  p = String(p || '/').split(/[?#]/)[0].slice(0, 200);
  if (!p.startsWith('/')) p = '/' + p;
  p = p.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
  return p || '/';
}

export async function onRequestPost({ request, env }) {
  const ok = new Response(null, { status: 204 });
  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return ok;
  let b;
  try { b = JSON.parse((await request.text()).slice(0, 2000)); } catch { return ok; }
  if (!b || !ID.test(String(b.id))) return ok;
  const now = Date.now();
  try {
    if (b.t === 'v') {
      if (!ID.test(String(b.sid))) return ok;
      const ref = String(b.r || '').toLowerCase().replace(/[^a-z0-9.\-]/g, '').slice(0, 100);
      const dev = b.d === 'm' ? 'm' : 'd';
      await env.DB.prepare(
        'INSERT OR IGNORE INTO views (id, ts, last, day, path, sid, ref, dev, sec) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)'
      ).bind(b.id, now, now, jstDay(now), cleanPath(b.p), b.sid, ref, dev).run();
    } else if (b.t === 's') {
      const sec = Math.max(0, Math.min(MAX_SEC, Math.round(Number(b.s) || 0)));
      await env.DB.prepare(
        'UPDATE views SET sec = MAX(sec, ?), last = ? WHERE id = ? AND ts > ?'
      ).bind(sec, now, b.id, now - 6 * 3600 * 1000).run();
    }
  } catch (e) { /* 計測の失敗でサイトは止めない */ }
  return ok;
}
