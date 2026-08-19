/** לקוח בדיקות מינימלי מעל WebSocket מקורי, באותו פרוטוקול של הדפדפן. */
export function connect(base) {
  const ws = new WebSocket(`${base.replace(/^http/, 'ws')}/ws`);
  const c = {
    ws, state: null, rid: 0, waiting: new Map(),
    call(t, payload = {}) {
      const rid = ++c.rid;
      return new Promise((resolve) => {
        const timer = setTimeout(() => { c.waiting.delete(rid); resolve({ ok: false, reason: 'timeout' }); }, 8000);
        c.waiting.set(rid, { resolve, timer });
        ws.send(JSON.stringify({ t, ...payload, rid }));
      });
    },
    close() { try { ws.close(); } catch { /* ignore */ } },
  };
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.t === 'state') c.state = msg.state;
    else if (msg.t === 'ack' && c.waiting.has(msg.rid)) {
      const { resolve, timer } = c.waiting.get(msg.rid);
      clearTimeout(timer); c.waiting.delete(msg.rid);
      const { t, rid, ...rest } = msg;
      resolve(rest);
    }
  });
  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => resolve(c));
    ws.addEventListener('error', reject);
  });
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
