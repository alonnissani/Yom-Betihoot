import { chromium } from 'playwright';
const URL = 'http://localhost:3011';
const OUT = process.env.OUT;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [name, vp, path] of [
  ['phone', { width: 390, height: 844 }, '/'],
  ['wide', { width: 1600, height: 900 }, '/live'],
  ['tablet', { width: 820, height: 1180 }, '/'],
]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: name === 'phone' ? 2 : 1, locale: 'he-IL' });
  const p = await ctx.newPage();
  await p.goto(URL + path, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `${OUT}/entry-${name}.png` });
}
await browser.close();
