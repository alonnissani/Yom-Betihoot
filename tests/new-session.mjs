/**
 * "פתח פעילות חדשה" ממסך הסיום.
 *
 * תרחיש שהגיע למסך הסיום נשאר 'ended', וכל מי שינסה להיכנס אחריו מקבל
 * "הפעילות כבר החלה" — בדיוק מה שקרה ב־deployment האמיתי. הבדיקה מוודאת
 * שהפעולה אחת סוגרת, שומרת לדוחות, ופותחת לובי חדש.
 */
import { connect, wait } from './ws-client.mjs';

const URL = process.env.APP || 'http://localhost:3011';
const ADMIN_KEY = process.env.ADMIN_KEY || '0000';
const log = (...a) => console.log(...a);
let fails = 0;
const check = (name, cond, extra = '') => {
  log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' :: ' + extra : ''}`);
  if (!cond) fails++;
};

const admin = await connect(URL);
await admin.call('adminAuth', { key: ADMIN_KEY });
await admin.call('adminCmd', { type: 'simStop' });
await admin.call('adminCmd', { type: 'setMode', payload: { mode: 'live' } });
await admin.call('adminCmd', { type: 'resetSession' });
await wait(300);

const before = await fetch(`${URL}/api/sessions?key=${ADMIN_KEY}`).then((r) => r.json());

// ── פעילות קצרה עם שני משתתפים, עד מסך הסיום ──
const ps = [];
for (let i = 0; i < 2; i += 1) {
  const s = await connect(URL);
  const res = await s.call('join', { code: admin.state.code });
  s.pid = res.pid;
  ps.push(s);
}
await wait(200);
const sessionId = admin.state.sessionId;
await admin.call('adminCmd', { type: 'start' });
await wait(200);

const guard = { n: 0 };
while (admin.state.status !== 'ended' && guard.n < 200) {
  guard.n += 1;
  const q = admin.state.question;
  if (q?.status === 'open') {
    for (const p of ps) await p.call('submit', { qid: q.id, value: q.kind === 'scale10' ? 6 : q.kind === 'timeline' ? 's4' : 'תשובה' });
    await admin.call('adminCmd', { type: 'closeQuestion' });
  }
  await admin.call('adminCmd', { type: 'advance' });
  await wait(60);
}
check('התרחיש הגיע למסך הסיום', admin.state.status === 'ended', `guard=${guard.n}`);

// ── מסך סיום נועל את הכניסה — זה הבאג שהפעולה באה לפתור ──
const stuck = await connect(URL);
check('משתתף חדש חסום כל עוד הפעילות נעולה',
  (await stuck.call('join', { code: '1111' })).reason === 'locked');
stuck.close();

// ── פעולה אחת: שמירה + לובי חדש ──
const res = await admin.call('adminCmd', { type: 'newSession' });
await wait(500);
check('הפעולה מדווחת שהפעילות נשמרה', res.saved === true, JSON.stringify(res));
check('חזרנו ללובי', admin.state.status === 'lobby', admin.state.status);
check('אין משתתפים בלובי החדש', admin.state.participants === 0, String(admin.state.participants));
check('נפתח Session חדש', admin.state.sessionId !== sessionId);
check('הקוד לא השתנה', admin.state.code === '1111', admin.state.code);
check('הלוח התנקה', admin.state.board.strips.length === 0);

// ── והפעילות הקודמת אכן נשמרה לדוחות ──
const after = await fetch(`${URL}/api/sessions?key=${ADMIN_KEY}`).then((r) => r.json());
const saved = after.find((x) => x.id === sessionId);
check('הפעילות שהסתיימה נמצאת ברשימת הדוחות', !!saved,
  `before=${before.length} after=${after.length}`);
check('הדוח שמר את מספר המשתתפים', saved?.participants === 2, String(saved?.participants));

// ── ומשתתף חדש יכול להיכנס שוב ──
const fresh = await connect(URL);
const joined = await fresh.call('join', { code: '1111' });
check('משתתף חדש נכנס ללובי החדש', joined.ok === true, JSON.stringify(joined));
fresh.close();

// ── בחזרה ובסימולציה שום דבר לא נשמר ──
await admin.call('adminCmd', { type: 'setMode', payload: { mode: 'rehearsal' } });
await admin.call('adminCmd', { type: 'resetSession' });
await wait(200);
await admin.call('adminCmd', { type: 'start' });
await wait(300);
const rehId = admin.state.sessionId;
await admin.call('adminCmd', { type: 'endSession' });
await wait(200);
const rehRes = await admin.call('adminCmd', { type: 'newSession' });
await wait(400);
check('חזרה אינה נשמרת לדוחות', rehRes.saved === false, JSON.stringify(rehRes));
const afterReh = await fetch(`${URL}/api/sessions?key=${ADMIN_KEY}`).then((r) => r.json());
check('נתוני החזרה לא נכנסו לרשימה', !afterReh.some((x) => x.id === rehId));
check('החזרה חזרה ללובי', admin.state.status === 'lobby');

await admin.call('adminCmd', { type: 'setMode', payload: { mode: 'live' } });
await admin.call('adminCmd', { type: 'resetSession' });
admin.close(); ps.forEach((p) => p.close());
log(fails ? `\n${fails} FAILURES` : '\nALL PASS');
process.exit(fails ? 1 : 0);
