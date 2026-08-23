import { chromium } from 'playwright';
import { connect, wait } from './ws-client.mjs';
import { joinAsParticipant, enterAsAdmin } from './helpers.mjs';

const APP = process.env.APP || 'http://localhost:3011';
const OUT = process.env.OUT;
let fails = 0;
const check = (n, c, e = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${e ? ' :: ' + e : ''}`); if (!c) fails++; };

const admin = await connect(APP);
await admin.call('adminAuth', { key: process.env.ADMIN_KEY || 'testkey' });
await wait(200);
if (admin.state.mode !== 'live') await admin.call('adminCmd', { type: 'setMode', payload: { mode: 'live' } });
await wait(150);
await admin.call('adminCmd', { type: 'resetSession' });
await wait(250);
const code = admin.state.code;

const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy });
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL' });
const desk = await browser.newContext({ viewport: { width: 1600, height: 900 }, locale: 'he-IL' });
const errors = [];

const helloFrames = [];
const p = await phone.newPage();
p.on('websocket', (ws) => {
  ws.on('framesent', (f) => {
    const body = String(f.payload || '');
    if (body.includes('"hello"')) helloFrames.push(body);
  });
});
p.on('console', (m) => { if (m.type() === 'error') errors.push(`participant: ${m.text()}`); });
await p.goto(APP, { waitUntil: 'networkidle' });
await wait(1200);
check('מסך הכניסה נטען', await p.locator('.entry-title').isVisible());

await joinAsParticipant(p, code);
check('כניסה עם קוד עובדת', await p.locator('.waiting-title').isVisible());
check('לא מוצג "אין חיבור" על חיבור תקין', (await p.locator('.conn-bar').count()) === 0);
await p.screenshot({ path: `${OUT}/cf-waiting.png` });

const adm = await desk.newPage();
adm.on('console', (m) => { if (m.type() === 'error') errors.push(`admin: ${m.text()}`); });
await adm.goto(`${APP}/admin`, { waitUntil: 'networkidle' });
await adm.fill('#k', process.env.ADMIN_KEY || 'testkey');
await adm.click('.gate-form button');
await wait(700);
check('Admin נפתח', await adm.locator('.a-code').isVisible());
check('כפתור "פתח מסך הקרנה" קיים', await adm.locator('.a-screen-btn').isVisible());
await adm.screenshot({ path: `${OUT}/cf-admin-lobby.png` });

// הכפתור באמת פותח את /live בטאב חדש באותה אפליקציה
const [liveTab] = await Promise.all([desk.waitForEvent('page'), adm.click('.a-screen-btn')]);
await liveTab.waitForLoadState('networkidle');
await wait(1200);
check('מסך ההקרנה נפתח בטאב חדש', new URL(liveTab.url()).pathname === '/live');
check('מסך ההקרנה מציג את קוד הפעילות', (await liveTab.locator('.lobby-code-value').textContent())?.trim() === code);

await admin.call('adminCmd', { type: 'start' });
await wait(1500);
check('התרחיש התחיל אצל המשתתף', await p.locator('.strip').first().isVisible());
check('התרחיש התחיל במסך ההקרנה', await liveTab.locator('.board').isVisible());

// מדידת עומס, שליחה, ואז רענון — התשובה חייבת לשרוד
await admin.call('adminCmd', { type: 'advance' });
await wait(1200);
check('גיליון השאלה נפתח', await p.locator('.sheet-q').isVisible());
await p.locator('.scale-btn').nth(6).click();
await wait(200);
await p.click('.sheet-send');
await wait(700);
check('התשובה נקלטה', await p.locator('.done-title').isVisible());
await p.screenshot({ path: `${OUT}/cf-answered.png` });

await wait(400);
check('מונה המשיבים במסך ההקרנה', (await liveTab.locator('.vote-n').textContent())?.trim() === '1');

// אחרי ההצטרפות הלקוח חייב לרענן את ה־hello עם הזיהוי. בלי זה כל חיבור
// מחדש (טלפון שנרדם, מעבר רשת) יישלח בלי זיהוי, המשתתף ייזרק למסך הקוד
// ולא יוכל לחזור כי הלובי כבר נעול.
const identified = helloFrames.filter((f) => f.includes('"token"'));
check('ה־hello מתעדכן עם הזיהוי אחרי הצטרפות', identified.length > 0,
  `${helloFrames.length} hello frames, ${identified.length} with token`);

await p.reload({ waitUntil: 'networkidle' });
await wait(1500);
check('אחרי רענון חוזרים לשלב הנוכחי', await p.locator('.board').isVisible());
check('התשובה שנשלחה שרדה את הרענון', await p.locator('.done-title').isVisible());
await wait(300);
check('הרענון לא נחשב כמשתתף חדש', admin.state.participants === 1, String(admin.state.participants));

console.log('console errors:', errors.length ? errors : 'none');
if (errors.length) fails += 1;
await browser.close();
admin.close();
console.log(fails ? `\n${fails} FAILURES` : '\nALL PASS');
process.exit(fails ? 1 : 0);
