/**
 * גשר מקומי אל ה־deployment החי.
 * הדפדפן בסביבה הזאת אינו יכול לצאת דרך ה־proxy, אז הבדיקות פונות
 * ל־localhost והגשר מעביר הכול — כולל WebSocket — אל ה־Worker האמיתי.
 */
import http from 'node:http';
import { WebSocketServer } from 'ws';

const ORIGIN = process.env.ORIGIN;
const PORT = Number(process.env.BRIDGE_PORT || 4599);
if (!ORIGIN) throw new Error('ORIGIN required');

const readBody = (req) => new Promise((resolve) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => resolve(chunks.length ? Buffer.concat(chunks) : undefined));
});

const server = http.createServer(async (req, res) => {
  try {
    const headers = { ...req.headers };
    delete headers.host; delete headers.connection; delete headers['accept-encoding'];
    const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req);
    const upstream = await fetch(ORIGIN + req.url, { method: req.method, headers, body, redirect: 'manual' });
    const out = {};
    for (const [k, v] of upstream.headers) {
      if (['content-encoding', 'transfer-encoding', 'content-length'].includes(k.toLowerCase())) continue;
      out[k] = v;
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, out);
    res.end(buf);
  } catch (e) {
    res.writeHead(502); res.end(String(e));
  }
});

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (client) => {
  const up = new WebSocket(`${ORIGIN.replace(/^http/, 'ws')}/ws`);
  const queue = [];
  up.addEventListener('open', () => { queue.splice(0).forEach((m) => up.send(m)); });
  up.addEventListener('message', (e) => { if (client.readyState === 1) client.send(e.data); });
  up.addEventListener('close', () => { try { client.close(); } catch { /* ignore */ } });
  up.addEventListener('error', () => { try { client.close(); } catch { /* ignore */ } });
  client.on('message', (d) => {
    const s = d.toString();
    if (up.readyState === 1) up.send(s); else queue.push(s);
  });
  client.on('close', () => { try { up.close(); } catch { /* ignore */ } });
});

server.listen(PORT, '127.0.0.1', () => console.log(`bridge ${PORT} -> ${ORIGIN}`));
