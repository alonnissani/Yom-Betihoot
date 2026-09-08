/** כרטיס ההתפתחות הנוכחית, מסונכרן בשלושת המסכים · חץ הצפון · KC135 */
import { chromium } from 'playwright';
import { connect, wait } from './ws-client.mjs';
import { joinAsParticipant, enterAsAdmin } from './helpers.mjs';

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
const errors = [];
const phone = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL' });
const desk = await b.newContext({ viewport: { width: 1500, height: 900 }, locale: 'he-IL' });

const p = await phone.newPage();
p.on('console', (m) => { if (m.type() === 'error') errors.push(`participant: ${m.text()}`); });
await p.goto(APP, { waitUntil: 'domcontentloaded' });
await wait(1100);
await joinAsParticipant(p, '1111');

const live = await desk.newPage();
live.on('console', (m) => { if (m.type() === 'error') errors.push(`live: ${m.text()}`); });
await live.goto(`${APP}/live`, { waitUntil: 'domcontentloaded' });
await wait(900);

const adm = await desk.newPage();
adm.on('console', (m) => { if (m.type() === 'error') errors.push(`admin: ${m.text()}`); });
await adm.goto(APP, { waitUntil: 'domcontentloaded' });
await wait(900);
await enterAsAdmin(adm, KEY);
await adm.waitForURL('**/admin', { timeout: 15000 });
await wait(1400);

await a.call('adminCmd', { type: 'start' });
await wait(1400);
check('בתמונת הפתיחה אין עדיין כרטיס התפתחות', (await p.locator('.cur').count()) === 0);

// חץ הצפון מצביע מטה
const northPath = await p.locator('.runway-svg path').first().getAttribute('d');
check('חץ הצפון מצביע כלפי מטה', northPath === 'M8 12 L8 30 M8 30 L4.5 24 M8 30 L11.5 24', String(northPath));

const step = async () => { await a.call('adminCmd', { type: 'advance' }); await wait(900); };
const cur = async (page) => ({
  cs: (await page.locator('.cur-cs').first().textContent().catch(() => null))?.trim(),
  line: (await page.locator('.cur-line').first().textContent().catch(() => null))?.trim(),
});

await step();                                   // q1
await a.call('adminCmd', { type: 'closeQuestion' }); await wait(300);
await step();                                   // 4XCGE
let c = await cur(p);
check('כרטיס ההתפתחות מופיע', c.cs === '4XCGE' && c.line.includes('REQUESTING CLEARANCE'), JSON.stringify(c));
if (OUT) await p.screenshot({ path: `${OUT}/c1-first.png` });

await step();                                   // AIZ801 pushback
c = await cur(p);
check('הכרטיס מתחלף ולא נצבר', c.cs === 'AIZ801' && c.line === 'READY FOR PUSHBACK', JSON.stringify(c));
check('קיים כרטיס אחד בלבד', (await p.locator('.cur').count()) === 1);

const cl = await cur(live);
const ca = await cur(adm);
check('אותו כרטיס במסך ההקרנה', cl.cs === c.cs && cl.line === c.line, JSON.stringify(cl));
check('אותו כרטיס בתצוגה שבתוך ה־Admin', ca.cs === c.cs && ca.line === c.line, JSON.stringify(ca));
check('הסטריפ עדיין מקבל הדגשה', (await p.locator('.strip.flash').count()) === 1);
if (OUT) { await live.screenshot({ path: `${OUT}/c2-live.png` }); await adm.screenshot({ path: `${OUT}/c3-admin.png` }); }

// אירוע ייעודי מנקה את הכרטיס במקום להציג כפילות
await step();                                   // ISR045 on frequency
await a.call('adminCmd', { type: 'closeQuestion' }); await wait(200);
await step();                                   // q2 -> נפתחת
await a.call('adminCmd', { type: 'closeQuestion' }); await wait(200);
await step();                                   // 📞 שיחה
check('שיחה נכנסת מנקה את כרטיס ההתפתחות',
  (await p.locator('.cur').count()) === 0 && (await p.locator('.ov-phone').count()) === 1);

// KC135 מגיע מנתוני התרחיש
let guard = 0;
while (guard++ < 20 && (await p.locator('.strip', { hasText: 'SHETS78' }).count()) === 0) {
  if (a.state.question?.status === 'open') { await a.call('adminCmd', { type: 'closeQuestion' }); await wait(150); }
  await a.call('adminCmd', { type: 'advance' }); await wait(320);
}
const t = (s2) => s2.locator('.strip', { hasText: 'SHETS78' }).locator('.strip-type').textContent();
check('SHETS78 מסווג KC135 בטלפון', (await t(p)).trim() === 'KC135', await t(p));
check('SHETS78 מסווג KC135 במסך ההקרנה', (await t(live)).trim() === 'KC135', await t(live));
check('SHETS78 מסווג KC135 בתצוגת ה־Admin', (await t(adm)).trim() === 'KC135', await t(adm));
if (OUT) await p.screenshot({ path: `${OUT}/c4-shets.png` });

await b.close(); a.close();
console.log('console errors:', errors.length ? errors : 'none');
if (errors.length) fails += 1;
console.log(fails ? `\n${fails} FAILURES` : '\nALL PASS');
process.exit(fails ? 1 : 0);
