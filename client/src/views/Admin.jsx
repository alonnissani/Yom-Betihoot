import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Distribution, TimelineReveal } from '../components/Charts.jsx';
import ParticipantPreview from '../components/ParticipantPreview.jsx';
import { useServerState, emit, readAdminToken, clearAdminToken } from '../lib/socket.js';
import { ACTIVITY_TITLE, STAGES } from '@shared/scenario.js';

const KEY_STORE = 'z2h.adminKey';

/* ─── שער כניסה ──────────────────────────────────────────────────────────── */

function Gate({ onOk }) {
  const [key, setKey] = useState('');
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(false);
    const res = await emit('admin:auth', { key });
    setBusy(false);
    if (res.ok) { sessionStorage.setItem(KEY_STORE, key); onOk(key); }
    else setErr(true);
  };

  return (
    <div className="gate">
      <form className="gate-form card" onSubmit={submit}>
        <div className="gate-brand tech">0→100 · CONTROL</div>
        <label className="entry-label" htmlFor="k">מפתח מנחה</label>
        <input id="k" className="field" type="password" value={key} autoComplete="off"
          onChange={(e) => setKey(e.target.value)} />
        {err && <div className="sheet-error">מפתח שגוי.</div>}
        <button className="btn btn-primary btn-block" disabled={busy || !key}>כניסה</button>
      </form>
    </div>
  );
}

/* ─── אישור לפעולה מסוכנת ────────────────────────────────────────────────── */

