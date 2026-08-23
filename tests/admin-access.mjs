/** הגעה למסך המנחה מהטלפון, ויציאה מהפעילות כל עוד הלובי פתוח. */
import { chromium } from 'playwright';
import { connect, wait } from './ws-client.mjs';

const APP = process.env.APP || 'http://localhost:3011';
const KEY = process.env.ADMIN_KEY || 'testkey';
const OUT = process.env.OUT;
let fails = 0;
const check = (n, c, e = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${e ? ' :: ' + e : ''}`); if (!c) fails++; };

const a = await connect(APP);
await a.call('adminAuth', { key: KEY });
await wait(200);
if (a.state.mode !== 'live') await a.call('adminCmd', { type: 'setMode', payload: { mode: 'live' } });
await wait(150);
await a.call('adminCmd', { type: 'resetSession' });
await wait(300);
const code = a.state.code;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const phone = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL' });
const p = await phone.newPage();

await p.goto(APP, { waitUntil: 'domcontentloaded' });
await wait(1200);
// אין קישור גלוי למנחה — הכניסה היא דרך הקוד בלבד (נבדק ב־sync.mjs)
check('אין קישור מנחה חשוף במסך הכניסה', (await p.locator('.admin-link').count()) === 0);
if (OUT) await p.screenshot({ path: `${OUT}/x1-entry.png` });

// הצטרפות רגילה, ואפשרות לפנות את המקום כל עוד הלובי פתוח
await p.fill('#code', code);
await p.click('button[type=submit]');
await wait(1000);
check('הצטרפות הצליחה', await p.locator('.waiting-title').isVisible());
check('"יציאה מהפעילות" זמינה בלובי', await p.locator('.leave-link').isVisible());
if (OUT) await p.screenshot({ path: `${OUT}/x2-waiting.png` });
await wait(300);
check('המשתתף נספר', a.state.participants === 1, String(a.state.participants));

await p.click('.leave-link');
await wait(1200);
check('אחרי יציאה חוזרים למסך הקוד', await p.locator('.entry-code').isVisible());
await wait(300);
check('היציאה פינתה את המקום', a.state.participants === 0, String(a.state.participants));

// אחרי נעילת הלובי אין יציאה — משתתף לא יכול לנעול את עצמו בחוץ
await p.fill('#code', code);
await p.click('button[type=submit]');
await wait(900);

// משתתף שהצטרף בזמן, ורק אחר כך הפעילות נעולה
const joined = await connect(APP);
const jr = await joined.call('join', { code });
check('משתתף נוסף הצטרף לפני הנעילה', jr.ok === true, JSON.stringify(jr));

await a.call('adminCmd', { type: 'start' });
await wait(1500);
check('אחרי התחלה אין כפתור יציאה', (await p.locator('.leave-link').count()) === 0);

const refused = await joined.call('leave');
check('יציאה נדחית בשרת אחרי נעילה', refused.ok === false && refused.reason === 'locked',
  JSON.stringify(refused));
await wait(300);
check('המשתתף נשאר בפעילות', a.state.participants === 2, String(a.state.participants));
joined.close();

await b.close(); a.close();
console.log(fails ? `\n${fails} FAILURES` : '\nALL PASS');
process.exit(fails ? 1 : 0);
