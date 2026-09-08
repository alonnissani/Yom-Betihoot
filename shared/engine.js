import {
  FLOW, QUESTIONS, QUESTION_BY_ID, LOAD_TRACK, STAGES,
  SESSION_LABEL, JOIN_CODE, stageNumberOf,
} from './scenario.js';

/** מזהים אקראיים מעל Web Crypto — עובד גם ב־Workers וגם ב־Node. */
function randomId(alphabet, length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
const nid = () => randomId('abcdefghijkmnpqrstuvwxyz23456789', 16);

const OVERLAY_TTL = { phone: 12000, birds: 13000 };
const MAYDAY_IMPACT_MS = 6000;

// ─── יצירה ואיפוס ────────────────────────────────────────────────────────────

export function createSession(mode = 'live') {
  return {
    id: `${new Date().toISOString().slice(0, 10)}-${nid().slice(0, 6)}`,
    label: SESSION_LABEL,
    mode,                       // 'live' | 'rehearsal' | 'simulation'
    code: JOIN_CODE,
    status: 'lobby',            // 'lobby' | 'running' | 'ended'
    cursor: -1,
    createdAt: Date.now(),
    startedAt: null,
    endedAt: null,
    participants: {},           // pid -> { pid, joinedAt, connected, bot }
    board: { strips: [], overlays: [], current: null },
    activeQuestion: null,
    questions: Object.fromEntries(
      QUESTIONS.map((q) => [q.id, { id: q.id, status: 'idle', openedAt: null, closedAt: null, answers: {} }]),
    ),
    reveal: null,               // 'traj1'..'traj4' | 'closing'
    seq: 0,                     // מונה שינויים – מזין highlight בצד הלקוח
  };
}

function freshQuestions() {
  return Object.fromEntries(
    QUESTIONS.map((q) => [q.id, { id: q.id, status: 'idle', openedAt: null, closedAt: null, answers: {} }]),
  );
}

// ─── לוח התנועה ──────────────────────────────────────────────────────────────

function applyAction(s, action) {
  s.seq += 1;
  if (action.op === 'add') {
    const exists = s.board.strips.find((x) => x.id === action.strip.id);
    if (exists) return;
    s.board.strips.push({ ...action.strip, rev: 0, enteredSeq: s.seq, updatedSeq: s.seq });
  } else if (action.op === 'update') {
    const strip = s.board.strips.find((x) => x.id === action.id);
    if (!strip) return;
    Object.assign(strip, action.patch);
    strip.rev = (strip.rev || 0) + 1;
    strip.updatedSeq = s.seq;
  } else if (action.op === 'remove') {
    s.board.strips = s.board.strips.filter((x) => x.id !== action.id);
  } else if (action.op === 'headline') {
    // ההתפתחות הנוכחית מחליפה את הקודמת ולעולם אינה נצברת
    s.board.current = action.headline ? { ...action.headline, seq: s.seq } : null;
  } else if (action.op === 'overlay') {
    const o = { ...action.overlay, id: `${action.overlay.kind}`, seq: s.seq, phase: action.overlay.kind === 'mayday' ? 'impact' : undefined };
    s.board.overlays = s.board.overlays.filter((x) => x.id !== o.id);
    // אירוע חדש מפנה את כרטיס השיחה — לא נערמות שתי שכבות זו על זו
    if (o.kind !== 'phone') s.board.overlays = s.board.overlays.filter((x) => x.kind !== 'phone');
    s.board.overlays.push(o);
  }
}

function rebuildBoard(s, uptoCursor) {
  s.board = { strips: [], overlays: [], current: null };
  s.seq = 0;
  for (let i = 0; i <= uptoCursor; i += 1) {
    const item = FLOW[i];
    if (item?.kind === 'beat') for (const a of item.actions || []) applyAction(s, a);
  }
  // Overlays שהיו זמניים אינם משוחזרים כשחוזרים אחורה, למעט ה־MAYDAY.
  s.board.overlays = s.board.overlays.filter((o) => o.kind === 'mayday');
  for (const o of s.board.overlays) if (o.kind === 'mayday') o.phase = 'banner';
}

// ─── מנוע ────────────────────────────────────────────────────────────────────

export class Engine {
  constructor(onChange) {
    this.onChange = onChange;
    // שלושה מרחבים נפרדים לחלוטין. מעבר ביניהם אינו מערבב משתתפים,
    // תשובות או תמונת תנועה — וזו כל ההגנה על נתוני האמת.
    this.sessions = {
      live: createSession('live'),
      rehearsal: createSession('rehearsal'),
      simulation: createSession('simulation'),
    };
    this.active = 'live';
    this.timers = { live: new Set(), rehearsal: new Set(), simulation: new Set() };
    this.sim = null;            // מצב הריצה האוטומטית; לעולם אינו נשמר
  }

  get s() { return this.sessions[this.active]; }

  changed() { this.onChange(); }

  later(mode, ms, fn) {
    const t = setTimeout(() => {
      this.timers[mode].delete(t);
      try { fn(); } catch (e) { console.error('timer', e); }
      this.changed();
    }, ms);
    this.timers[mode].add(t);
    return t;
  }

  clearTimers(mode) {
    for (const t of this.timers[mode]) clearTimeout(t);
    this.timers[mode].clear();
  }

  setMode(mode) {
    // אל מצב הסימולציה נכנסים רק דרך startSimulation, שמכין את הנתונים
    // ואת מנוע הקצב. מעבר ידני היה מציב session ריק בלי מי שיריץ אותו.
    if (mode !== 'live' && mode !== 'rehearsal') return;
    if (this.sim) this.stopSimulation();
    this.active = mode;
    this.changed();
  }

  // ── משתתפים ────────────────────────────────────────────────────────────────

  /** מחזיר { ok, pid, reason }. reconnect של משתתף קיים מותר גם לאחר נעילה. */
  join({ code, token, sessionId }) {
    const s = this.s;
    const known = token && sessionId === s.id && s.participants[token];
    if (known) {
      known.connected = true;
      known.lastSeen = Date.now();
      this.changed();
      return { ok: true, pid: token, sessionId: s.id, reconnected: true };
    }
    if (String(code || '').trim().toUpperCase() !== s.code) {
      return { ok: false, reason: 'bad-code' };
    }
    if (s.status !== 'lobby') return { ok: false, reason: 'locked' };
    const pid = nid();
    s.participants[pid] = { pid, joinedAt: Date.now(), lastSeen: Date.now(), connected: true, bot: false };
    this.changed();
    return { ok: true, pid, sessionId: s.id, reconnected: false };
  }

  /** יציאה מרצון. מותרת רק בלובי — אחרי הנעילה אין דרך לחזור פנימה. */
  leave(pid) {
    const s = this.s;
    if (!pid || !s.participants[pid]) return { ok: false, reason: 'unknown' };
    if (s.status !== 'lobby') return { ok: false, reason: 'locked' };
    delete s.participants[pid];
    this.changed();
    return { ok: true };
  }

  setConnected(pid, connected) {
    const s = this.s;
    for (const sess of Object.values(this.sessions)) {
      if (sess.participants[pid]) {
        sess.participants[pid].connected = connected;
        sess.participants[pid].lastSeen = Date.now();
      }
    }
    void s;
    this.changed();
  }

  // ── שליטת מנחה ─────────────────────────────────────────────────────────────

  start() {
    const s = this.s;
    if (s.status !== 'lobby') return;
    s.status = 'running';
    s.startedAt = Date.now();
    if (s.mode !== 'live') this.spawnBots();
    this.advance();
  }

  /** האם הכפתור הראשי פעיל כרגע (אין שאלה פתוחה/סגורה שמחכה להחלטה). */
  canAdvance() {
    const s = this.s;
    if (s.status !== 'running') return false;
    if (s.activeQuestion) {
      const q = s.questions[s.activeQuestion];
      return q.status !== 'open';       // סגורה – מותר להמשיך (עם או בלי חשיפה)
    }
    return s.cursor < FLOW.length - 1;
  }

  advance() {
    const s = this.s;
    if (s.status !== 'running') return;

    // שאלה פתוחה חוסמת התקדמות; שאלה סגורה – ההתקדמות סוגרת אותה סופית.
    if (s.activeQuestion) {
      const q = s.questions[s.activeQuestion];
      if (q.status === 'open') return;
      s.activeQuestion = null;
    }

    if (s.cursor >= FLOW.length - 1) return;
    s.cursor += 1;
    const item = FLOW[s.cursor];

    if (item.kind === 'beat') {
      for (const a of item.actions || []) {
        if (a.delay) this.later(s.mode, a.delay, () => applyAction(s, a));
        else applyAction(s, a);
      }
      for (const a of item.actions || []) {
        if (a.op !== 'overlay') continue;
        const kind = a.overlay.kind;
        const base = a.delay || 0;
        if (OVERLAY_TTL[kind]) {
          this.later(s.mode, base + OVERLAY_TTL[kind], () => {
            s.board.overlays = s.board.overlays.filter((o) => o.kind !== kind);
          });
        }
        if (kind === 'mayday') {
          this.later(s.mode, base + MAYDAY_IMPACT_MS, () => {
            const o = s.board.overlays.find((x) => x.kind === 'mayday');
            if (o) o.phase = 'banner';
          });
        }
      }
    } else if (item.kind === 'question') {
      s.activeQuestion = item.questionId;
      const q = s.questions[item.questionId];
      q.status = 'open';
      q.openedAt = Date.now();
      if (s.mode === 'rehearsal') this.scheduleBotAnswers(item.questionId);
      else if (s.mode === 'simulation') this.scheduleBotAnswers(item.questionId, this.sim?.speed || 5000);
    } else if (item.kind === 'reveal' || item.kind === 'closing') {
      s.reveal = item.reveal;
      if (item.kind === 'closing') s.status = 'ended';
      if (item.kind === 'closing') s.endedAt = Date.now();
    }
    this.changed();
  }

  closeQuestion() {
    const s = this.s;
    const qid = s.activeQuestion;
    if (!qid) return;
    const q = s.questions[qid];
    if (q.status !== 'open') return;
    q.status = 'closed';
    q.closedAt = Date.now();
    this.changed();
  }

  revealQuestion() {
    const s = this.s;
    const qid = s.activeQuestion;
    if (!qid) return;
    const q = s.questions[qid];
    if (q.status === 'open') return;
    q.status = 'revealed';
    this.changed();
  }

  hideQuestionReveal() {
    const s = this.s;
    const qid = s.activeQuestion;
    if (!qid) return;
    s.questions[qid].status = 'closed';
    this.changed();
  }

  submit({ pid, qid, value }) {
    const s = this.s;
    if (!s.participants[pid]) return { ok: false, reason: 'unknown' };
    const q = s.questions[qid];
    if (!q) return { ok: false, reason: 'unknown-question' };
    if (q.status !== 'open') return { ok: false, reason: 'closed' };
    if (q.answers[pid] !== undefined) return { ok: false, reason: 'already' };
    const def = QUESTION_BY_ID[qid];
    let v = value;
    if (def.kind === 'scale10') {
      v = Number(value);
      if (!Number.isInteger(v) || v < 1 || v > 10) return { ok: false, reason: 'invalid' };
    } else if (def.kind === 'timeline') {
      if (!STAGES.some((st) => st.id === value)) return { ok: false, reason: 'invalid' };
    } else if (def.kind === 'text') {
      v = String(value || '').trim().slice(0, 240);
      if (!v) return { ok: false, reason: 'invalid' };
    }
    q.answers[pid] = v;
    this.changed();
    return { ok: true };
  }

  // ── פעולות מסוכנות (תפריט משני + אישור) ────────────────────────────────────

  back() {
    const s = this.s;
    if (s.cursor < 0) return;
    this.clearTimers(s.mode);
    s.cursor -= 1;
    s.activeQuestion = null;
    rebuildBoard(s, s.cursor);
    // שאלות ו־reveals שאחרי הסמן חוזרים ל־idle; התשובות עצמן נשמרות ונעולות.
    for (let i = s.cursor + 1; i < FLOW.length; i += 1) {
      const it = FLOW[i];
      if (it.kind === 'question') s.questions[it.questionId].status = 'idle';
    }
    const lastReveal = FLOW.slice(0, s.cursor + 1).filter((f) => f.reveal).pop();
    s.reveal = lastReveal ? lastReveal.reveal : null;
    if (s.status === 'ended') s.status = 'running';
    // clearTimers הרגע הרג גם את קוצב הסימולציה; בלי זה הריצה נתקעת
    if (this.sim && !this.sim.done) { this.sim.timer = null; this.simArm(); }
    this.changed();
  }

  resetSession({ keepParticipants = false } = {}) {
    const mode = this.active;
    // אין "לאפס סימולציה": עוצרים אותה, וזה גם מוחק את נתוני הדמה.
    if (mode === 'simulation') return this.stopSimulation();
    this.clearTimers(mode);
    const old = this.sessions[mode];
    const next = createSession(mode);
    if (keepParticipants) {
      next.participants = old.participants;
      next.id = old.id;
      next.code = old.code;
    }
    this.sessions[mode] = next;
    this.changed();
  }

  endSession() {
    const s = this.s;
    this.clearTimers(s.mode);
    s.status = 'ended';
    s.endedAt = Date.now();
    s.activeQuestion = null;
    this.changed();
    return this.exportRecord();
  }

  /**
   * מצב מלא לשחזור אחרי הפעלה מחדש של ה־Durable Object.
   * הסימולציה נשארת בחוץ במכוון: נתוני דמה לא נכתבים לאחסון, ואם ה־DO
   * מתחיל מחדש באמצע סימולציה — התמונה חוזרת לפעילות האמיתית.
   */
  serialize() {
    const { live, rehearsal } = this.sessions;
    return {
      sessions: { live, rehearsal },
      active: this.active === 'simulation' ? 'live' : this.active,
    };
  }

  restore(snapshot) {
    if (!snapshot?.sessions?.live || !snapshot?.sessions?.rehearsal) return false;
    this.sessions = {
      live: snapshot.sessions.live,
      rehearsal: snapshot.sessions.rehearsal,
      simulation: createSession('simulation'),
    };
    this.active = snapshot.active === 'rehearsal' ? 'rehearsal' : 'live';
    // טיימרים אינם שורדים הפעלה מחדש; שכבות זמניות מנוקות כדי לא להיתקע על המסך.
    for (const sess of Object.values(this.sessions)) {
      if (sess.board.current === undefined) sess.board.current = null;
      sess.board.overlays = (sess.board.overlays || []).filter((o) => o.kind === 'mayday');
      for (const o of sess.board.overlays) o.phase = 'banner';
      for (const p of Object.values(sess.participants)) p.connected = false;
    }
    return true;
  }

  // ── משתתפי דמה (חזרה וסימולציה) ────────────────────────────────────────────

  /**
   * יוצר משתתפי דמה עם אופי אישי. לעולם לא בפעילות אמיתית.
   * המסלול של כל בוט נקבע כאן פעם אחת ונשמר, כך שהתשובות שלו לאורך
   * התרחיש מספרות סיפור אחד עקבי — ולא רעש מחודש בכל שאלה.
   */
  spawnBots(n = 20) {
    const s = this.s;
    if (s.mode === 'live') return;
    const kinds = archetypeList(n);
    const texts = shuffled(BOT_TEXTS);
    for (let i = 0; i < n; i += 1) {
      const pid = `bot-${nid().slice(0, 8)}`;
      const { curve, change } = makeProfile(kinds[i]);
      s.participants[pid] = {
        pid, joinedAt: Date.now(), lastSeen: Date.now(), connected: true, bot: true,
        profile: {
          kind: kinds[i].id,
          curve,                              // עומס 1–10 בכל אחד מששת השלבים
          change,                             // השלב שבו הוא עצמו ירגיש את השינוי
          text: texts[i % texts.length],      // תשובה אחת ויחידה לשאלה הפתוחה
        },
      };
    }
    this.changed();
  }

  /**
   * פורס את תשובות הבוטים על פני חלון הזמן.
   * הפיזור הוא העיקר: המונה צריך לטפס 3/20 → 8/20 → 20/20 מול העיניים,
   * כי כך זה נראה בחדר אמיתי — ולא לקפוץ לעשרים בבת אחת.
   */
  scheduleBotAnswers(qid, windowMs = 10500) {
    const s = this.s;
    const mode = s.mode;
    const def = QUESTION_BY_ID[qid];
    const stageIdx = def.stage ? STAGES.findIndex((x) => x.id === def.stage) + 1 : STAGES.length;
    const pending = Object.values(s.participants)
      .filter((p) => p.bot && s.questions[qid].answers[p.pid] === undefined);

    pending.forEach((p, i) => {
      const slot = (i + 0.5) / pending.length;
      const jitter = (Math.random() - 0.5) * windowMs * 0.08;
      const delay = Math.max(120, windowMs * (0.12 + slot * 0.68) + jitter);
      this.later(mode, delay, () => {
        // טיימר שנותר מ־session קודם לא ייגע ב־session הפעיל
        if (this.active !== mode) return;
        this.submit({ pid: p.pid, qid, value: this.botAnswer(def, p, stageIdx) });
      });
    });
  }

  botAnswer(def, p, stageIdx) {
    const pr = profileOf(p);
    if (def.kind === 'scale10') return pr.curve[clamp(stageIdx, 1, pr.curve.length) - 1];
    if (def.kind === 'timeline') return STAGES[clamp(pr.change, 1, STAGES.length) - 1].id;
    return pr.text;
  }

  // ── סימולציה מלאה ──────────────────────────────────────────────────────────

  /**
   * מריצה את התרחיש כולו מקצה לקצה על נתוני דמה, כדי שהמנחה יוכל לשבת
   * לבד לפני יום הבטיחות ולראות בדיוק את מה שמשתתף אמיתי יראה.
   *
   * הסימולציה רצה ב־session שלישי משלה: היא אינה נשמרת לאחסון, אינה
   * נכנסת לדוחות השמורים, ואינה נוגעת במשתתפים או בתשובות של live
   * ושל rehearsal. עצירה או יציאה מוחקות את כל נתוני הדמה.
   */
  startSimulation({ speed = 5000 } = {}) {
    const ms = clamp(Number(speed) || 5000, 1000, 30000);
    this.clearTimers('simulation');
    this.sessions.simulation = createSession('simulation');
    this.active = 'simulation';
    this.sim = { speed: ms, paused: false, done: false, dueAt: 0, left: ms, timer: null };
    this.start();                 // נועל את הלובי, יוצר 20 בוטים ומפעיל את הפריט הראשון
    this.simArm();
    this.changed();
  }

  /** קוצב הזמן עד הפעולה הבאה. dueAt מאפשר ללקוח לספור לאחור בעצמו. */
  simArm(ms) {
    const sim = this.sim;
    if (!sim || sim.paused || sim.done) return;
    const delay = ms === undefined ? sim.speed : ms;
    sim.left = delay;
    sim.dueAt = Date.now() + delay;
    sim.timer = this.later('simulation', delay, () => this.simStep());
  }

  simClearPace() {
    const sim = this.sim;
    if (!sim?.timer) return;
    clearTimeout(sim.timer);
    this.timers.simulation.delete(sim.timer);
    sim.timer = null;
  }

  /**
   * פעולה אחת בכל פעימה, באותו סדר שבו מנחה אנושי היה לוחץ:
   * להציג התפתחות, לפתוח הצבעה, לסגור, לחשוף, להמשיך.
   */
  simStep() {
    const sim = this.sim;
    if (!sim || sim.done) return;
    if (this.active !== 'simulation') return this.stopSimulation();
    const s = this.sessions.simulation;

    if (s.activeQuestion) {
      const q = s.questions[s.activeQuestion];
      if (q.status === 'open') this.closeQuestion();
      // חשיפה אוטומטית קיימת אך ורק כאן. בפעילות אמיתית רק המנחה חושף.
      else if (q.status === 'closed') this.revealQuestion();
      else this.advance();
    } else if (s.status === 'ended') {
      return this.simFinish();
    } else {
      this.advance();
    }

    if (s.status === 'ended' && !s.activeQuestion) return this.simFinish();
    this.simArm();
    return undefined;
  }

  /** סוף התרחיש. הנתונים נשארים על המסך עד שהמנחה יוצא — ואז נמחקים. */
  simFinish() {
    const sim = this.sim;
    if (!sim) return;
    this.simClearPace();
    sim.done = true;
    sim.paused = false;
    sim.dueAt = 0;
    sim.left = 0;
    this.changed();
  }

  pauseSimulation() {
    const sim = this.sim;
    if (!sim || sim.paused || sim.done) return;
    sim.left = Math.max(0, sim.dueAt - Date.now());
    sim.paused = true;
    // עוצרים גם את תשובות הבוטים שבדרך: "מושהה" שבו המונה ממשיך לזוז
    // הוא לא מושהה.
    this.clearTimers('simulation');
    sim.timer = null;
    this.changed();
  }

  resumeSimulation() {
    const sim = this.sim;
    if (!sim || !sim.paused || sim.done) return;
    sim.paused = false;
    const s = this.sessions.simulation;
    const left = Math.max(400, sim.left || sim.speed);
    const qid = s.activeQuestion;
    if (qid && s.questions[qid].status === 'open') this.scheduleBotAnswers(qid, left);
    this.simArm(left);
    this.changed();
  }

  /** דילוג לפעולה הבאה. הצבעה פתוחה נסגרת מלאה, לא חתוכה באמצע. */
  skipSimulation() {
    const sim = this.sim;
    if (!sim || sim.done) return;
    this.simClearPace();
    const s = this.sessions.simulation;
    const qid = s.activeQuestion;
    if (qid && s.questions[qid].status === 'open') {
      const def = QUESTION_BY_ID[qid];
      const stageIdx = def.stage ? STAGES.findIndex((x) => x.id === def.stage) + 1 : STAGES.length;
      for (const p of Object.values(s.participants)) {
        if (!p.bot || s.questions[qid].answers[p.pid] !== undefined) continue;
        this.submit({ pid: p.pid, qid, value: this.botAnswer(def, p, stageIdx) });
      }
    }
    this.simStep();
  }

  /** עצירה ומחיקה. אחריה לא נשאר זכר לנתוני הדמה בשום מקום. */
  stopSimulation() {
    this.clearTimers('simulation');
    this.sim = null;
    this.sessions.simulation = createSession('simulation');
    if (this.active === 'simulation') this.active = 'live';
    this.changed();
  }

  simView() {
    const sim = this.sim;
    if (!sim) return null;
    const s = this.sessions.simulation;
    return {
      speed: sim.speed,
      paused: sim.paused,
      done: sim.done,
      step: clamp(s.cursor + 1, 1, FLOW.length),
      steps: FLOW.length,
      msLeft: sim.paused ? sim.left : (sim.dueAt ? Math.max(0, sim.dueAt - Date.now()) : 0),
      bots: Object.keys(s.participants).length,
    };
  }

  // ── ייצוא ──────────────────────────────────────────────────────────────────

  exportRecord() {
    const s = this.s;
    const pids = Object.keys(s.participants);
    const anon = Object.fromEntries(pids.map((pid, i) => [pid, `P${String(i + 1).padStart(2, '0')}`]));
    const questions = QUESTIONS.map((def) => {
      const q = s.questions[def.id];
      const values = Object.values(q.answers);
      const out = {
        id: def.id, kind: def.kind, track: def.track, text: def.text, stage: def.stage,
        responded: values.length,
      };
      if (def.kind === 'scale10') {
        out.distribution = Array.from({ length: 10 }, (_, i) => values.filter((v) => v === i + 1).length);
        out.average = values.length ? +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : null;
        out.answers = Object.fromEntries(Object.entries(q.answers).map(([pid, v]) => [anon[pid], v]));
      } else if (def.kind === 'timeline') {
        out.distribution = STAGES.map((st) => values.filter((v) => v === st.id).length);
        out.answers = Object.fromEntries(Object.entries(q.answers).map(([pid, v]) => [anon[pid], v]));
      } else {
        out.answers = values;
      }
      return out;
    });
    const trajectories = pids.map((pid) => ({
      anon: anon[pid],
      values: LOAD_TRACK.map((qid) => s.questions[qid].answers[pid] ?? null),
    }));
    return {
      id: s.id, label: s.label, mode: s.mode,
      startedAt: s.startedAt, endedAt: s.endedAt || Date.now(),
      participantCount: pids.length,
      loadTrack: LOAD_TRACK,
      stages: STAGES,
      questions,
      trajectories,
    };
  }

  // ── תצוגות (מה כל תפקיד רואה) ──────────────────────────────────────────────

  publicQuestion(qid, pid) {
    const s = this.s;
    if (!qid) return null;
    const def = QUESTION_BY_ID[qid];
    const q = s.questions[qid];
    return {
      id: def.id, kind: def.kind, text: def.text, hint: def.hint,
      low: def.low, high: def.high, liveTitle: def.liveTitle,
      status: q.status,
      myAnswer: pid ? (q.answers[pid] ?? null) : null,
    };
  }

  counts(qid) {
    const s = this.s;
    const total = Object.keys(s.participants).length;
    const answered = qid ? Object.keys(s.questions[qid].answers).length : 0;
    return { answered, total };
  }

  stats(qid) {
    const s = this.s;
    if (!qid) return null;
    const def = QUESTION_BY_ID[qid];
    const values = Object.values(s.questions[qid].answers);
    if (def.kind === 'scale10') {
      const dist = Array.from({ length: 10 }, (_, i) => values.filter((v) => v === i + 1).length);
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
      return { kind: 'scale10', dist, avg: avg === null ? null : +avg.toFixed(1) };
    }
    if (def.kind === 'timeline') {
      return { kind: 'timeline', dist: STAGES.map((st) => values.filter((v) => v === st.id).length) };
    }
    return { kind: 'text', texts: values };
  }

  trajectories() {
    const s = this.s;
    return Object.keys(s.participants).map((pid, i) => ({
      key: `p${i}`,
      values: LOAD_TRACK.map((qid) => s.questions[qid].answers[pid] ?? null),
    }));
  }

  viewFor(role, pid) {
    const s = this.s;
    const item = s.cursor >= 0 ? FLOW[s.cursor] : null;
    const nextItem = s.cursor + 1 < FLOW.length ? FLOW[s.cursor + 1] : null;
    const base = {
      sessionId: s.id, mode: s.mode, status: s.status, code: s.code,
      board: s.board, reveal: s.reveal,
      stageNumber: stageNumberOf(item), stageCount: STAGES.length,
      started: s.status !== 'lobby',
    };

    // 'preview' היא תצוגת המשתתף כפי שהמנחה רואה אותה ב־Admin — אותו state
    // ואותם רכיבים בדיוק, בלי זהות אישית.
    if (role === 'participant' || role === 'preview') {
      const q = this.publicQuestion(s.activeQuestion, role === 'preview' ? null : pid);
      const revealed = q && q.status === 'revealed';
      return {
        ...base,
        code: undefined,
        question: q && q.status !== 'idle' ? q : null,
        joined: role === 'preview' ? true : !!s.participants[pid],
        // תוצאות מגיעות למכשיר רק אחרי שהמנחה חשף אותן. לעולם לא אוטומטית.
        results: revealed ? this.stats(s.activeQuestion) : null,
        trajectories: s.reveal && s.reveal.startsWith('traj') ? this.trajectories() : null,
        stages: STAGES,
        preview: role === 'preview' || undefined,
      };
    }

    if (role === 'live') {
      const q = s.activeQuestion ? this.publicQuestion(s.activeQuestion) : null;
      const revealed = q && q.status === 'revealed';
      return {
        ...base,
        code: s.status === 'lobby' ? s.code : undefined,
        connected: Object.values(s.participants).filter((p) => p.connected).length,
        question: q && q.status !== 'idle' ? { ...q, myAnswer: undefined } : null,
        counts: s.activeQuestion ? this.counts(s.activeQuestion) : null,
        results: revealed ? this.stats(s.activeQuestion) : null,
        trajectories: s.reveal && s.reveal.startsWith('traj') ? this.trajectories() : null,
        stages: STAGES,
      };
    }

    // admin
    return {
      ...base,
      connected: Object.values(s.participants).filter((p) => p.connected).length,
      participants: Object.keys(s.participants).length,
      cursor: s.cursor,
      flowLength: FLOW.length,
      current: item ? pick(item) : null,
      next: nextItem ? pick(nextItem) : null,
      canAdvance: this.canAdvance(),
      question: s.activeQuestion ? { ...this.publicQuestion(s.activeQuestion), adminTitle: QUESTION_BY_ID[s.activeQuestion].adminTitle } : null,
      counts: s.activeQuestion ? this.counts(s.activeQuestion) : null,
      stats: s.activeQuestion ? this.stats(s.activeQuestion) : null,
      stages: STAGES,
      // הפעילות האמיתית כבר רצה — אזור הבדיקות נסגר כדי שלא ימשוך
      // עשרים טלפונים אל תוך תרחיש דמה באמצע יום הבטיחות.
      liveStarted: this.sessions.live.status !== 'lobby',
      simulation: this.simView(),
      participantView: this.viewFor('preview'),
    };
  }
}

function pick(item) {
  return {
    id: item.id, kind: item.kind, label: item.label, summary: item.summary,
    note: item.note, stage: item.stage, stageNumber: stageNumberOf(item),
    questionId: item.questionId, reveal: item.reveal,
  };
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function rand([lo, hi]) { return lo + Math.random() * (hi - lo); }

function shuffled(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * ארכיטיפים של עומס למשתתפי דמה.
 *
 * הגרלה אחידה מייצרת עשרים קווים שנראים כמו רעש סביב אותו ממוצע — בדיוק
 * ההפך ממה שהפעילות מנסה להראות. כאן לכל בוט יש אופי: מתי העומס מתחיל
 * לעלות אצלו (knee), באיזו תלילות (slope), כמה הוא נסחף עם התמונה גם
 * בלי אירוע (drift), וכמה ה־MAYDAY מזיז אותו (surge).
 *
 * count הוא החלק היחסי מתוך עשרים: רוב הקבוצה עולה בהדרגה, מיעוט עולה
 * מוקדם, מיעוט נשאר רגוע עד השלבים האחרונים.
 */
const LOAD_ARCHETYPES = [
  { id: 'calm', count: 3, base: [1.0, 2.0], knee: [4.6, 5.6], slope: [1.0, 1.6], drift: [0.25, 0.45], surge: [1.5, 3.0] },
  { id: 'early', count: 4, base: [2.0, 3.2], knee: [1.2, 2.2], slope: [0.9, 1.4], drift: [0.25, 0.45], surge: [0.8, 2.0] },
  { id: 'gradual', count: 9, base: [1.5, 3.0], knee: [2.4, 3.8], slope: [1.0, 1.6], drift: [0.25, 0.50], surge: [1.0, 2.5] },
  { id: 'late', count: 4, base: [1.0, 2.2], knee: [4.0, 5.0], slope: [2.0, 2.8], drift: [0.15, 0.35], surge: [2.0, 3.5] },
];

const GRADUAL = LOAD_ARCHETYPES.find((a) => a.id === 'gradual');

/** מחלק n בוטים בין הארכיטיפים לפי המשקלות, ומערבב כדי שהסדר לא ילמד דבר. */
function archetypeList(n) {
  const total = LOAD_ARCHETYPES.reduce((sum, a) => sum + a.count, 0);
  const out = [];
  for (const a of LOAD_ARCHETYPES) {
    const k = Math.max(1, Math.round((a.count / total) * n));
    for (let i = 0; i < k; i += 1) out.push(a);
  }
  while (out.length > n) out.pop();
  while (out.length < n) out.push(GRADUAL);
  return shuffled(out);
}

/**
 * המסלול האישי: העומס בכל אחד מששת השלבים, ולצדו השלב שבו האדם עצמו
 * יגיד "כאן זה השתנה מבחינתי".
 *
 * נקודת השינוי נגזרת מה־knee — השלב שבו הקו שלו מתחיל לעלות — ולא
 * מסף מוחלט. סף מוחלט היה מרכז כמעט את כולם ב־MAYDAY, שם ממילא כולם
 * גבוהים, ומוחק בדיוק את מה שהפעילות באה להראות: שאנשים שונים מגיעים
 * ל־100 בנקודות שונות.
 */
function makeProfile(archetype) {
  const a = archetype || GRADUAL;
  const base = rand(a.base);
  const knee = rand(a.knee);
  const slope = rand(a.slope);
  const drift = rand(a.drift);
  const surge = rand(a.surge);
  const last = STAGES.length;

  const curve = STAGES.map((_, i) => {
    const k = i + 1;
    const raw = base
      + drift * (k - 1)
      + Math.max(0, k - knee) * slope
      + (k === last ? surge : 0)
      + (Math.random() - 0.5) * 1.1;
    return clamp(Math.round(raw), 1, 10);
  });

  // מיעוט זוכר את האירוע הדרמטי ולא את הרגע שבו באמת התחיל לעלות
  const change = Math.random() < 0.12 ? last : clamp(Math.round(knee + 0.5), 1, last);
  return { curve, change };
}

/** בוטים משחזורי snapshot ישנים יכולים להגיע בלי מסלול; נבנה להם אחד. */
function profileOf(p) {
  if (!p.profile?.curve) {
    p.profile = {
      kind: 'gradual',
      ...makeProfile(GRADUAL),
      text: BOT_TEXTS[Math.floor(Math.random() * BOT_TEXTS.length)],
    };
  }
  return p.profile;
}

/**
 * תשובות דמה לשאלה הפתוחה. עשרים ומעלה, כדי שכל בוט יקבל משפט משלו
 * וקיר התשובות ייראה כמו קיר של עשרים אנשים.
 */
const BOT_TEXTS = [
  'אני מתחיל לדבר מהר יותר',
  'יותר מדי דברים נשארים לי בראש',
  'אני מפסיק להסתכל קדימה',
  'אני מרגיש שאני מגיב במקום לתכנן',
  'אני מתחיל לפספס פרטים קטנים',
  'כשאני מתחיל לתעדף מי מדבר ראשון במקום לענות לכולם',
  'כשאני מפסיק להסתכל על התמונה הגדולה ורק סוגר את מה שמולי',
  'כשאני צריך לחזור על הקראה כי לא זכרתי מה אמרתי',
  'כשהידיים מסמנות סטריפים מהר יותר מהראש',
  'כשאני דוחה שיחת טלפון כי אין לי רגע פנוי',
  'כשאני מפסיק לתכנן קדימה שתי תנועות',
  'כשאני מגלה שאני לא זוכר איפה נמצאת תנועה שכבר טיפלתי בה',
  'כשכל מה שנכנס מרגיש דחוף באותה מידה',
  'כשאני מתחיל לכתוב לעצמי דברים שבדרך כלל אני זוכר',
  'כשאני מרגיש שאני לא רוצה שאף אחד יקרא לי עכשיו',
  'כשאני עונה לפני שסיימתי לשמוע את כל ההודעה',
  'כשאני מפסיק לשתות ולהסתכל בשעון',
  'כשאני מרגיש את הכתפיים עולות בלי ששמתי לב',
  'כשאני מבקש חזרה על משהו בפעם השנייה באותה דקה',
  'כשאני סופר כמה זמן נשאר למשמרת',
  'כשאני מדבר בלי לחשוב על הניסוח',
  'כשאני מרגיש שהתמונה בראש שלי מתחילה להיטשטש',
  'כשאני מפסיק לשים לב למה שקורה בצד השני של המסלול',
  'כשאני מוצא את עצמי מחזיק את הנשימה',
];

export { FLOW, STAGES, QUESTIONS, LOAD_TRACK };
