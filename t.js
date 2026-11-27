/* アクセス計測（Cookieなし・個人を特定する情報なし）
   記録するもの：見たページ（URLと見出し）、来た元のサイト名、スマホかPCか、画面に表示していた秒数。
   タブごとのランダムな番号はタブを閉じると消える。 */
(function () {
  try { if (localStorage.getItem('nz_notrack') === '1') return; } catch (e) {}
  var h = location.hostname;
  if (location.protocol === 'file:' || h === 'localhost' || h === '127.0.0.1' || /\.nennai-zemi\.pages\.dev$/.test(h)) return;
  if (/^\/stats(\/|$)/.test(location.pathname)) return;
  if (!window.crypto || !crypto.getRandomValues) return;

  function rid() {
    var a = new Uint8Array(16), s = '';
    crypto.getRandomValues(a);
    for (var i = 0; i < a.length; i++) s += (a[i] % 36).toString(36);
    return s;
  }
  var sid;
  try { sid = sessionStorage.getItem('nz_sid'); if (!sid) { sid = rid(); sessionStorage.setItem('nz_sid', sid); } } catch (e) { sid = rid(); }
  var id = rid(), ref = '';
  try { if (document.referrer) { var r = new URL(document.referrer); if (r.host !== location.host) ref = r.hostname; } } catch (e) {}
  var dev = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'm' : 'd';
  var URL_ = '/api/hit';

  function send(o, beacon) {
    var body = JSON.stringify(o);
    if (beacon && navigator.sendBeacon) { try { if (navigator.sendBeacon(URL_, body)) return; } catch (e) {} }
    try { fetch(URL_, { method: 'POST', body: body, keepalive: true }).catch(function () {}); } catch (e) {}
  }
  send({ t: 'v', id: id, sid: sid, p: location.pathname, r: ref, d: dev, ti: document.title });

  var acc = 0, start = document.visibilityState === 'hidden' ? 0 : Date.now(), lastSent = -1;
  function stop() { if (start) { acc += Date.now() - start; start = 0; } }
  function flush(beacon) {
    var s = Math.round((acc + (start ? Date.now() - start : 0)) / 1000);
    if (s === lastSent) return;
    lastSent = s;
    send({ t: 's', id: id, s: s }, beacon);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { stop(); flush(true); }
    else if (!start) { start = Date.now(); }
  });
  addEventListener('pagehide', function () { stop(); flush(true); });
  addEventListener('pageshow', function (e) { if (e.persisted && !start) start = Date.now(); });
  setInterval(function () { if (start) flush(false); }, 30000);
})();
