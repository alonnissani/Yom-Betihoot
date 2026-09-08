/** חצייה מצפון לדרום: הצפון בתחתית האיור, ולכן הלהקה נעה מלמטה למעלה. */
import { chromium } from 'playwright';
import { connect, wait } from './ws-client.mjs';
import { joinAsParticipant } from './helpers.mjs';

const APP = process.env.APP || 'http://localhost:3011';
const KEY = process.env.ADMIN_KEY || '0000';
const OUT = process.env.OUT || 'tests/out';
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
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL' });
const p = await ctx.newPage();
const errors = [];
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto(APP, { waitUntil: 'domcontentloaded' });
await wait(1100);
await joinAsParticipant(p, '1111');
await a.call('adminCmd', { type: 'start' });
await wait(1000);

// חץ הצפון מצביע מטה — זו האוריינטציה שהלהקה צריכה להתאים לה
const north = await p.locator('.runway-svg path').first().getAttribute('d');
check('חץ הצפון מצביע מטה', north === 'M8 12 L8 30 M8 30 L4.5 24 M8 30 L11.5 24', String(north));

// מקדמים עד אירוע הציפורים
let guard = 0;
while (guard++ < 30 && !(a.state.board?.overlays || []).some((o) => o.kind === 'birds')) {
  if (a.state.question?.status === 'open') { await a.call('adminCmd', { type: 'closeQuestion' }); await wait(120); }
  await a.call('adminCmd', { type: 'advance' }); await wait(280);
}
check('אירוע הקורמורנים הופעל', (a.state.board?.overlays || []).some((o) => o.kind === 'birds'));
await wait(600);
check('באנר BIRD ACTIVITY מוצג', await p.locator('.ov-birds').isVisible());
const count = await p.locator('.rw-bird').count();
check('הלהקה מצוירת', count > 0, String(count));

// דוגמים את מיקום הלהקה פעמיים כדי לקבוע את כיוון התנועה בפועל
const sample = async () => p.evaluate(() => {
  const wraps = [...document.querySelectorAll('.rw-bird-wrap')];
  const ys = wraps.map((w) => w.getBoundingClientRect().top).filter((y) => Number.isFinite(y) && y !== 0);
  return ys.length ? ys.reduce((s, y) => s + y, 0) / ys.length : null;
});
const y1 = await sample();
await wait(2200);
const y2 = await sample();
check('הלהקה נעה מלמטה כלפי מעלה', y1 !== null && y2 !== null && y2 < y1 - 20,
  `y1=${y1?.toFixed(1)} y2=${y2?.toFixed(1)}`);
if (OUT) await p.screenshot({ path: `${OUT}/birds.png` });

await b.close(); a.close();
console.log('console errors:', errors.length ? errors : 'none');
if (errors.length) fails += 1;
console.log(fails ? `\n${fails} FAILURES` : '\nALL PASS');
process.exit(fails ? 1 : 0);
