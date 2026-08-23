import { useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import TowerScene from '../components/TowerScene.jsx';
import Board from '../components/Board.jsx';
import QuestionSheet from '../components/Question.jsx';
import RevealPanel, { hasReveal } from '../components/Reveal.jsx';
import { useServerState, emit, readToken, writeToken, clearToken, writeAdminToken } from '../lib/socket.js';
import { ACTIVITY_TITLE, EVENT_TITLE, STAGES, REVEAL_COPY, JOIN_CODE } from '@shared/scenario.js';

/** קוד ספרתי -> מקלדת מספרים בטלפון. נגזר מהקוד עצמו כדי שיישאר נכון אם ישתנה. */
const NUMERIC_CODE = /^\d+$/.test(JOIN_CODE);

const JOIN_ERRORS = {
  'bad-code': 'קוד שגוי. בדוק את הקוד שעל המסך.',
  locked: 'הפעילות כבר החלה ולא ניתן להצטרף בשלב זה.',
  timeout: 'החיבור איטי. נסה שוב.',
};

/* ─── מסך הכניסה הממותג ──────────────────────────────────────────────────── */

function EntryShell({ children, disconnected = false }) {
  return (
    <div className="entry">
      {disconnected && <div className="conn-bar">אין חיבור — מתחברים מחדש…</div>}
      <TowerScene />
      <header className="entry-top">
        <div className="entry-event">{EVENT_TITLE}</div>
        <div className="entry-rule" />
      </header>
      <div className="entry-mid">
        <h1 className="entry-title">{ACTIVITY_TITLE}</h1>
        <div className="entry-sub">תרחיש בטיחות אינטראקטיבי</div>
        <div className="entry-badge">EILAT · RAMON CONTROL TOWER</div>
      </div>
      <div className="entry-bottom">{children}</div>
    </div>
  );
}

function JoinForm({ onJoin }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true); setError(null);
    const res = await onJoin(code.trim());
    if (res.ok) return;                       // ניווט מתבצע בקורא
    setBusy(false);
    setError(JOIN_ERRORS[res.reason] || 'לא הצלחנו לחבר אותך. נסה שוב.');
  };

  return (
    <>
      <form className="entry-form" onSubmit={submit}>
        <label className="entry-label" htmlFor="code">קוד פעילות</label>
        <input id="code" className="field entry-code tech" value={code} autoComplete="off"
          inputMode={NUMERIC_CODE ? 'numeric' : 'text'}
          autoCapitalize="characters" spellCheck="false" maxLength={8}
          onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy || !code.trim()}>
          {busy ? 'מתחבר…' : 'כניסה לפעילות'}
        </button>
        <div className="entry-note">אין צורך בשם, מספר עובד או זיהוי אישי.</div>
      </form>
      <AnimatePresence>
        {error && (
          <motion.div className="entry-error" initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{error}</motion.div>
        )}
      </AnimatePresence>
      <div className="anon-note">התשובות בפעילות אנונימיות.</div>
    </>
  );
}

function Waiting({ onLeave }) {
  return (
    <>
      <div className="waiting">
        <div className="waiting-check">✓</div>
        <div className="waiting-title">התחברת לפעילות</div>
        <div className="waiting-sub">ממתינים לתחילת התרחיש…</div>
        <div className="waiting-dots" aria-hidden="true"><i /><i /><i /></div>
      </div>
      <div className="anon-note">התשובות בפעילות אנונימיות.</div>
      <div className="entry-links">
        <button type="button" className="leave-link" onClick={onLeave}>יציאה מהפעילות</button>
      </div>
    </>
  );
}

export function Closing() {
  return (
    <div className="closing closing-participant">
      {REVEAL_COPY.closing.map((line, i) => (
        <motion.div key={line} className={`closing-line${i === REVEAL_COPY.closing.length - 1 ? ' last' : ''}`}
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 + i * 0.5, duration: 0.75 }}>{line}</motion.div>
      ))}
    </div>
  );
}

/* ─── במה משותפת ─────────────────────────────────────────────────────────────
   זהו בדיוק מה שהמשתתף רואה. הוא מוצג גם בטלפון וגם בתוך מסך המנחה,
   מאותו state ומאותם רכיבים, כדי שלא ייתכן פער בין השניים.
   ─────────────────────────────────────────────────────────────────────────── */

export function ParticipantStage({ state, onSubmit, readOnly = false, disconnected = false }) {
  const stage = STAGES.find((s) => s.n === state.stageNumber);
  const q = state.question;
  const showSheet = q && (q.status === 'open' || q.status === 'closed');
  const showReveal = !showSheet && hasReveal(state);
  // מפתח יציב לאורך שלבי הגרף (traj1..traj4): הקווים נשארים על המסך
  // והממוצע והמסר מצטרפים אליהם, במקום שהגרף ייבנה מחדש בכל שלב.
  const revealKey = q && q.status === 'revealed' ? `q-${q.id}` : 'traj';

  if (state.status === 'ended' && state.reveal === 'closing') return <Closing />;

  return (
    <div className="p-shell">
      {disconnected && <div className="conn-bar">אין חיבור — מתחברים מחדש…</div>}
      <div className="p-board">
        <Board board={state.board} stageNumber={state.stageNumber} stageCount={state.stageCount}
          stageTitle={stage?.title} variant="participant" tight={!!showSheet} />
      </div>
      <AnimatePresence>
        {showReveal && <RevealPanel key={revealKey} state={state} />}
        {showSheet && (
          <QuestionSheet key={q.id} question={q} onSubmit={onSubmit} readOnly={readOnly} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── התצוגה ─────────────────────────────────────────────────────────────── */

export default function Participant() {
  const [token, setToken] = useState(() => readToken());
  const hello = useMemo(() => ({ token: token?.pid, sessionId: token?.sessionId }), [token]);
  const { state, connected } = useServerState('participant', hello);

  const join = useCallback(async (code) => {
    const saved = readToken();
    const res = await emit('join', { code, token: saved?.pid, sessionId: saved?.sessionId });
    // קוד המנחה מזוהה בשרת. הלקוח מקבל אסימון אטום ועובר למסך הניהול.
    if (res.ok && res.admin) {
      writeAdminToken(res.token);
      window.location.assign('/admin');
      return res;
    }
    if (res.ok) {
      const next = { pid: res.pid, sessionId: res.sessionId };
      writeToken(next);
      setToken(next);
    }
    return res;
  }, []);

  const submit = useCallback((qid, value) => emit('submit', { qid, value }), []);

  const leave = useCallback(async () => {
    const res = await emit('leave');
    if (res?.ok) { clearToken(); setToken(null); }
    return res;
  }, []);

  if (!state) {
    return <EntryShell><div className="waiting"><div className="waiting-dots"><i /><i /><i /></div></div></EntryShell>;
  }

  if (!state.joined) return <EntryShell disconnected={!connected}><JoinForm onJoin={join} /></EntryShell>;
  if (state.status === 'lobby') {
    return (
      <EntryShell disconnected={!connected}>
        <Waiting onLeave={leave} />
      </EntryShell>
    );
  }

  return <ParticipantStage state={state} onSubmit={submit} disconnected={!connected} />;
}
