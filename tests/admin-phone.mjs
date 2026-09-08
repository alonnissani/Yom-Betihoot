import { chromium } from 'playwright';
import { connect, wait } from './ws-client.mjs';
const APP = process.env.APP || 'http://localhost:3011';
const KEY = process.env.ADMIN_KEY || 'testkey';
const OUT = process.env.OUT || 'tests/out';

const a = await connect(APP);
await a.call('adminAuth', { key: KEY });
await wait(200);
if (a.state.mode !== 'rehearsal') await a.call('adminCmd', { type: 'setMode', payload: { mode: 'rehearsal' } });
await wait(150);
await a.call('adminCmd', { type: 'resetSession' });
await wait(300);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const phone = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL' });
const p = await phone.newPage();
let fails = 0;
const check = (n, c, e = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${e ? ' :: ' + e : ''}`); if (!c) fails++; };
const overflow = async (label) => {
  const w = await p.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
  check(`${label}: אין גלילה אופקית`, w.doc <= w.win, `scrollWidth=${w.doc} viewport=${w.win}`);
};

await p.goto(`${APP}/admin`, { waitUntil: 'domcontentloaded' });
await wait(800);
await p.fill('#k', KEY);
await p.click('.gate-form button');
await wait(900);
await p.screenshot({ path: `${OUT}/a1-lobby.png` });
await overflow('lobby');

await a.call('adminCmd', { type: 'start' });
await wait(1500);
await p.screenshot({ path: `${OUT}/a2-running.png` });
await overflow('running');

// עד שאלה פתוחה עם התפלגות
await a.call('adminCmd', { type: 'advance' });
await wait(4000);
await p.screenshot({ path: `${OUT}/a3-question.png` });
await overflow('question');

// תפריט משני
await p.click('.a-menu-btn');
await wait(500);
await p.screenshot({ path: `${OUT}/a4-menu.png` });
await overflow('menu');

// גודל יעדי מגע של הכפתור הראשי
const go = await p.locator('.a-go').boundingBox();
check('הכפתור הראשי גדול מספיק למגע', !!go && go.height >= 44 && go.width >= 240,
  go && `${Math.round(go.width)}x${Math.round(go.height)}`);
check('הכפתור הראשי גלוי בלי גלילה', await p.locator('.a-go').isVisible());
check('כפתור מסך ההקרנה גלוי בטלפון', await p.locator('.a-screen-btn').isVisible());
await b.close(); a.close();
console.log(fails ? `\n${fails} FAILURES` : '\nALL PASS');
process.exit(fails ? 1 : 0);
