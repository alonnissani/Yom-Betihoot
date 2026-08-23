/** קוד מנחה במסך הכניסה · תצוגת משתתף ב־Admin · חשיפות בטלפון · הדגשת סטריפ */
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
if (a.state.mode !== 'rehearsal') await a.call('adminCmd', { type: 'setMode', payload: { mode: 'rehearsal' } });
await wait(150);
await a.call('adminCmd', { type: 'resetSession' });
await wait(300);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const errors = [];
const phone = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL' });
const desk = await b.newContext({ viewport: { width: 1500, height: 950 }, locale: 'he-IL' });

// ── קוד מנחה מוביל ישר ל־Admin, בלי שער נוסף ──
const adm = await desk.newPage();
adm.on('console', (m) => { if (m.type() === 'error') errors.push(`admin: ${m.text()}`); });
await adm.goto(APP, { waitUntil: 'domcontentloaded' });
await wait(1200);
check('שני מסלולי כניסה נפרדים במסך הראשי',
  (await adm.locator('.cta-participant').isVisible()) && (await adm.locator('.cta-admin').isVisible()));

// קוד הפעילות אינו פותח את מסך הניהול
await adm.click('.cta-admin');
await adm.waitForSelector('#admincode');
await adm.fill('#admincode', '1111');
await adm.click('.entry-form button[type=submit]');
await wait(1200);
check('קוד פעילות נדחה במסלול המנחה', await adm.locator('.entry-error').isVisible());
check('לא עבר למסך הניהול', new URL(adm.url()).pathname === '/');

// ומפתח המנחה אינו מצרף לפעילות
await adm.click('.gate-back');
await wait(400);
await adm.click('.cta-participant');
await adm.waitForSelector('#code');
await adm.fill('#code', KEY);
await adm.click('.entry-form button[type=submit]');
await wait(1200);
check('מפתח המנחה נדחה במסלול המשתתפים', await adm.locator('.entry-error').isVisible());
check('לא צורף כמשתתף', a.state.participants === 0, String(a.state.participants));

await adm.click('.gate-back');
await wait(400);
await enterAsAdmin(adm, KEY, 400);
await adm.waitForURL('**/admin', { timeout: 15000 });
await wait(1500);
check('קוד המנחה מוביל למסך הניהול', new URL(adm.url()).pathname === '/admin');
check('נכנס בלי לבקש מפתח שוב', (await adm.locator('#k').count()) === 0);
check('הקוד עצמו לא נשמר בדפדפן',
  !JSON.stringify(await adm.evaluate(() => ({ ...sessionStorage, ...localStorage }))).includes(KEY));

// ── תצוגת משתתף בזמן אמת ──
check('אזור "תצוגת משתתף בזמן אמת" קיים', await adm.locator('.pv-title').first().isVisible());

// ── משתתף אמיתי מצטרף לפני שהלובי ננעל ──
const p = await phone.newPage();
p.on('console', (m) => { if (m.type() === 'error') errors.push(`participant: ${m.text()}`); });
await p.goto(APP, { waitUntil: 'domcontentloaded' });
await wait(1200);
await joinAsParticipant(p, '1111', 1000);
check('משתתף הצטרף', await p.locator('.waiting-title').isVisible());

await a.call('adminCmd', { type: 'start' });
await wait(2000);
check('משתתף לא רואה הדגשה בכניסה לשלב קיים', (await p.locator('.strip.flash').count()) === 0);
check('התצוגה מציגה את לוח התנועה', await adm.locator('.pv-frame .board').isVisible());
const stripsInPreview = await adm.locator('.pv-frame .strip').count();
check('התצוגה מציגה את הסטריפים', stripsInPreview === 3, String(stripsInPreview));
if (OUT) await adm.screenshot({ path: `${OUT}/s1-admin-preview.png` });

// שלב 2: 4XCGE נכנס, ואז AIZ801 מתעדכן
await a.call('adminCmd', { type: 'advance' });   // q1
await wait(600);
await a.call('adminCmd', { type: 'closeQuestion' });
await wait(400);
await a.call('adminCmd', { type: 'advance' });   // 4XCGE
await wait(900);
await a.call('adminCmd', { type: 'advance' });   // AIZ801 → מוכן לפושבק
await wait(500);
const flashedAdmin = await adm.locator('.pv-frame .strip.flash').count();
check('הדגשה מופיעה בתצוגה שבתוך ה־Admin', flashedAdmin === 1, String(flashedAdmin));
const flashedPhone = await p.locator('.strip.flash').count();
check('אותה הדגשה מופיעה גם בטלפון', flashedPhone === 1, String(flashedPhone));
const flashedId = await p.locator('.strip.flash .strip-cs').textContent();
check('ההדגשה על התנועה שהשתנתה', flashedId?.trim() === 'AIZ801', String(flashedId));
const cls = await p.locator('.strip.flash').getAttribute('class');
check('צבע הסיווג נשמר בזמן ההדגשה', cls.includes('k-dep'), cls);
if (OUT) await p.screenshot({ path: `${OUT}/s2-flash.png` });

await wait(3000);
check('ההדגשה נעלמת מעצמה', (await p.locator('.strip.flash').count()) === 0);

// רענון באמצע לא מדליק הדגשה מחדש
await p.reload({ waitUntil: 'domcontentloaded' });
await wait(2000);
check('רענון לא מדליק הדגשה', (await p.locator('.strip.flash').count()) === 0);

await b.close(); a.close();
console.log('console errors:', errors.length ? errors : 'none');
if (errors.length) fails += 1;
console.log(fails ? `\n${fails} FAILURES` : '\nALL PASS');
process.exit(fails ? 1 : 0);
