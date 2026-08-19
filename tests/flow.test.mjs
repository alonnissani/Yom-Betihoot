import { io } from 'socket.io-client';
const URL = 'http://localhost:3011';
const mk = () => io(URL, { transports: ['websocket'] });
const call = (s, ev, p) => new Promise((r) => s.emit(ev, p, r));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, c, e = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${e ? ' :: ' + e : ''}`); if (!c) fails++; };

const admin = mk(); await new Promise((r) => admin.on('connect', r));
let A = null; admin.on('state', (s) => { A = s; });
await call(admin, 'admin:auth', { key: 'testkey' });
await wait(100);

const live = mk(); await new Promise((r) => live.on('connect', r));
let L = null; live.on('state', (s) => { L = s; });
await call(live, 'hello', { role: 'live' });

// מצב חזרה
await call(admin, 'admin:cmd', { type: 'setMode', payload: { mode: 'rehearsal' } });
await wait(100);
check('rehearsal mode active', A.mode === 'rehearsal');
check('rehearsal is a separate session', A.status === 'lobby' && A.participants === 0);

await call(admin, 'admin:cmd', { type: 'start' });
await wait(150);
check('20 bots spawned', A.participants === 20, String(A.participants));

const seen = { beats: 0, questions: 0, reveals: 0 };
let guard = 0;
while (guard++ < 80) {
  await wait(60);
  if (A.question && A.question.status === 'open') {
    seen.questions++;
    // מחכים שכל הבוטים יענו
    let w = 0;
    while (A.counts.answered < A.counts.total && w++ < 200) await wait(120);
    check(`  ${A.question.id}: כל 20 ענו`, A.counts.answered === 20, `${A.counts.answered}/${A.counts.total}`);
    if (A.question.id === 'q1') {
      check('  Live מציג מונה בלבד בזמן הצבעה', !!L.counts && L.results === null,
        `counts=${JSON.stringify(L.counts)} results=${JSON.stringify(L.results)}`);
    }
    await call(admin, 'admin:cmd', { type: 'closeQuestion' });
    await wait(80);
    if (A.question.id === 'qTimeline') {
      await call(admin, 'admin:cmd', { type: 'revealQuestion' });
      await wait(100);
      check('חשיפת נקודת השינוי מגיעה ל־Live', L.results?.kind === 'timeline' && L.results.dist.reduce((a, b) => a + b, 0) === 20,
        JSON.stringify(L.results));
    }
    if (A.question.id === 'qOpen') {
      await call(admin, 'admin:cmd', { type: 'revealQuestion' });
      await wait(100);
      check('קיר התשובות מגיע ל־Live', L.results?.kind === 'text' && L.results.texts.length === 20, String(L.results?.texts?.length));
    }
  } else if (A.current?.kind === 'beat') seen.beats++;
  else if (A.current?.kind === 'reveal') {
    seen.reveals++;
    if (A.current.reveal === 'traj1') {
      check('Live מקבל מסלולי עומס', Array.isArray(L.trajectories) && L.trajectories.length === 20, String(L.trajectories?.length));
      const filled = L.trajectories.every((t) => t.values.filter((v) => v !== null).length === 6);
      check('כל מסלול מכיל 6 מדידות', filled);
    }
  }
  if (A.status === 'ended') break;
  await call(admin, 'admin:cmd', { type: 'advance' });
}
check('התרחיש הגיע לסיום', A.status === 'ended', `guard=${guard}`);
check('מסך סיום ב־Live', L.reveal === 'closing');
check('כל 9 השאלות נפתחו', seen.questions === 9, String(seen.questions));

// לוח מלא בסוף
await wait(100);
check('כל 6 התנועות בתמונה בסיום', A.board.strips.length === 6, A.board.strips.map((s) => s.id).join(','));
check('ISR045 בחירום', A.board.strips.find((s) => s.id === 'ISR045')?.emergency === true);
check('MAYDAY לא מחק תנועות', A.board.strips.filter((s) => !s.emergency).length === 5);

// דוח
const rep = await fetch(`${URL}/api/report/current?key=testkey`).then((r) => r.json());
check('דוח: 20 משתתפים', rep.participantCount === 20);
check('דוח: 9 שאלות', rep.questions.length === 9);
check('דוח: ממוצעים לכל שלב', rep.questions.filter((q) => q.track === 'load').every((q) => typeof q.average === 'number'));
check('דוח: מסלולים אנונימיים', rep.trajectories.length === 20 && /^P\d\d$/.test(rep.trajectories[0].anon));
check('דוח: אין מזהי משתתפים', !JSON.stringify(rep).includes('bot-'));

// חזרה אחורה
await call(admin, 'admin:cmd', { type: 'back' });
await wait(120);
check('חזרה אחורה משחזרת מצב', A.status === 'running' && A.cursor === rep.questions.length - 9 + 29, `cursor=${A.cursor}`);

// איפוס חזרה + בידוד נתונים
await call(admin, 'admin:cmd', { type: 'resetSession' });
await wait(120);
check('אפס חזרה מנקה הכול', A.participants === 0 && A.status === 'lobby' && A.board.strips.length === 0);
await call(admin, 'admin:cmd', { type: 'setMode', payload: { mode: 'live' } });
await wait(120);
check('נתוני הפעילות האמיתית שרדו את החזרה', A.mode === 'live' && A.status === 'running',
  `status=${A.status} participants=${A.participants}`);

admin.close(); live.close();
console.log(fails ? `\n${fails} FAILURES` : '\nALL PASS');
process.exit(fails ? 1 : 0);
