/**
 * האפליקציה חייבת להיפתח גם כשאין חיבור לשרת.
 *
 * מסך הכניסה חיכה למצב הראשון מה־WebSocket, ולכן ברשת שחוסמת או מעכבת
 * חיבורים מתמשכים האפליקציה נראתה כאילו אינה נפתחת כלל: לוגו, שלוש
 * נקודות, ושום דרך להמשיך. הבדיקה חוסמת את ה־WebSocket בלבד — HTML
 * ו־assets נטענים כרגיל — ומוודאת שכל מסך מגיע למצב שאפשר לפעול בו.
 */
import { chromium } from 'playwright';

const APP = process.env.APP || 'http://localhost:3011';
const KEY = process.env.ADMIN_KEY || '0000';
let fails = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' :: ' + extra : ''}`);
  if (!cond) fails++;
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL' });
await ctx.routeWebSocket('**/ws', (ws) => ws.close({ code: 1006 }));
const errors = [];

// ── משתתף ──
const p = await ctx.newPage();
p.on('console', (m) => { if (m.type() === 'error') errors.push(`participant: ${m.text()}`); });
await p.goto(APP, { waitUntil: 'load' });
await p.waitForTimeout(6000);
check('מסך הכניסה נטען בלי חיבור לשרת', await p.locator('.entry-title').isVisible());
check('כפתורי הכניסה מוצגים', await p.locator('.cta-participant').isVisible() && await p.locator('.cta-admin').isVisible());
check('מוצגת הודעת תקשורת', await p.locator('.conn-bar').isVisible());
check('יש כפתור ניסיון חוזר', await p.locator('.conn-retry').isVisible());
check('הכותרת אינה מוסתרת מאחורי ההודעה', await p.evaluate(() => {
  const bar = document.querySelector('.conn-bar').getBoundingClientRect();
  const top = document.querySelector('.entry-event').getBoundingClientRect();
  return top.top >= bar.bottom - 1;
}));
// לחיצה על "נסה שוב" אינה מפילה את המסך
await p.click('.conn-retry');
await p.waitForTimeout(2500);
check('המסך שורד ניסיון התחברות חוזר', await p.locator('.entry-title').isVisible());
// טופס הקוד עדיין נפתח, והשליחה נכשלת בהודעה ולא בקריסה
await p.click('.cta-participant');
await p.waitForSelector('#code', { timeout: 10000 });
await p.fill('#code', '1111');
await p.click('.entry-form button[type=submit]');
await p.waitForTimeout(9500);
check('שליחת קוד ללא חיבור מציגה שגיאה מנוסחת', await p.locator('.entry-error').isVisible(),
  await p.locator('.entry-error').innerText().catch(() => ''));

// ── מסך ההקרנה ──
const l = await ctx.newPage();
l.on('console', (m) => { if (m.type() === 'error') errors.push(`live: ${m.text()}`); });
await l.goto(`${APP}/live`, { waitUntil: 'load' });
await l.waitForTimeout(6500);
check('מסך ההקרנה מציג הודעת תקשורת ולא "מתחבר…" לנצח',
  await l.locator('.conn-card-title').isVisible() && (await l.locator('.live-boot').count()) === 0);
check('גם שם יש כפתור ניסיון חוזר', await l.locator('.conn-card button').isVisible());

// ── מסך הניהול ──
const a = await ctx.newPage();
a.on('console', (m) => { if (m.type() === 'error') errors.push(`admin: ${m.text()}`); });
await a.goto(`${APP}/admin`, { waitUntil: 'load' });
await a.waitForTimeout(2500);
check('שער המנחה נטען בלי חיבור לשרת', await a.locator('#k').isVisible());

console.log('console errors:', errors.length ? errors.slice(0, 4) : 'none');
if (errors.length) fails++;
await browser.close();
console.log(fails ? `\n${fails} FAILURES` : '\nALL PASS');
process.exit(fails ? 1 : 0);
