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
await call(admin, 'admin:cmd', { type: 'resetSession' });
await wait(200);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const desk = await browser.newContext({ viewport: { width: 1600, height: 900 }, locale: 'he-IL' });
const live = await desk.newPage();
await live.goto(`${URL}/live`, { waitUntil: 'networkidle' });
const adm = await desk.newPage();
await adm.goto(`${URL}/admin`, { waitUntil: 'networkidle' });
await adm.fill('#k', 'testkey'); await adm.click('.gate-form button'); await wait(600);

await call(admin, 'admin:cmd', { type: 'start' }); await wait(400);
const waitAll = async () => { let w = 0; while (A.counts && A.counts.answered < A.counts.total && w++ < 200) await wait(150); };

let guard = 0;
while (guard++ < 60 && A.status !== 'ended') {
  if (A.question && A.question.status === 'open') {
    if (A.question.id === 'q1') { await wait(2500); await live.screenshot({ path: `${OUT}/L-voting.png` }); }
    await waitAll();
    if (A.question.id === 'q1') { await wait(600); await adm.screenshot({ path: `${OUT}/A-voting.png` }); }
    await call(admin, 'admin:cmd', { type: 'closeQuestion' }); await wait(200);
    if (A.question.id === 'qTimeline') {
      await call(admin, 'admin:cmd', { type: 'revealQuestion' }); await wait(4200);
      await live.screenshot({ path: `${OUT}/L-timeline.png` });
    }
    if (A.question.id === 'qOpen') {
      await call(admin, 'admin:cmd', { type: 'revealQuestion' }); await wait(9000);
      await live.screenshot({ path: `${OUT}/L-wall.png` });
    }
    if (A.question.id === 'q6') {
      await call(admin, 'admin:cmd', { type: 'revealQuestion' }); await wait(1500);
      await live.screenshot({ path: `${OUT}/L-dist.png` });
      await call(admin, 'admin:cmd', { type: 'hideReveal' }); await wait(200);
    }
  }
  const r = A.current?.reveal;
  if (r === 'traj1') { await wait(2800); await live.screenshot({ path: `${OUT}/L-traj1.png` }); }
  if (r === 'traj2') { await wait(2000); await live.screenshot({ path: `${OUT}/L-traj2.png` }); }
  if (r === 'traj4') { await wait(1600); await live.screenshot({ path: `${OUT}/L-traj4.png` }); }
  if (A.current?.id === 'f-s5-birds') { await wait(2500); await live.screenshot({ path: `${OUT}/L-birds.png` }); }
  if (A.current?.id === 'f-s6-mayday') { await wait(3000); await live.screenshot({ path: `${OUT}/L-mayday.png` }); }
  await call(admin, 'admin:cmd', { type: 'advance' }); await wait(250);
}
await wait(3500);
await live.screenshot({ path: `${OUT}/L-closing.png` });
const rep = await desk.newPage();
await rep.goto(`${URL}/report?key=testkey`, { waitUntil: 'networkidle' });
await wait(1200);
await rep.screenshot({ path: `${OUT}/R-report.png`, fullPage: true });
console.log('done');
await browser.close(); admin.close();
