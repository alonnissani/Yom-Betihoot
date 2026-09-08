/**
 * סימולציה מלאה: ריצה אוטומטית מקצה לקצה על נתוני דמה.
 * הבדיקה מריצה במהירות המינימלית ומוודאת גם את ההתקדמות וגם את
 * ההפרדה מנתוני האמת — שהיא העיקר.
 */
import { connect, wait } from './ws-client.mjs';

const URL = process.env.APP || 'http://localhost:3011';
const ADMIN_KEY = process.env.ADMIN_KEY || 'testkey';
const log = (...a) => console.log(...a);
let fails = 0;
const check = (name, cond, extra = '') => {
  log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' :: ' + extra : ''}`);
  if (!cond) fails++;
};

const admin = await connect(URL);
await admin.call('adminAuth', { key: ADMIN_KEY });
// כל חבילת בדיקות מאתחלת את עצמה, כדי שסדר ההרצה לא ישפיע
await admin.call('adminCmd', { type: 'simStop' });
await admin.call('adminCmd', { type: 'setMode', payload: { mode: 'live' } });
await admin.call('adminCmd', { type: 'resetSession' });
await wait(250);

// ── נתוני אמת שחייבים לשרוד את הסימולציה ──
const real = await connect(URL);
const joined = await real.call('join', { code: admin.state.code });
check('real participant joined', joined.ok);
await wait(150);
check('live sees 1 real participant', admin.state.participants === 1, String(admin.state.participants));

// ── הפעלה ──
check('no simulation before it starts', admin.state.simulation === null);
await admin.call('adminCmd', { type: 'startSimulation', payload: { speed: 1000 } });
await wait(300);
const sim0 = admin.state.simulation;
check('simulation mode is on', admin.state.mode === 'simulation' && !!sim0);
check('20 dummy participants', admin.state.participants === 20, String(admin.state.participants));
check('real participant is not in the simulation', admin.state.participants === 20);
check('step counter reported', sim0.step >= 1 && sim0.steps > 20, JSON.stringify({ step: sim0.step, steps: sim0.steps }));
check('countdown reported', sim0.msLeft > 0 && sim0.msLeft <= 1000, String(sim0.msLeft));
check('the real device now shows the simulation board', real.state.mode === 'simulation');

// ── הצבעה נפתחת והתשובות נכנסות בהדרגה ──
let sawPartial = false;
let sawQuestion = false;
for (let i = 0; i < 40 && !sawPartial; i++) {
  await wait(120);
  const c = admin.state.counts;
  if (admin.state.question?.status === 'open') sawQuestion = true;
  if (c && c.answered > 0 && c.answered < c.total) sawPartial = true;
}
check('a question opened by itself', sawQuestion);
check('answers arrive gradually, not all at once', sawPartial);

// ── השהיה עוצרת גם את הקצב וגם את הבוטים ──
await admin.call('adminCmd', { type: 'simPause' });
await wait(200);
const frozen = JSON.stringify({ cursor: admin.state.cursor, answered: admin.state.counts?.answered });
check('paused flag set', admin.state.simulation.paused === true);
await wait(1400);
const stillFrozen = JSON.stringify({ cursor: admin.state.cursor, answered: admin.state.counts?.answered });
check('nothing moves while paused', frozen === stillFrozen, `${frozen} → ${stillFrozen}`);
await admin.call('adminCmd', { type: 'simResume' });
await wait(200);
check('resumed', admin.state.simulation.paused === false);

// ── ריצה עד הסוף ──
let sawReveal = false;
const deadline = Date.now() + 120000;
while (Date.now() < deadline && !admin.state.simulation?.done) {
  if (admin.state.question?.status === 'revealed') sawReveal = true;
  await wait(250);
}
const sim = admin.state.simulation;
check('simulation reached the end on its own', sim?.done === true, JSON.stringify(sim));
check('results were revealed automatically inside the simulation', sawReveal);
check('scenario ended', admin.state.status === 'ended');
check('closing screen reached', admin.state.reveal === 'closing');

// ── התשובות של הבוטים נראות כמו עשרים אנשים שונים ──
const report = await fetch(`${URL}/api/report/current?key=${ADMIN_KEY}`).then((r) => r.json());
check('report is marked as simulation data', report.mode === 'simulation');
const load = report.questions.filter((q) => q.track === 'load');
check('every load question was answered by all 20', load.every((q) => q.responded === 20),
  load.map((q) => `${q.id}:${q.responded}`).join(' '));
const curves = report.trajectories.map((t) => t.values.join(','));
check('20 trajectories', curves.length === 20, String(curves.length));
check('trajectories differ from each other', new Set(curves).size >= 15, `${new Set(curves).size} distinct`);
const first = load[0].average;
const last = load[load.length - 1].average;
check('load rises from the first stage to MAYDAY', last - first >= 3, `${first} → ${last}`);
const mayday = load[load.length - 1].distribution;
const high = mayday.slice(6).reduce((a, b) => a + b, 0);
check('most are high at MAYDAY', high >= 12, `${high}/20 at 7+`);
check('but not everyone is identical at MAYDAY', mayday.filter((n) => n > 0).length >= 3,
  JSON.stringify(mayday));
const timeline = report.questions.find((q) => q.id === 'qTimeline');
check('the change point is spread over several stages',
  timeline.distribution.filter((n) => n > 0).length >= 3, JSON.stringify(timeline.distribution));
const open = report.questions.find((q) => q.id === 'qOpen');
check('20 open answers, all different', open.answers.length === 20 && new Set(open.answers).size === 20,
  `${open.answers.length} answers, ${new Set(open.answers).size} distinct`);

// ── עצירה מוחקת הכול ומחזירה את הפעילות האמיתית ──
await admin.call('adminCmd', { type: 'simStop' });
await wait(300);
check('back to live', admin.state.mode === 'live' && admin.state.simulation === null);
check('the real participant survived untouched', admin.state.participants === 1, String(admin.state.participants));
check('the real session is still in the lobby', admin.state.status === 'lobby');
check('the real device is back on the real session', real.state.mode === 'live');

// ── הסימולציה לא נשמרה לשום דוח ──
const sessions = await fetch(`${URL}/api/sessions?key=${ADMIN_KEY}`).then((r) => r.json());
check('no simulation session was saved', !sessions.some((x) => x.mode === 'simulation'),
  JSON.stringify(sessions.map((x) => x.id)));

admin.close(); real.close();
log(fails ? `\n${fails} FAILURES` : '\nALL PASS');
process.exit(fails ? 1 : 0);
