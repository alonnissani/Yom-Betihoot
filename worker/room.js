import { DurableObject } from 'cloudflare:workers';
import { Engine } from '../shared/engine.js';

const SNAPSHOT_KEY = 'engine:snapshot';

/**
 * SessionRoom — מופע יחיד שמחזיק את מצב הפעילות ואת כל החיבורים.
 * כל שינוי מייצר שידור מותאם לכל תפקיד: המשתתף, מסך ההקרנה והמנחה
 * מקבלים תצוגות נפרדות, כך שמידע שאסור להיחשף לא נשלח כלל.
 */
export class SessionRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    this.sockets = new Set();          // { ws, role, pid }
    this.pending = false;
    this.engine = new Engine(() => this.broadcast());

    ctx.blockConcurrencyWhile(async () => {
      const snapshot = await ctx.storage.get(SNAPSHOT_KEY);
      if (snapshot) this.engine.restore(snapshot);
    });
  }

  get adminKey() { return this.env.ADMIN_KEY || 'ramon2026'; }

  // ─── שידור ─────────────────────────────────────────────────────────────────

  broadcast() {
    if (this.pending) return;
    this.pending = true;
    queueMicrotask(() => {
      this.pending = false;
      let live = null;
      let admin = null;
      for (const c of this.sockets) {
        try {
          if (c.role === 'live') {
            live = live || JSON.stringify({ t: 'state', state: this.engine.viewFor('live') });
            c.ws.send(live);
          } else if (c.role === 'admin') {
            admin = admin || JSON.stringify({ t: 'state', state: this.engine.viewFor('admin') });
            c.ws.send(admin);
          } else if (c.role === 'participant') {
            c.ws.send(JSON.stringify({ t: 'state', state: this.engine.viewFor('participant', c.pid) }));
          }
        } catch { this.sockets.delete(c); }
      }
      this.persist();
    });
  }

  persist() {
    // שמירה עצלה: מספיקה כדי לשרוד הפעלה מחדש של ה־DO באמצע פעילות.
    if (this.saveQueued) return;
    this.saveQueued = true;
    this.ctx.waitUntil((async () => {
      await new Promise((r) => setTimeout(r, 400));
      this.saveQueued = false;
      try {
        await this.ctx.storage.put(SNAPSHOT_KEY, this.engine.serialize());
      } catch (e) { console.error('persist', e); }
    })());
  }

  sendTo(conn, payload) {
    try { conn.ws.send(JSON.stringify(payload)); } catch { this.sockets.delete(conn); }
  }

  pushState(conn) {
    if (conn.role === 'participant') {
      this.sendTo(conn, { t: 'state', state: this.engine.viewFor('participant', conn.pid) });
    } else if (conn.role) {
      this.sendTo(conn, { t: 'state', state: this.engine.viewFor(conn.role) });
    }
  }

  // ─── WebSocket ─────────────────────────────────────────────────────────────

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('expected websocket', { status: 426 });
      }
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      // accept() רגיל (ללא hibernation) — ה־DO נשאר חי כל עוד יש חיבורים,
      // כך שההשהיות הקצרות בתרחיש (MAYDAY, שכבות, בוטים) פועלות כמתוכנן.
      server.accept();
      const conn = { ws: server, role: null, pid: null };
      this.sockets.add(conn);

      server.addEventListener('message', (event) => {
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }
        try { this.handle(conn, msg); } catch (e) { console.error('handle', e); }
      });
      const drop = () => {
        this.sockets.delete(conn);
        if (conn.role === 'participant' && conn.pid) this.engine.setConnected(conn.pid, false);
      };
      server.addEventListener('close', drop);
      server.addEventListener('error', drop);

      return new Response(null, { status: 101, webSocket: client });
    }

    return this.api(request, url);
  }

  handle(conn, msg) {
    const ack = (payload) => { if (msg.rid) this.sendTo(conn, { t: 'ack', rid: msg.rid, ...payload }); };

    switch (msg.t) {
      case 'hello': {
        if (msg.role === 'live') {
          conn.role = 'live';
        } else if (msg.role === 'participant') {
          conn.role = 'participant';
          const s = this.engine.s;
          if (msg.token && msg.sessionId === s.id && s.participants[msg.token]) {
            conn.pid = msg.token;
            this.engine.setConnected(msg.token, true);
          }
        }
        this.pushState(conn);
        return ack({ ok: true });
      }
      case 'join': {
        const result = this.engine.join(msg);
        if (result.ok) {
          conn.role = 'participant';
          conn.pid = result.pid;
          this.pushState(conn);
        }
        return ack(result);
      }
      case 'leave': {
        const result = this.engine.leave(conn.pid);
        if (result.ok) conn.pid = null;
        this.pushState(conn);
        return ack(result);
      }
      case 'submit': {
        if (!conn.pid) return ack({ ok: false, reason: 'unknown' });
        const result = this.engine.submit({ pid: conn.pid, qid: msg.qid, value: msg.value });
        this.pushState(conn);
        return ack(result);
      }
      case 'adminAuth': {
        if (msg.key !== this.adminKey) return ack({ ok: false });
        conn.role = 'admin';
        this.pushState(conn);
        return ack({ ok: true });
      }
      case 'adminCmd': {
        if (conn.role !== 'admin') return ack({ ok: false, reason: 'unauthorized' });
        const extra = this.command(msg.type, msg.payload) || {};
        this.broadcast();
        return ack({ ok: true, ...extra });
      }
      case 'ping':
        return ack({ ok: true });
      default:
        return ack({ ok: false, reason: 'unknown-message' });
    }
  }

  command(type, payload) {
    const e = this.engine;
    switch (type) {
      case 'start': return e.start();
      case 'advance': return e.advance();
      case 'closeQuestion': return e.closeQuestion();
      case 'revealQuestion': return e.revealQuestion();
      case 'hideReveal': return e.hideQuestionReveal();
      case 'back': return e.back();
      case 'regenerateCode': return e.regenerateCode();
      case 'setMode': return e.setMode(payload?.mode);
      case 'resetSession': return e.resetSession();
      case 'endSession': {
        const record = e.endSession();
        if (record.mode !== 'rehearsal') {
          this.ctx.waitUntil(this.ctx.storage.put(`session:${record.id}`, record));
          return { saved: true };
        }
        return { saved: false };
      }
      default: return undefined;
    }
  }

  // ─── API לדוחות ────────────────────────────────────────────────────────────

  async api(request, url) {
    const key = request.headers.get('x-admin-key') || url.searchParams.get('key');
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

    if (url.pathname === '/api/health') return json({ ok: true, mode: this.engine.active });
    if (key !== this.adminKey) return json({ error: 'unauthorized' }, 401);

    if (url.pathname === '/api/report/current') return json(this.engine.exportRecord());

    if (url.pathname === '/api/sessions') {
      const map = await this.ctx.storage.list({ prefix: 'session:' });
      const out = [...map.values()]
        .map((r) => ({ id: r.id, label: r.label, startedAt: r.startedAt, endedAt: r.endedAt, participants: r.participantCount }))
        .sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
      return json(out);
    }

    const match = url.pathname.match(/^\/api\/sessions\/(.+)$/);
    if (match) {
      const rec = await this.ctx.storage.get(`session:${decodeURIComponent(match[1])}`);
      return rec ? json(rec) : json({ error: 'not-found' }, 404);
    }

    return json({ error: 'not-found' }, 404);
  }
}
