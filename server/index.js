import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import { Engine } from './session.js';
import { saveSession, listSessions, readSession } from './storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'ramon2026';

const app = express();
app.use(express.json({ limit: '256kb' }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });

// ─── שידור ───────────────────────────────────────────────────────────────────

let pending = false;
function broadcast() {
  if (pending) return;
  pending = true;
  setImmediate(() => {
    pending = false;
    const liveView = engine.viewFor('live');
    const adminView = engine.viewFor('admin');
    io.to('live').emit('state', liveView);
    io.to('admin').emit('state', adminView);
    for (const [, socket] of io.of('/').sockets) {
      if (socket.data.role !== 'participant') continue;
      socket.emit('state', engine.viewFor('participant', socket.data.pid));
    }
  });
}

const engine = new Engine(broadcast);

// ─── API ─────────────────────────────────────────────────────────────────────

function requireAdmin(req, res, next) {
  const key = req.get('x-admin-key') || req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).json({ error: 'unauthorized' });
  return next();
}

app.get('/api/health', (_req, res) => res.json({ ok: true, mode: engine.active }));

app.get('/api/report/current', requireAdmin, (_req, res) => res.json(engine.exportRecord()));
app.get('/api/sessions', requireAdmin, (_req, res) => res.json(listSessions()));
app.get('/api/sessions/:id', requireAdmin, (req, res) => {
  const rec = readSession(req.params.id);
  if (!rec) return res.status(404).json({ error: 'not-found' });
  return res.json(rec);
});

// ─── Socket ──────────────────────────────────────────────────────────────────

const ADMIN_COMMANDS = {
  start: (e) => e.start(),
  advance: (e) => e.advance(),
  closeQuestion: (e) => e.closeQuestion(),
  revealQuestion: (e) => e.revealQuestion(),
  hideReveal: (e) => e.hideQuestionReveal(),
  back: (e) => e.back(),
  regenerateCode: (e) => e.regenerateCode(),
  setMode: (e, p) => e.setMode(p?.mode),
  resetSession: (e) => e.resetSession(),
  endSession: (e) => {
    const record = e.endSession();
    const file = saveSession(record);
    return { saved: !!file };
  },
};

io.on('connection', (socket) => {
  socket.data.role = null;

  socket.on('hello', (payload = {}, ack) => {
    const role = payload.role;
    if (role === 'live') {
      socket.data.role = 'live';
      socket.join('live');
      socket.emit('state', engine.viewFor('live'));
    } else if (role === 'participant') {
      socket.data.role = 'participant';
      const { token, sessionId } = payload;
      const s = engine.s;
      if (token && sessionId === s.id && s.participants[token]) {
        socket.data.pid = token;
        engine.setConnected(token, true);
      }
      socket.emit('state', engine.viewFor('participant', socket.data.pid));
    }
    ack?.({ ok: true });
  });

  socket.on('join', (payload = {}, ack) => {
    const result = engine.join(payload);
    if (result.ok) {
      socket.data.role = 'participant';
      socket.data.pid = result.pid;
      socket.emit('state', engine.viewFor('participant', result.pid));
    }
    ack?.(result);
  });

  socket.on('submit', (payload = {}, ack) => {
    const pid = socket.data.pid;
    if (!pid) return ack?.({ ok: false, reason: 'unknown' });
    const result = engine.submit({ pid, qid: payload.qid, value: payload.value });
    socket.emit('state', engine.viewFor('participant', pid));
    return ack?.(result);
  });

  socket.on('admin:auth', (payload = {}, ack) => {
    if (payload.key !== ADMIN_KEY) return ack?.({ ok: false });
    socket.data.role = 'admin';
    socket.join('admin');
    socket.emit('state', engine.viewFor('admin'));
    return ack?.({ ok: true });
  });

  socket.on('admin:cmd', (payload = {}, ack) => {
    if (socket.data.role !== 'admin') return ack?.({ ok: false, reason: 'unauthorized' });
    const fn = ADMIN_COMMANDS[payload.type];
    if (!fn) return ack?.({ ok: false, reason: 'unknown-command' });
    const extra = fn(engine, payload.payload) || {};
    broadcast();
    return ack?.({ ok: true, ...extra });
  });

  socket.on('disconnect', () => {
    if (socket.data.role === 'participant' && socket.data.pid) {
      engine.setConnected(socket.data.pid, false);
    }
  });
});

// ─── סטטי ────────────────────────────────────────────────────────────────────

const DIST = path.join(ROOT, 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
} else {
  app.get('/', (_req, res) =>
    res.status(200).send('<h1 dir="rtl">הריצו npm run build (או npm run dev) כדי לבנות את הממשק.</h1>'));
}

server.listen(PORT, () => {
  console.log(`\n  מ־0 ל־100  ·  RAMON SAFETY DAY 2026`);
  console.log(`  משתתפים : http://localhost:${PORT}/`);
  console.log(`  מנחה     : http://localhost:${PORT}/admin`);
  console.log(`  הקרנה    : http://localhost:${PORT}/live`);
  console.log(`  קוד כניסה: ${engine.sessions.live.code}   ·   מפתח Admin: ${ADMIN_KEY}\n`);
});
