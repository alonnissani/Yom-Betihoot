import { chromium } from 'playwright';
import { io } from 'socket.io-client';
const URL = process.env.APP || 'http://localhost:3011';
const OUT = process.env.OUT;
const call = (s, ev, p) => new Promise((r) => s.emit(ev, p, r));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const admin = io(URL, { transports: ['websocket'] });
await new Promise((r) => admin.on('connect', r));
let A = null; admin.on('state', (s) => { A = s; });
await call(admin, 'admin:auth', { key: 'testkey' });
await wait(200);
// התחלה נקייה במצב חזרה
if (A.mode !== 'rehearsal') await call(admin, 'admin:cmd', { type: 'setMode', payload: { mode: 'rehearsal' } });
await wait(150);
await call(admin, 'admin:cmd', { type: 'resetSession' });
await wait(200);
const code = A.code;
console.log('code', code, 'mode', A.mode);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL' });
const desk = await browser.newContext({ viewport: { width: 1600, height: 900 }, locale: 'he-IL' });

const p = await phone.newPage();
await p.goto(URL, { waitUntil: 'networkidle' });
await wait(1400);
await p.screenshot({ path: `${OUT}/01-entry-phone.png` });

const live = await desk.newPage();
await live.goto(`${URL}/live`, { waitUntil: 'networkidle' });
await wait(1500);
await live.screenshot({ path: `${OUT}/02-live-lobby.png` });

// כניסה
await p.fill('#code', code);
await p.click('button[type=submit]');
await wait(900);
await p.screenshot({ path: `${OUT}/03-waiting-phone.png` });

const adm = await desk.newPage();
await adm.goto(`${URL}/admin`, { waitUntil: 'networkidle' });
await adm.fill('#k', 'testkey');
await adm.click('.gate-form button');
await wait(700);
await adm.screenshot({ path: `${OUT}/04-admin-lobby.png` });

const step = async (n) => { for (let i = 0; i < n; i++) { await call(admin, 'admin:cmd', { type: 'advance' }); await wait(260); } };
await call(admin, 'admin:cmd', { type: 'start' }); await wait(1400);
await p.screenshot({ path: `${OUT}/05-stage1-phone.png` });
await live.screenshot({ path: `${OUT}/06-stage1-live.png` });
await adm.screenshot({ path: `${OUT}/07-admin-stage1.png` });

// שאלה פתוחה
await step(1); await wait(1200);
await p.screenshot({ path: `${OUT}/08-question-phone.png` });
await live.screenshot({ path: `${OUT}/09-live-voting.png` });
await wait(2500);
await adm.screenshot({ path: `${OUT}/10-admin-voting.png` });
await call(admin, 'admin:cmd', { type: 'closeQuestion' }); await wait(400);
await step(1);

// שלב 2 + 3 (טלפון ו-LAHAK3)
await step(3); await wait(600);   // 4XCGE, AIZ, ISR
await call(admin, 'admin:cmd', { type: 'closeQuestion' }); await wait(300); await step(1); // q2
await step(1); await wait(900);
await live.screenshot({ path: `${OUT}/11-live-phone-call.png` });
await step(1); await wait(1200);
await live.screenshot({ path: `${OUT}/12-live-lahak3.png` });
await p.screenshot({ path: `${OUT}/13-lahak3-phone.png` });

// עד הציפורים
await step(4); await wait(400);                                  // s3 updates
await call(admin, 'admin:cmd', { type: 'closeQuestion' }); await wait(250); await step(1);  // q3a
await call(admin, 'admin:cmd', { type: 'closeQuestion' }); await wait(250); await step(1);  // q3b
await step(4); await wait(400);                                  // s4
await call(admin, 'admin:cmd', { type: 'closeQuestion' }); await wait(250); await step(1);  // q4
await step(1); await wait(300);                                  // SHETS78
await step(1); await wait(2600);                                 // birds
await live.screenshot({ path: `${OUT}/14-live-birds.png` });
await p.screenshot({ path: `${OUT}/15-birds-phone.png` });

await wait(11000);
await call(admin, 'admin:cmd', { type: 'closeQuestion' }); await wait(250); await step(1);  // q5
await step(1); await wait(3200);                                  // MAYDAY
await live.screenshot({ path: `${OUT}/16-live-mayday.png` });
await p.screenshot({ path: `${OUT}/17-mayday-phone.png` });
await wait(4200);
await live.screenshot({ path: `${OUT}/18-live-mayday-banner.png` });

// נקודת השינוי
await call(admin, 'admin:cmd', { type: 'closeQuestion' }); await wait(250); await step(1);  // q6
await wait(1200);
await p.screenshot({ path: `${OUT}/19-timeline-q-phone.png` });
let w = 0; while (A.counts?.answered < A.counts?.total && w++ < 120) await wait(200);
await adm.screenshot({ path: `${OUT}/20-admin-timeline.png` });
await call(admin, 'admin:cmd', { type: 'closeQuestion' }); await wait(300);
await call(admin, 'admin:cmd', { type: 'revealQuestion' }); await wait(3600);
await live.screenshot({ path: `${OUT}/21-live-reveal-timeline.png` });

// מסלולי העומס
await step(1); await wait(2600); await live.screenshot({ path: `${OUT}/22-live-traj1.png` });
await step(1); await wait(1800); await live.screenshot({ path: `${OUT}/23-live-traj2.png` });
await step(1); await wait(1400); await live.screenshot({ path: `${OUT}/24-live-traj3.png` });
await step(1); await wait(1400); await live.screenshot({ path: `${OUT}/25-live-traj4.png` });

// שאלה פתוחה + קיר
await step(1); await wait(1000);
await p.screenshot({ path: `${OUT}/26-open-q-phone.png` });
w = 0; while (A.counts?.answered < A.counts?.total && w++ < 120) await wait(200);
await call(admin, 'admin:cmd', { type: 'closeQuestion' }); await wait(250);
await call(admin, 'admin:cmd', { type: 'revealQuestion' }); await wait(8500);
await live.screenshot({ path: `${OUT}/27-live-wall.png` });
await step(1); await wait(3600);
await live.screenshot({ path: `${OUT}/28-live-closing.png` });

// דוח
const rep = await desk.newPage();
await rep.goto(`${URL}/report?key=testkey`, { waitUntil: 'networkidle' });
await wait(1200);
await rep.screenshot({ path: `${OUT}/29-report.png`, fullPage: true });

const errs = [];
for (const pg of [p, live, adm, rep]) pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
console.log('console errors:', errs.length ? errs : 'none');
await browser.close(); admin.close();
