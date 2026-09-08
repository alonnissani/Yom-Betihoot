import { chromium } from 'playwright';
const APP = process.env.APP || 'http://localhost:3011';
const OUT = process.env.OUT || 'tests/out';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [name, vp] of [['phone', { width: 390, height: 844 }], ['wide', { width: 1500, height: 900 }]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: name === 'phone' ? 2 : 1, locale: 'he-IL' });
  const p = await ctx.newPage();
  await p.goto(APP, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `${OUT}/e-${name}-choice.png` });
  if (name === 'phone') {
    await p.click('.cta-participant'); await p.waitForTimeout(700);
    await p.screenshot({ path: `${OUT}/e-participant.png` });
    await p.click('.gate-back'); await p.waitForTimeout(500);
    await p.click('.cta-admin'); await p.waitForTimeout(700);
    await p.screenshot({ path: `${OUT}/e-admin.png` });
  }
}
await b.close();
