import { connect, wait } from './ws-client.mjs';
const URL = process.env.APP || 'http://localhost:3011';
const ADMIN_KEY = process.env.ADMIN_KEY || 'testkey';
const log = (...a) => console.log(...a);
let fails = 0;
const check = (name, cond, extra = '') => { log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' :: ' + extra : ''}`); if (!cond) fails++; };

const admin = await connect(URL);
check('admin auth ok', (await admin.call('adminAuth', { key: ADMIN_KEY })).ok);
const stranger = await connect(URL);
check('admin auth rejects bad key', !(await stranger.call('adminAuth', { key: 'nope' })).ok);
stranger.close();
await wait(150);
const code = admin.state.code;
log('   code =', code);

// ── join ──
const ps = [];
for (let i = 0; i < 5; i++) {
  const s = await connect(URL);
  const res = await s.call('join', { code });
  s.pid = res.pid; s.sid = res.sessionId;
  ps.push(s);
}
check('5 participants joined', ps.every((p) => p.pid));
const badCode = await connect(URL);
check('bad code rejected', (await badCode.call('join', { code: 'ZZZZ' })).reason === 'bad-code');
badCode.close();
await wait(150);
check('admin sees 5 participants', admin.state.participants === 5, `got ${admin.state.participants}`);

// ── start locks lobby ──
await admin.call('adminCmd', { type: 'start' });
await wait(150);
check('status running', admin.state.status === 'running');
const late = await connect(URL);
check('late join blocked', (await late.call('join', { code })).reason === 'locked');
late.close();

// ── reconnect of a known participant ──
const re = await connect(URL);
const rej = await re.call('join', { code: 'WRONG', token: ps[0].pid, sessionId: ps[0].sid });
check('reconnect after lock allowed (even w/ wrong code)', rej.ok && rej.reconnected && rej.pid === ps[0].pid);

// ── beat applied ──
check('opening picture has 3 strips', admin.state.board.strips.length === 3, JSON.stringify(admin.state.board.strips.map(s=>s.id)));
check('current label', admin.state.current?.label === 'תמונת פתיחה', admin.state.current?.label);
check('next is a question', admin.state.next?.kind === 'question');

// ── question flow ──
await admin.call('adminCmd', { type: 'advance' });
await wait(120);
check('q1 open', admin.state.question?.id === 'q1' && admin.state.question.status === 'open');
check('cannot advance while open', admin.state.canAdvance === false);
const adv = await admin.call('adminCmd', { type: 'advance' });
await wait(100);
check('advance is a no-op while question open', admin.state.question?.id === 'q1', JSON.stringify(adv));

check('submit ok', (await ps[0].call('submit', { qid: 'q1', value: 7 })).ok);
check('second submit rejected (immutable)', (await ps[0].call('submit', { qid: 'q1', value: 3 })).reason === 'already');
check('out-of-range rejected', (await ps[1].call('submit', { qid: 'q1', value: 11 })).reason === 'invalid');
check('valid after invalid', (await ps[1].call('submit', { qid: 'q1', value: 2 })).ok);
await wait(150);
check('admin counts 2/5', admin.state.counts.answered === 2 && admin.state.counts.total === 5, JSON.stringify(admin.state.counts));
check('admin sees distribution', admin.state.stats.dist[6] === 1 && admin.state.stats.dist[1] === 1, JSON.stringify(admin.state.stats));
check('admin sees average', admin.state.stats.avg === 4.5, String(admin.state.stats.avg));
check('participant sees own answer only', ps[0].state.question.myAnswer === 7 && ps[0].state.question.counts === undefined);
check('participant gets no results', ps[0].state.results === undefined && ps[0].state.stats === undefined);

await admin.call('adminCmd', { type: 'closeQuestion' });
await wait(120);
check('question closed', admin.state.question.status === 'closed');
check('submit after close rejected', (await ps[2].call('submit', { qid: 'q1', value: 5 })).reason === 'closed');
check('no auto-reveal', admin.state.question.status !== 'revealed');
await admin.call('adminCmd', { type: 'advance' });
await wait(120);
check('advanced past question', admin.state.question === null && admin.state.current?.stage === 's2');

admin.close(); ps.forEach((p) => p.close()); re.close();
log(fails ? `\n${fails} FAILURES` : '\nALL PASS');
process.exit(fails ? 1 : 0);
