import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Distribution, TimelineReveal } from '../components/Charts.jsx';
import { useServerState, emit } from '../lib/socket.js';
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

function Confirm({ open, title, body, confirmLabel, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="modal-veil" onClick={onCancel}>
      <motion.div className="modal card" onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
        <h3 className="modal-title">{title}</h3>
        {body && <p className="modal-body">{body}</p>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>ביטול</button>
          <button className="btn btn-danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── ניהול ──────────────────────────────────────────────────────────────── */

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const { state } = useServerState(authed ? 'admin' : null);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(KEY_STORE);
    if (!saved) return;
    emit('admin:auth', { key: saved }).then((r) => { if (r.ok) setAuthed(true); });
  }, []);

  const cmd = useCallback((type, payload) => emit('admin:cmd', { type, payload }), []);

  if (!authed) return <Gate onOk={() => setAuthed(true)} />;
  if (!state) return <div className="live-boot">טוען…</div>;

  const rehearsal = state.mode === 'rehearsal';
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

  const dangerous = [
    {
      id: 'back', label: 'חזרה לשלב קודם', danger: true,
      title: 'לחזור שלב אחורה?',
      body: 'תמונת התנועה תיבנה מחדש עד השלב הקודם. תשובות שכבר נשלחו נשמרות ונשארות נעולות.',
      confirmLabel: 'חזור שלב אחורה', run: () => cmd('back'),
    },
    {
      id: 'reset', label: rehearsal ? 'אפס חזרה' : 'אפס Session', danger: true,
      title: rehearsal ? 'לאפס את החזרה?' : 'לאפס את ה־Session?',
      body: rehearsal
        ? 'כל נתוני החזרה יימחקו. נתוני הפעילות האמיתית אינם מושפעים.'
        : 'כל המשתתפים והתשובות יימחקו ותיפתח פעילות חדשה עם קוד חדש.',
      confirmLabel: 'אפס', run: () => cmd('resetSession'),
    },
    {
      id: 'end', label: 'סיום פעילות', danger: true,
      title: 'לסיים את הפעילות?',
      body: rehearsal ? 'החזרה תיסגר. נתוני חזרה אינם נשמרים.' : 'הפעילות תיסגר וה־Session יישמר לצפייה ולדוח.',
      confirmLabel: 'סיים ושמור', run: () => cmd('endSession'),
    },
  ];

  return (
    <div className="admin">
      {/* ─── סרגל עליון ─── */}
      <header className="a-top">
        <div className="a-brand">
          <span className="a-mark tech">0→100</span>
          <span className={`a-live tech${rehearsal ? ' reh' : ''}`}>{rehearsal ? 'REHEARSAL' : 'LIVE'}</span>
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
                <button className="a-menu-item" onClick={() => { setMenu(false); cmd('setMode', { mode: rehearsal ? 'live' : 'rehearsal' }); }}>
                  {rehearsal ? 'חזרה לפעילות אמיתית' : 'מצב חזרה'}
                </button>
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
              <button className="btn btn-ghost a-code-new" onClick={() => cmd('regenerateCode')}>קוד חדש</button>
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
            <h2 className="a-card-title">הפעילות הסתיימה</h2>
            <p className="a-card-sum">ה־Session נשמר. אפשר לפתוח את הדוח ולהוריד אותו כ־PDF.</p>
            <button className="btn btn-primary" onClick={openReport}>פתח דוח פעילות</button>
          </section>
        )}
      </div>

      {/* ─── הכפתור הגדול ─── */}
      <footer className="a-foot">
        <button className="btn btn-primary a-go" onClick={primary.action} disabled={primary.disabled}>
          {primary.label}
        </button>
      </footer>

      <Confirm open={!!confirm} title={confirm?.title} body={confirm?.body}
        confirmLabel={confirm?.confirmLabel}
        onCancel={() => setConfirm(null)}
        onConfirm={() => { confirm.run(); setConfirm(null); }} />
    </div>
  );
}

export { STAGES, ACTIVITY_TITLE };
