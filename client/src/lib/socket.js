import { useEffect, useState } from 'react';

/**
 * חיבור זמן־אמת מעל WebSocket מקורי (Cloudflare Durable Object).
 * מתחבר מחדש לבד, משדר hello בכל חיבור, וממפה בקשה→תשובה לפי rid.
 */

const TOKEN_KEY = 'z2h.participant';
const ADMIN_TOKEN_KEY = 'z2h.adminToken';

export function readToken() {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); } catch { return null; }
}
export function writeToken(v) {
  try { localStorage.setItem(TOKEN_KEY, JSON.stringify(v)); } catch { /* מצב פרטי */ }
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

/** אסימון מנחה אטום. המפתח עצמו לעולם אינו מגיע ללקוח. */
export function writeAdminToken(token) {
  try { sessionStorage.setItem(ADMIN_TOKEN_KEY, token); } catch { /* ignore */ }
}
export function readAdminToken() {
  try { return sessionStorage.getItem(ADMIN_TOKEN_KEY); } catch { return null; }
}
export function clearAdminToken() {
  try { sessionStorage.removeItem(ADMIN_TOKEN_KEY); } catch { /* ignore */ }
}

function wsURL() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}

class Connection {
  constructor() {
    this.ws = null;
    this.rid = 0;
    this.waiting = new Map();
    this.outbox = [];                 // בקשות שנוצרו לפני שהחיבור נפתח
    this.stateHandlers = new Set();
    this.statusHandlers = new Set();
    this.hello = null;
    this.retry = 0;
    this.closed = false;
    this.connect();
    // חיבור שנרדם ברקע בטלפון מתעורר מיד עם החזרה למסך
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.ws?.readyState !== WebSocket.OPEN) this.connect();
    });
    window.addEventListener('online', () => this.connect());
  }

  connect() {
    if (this.closed) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    clearTimeout(this.retryTimer);

    let ws;
    try { ws = new WebSocket(wsURL()); } catch { return this.scheduleRetry(); }
    this.ws = ws;

    ws.onopen = () => {
      this.retry = 0;
      this.emitStatus(true);
      if (this.hello) this.send({ t: 'hello', ...this.hello });
      // בקשות שנוצרו בזמן טעינת הדף נשלחות ברגע שהחיבור קם
      const queued = this.outbox.splice(0);
      for (const msg of queued) this.send(msg);
      this.keepAlive = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'ping' }));
      }, 25000);
    };

    ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      if (msg.t === 'state') {
        for (const h of this.stateHandlers) h(msg.state);
      } else if (msg.t === 'ack' && this.waiting.has(msg.rid)) {
        const { resolve, timer } = this.waiting.get(msg.rid);
        clearTimeout(timer);
        this.waiting.delete(msg.rid);
        const { t, rid, ...rest } = msg;
        resolve(rest);
      }
    };

    const down = () => {
      clearInterval(this.keepAlive);
      this.emitStatus(false);
      this.scheduleRetry();
    };
    ws.onclose = down;
    ws.onerror = () => { try { ws.close(); } catch { /* ignore */ } };
    return undefined;
  }

  scheduleRetry() {
    if (this.closed) return;
    this.retry = Math.min(this.retry + 1, 6);
    const delay = Math.min(400 * 2 ** (this.retry - 1), 5000);
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.connect(), delay);
  }

  emitStatus(up) { for (const h of this.statusHandlers) h(up); }

  setHello(payload) {
    this.hello = payload;
    if (this.ws?.readyState === WebSocket.OPEN) this.send({ t: 'hello', ...payload });
  }

  send(obj) {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(obj));
    return true;
  }

  request(obj, timeoutMs = 8000) {
    return new Promise((resolve) => {
      const rid = ++this.rid;
      const timer = setTimeout(() => {
        this.waiting.delete(rid);
        resolve({ ok: false, reason: 'timeout' });
      }, timeoutMs);
      this.waiting.set(rid, { resolve, timer });
      const msg = { ...obj, rid };
      // אם החיבור עוד לא נפתח — ממתינים לו במקום להיכשל מיד. ה־timeout
      // עדיין חוסם. זה קורה בכל טעינת דף, שם ה־socket עוד ב־CONNECTING.
      if (!this.send(msg)) this.outbox.push(msg);
    });
  }

  onState(fn) { this.stateHandlers.add(fn); return () => this.stateHandlers.delete(fn); }
  onStatus(fn) { this.statusHandlers.add(fn); return () => this.statusHandlers.delete(fn); }
  get connected() { return this.ws?.readyState === WebSocket.OPEN; }
}

export const connection = new Connection();

/** מנוי על מצב השרת עבור תפקיד מסוים. */
export function useServerState(role, helloPayload = {}) {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(connection.connected);
  const { token, sessionId } = helloPayload;

  useEffect(() => {
    // ה־open עשוי היה לקרות עוד לפני שהרכיב עלה — מסנכרנים כדי לא להציג
    // "אין חיבור" על חיבור תקין.
    setConnected(connection.connected);
    const offState = connection.onState(setState);
    const offStatus = connection.onStatus(setConnected);
    return () => { offState(); offStatus(); };
  }, []);

  // ה־hello חייב להתעדכן ברגע שהמשתתף מקבל מזהה, אחרת חיבור מחדש
  // (טלפון שנרדם, מעבר בין רשתות) יישלח בלי הזיהוי והמשתתף ייזרק
  // חזרה למסך הקוד — ואחרי נעילת הלובי הוא לא יוכל לחזור.
  useEffect(() => {
    if (role) connection.setHello({ role, token, sessionId });
  }, [role, token, sessionId]);

  return { state, connected, setState };
}

export function emit(event, payload = {}) {
  if (event === 'join') return connection.request({ t: 'join', ...payload });
  if (event === 'submit') return connection.request({ t: 'submit', ...payload });
  if (event === 'leave') return connection.request({ t: 'leave', ...payload });
  if (event === 'admin:auth') return connection.request({ t: 'adminAuth', ...payload });
  if (event === 'admin:cmd') return connection.request({ t: 'adminCmd', ...payload });
  return Promise.resolve({ ok: false, reason: 'unknown-event' });
}
