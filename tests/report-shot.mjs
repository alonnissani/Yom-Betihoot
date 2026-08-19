import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1000, height: 700 }, locale: 'he-IL' });
const p = await ctx.newPage();
await p.goto('http://localhost:3011/report?key=testkey', { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);
await p.screenshot({ path: `${process.env.OUT}/toolbar.png`, clip: { x: 0, y: 0, width: 1000, height: 140 } });
console.log('done');
await browser.close();
