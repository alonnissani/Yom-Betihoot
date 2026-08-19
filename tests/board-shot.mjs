import { chromium } from 'playwright';
import { io } from 'socket.io-client';
const URL = 'http://localhost:3011';
const OUT = process.env.OUT;
const call = (s, ev, p) => new Promise((r) => s.emit(ev, p, r));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const admin = io(URL, { transports: ['websocket'] });
await new Promise((r) => admin.on('connect', r));
let A = null; admin.on('state', (s) => { A = s; });
await call(admin, 'admin:auth', { key: 'testkey' });
await wait(200);
if (A.mode !== 'rehearsal') await call(admin, 'admin:cmd', { type: 'setMode', payload: { mode: 'rehearsal' } });
await wait(150);
await call(admin, 'admin:cmd', { type: 'resetSession' }); await wait(200);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const desk = await browser.newContext({ viewport: { width: 1600, height: 900 }, locale: 'he-IL' });
const live = await desk.newPage();
await live.goto(`${URL}/live`, { waitUntil: 'networkidle' });
const adm = await desk.newPage();
await adm.goto(`${URL}/admin`, { waitUntil: 'networkidle' });
await adm.fill('#k', 'testkey'); await adm.click('.gate-form button'); await wait(500);

await call(admin, 'admin:cmd', { type: 'start' }); await wait(1500);
await live.screenshot({ path: `${OUT}/W-stage1.png` });

// עד סוף שלב 5 (התמונה המלאה)
const skip = async () => {
  for (let i = 0; i < 40; i++) {
    if (A.question?.status === 'open') { await call(admin, 'admin:cmd', { type: 'closeQuestion' }); await wait(120); }
    if (A.current?.id === 'f-s5-birds') return;
    await call(admin, 'admin:cmd', { type: 'advance' }); await wait(200);
  }
};
await skip();
await wait(2500);
await live.screenshot({ path: `${OUT}/W-birds.png` });
await wait(11500);
await call(admin, 'admin:cmd', { type: 'closeQuestion' }); await wait(150);
await call(admin, 'admin:cmd', { type: 'advance' }); await wait(200);
await call(admin, 'admin:cmd', { type: 'advance' }); await wait(3200);
await live.screenshot({ path: `${OUT}/W-mayday.png` });
await wait(4000);
await live.screenshot({ path: `${OUT}/W-mayday-banner.png` });
await adm.screenshot({ path: `${OUT}/W-admin.png` });
console.log('done');
await browser.close(); admin.close();
