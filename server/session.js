import { customAlphabet } from 'nanoid';
import {
  FLOW, QUESTIONS, QUESTION_BY_ID, LOAD_TRACK, STAGES,
  SESSION_LABEL, stageNumberOf,
} from '../shared/scenario.js';

const nid = customAlphabet('abcdefghijkmnpqrstuvwxyz23456789', 16);
const codeGen = customAlphabet('ACDEFGHJKLMNPQRTUVWXY3479', 4);

const OVERLAY_TTL = { phone: 12000, birds: 13000 };
const MAYDAY_IMPACT_MS = 6000;

// ─── יצירה ואיפוס ────────────────────────────────────────────────────────────

export function createSession(mode = 'live') {
  return {
    id: `${new Date().toISOString().slice(0, 10)}-${nid().slice(0, 6)}`,
    label: SESSION_LABEL,
    mode,                       // 'live' | 'rehearsal'
    code: codeGen(),
    status: 'lobby',            // 'lobby' | 'running' | 'ended'
    cursor: -1,
    createdAt: Date.now(),
    startedAt: null,
    endedAt: null,
    participants: {},           // pid -> { pid, joinedAt, connected, bot }
    board: { strips: [], overlays: [] },
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
  } else if (action.op === 'overlay') {
    const o = { ...action.overlay, id: `${action.overlay.kind}`, seq: s.seq, phase: action.overlay.kind === 'mayday' ? 'impact' : undefined };
    s.board.overlays = s.board.overlays.filter((x) => x.id !== o.id);
    // אירוע חדש מפנה את כרטיס השיחה — לא נערמות שתי שכבות זו על זו
    if (o.kind !== 'phone') s.board.overlays = s.board.overlays.filter((x) => x.kind !== 'phone');
    s.board.overlays.push(o);
  }
}

function rebuildBoard(s, uptoCursor) {
  s.board = { strips: [], overlays: [] };
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
    this.sessions = { live: createSession('live'), rehearsal: createSession('rehearsal') };
    this.active = 'live';
    this.timers = { live: new Set(), rehearsal: new Set() };
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
    if (mode !== 'live' && mode !== 'rehearsal') return;
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
    if (s.mode === 'rehearsal') this.spawnBots();
    this.advance();
  }

  regenerateCode() {
    const s = this.s;
    if (s.status !== 'lobby') return;
    s.code = codeGen();
    this.changed();
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
    this.changed();
  }

  resetSession({ keepParticipants = false } = {}) {
    const mode = this.active;
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

  // ── חזרה: משתתפי דמה ───────────────────────────────────────────────────────

  spawnBots(n = 20) {
    const s = this.s;
    if (s.mode !== 'rehearsal') return;
    for (let i = 0; i < n; i += 1) {
      const pid = `bot-${nid().slice(0, 8)}`;
      s.participants[pid] = {
        pid, joinedAt: Date.now(), lastSeen: Date.now(), connected: true, bot: true,
        // פרופיל אישי: היכן העומס מתחיל לעלות ובאיזו עוצמה – יוצר מסלולים שונים.
        profile: {
          base: 1 + Math.random() * 2,
          knee: 1.5 + Math.random() * 3.5,     // השלב שבו מתחילה העלייה
          slope: 0.9 + Math.random() * 1.6,
          jitter: () => (Math.random() - 0.5) * 1.4,
        },
      };
    }
    this.changed();
  }

  scheduleBotAnswers(qid) {
    const s = this.s;
    const def = QUESTION_BY_ID[qid];
    const stageIdx = def.stage ? STAGES.findIndex((x) => x.id === def.stage) + 1 : 6;
    for (const p of Object.values(s.participants)) {
      if (!p.bot) continue;
      const delay = 1500 + Math.random() * 9000;
      this.later('rehearsal', delay, () => {
        const q = s.questions[qid];
        if (!q || q.status !== 'open' || q.answers[p.pid] !== undefined) return;
        q.answers[p.pid] = this.botAnswer(def, p, stageIdx);
      });
    }
  }

  botAnswer(def, p, stageIdx) {
    const pr = p.profile;
    if (def.kind === 'scale10') {
      if (def.track === 'shift') {
        return clamp(Math.round(4 + Math.random() * 6), 1, 10);
      }
      const raw = pr.base + Math.max(0, stageIdx - pr.knee) * pr.slope + pr.jitter();
      return clamp(Math.round(raw), 1, 10);
    }
    if (def.kind === 'timeline') {
      const idx = clamp(Math.round(pr.knee + (Math.random() - 0.4) * 2), 1, 6);
      return STAGES[idx - 1].id;
    }
    return REHEARSAL_TEXTS[Math.floor(Math.random() * REHEARSAL_TEXTS.length)];
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

    if (role === 'participant') {
      const q = this.publicQuestion(s.activeQuestion, pid);
      return {
        ...base,
        code: undefined,
        question: q && q.status !== 'idle' ? q : null,
        joined: !!s.participants[pid],
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

const REHEARSAL_TEXTS = [
  'כשאני מתחיל לתעדף מי מדבר ראשון במקום לענות לכולם',
  'כשאני מפסיק להסתכל על התמונה הגדולה ורק סוגר את מה שמולי',
  'כשאני מרגיש שאני מגיב במקום להוביל',
  'כשאני צריך לחזור על הקראה כי לא זכרתי מה אמרתי',
  'כשהידיים מסמנות סטריפים מהר יותר מהראש',
  'כשאני דוחה שיחת טלפון כי אין לי רגע פנוי',
  'כשאני מפסיק לתכנן קדימה שתי תנועות',
  'כשאני מגלה שאני לא זוכר איפה נמצאת תנועה שכבר טיפלתי בה',
  'כשאני מדבר מהר יותר בקשר',
  'כשכל מה שנכנס מרגיש דחוף באותה מידה',
  'כשאני מתחיל לכתוב לעצמי דברים שבדרך כלל אני זוכר',
  'כשאני מרגיש שאני לא רוצה שאף אחד יקרא לי עכשיו',
];

export { FLOW, STAGES, QUESTIONS, LOAD_TRACK };
