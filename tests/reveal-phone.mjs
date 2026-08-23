/** חשיפות מגיעות למכשיר האישי — ורק אחרי שהמנחה חשף. */
import { chromium } from 'playwright';
import { connect, wait } from './ws-client.mjs';
import { joinAsParticipant, enterAsAdmin } from './helpers.mjs';

const APP = process.env.APP || 'http://localhost:3011';
const KEY = process.env.ADMIN_KEY || '0000';
const OUT = process.env.OUT;
let fails = 0;
const check = (n, c, e = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${e ? ' :: ' + e : ''}`); if (!c) fails++; };

const a = await connect(APP);
await a.call('adminAuth', { key: KEY });
await wait(200);
await a.call('adminCmd', { type: 'setMode', payload: { mode: 'rehearsal' } });
await wait(150);
await a.call('adminCmd', { type: 'resetSession' });
await wait(300);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const errors = [];
const phone = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL' });
const p = await phone.newPage();
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto(APP, { waitUntil: 'domcontentloaded' });
await wait(1200);
await joinAsParticipant(p, '1111');

await a.call('adminCmd', { type: 'start' });
await wait(1200);

/** ממתין לבוטים. בבדיקה יש משתתף אמיתי אחד שאינו עונה, ולכן היעד הוא
 *  total-1 ולא total — אחרת ההמתנה לעולם לא מסתיימת. */
const answerAll = async (capMs = 20000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < capMs) {
    const c = a.state.counts;
    if (!c) return;
    if (c.answered >= c.total - 1) return;
    await wait(200);
  }
};
/** מקדם עד שהשאלה המבוקשת פתוחה, בלי לחשוף כלום בדרך. */
const advanceTo = async (qid) => {
  let guard = 0;
  while (guard++ < 60) {
    if (a.state.question?.id === qid && a.state.question.status === 'open') return true;
    if (a.state.question && a.state.question.status === 'open') {
      await answerAll(6000);   // מספיק מענה כדי שיהיו מסלולים אמיתיים לגרף
      await a.call('adminCmd', { type: 'closeQuestion' });
      await wait(120);
    }
    await a.call('adminCmd', { type: 'advance' });
    await wait(260);
  }
  return false;
};

// ── מדידת עומס: לפני חשיפה אין תוצאות במכשיר ──
check('הגענו למדידת העומס הראשונה', await advanceTo('q1'));
await answerAll();
await a.call('adminCmd', { type: 'closeQuestion' });
await wait(800);
check('לפני חשיפה אין פאנל תוצאות בטלפון', (await p.locator('.reveal-sheet').count()) === 0);

await a.call('adminCmd', { type: 'revealQuestion' });
await wait(1500);
check('אחרי חשיפה מופיעה התפלגות בטלפון', await p.locator('.reveal-sheet .dist').isVisible());
if (OUT) await p.screenshot({ path: `${OUT}/r1-distribution.png` });

await a.call('adminCmd', { type: 'hideReveal' });
await wait(900);
check('הסתרה מסירה את הפאנל מהטלפון', (await p.locator('.reveal-sheet').count()) === 0);

// ── נקודת השינוי ──
check('הגענו לשאלת נקודת השינוי', await advanceTo('qTimeline'));
await answerAll();
await a.call('adminCmd', { type: 'closeQuestion' });
await wait(400);
check('גם כאן אין חשיפה אוטומטית', (await p.locator('.reveal-sheet').count()) === 0);
await a.call('adminCmd', { type: 'revealQuestion' });
await wait(2500);
check('ציר השלבים מופיע בטלפון', await p.locator('.reveal-sheet .tlc').isVisible());
const rows = await p.locator('.reveal-sheet .tlc li').count();
check('שישה שלבים על הציר', rows === 6, String(rows));
const dots = await p.locator('.reveal-sheet .tlc-dots i').count();
check('בחירות המשתתפים מוצגות כנקודות', dots >= 10, String(dots));
if (OUT) await p.screenshot({ path: `${OUT}/r2-timeline.png` });

// ── גרף מסלולי העומס ──
await a.call('adminCmd', { type: 'advance' });   // traj1
await wait(2500);
check('פאנל החשיפה עדיין מוצג', (await p.locator('.reveal-sheet').count()) === 1,
  `reveal=${JSON.stringify(a.state.participantView?.reveal)} traj=${a.state.participantView?.trajectories?.length}`);
check('גרף המסלולים מופיע בטלפון', await p.locator('.reveal-sheet .traj-wrap').isVisible());
const lines = await p.locator('.reveal-sheet .traj-lines path').count();
check('הקווים האנונימיים מוצגים', lines >= 10, String(lines));
if (OUT) await p.screenshot({ path: `${OUT}/r3-traj1.png` });

await a.call('adminCmd', { type: 'advance' });   // traj2 – ממוצע
await wait(1800);
check('ממוצע הקבוצה מופיע בטלפון', (await p.locator('.reveal-sheet .lg-avg').count()) > 0);
await a.call('adminCmd', { type: 'advance' });   // traj3 – מסר
await wait(1500);
const msg = await p.locator('.reveal-sheet .traj-message').textContent();
check('מסר הסיכום מופיע בטלפון', (msg || '').includes('לא עלה אצל כולנו'), String(msg));
if (OUT) await p.screenshot({ path: `${OUT}/r4-traj3.png` });
await a.call('adminCmd', { type: 'advance' });   // traj4
await wait(1200);

// ── קיר התשובות ──
check('הגענו לשאלה הפתוחה', await advanceTo('qOpen'));
await answerAll();
await a.call('adminCmd', { type: 'closeQuestion' });
await wait(400);
check('קיר התשובות לא נחשף מעצמו', (await p.locator('.reveal-sheet .wall').count()) === 0);
await a.call('adminCmd', { type: 'revealQuestion' });
await wait(4000);
check('קיר התשובות מופיע בטלפון', await p.locator('.reveal-sheet .wall').isVisible());
const cards = await p.locator('.reveal-sheet .wall-card').count();
check('תשובות מוצגות ככרטיסים', cards >= 3, String(cards));
if (OUT) await p.screenshot({ path: `${OUT}/r5-wall.png` });

// ── מסך הסיום ──
await a.call('adminCmd', { type: 'advance' });
await wait(3500);
check('מסך הסיום מופיע בטלפון', await p.locator('.closing-line').first().isVisible());
if (OUT) await p.screenshot({ path: `${OUT}/r6-closing.png` });

await b.close(); a.close();
console.log('console errors:', errors.length ? errors : 'none');
if (errors.length) fails += 1;
console.log(fails ? `\n${fails} FAILURES` : '\nALL PASS');
process.exit(fails ? 1 : 0);
