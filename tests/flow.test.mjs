import { connect, wait } from './ws-client.mjs';
const URL = process.env.APP || 'http://localhost:3011';
const ADMIN_KEY = process.env.ADMIN_KEY || 'testkey';
let fails = 0;
const check = (n, c, e = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${e ? ' :: ' + e : ''}`); if (!c) fails++; };

const admin = await connect(URL);
await admin.call('adminAuth', { key: ADMIN_KEY });
await wait(150);

const live = await connect(URL);
await live.call('hello', { role: 'live' });
await wait(100);

// מצב חזרה
await admin.call('adminCmd', { type: 'setMode', payload: { mode: 'rehearsal' } });
await wait(150);
await admin.call('adminCmd', { type: 'resetSession' });
await wait(300);
check('rehearsal mode active', admin.state.mode === 'rehearsal');
check('rehearsal is a separate session', admin.state.status === 'lobby' && admin.state.participants === 0);

await admin.call('adminCmd', { type: 'start' });
await wait(150);
check('20 bots spawned', admin.state.participants === 20, String(admin.state.participants));

const seen = { beats: 0, questions: 0, reveals: 0 };
let guard = 0;
while (guard++ < 80) {
  await wait(60);
  if (admin.state.question && admin.state.question.status === 'open') {
    seen.questions++;
    // מחכים שכל הבוטים יענו
    let w = 0;
    while (admin.state.counts.answered < admin.state.counts.total && w++ < 200) await wait(120);
    check(`  ${admin.state.question.id}: כל 20 ענו`, admin.state.counts.answered === 20, `${admin.state.counts.answered}/${admin.state.counts.total}`);
    if (admin.state.question.id === 'q1') {
      check('  Live מציג מונה בלבד בזמן הצבעה', !!live.state.counts && live.state.results === null,
        `counts=${JSON.stringify(live.state.counts)} results=${JSON.stringify(live.state.results)}`);
    }
    await admin.call('adminCmd', { type: 'closeQuestion' });
    await wait(80);
    if (admin.state.question.id === 'qTimeline') {
      await admin.call('adminCmd', { type: 'revealQuestion' });
      await wait(100);
      check('חשיפת נקודת השינוי מגיעה ל־Live', live.state.results?.kind === 'timeline' && live.state.results.dist.reduce((a, b) => a + b, 0) === 20,
        JSON.stringify(live.state.results));
    }
    if (admin.state.question.id === 'qOpen') {
      await admin.call('adminCmd', { type: 'revealQuestion' });
      await wait(100);
      check('קיר התשובות מגיע ל־Live', live.state.results?.kind === 'text' && live.state.results.texts.length === 20, String(live.state.results?.texts?.length));
    }
  } else if (admin.state.current?.kind === 'beat') seen.beats++;
  else if (admin.state.current?.kind === 'reveal') {
    seen.reveals++;
    if (admin.state.current.reveal === 'traj1') {
      check('Live מקבל מסלולי עומס', Array.isArray(live.state.trajectories) && live.state.trajectories.length === 20, String(live.state.trajectories?.length));
      const filled = live.state.trajectories.every((t) => t.values.filter((v) => v !== null).length === 6);
      check('כל מסלול מכיל 6 מדידות', filled);
    }
  }
  if (admin.state.status === 'ended') break;
  await admin.call('adminCmd', { type: 'advance' });
}
check('התרחיש הגיע לסיום', admin.state.status === 'ended', `guard=${guard}`);
check('מסך סיום ב־Live', live.state.reveal === 'closing');
check('כל 9 השאלות נפתחו', seen.questions === 9, String(seen.questions));

// לוח מלא בסוף
await wait(100);
check('כל 6 התנועות בתמונה בסיום', admin.state.board.strips.length === 6, admin.state.board.strips.map((s) => s.id).join(','));
check('ISR045 בחירום', admin.state.board.strips.find((s) => s.id === 'ISR045')?.emergency === true);
check('MAYDAY לא מחק תנועות', admin.state.board.strips.filter((s) => !s.emergency).length === 5);

// דוח
const rep = await fetch(`${URL}/api/report/current?key=${ADMIN_KEY}`).then((r) => r.json());
check('דוח: 20 משתתפים', rep.participantCount === 20);
check('דוח: 9 שאלות', rep.questions.length === 9);
check('דוח: ממוצעים לכל שלב', rep.questions.filter((q) => q.track === 'load').every((q) => typeof q.average === 'number'));
check('דוח: מסלולים אנונימיים', rep.trajectories.length === 20 && /^P\d\d$/.test(rep.trajectories[0].anon));
check('דוח: אין מזהי משתתפים', !JSON.stringify(rep).includes('bot-'));

// חזרה אחורה
await admin.call('adminCmd', { type: 'back' });
await wait(120);
check('חזרה אחורה משחזרת מצב', admin.state.status === 'running' && admin.state.cursor === rep.questions.length - 9 + 29, `cursor=${admin.state.cursor}`);

// איפוס חזרה + בידוד נתונים
await admin.call('adminCmd', { type: 'resetSession' });
await wait(120);
check('אפס חזרה מנקה הכול', admin.state.participants === 0 && admin.state.status === 'lobby' && admin.state.board.strips.length === 0);
await admin.call('adminCmd', { type: 'setMode', payload: { mode: 'live' } });
await wait(120);
check('נתוני הפעילות האמיתית שרדו את החזרה', admin.state.mode === 'live' && admin.state.status === 'running',
  `status=${admin.state.status} participants=${admin.state.participants}`);

admin.close(); live.close();
console.log(fails ? `\n${fails} FAILURES` : '\nALL PASS');
process.exit(fails ? 1 : 0);
