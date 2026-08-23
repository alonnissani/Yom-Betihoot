import { chromium } from 'playwright';
import { connect, wait } from './ws-client.mjs';
const APP='http://localhost:3011';
const a = await connect(APP);
await a.call('adminAuth', { key: '0000' });
await wait(200);
await a.call('adminCmd', { type: 'setMode', payload: { mode: 'rehearsal' } });
await wait(150);
await a.call('adminCmd', { type: 'resetSession' });
await wait(300);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto(APP, { waitUntil: 'domcontentloaded' });
await wait(1200);
await p.fill('#code','1111'); await p.click('button[type=submit]'); await wait(900);
await a.call('adminCmd', { type: 'start' }); await wait(1200);

const answerAll = async () => { let w=0; while (a.state.counts && a.state.counts.answered < a.state.counts.total && w++ < 250) await wait(120); };
const advanceTo = async (qid) => {
  let guard = 0;
  while (guard++ < 60) {
    if (a.state.question?.id === qid && a.state.question.status === 'open') return true;
    if (a.state.question && a.state.question.status === 'open') { await answerAll(); await a.call('adminCmd', { type: 'closeQuestion' }); await wait(150); }
    await a.call('adminCmd', { type: 'advance' });
    await wait(320);
  }
  return false;
};
console.log('reached q1:', await advanceTo('q1'));
console.log('counts:', JSON.stringify(a.state.counts));
const t0 = Date.now();
await answerAll();
console.log('answerAll took ms:', Date.now()-t0, 'counts:', JSON.stringify(a.state.counts));
await a.call('adminCmd', { type: 'closeQuestion' }); await wait(800);
console.log('before reveal: sheet=', await p.locator('.sheet').count(), 'reveal=', await p.locator('.reveal-sheet').count());
await a.call('adminCmd', { type: 'revealQuestion' }); await wait(1500);
console.log('admin status:', a.state.question?.status);
console.log('after reveal: sheet=', await p.locator('.sheet').count(), 'reveal=', await p.locator('.reveal-sheet').count(), 'dist=', await p.locator('.dist').count());
console.log('closing?', await p.locator('.closing').count(), '| board?', await p.locator('.board').count());
console.log('body text head:', (await p.locator('body').innerText()).slice(0,200).replace(/\n/g,' | '));
await b.close(); a.close(); process.exit(0);