function Confirm({ open, title, body, confirmLabel, tone = 'danger', onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="modal-veil" onClick={onCancel}>
      <motion.div className="modal card" onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
        <h3 className="modal-title">{title}</h3>
        {body && <p className="modal-body">{body}</p>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>ביטול</button>
          <button className={`btn btn-${tone === 'danger' ? 'danger' : 'primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── בדיקות וחזרה ───────────────────────────────────────────────────────── */

const SPEEDS = [
  { ms: 3000, label: '3 שניות' },
  { ms: 5000, label: '5 שניות' },
  { ms: 10000, label: '10 שניות' },
];

/**
 * הספירה לאחור עד הפעולה הבאה.
 * השרת שולח את הזמן שנותר בכל שידור; כאן רק מורידים ממנו מקומית, כדי
 * שהמספר יזוז כל שנייה בלי לשדר עשרות הודעות מיותרות לכל המכשירים.
 */
function Countdown({ msLeft, paused, done }) {
  const [left, setLeft] = useState(msLeft);

  useEffect(() => { setLeft(msLeft); }, [msLeft]);
  useEffect(() => {
    if (paused || done) return undefined;
    const id = setInterval(() => setLeft((v) => Math.max(0, v - 250)), 250);
    return () => clearInterval(id);
  }, [paused, done, msLeft]);

  if (done) return <span className="sim-count-done">הסתיימה</span>;
  if (paused) return <span className="sim-count-done">מושהית</span>;
  return <span className="sim-count tech">{Math.max(0, Math.ceil(left / 1000))}</span>;
}

/** אזור הבדיקות: חזרה ידנית וסימולציה מלאה זו לצד זו. */
function TestingSection({ rehearsal, liveStarted, speed, onSpeed, onToggleRehearsal, onRunSim }) {
  return (
    <section className="a-test card">
      <header className="a-test-head">
        <h2 className="a-test-title">בדיקות וחזרה</h2>
        <p className="a-test-sub">שני מצבים נפרדים. שניהם על נתוני דמה בלבד.</p>
      </header>

      <div className="a-test-grid">
        <article className={`a-test-tile${rehearsal ? ' on' : ''}`}>
          <div className="a-test-tile-title">חזרה ידנית</div>
          <p className="a-test-tile-body">
            אתה מתקדם, פותח וסוגר הצבעות וחושף תוצאות בעצמך, בדיוק כמו בפעילות.
            עם ההתחלה נוצרים 20 משתתפי דמה שעונים לבד.
          </p>
          <button className="btn" onClick={onToggleRehearsal}>
            {rehearsal ? 'צא ממצב חזרה' : 'עבור למצב חזרה'}
          </button>
        </article>

        <article className="a-test-tile">
          <div className="a-test-tile-title">סימולציה מלאה</div>
          <p className="a-test-tile-body">
            המערכת מריצה לבד את כל התרחיש מההתחלה ועד מסך הסיום, עם 20 משתתפי
            דמה שמצביעים בהדרגה. אתה רק צופה.
          </p>
          <div className="a-test-speed">
            <span className="a-test-speed-l">מהירות</span>
            {SPEEDS.map((sp) => (
              <button key={sp.ms} type="button"
                className={`a-speed${speed === sp.ms ? ' on' : ''}`}
                aria-pressed={speed === sp.ms}
                onClick={() => onSpeed(sp.ms)}>{sp.label}</button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={onRunSim} disabled={liveStarted}>
            ▶  הרץ סימולציה מלאה
          </button>
          {liveStarted && (
            <p className="a-test-lock">
              הפעילות האמיתית כבר התחילה. סימולציה תחליף את מה שרואים כל
              המשתתפים — אפס את ה־Session כדי לאפשר אותה.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}

/** שורת הבקרה שמחליפה את הכפתור הגדול בזמן סימולציה. */
function SimBar({ sim, cmd, onStop }) {
  return (
    <div className="sim-bar">
      <div className="sim-status">
        <span className="sim-badge tech">SIMULATION MODE</span>
        <span className="sim-step">שלב <b className="tech">{sim.step}</b> מתוך <b className="tech">{sim.steps}</b></span>
        <span className="sim-next">
          {sim.done ? 'הסימולציה הסתיימה' : 'הפעולה הבאה בעוד'}
          {!sim.done && <Countdown msLeft={sim.msLeft} paused={sim.paused} done={sim.done} />}
        </span>
      </div>
      <div className="sim-actions">
        {!sim.done && (
          <button className="btn sim-btn" onClick={() => cmd(sim.paused ? 'simResume' : 'simPause')}>
            {sim.paused ? '▶  המשך' : '⏸  השהה'}
          </button>
        )}
        {!sim.done && <button className="btn sim-btn" onClick={() => cmd('simSkip')}>⏭  דלג</button>}
        <button className="btn btn-danger sim-btn" onClick={onStop}>■  עצור ונקה</button>
      </div>
    </div>
  );
}

const SIM_CONFIRM = (run) => ({
  title: 'להריץ סימולציה מלאה?',
  body: 'הסימולציה משתמשת בנתוני דמה בלבד ולא משפיעה על הפעילות האמיתית. '
    + 'התרחיש כולו ירוץ לבד מההתחלה ועד מסך הסיום, ובסיומה נתוני הדמה יימחקו.',
  confirmLabel: 'התחל סימולציה',
  tone: 'primary',
  run,
});

const NEW_SESSION = (testMode, run) => ({
  title: testMode ? 'להתחיל מחדש?' : 'לפתוח פעילות חדשה?',
  body: testMode
    ? 'נתוני הדמה יימחקו ותיפתח ריצה חדשה.'
    : 'הפעילות שהסתיימה תישמר לדוחות, ואז ייפתח לובי חדש עם אותו קוד. '
      + 'המסכים של כל המשתתפים יחזרו למסך הכניסה.',
  confirmLabel: testMode ? 'התחל מחדש' : 'פתח פעילות חדשה',
  tone: 'primary',
  run,
});

const SIM_STOP = (run) => ({
  title: 'לעצור את הסימולציה?',
  body: 'כל 20 משתתפי הדמה והתשובות שלהם יימחקו, והמסך יחזור לפעילות האמיתית.',
  confirmLabel: 'עצור ונקה',
  run,
});

/* ─── ניהול ──────────────────────────────────────────────────────────────── */

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const { state } = useServerState(authed ? 'admin' : null);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [speed, setSpeed] = useState(5000);

  useEffect(() => {
    const token = readAdminToken();
    if (token) {
      emit('admin:auth', { token }).then((r) => {
        if (r.ok) setAuthed(true);
        // מוחקים רק כשהשרת דחה במפורש, לא על כשל תקשורת חולף
        else if (!r.reason) clearAdminToken();
      });
      return;
    }
    const saved = sessionStorage.getItem(KEY_STORE);
    if (saved) emit('admin:auth', { key: saved }).then((r) => { if (r.ok) setAuthed(true); });
  }, []);

  const cmd = useCallback((type, payload) => emit('admin:cmd', { type, payload }), []);

  if (!authed) return <Gate onOk={() => setAuthed(true)} />;
  if (!state) return <div className="live-boot">טוען…</div>;

  const rehearsal = state.mode === 'rehearsal';
  const sim = state.simulation;
  // אזור הבדיקות נעלם ברגע שהפעילות האמיתית רצה, כדי שאי אפשר יהיה
  // למשוך עשרים טלפונים אל תוך תרחיש דמה באמצע יום הבטיחות.
  const showTesting = !state.liveStarted || state.mode !== 'live';
  const q = state.question;
  const qOpen = q && q.status === 'open';
  const qClosed = q && q.status === 'closed';
  const qRevealed = q && q.status === 'revealed';
  const atEnd = state.cursor >= state.flowLength - 1 && !q;

  let primary = { label: '▶  הפעל התפתחות הבאה', action: () => cmd('advance'), disabled: atEnd };
  if (state.status === 'lobby') primary = { label: '▶  התחל פעילות', action: () => cmd('start'), disabled: false };
  else if (qOpen) primary = { label: '■  סגור הצבעה', action: () => cmd('closeQuestion'), disabled: false };
  else if (qClosed) primary = { label: '←  המשך ללא חשיפה', action: () => cmd('advance'), disabled: false };
  else if (qRevealed) primary = { label: '←  המשך', action: () => cmd('advance'), disabled: false };
  else if (atEnd) primary = { label: 'התרחיש הסתיים', action: () => {}, disabled: true };

  const openLive = () => window.open('/live', '_blank', 'noopener');

  const openReport = () => {
    const key = sessionStorage.getItem(KEY_STORE) || '';
    window.open(`/report?key=${encodeURIComponent(key)}`, '_blank', 'noopener');
  };

  // בסימולציה ובחזרה הניסוח חייב להיות של נתוני דמה, אחרת המנחה יקרא
  // "כל המשתתפים והתשובות יימחקו" בזמן שהוא מסתכל על תרחיש בדיקה.
  const testMode = rehearsal || !!sim;
  const dangerous = [
    {
      id: 'back', label: 'חזרה לשלב קודם', danger: true,
      title: 'לחזור שלב אחורה?',
      body: 'תמונת התנועה תיבנה מחדש עד השלב הקודם. תשובות שכבר נשלחו נשמרות ונשארות נעולות.',
      confirmLabel: 'חזור שלב אחורה', run: () => cmd('back'),
    },
    {
      id: 'reset', label: testMode ? 'אפס נתוני בדיקה' : 'אפס Session', danger: true,
      title: testMode ? 'לאפס את נתוני הבדיקה?' : 'לאפס את ה־Session?',
      body: testMode
        ? 'כל נתוני הדמה יימחקו. נתוני הפעילות האמיתית אינם מושפעים.'
        : 'כל המשתתפים והתשובות יימחקו ותיפתח פעילות חדשה עם קוד חדש.',
      confirmLabel: 'אפס', run: () => cmd('resetSession'),
    },
    {
      id: 'end', label: 'סיום פעילות', danger: true,
      title: 'לסיים את הפעילות?',
      body: testMode ? 'הריצה תיסגר. נתוני דמה אינם נשמרים.' : 'הפעילות תיסגר וה־Session יישמר לצפייה ולדוח.',
      confirmLabel: 'סיים ושמור', run: () => cmd('endSession'),
    },
  ];

  return (
    <div className="admin">
      {/* ─── סרגל עליון ─── */}
      <header className="a-top">
        <div className="a-brand">
          <span className="a-mark tech">0→100</span>
          <span className={`a-live tech${sim ? ' sim' : rehearsal ? ' reh' : ''}`}>
            {sim ? 'SIMULATION' : rehearsal ? 'REHEARSAL' : 'LIVE'}
          </span>
        </div>
        <div className="a-meta">
          <span className="a-chip"><span className="dot-live" /><b className="tech">{state.connected}</b> מחוברים</span>
          {state.stageNumber && (
            <span className="a-chip">שלב <b className="tech">{state.stageNumber}/{state.stageCount}</b></span>
          )}
          {state.status === 'lobby' && <span className="a-chip">קוד <b className="tech">{state.code}</b></span>}
        </div>
        <button className="btn btn-ghost a-screen-btn" onClick={openLive}>
          <span aria-hidden="true">🖥</span> מסך הקרנה
        </button>
        <div className="a-menu-wrap">
          <button className="btn btn-ghost a-menu-btn" onClick={() => setMenu((v) => !v)} aria-label="תפריט">⋯</button>
          <AnimatePresence>
            {menu && (
              <motion.div className="a-menu card" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}>
                <button className="a-menu-item" onClick={() => { setMenu(false); openReport(); }}>דוח פעילות</button>
                <div className="a-menu-sep" />
                {dangerous.map((d) => (
                  <button key={d.id} className="a-menu-item danger"
                    onClick={() => { setMenu(false); setConfirm(d); }}>{d.label}</button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="a-body">
        {/* ─── לובי ─── */}
        {state.status === 'lobby' ? (
          <section className="a-lobby card">
            <div className="a-lobby-code">
              <div className="eyebrow">קוד פעילות</div>
              <div className="a-code tech">{state.code}</div>
            </div>
            <div className="a-lobby-count">
              <div className="a-count-n tech">{state.participants}</div>
              <div className="a-count-l">משתתפים מחוברים</div>
            </div>
            <button className="btn a-lobby-live" onClick={openLive}>
              <span aria-hidden="true">🖥</span> פתח מסך הקרנה בטאב חדש
            </button>
            <p className="a-lobby-note">
              {rehearsal
                ? 'מצב חזרה: עם הלחיצה ייווצרו 20 משתתפי דמה שיענו לבד. נתוני החזרה מופרדים לחלוטין.'
                : 'לחיצה על "התחל פעילות" נועלת את הלובי. לא ניתן להצטרף לאחר מכן.'}
            </p>
          </section>
        ) : (
          <>
            {/* ─── עכשיו / הבא ─── */}
            <section className="a-flow">
              <article className="a-card now card">
                <div className="eyebrow">עכשיו</div>
                <h2 className="a-card-title">{state.current?.label || '—'}</h2>
                {state.current?.summary && <p className="a-card-sum">{state.current.summary}</p>}
              </article>
              <article className="a-card next card">
                <div className="eyebrow">הבא</div>
                <h2 className="a-card-title">{state.next?.label || 'סוף התרחיש'}</h2>
                {state.next?.summary && <p className="a-card-sum">{state.next.summary}</p>}
              </article>
            </section>

            {state.current?.note && (
              <aside className="a-note">
                <div className="a-note-tag">למנחה בלבד</div>
                <p>{state.current.note}</p>
              </aside>
            )}
          </>
        )}

        {/* ─── לוח הצבעה ─── */}
        <AnimatePresence>
          {q && (
            <motion.section className="a-vote card" initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="a-vote-head">
                <div>
                  <div className="eyebrow">{q.adminTitle}</div>
                  <div className="a-vote-q">{q.text}</div>
                </div>
                <div className={`a-vote-count tech${state.counts?.answered >= state.counts?.total ? ' full' : ''}`}>
                  {state.counts?.answered}/{state.counts?.total}
                  <span className="a-vote-count-l">ענו</span>
                </div>
              </div>

              {state.stats?.kind === 'scale10' && (
                <Distribution dist={state.stats.dist} avg={state.stats.avg} compact />
              )}
              {state.stats?.kind === 'timeline' && (
                <div className="a-tl-preview"><TimelineReveal dist={state.stats.dist} animate={false} /></div>
              )}
              {state.stats?.kind === 'text' && (
                <ul className="a-texts scroll-y">
                  {state.stats.texts.length === 0 && <li className="muted">אין תשובות עדיין</li>}
                  {state.stats.texts.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              )}

              <div className="a-vote-actions">
                {(qClosed || qRevealed) && (
                  <button className={`btn${qRevealed ? '' : ' btn-primary'}`}
                    onClick={() => cmd(qRevealed ? 'hideReveal' : 'revealQuestion')}>
                    {qRevealed ? 'הסתר תוצאות' : '👁  חשוף תוצאות'}
                  </button>
                )}
                <span className="a-vote-hint">
                  {qOpen ? 'התוצאות גלויות לך בלבד. המשתתפים והמסך אינם רואים אותן.'
                    : qRevealed ? 'התוצאות מוצגות עכשיו על מסך ההקרנה.'
                      : 'ההצבעה סגורה. ברירת המחדל היא להמשיך ללא חשיפה.'}
                </span>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {state.status === 'ended' && (
          <section className="a-ended card">
            <h2 className="a-card-title">{testMode ? 'הריצה הסתיימה' : 'הפעילות הסתיימה'}</h2>
            <p className="a-card-sum">
              {testMode
                ? 'אלה נתוני דמה: הם אינם נשמרים ואינם מופיעים ברשימת הפעילויות. אפשר לפתוח את הדוח כדי לראות איך הוא ייראה.'
                : 'אפשר לפתוח את הדוח ולהוריד אותו כ־PDF. כדי לרוץ שוב — פתח פעילות חדשה, '
                  + 'והפעילות הזו תישמר לדוחות לפני שהלובי נפתח מחדש.'}
            </p>
            <div className="a-ended-actions">
              <button className="btn btn-primary" onClick={() => setConfirm(NEW_SESSION(testMode, () => cmd('newSession')))}>
                ▶  {testMode ? 'התחל מחדש' : 'פתח פעילות חדשה'}
              </button>
              <button className="btn" onClick={openReport}>
                {testMode ? 'פתח דוח לדוגמה' : 'פתח דוח פעילות'}
              </button>
            </div>
          </section>
        )}
        {showTesting && !sim && (
          <TestingSection
            rehearsal={rehearsal}
            liveStarted={state.liveStarted}
            speed={speed}
            onSpeed={setSpeed}
            onToggleRehearsal={() => cmd('setMode', { mode: rehearsal ? 'live' : 'rehearsal' })}
            onRunSim={() => setConfirm(SIM_CONFIRM(() => cmd('startSimulation', { speed })))}
          />
        )}

        <ParticipantPreview state={state.participantView} />
      </div>

      {/* ─── הכפתור הגדול ─── */}
      <footer className={`a-foot${sim ? ' sim' : ''}`}>
        {sim ? (
          <SimBar sim={sim} cmd={cmd} onStop={() => setConfirm(SIM_STOP(() => cmd('simStop')))} />
        ) : (
          <button className="btn btn-primary a-go" onClick={primary.action} disabled={primary.disabled}>
            {primary.label}
          </button>
        )}
      </footer>

      <Confirm open={!!confirm} title={confirm?.title} body={confirm?.body}
        confirmLabel={confirm?.confirmLabel} tone={confirm?.tone}
        onCancel={() => setConfirm(null)}
        onConfirm={() => { confirm.run(); setConfirm(null); }} />
    </div>
  );
}

export { STAGES, ACTIVITY_TITLE };
