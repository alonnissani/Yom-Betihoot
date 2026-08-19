import { io } from 'socket.io-client';
const URL = 'http://localhost:3011';
const mk = () => io(URL, { transports: ['websocket'] });
const call = (s, ev, p) => new Promise((r) => s.emit(ev, p, r));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
let fails = 0;
const check = (name, cond, extra = '') => { log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' :: ' + extra : ''}`); if (!cond) fails++; };

const admin = mk();
await new Promise((r) => admin.on('connect', r));
let adminState = null;
admin.on('state', (s) => { adminState = s; });
check('admin auth ok', (await call(admin, 'admin:auth', { key: 'testkey' })).ok);
check('admin auth rejects bad key', !(await call(mk(), 'admin:auth', { key: 'nope' })).ok);
await wait(120);
const code = adminState.code;
log('   code =', code);

// ── join ──
const ps = [];
for (let i = 0; i < 5; i++) {
  const s = mk();
  await new Promise((r) => s.on('connect', r));
  s.state = null; s.on('state', (v) => { s.state = v; });
  const res = await call(s, 'join', { code });
  s.pid = res.pid; s.sid = res.sessionId;
  ps.push(s);
}
check('5 participants joined', ps.every((p) => p.pid));
check('bad code rejected', (await call(mk(), 'join', { code: 'ZZZZ' })).reason === 'bad-code');
await wait(150);
check('admin sees 5 participants', adminState.participants === 5, `got ${adminState.participants}`);

// ── start locks lobby ──
await call(admin, 'admin:cmd', { type: 'start' });
await wait(150);
check('status running', adminState.status === 'running');
check('late join blocked', (await call(mk(), 'join', { code })).reason === 'locked');

// ── reconnect of a known participant ──
const re = mk();
await new Promise((r) => re.on('connect', r));
const rej = await call(re, 'join', { code: 'WRONG', token: ps[0].pid, sessionId: ps[0].sid });
check('reconnect after lock allowed (even w/ wrong code)', rej.ok && rej.reconnected && rej.pid === ps[0].pid);

// ── beat applied ──
check('opening picture has 3 strips', adminState.board.strips.length === 3, JSON.stringify(adminState.board.strips.map(s=>s.id)));
check('current label', adminState.current?.label === 'תמונת פתיחה', adminState.current?.label);
check('next is a question', adminState.next?.kind === 'question');

// ── question flow ──
await call(admin, 'admin:cmd', { type: 'advance' });
await wait(120);
check('q1 open', adminState.question?.id === 'q1' && adminState.question.status === 'open');
check('cannot advance while open', adminState.canAdvance === false);
const adv = await call(admin, 'admin:cmd', { type: 'advance' });
await wait(100);
check('advance is a no-op while question open', adminState.question?.id === 'q1', JSON.stringify(adv));

check('submit ok', (await call(ps[0], 'submit', { qid: 'q1', value: 7 })).ok);
check('second submit rejected (immutable)', (await call(ps[0], 'submit', { qid: 'q1', value: 3 })).reason === 'already');
check('out-of-range rejected', (await call(ps[1], 'submit', { qid: 'q1', value: 11 })).reason === 'invalid');
check('valid after invalid', (await call(ps[1], 'submit', { qid: 'q1', value: 2 })).ok);
await wait(150);
check('admin counts 2/5', adminState.counts.answered === 2 && adminState.counts.total === 5, JSON.stringify(adminState.counts));
check('admin sees distribution', adminState.stats.dist[6] === 1 && adminState.stats.dist[1] === 1, JSON.stringify(adminState.stats));
check('admin sees average', adminState.stats.avg === 4.5, String(adminState.stats.avg));
check('participant sees own answer only', ps[0].state.question.myAnswer === 7 && ps[0].state.question.counts === undefined);
check('participant gets no results', ps[0].state.results === undefined && ps[0].state.stats === undefined);

await call(admin, 'admin:cmd', { type: 'closeQuestion' });
await wait(120);
check('question closed', adminState.question.status === 'closed');
check('submit after close rejected', (await call(ps[2], 'submit', { qid: 'q1', value: 5 })).reason === 'closed');
check('no auto-reveal', adminState.question.status !== 'revealed');
await call(admin, 'admin:cmd', { type: 'advance' });
await wait(120);
check('advanced past question', adminState.question === null && adminState.current?.stage === 's2');

admin.close(); ps.forEach((p) => p.close()); re.close();
log(fails ? `\n${fails} FAILURES` : '\nALL PASS');
process.exit(fails ? 1 : 0);
