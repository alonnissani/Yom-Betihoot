import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STAGES, SCALE_LOW, SCALE_HIGH } from '@shared/scenario.js';

/* ─── סולם 1–10 ──────────────────────────────────────────────────────────── */

function Scale10({ value, onPick, disabled, low, high }) {
  return (
    <div className="scale">
      <div className="scale-grid">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" disabled={disabled}
            className={`scale-btn${value === n ? ' on' : ''}`}
            aria-pressed={value === n} aria-label={`${n}`}
            onClick={() => onPick(n)}>
            <span className="tech">{n}</span>
          </button>
        ))}
      </div>
      <div className="scale-legend">
        <span>{low || SCALE_LOW}</span>
        <span className="scale-arrow" aria-hidden="true" />
        <span>{high || SCALE_HIGH}</span>
      </div>
    </div>
  );
}

/* ─── בחירת נקודת שינוי על ציר השלבים ────────────────────────────────────── */

function TimelinePick({ value, onPick, disabled }) {
  return (
    <ol className="tl-pick">
      {STAGES.map((s) => (
        <li key={s.id}>
          <button type="button" disabled={disabled}
            className={`tl-item${value === s.id ? ' on' : ''}`}
            aria-pressed={value === s.id} onClick={() => onPick(s.id)}>
            <span className="tl-node" aria-hidden="true" />
            <span className="tl-num tech">{s.n}</span>
            <span className="tl-title">{s.title}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/* ─── שאלה פתוחה ─────────────────────────────────────────────────────────── */

function TextAnswer({ value, onChange, disabled, hint }) {
  return (
    <div className="text-answer">
      <textarea className="field" rows={3} maxLength={240} disabled={disabled}
        value={value || ''} placeholder={hint || 'במשפט אחד…'}
        onChange={(e) => onChange(e.target.value)} />
      <div className="text-count tech">{(value || '').length}/240</div>
    </div>
  );
}

/* ─── גיליון השאלה (Bottom Sheet) ────────────────────────────────────────── */

export default function QuestionSheet({ question, onSubmit }) {
  const [draft, setDraft] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { setDraft(null); setError(null); }, [question?.id]);

  if (!question) return null;
  const answered = question.myAnswer !== null && question.myAnswer !== undefined;
  const closed = question.status !== 'open';
  const locked = answered || closed;

  const canSend = !locked && !sending &&
    (question.kind === 'text' ? String(draft || '').trim().length > 0 : draft !== null);

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    const res = await onSubmit(question.id, draft);
    setSending(false);
    if (!res?.ok) setError(res?.reason === 'closed' ? 'ההצבעה נסגרה' : 'לא הצלחנו לשלוח. נסה שוב.');
  };

  return (
    <motion.div className="sheet" role="dialog" aria-label={question.text}
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 34 }}>
      <div className="sheet-handle" aria-hidden="true" />
      <div className="sheet-body scroll-y">
        <AnimatePresence mode="wait">
          {answered ? (
            <motion.div key="done" className="sheet-done"
              initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="done-check">✓</div>
              <div className="done-title">התשובה נקלטה</div>
              <div className="done-sub">
                {closed ? 'ההצבעה נסגרה.' : 'לא ניתן לשנות את התשובה.'}
              </div>
            </motion.div>
          ) : closed ? (
            <motion.div key="closed" className="sheet-done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="done-check muted">—</div>
              <div className="done-title">ההצבעה נסגרה</div>
              <div className="done-sub">ממתינים להמשך התרחיש.</div>
            </motion.div>
          ) : (
            <motion.div key="ask" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="sheet-q">{question.text}</h2>
              {question.kind === 'scale10' && (
                <Scale10 value={draft} onPick={setDraft} disabled={locked}
                  low={question.low} high={question.high} />
              )}
              {question.kind === 'timeline' && <TimelinePick value={draft} onPick={setDraft} disabled={locked} />}
              {question.kind === 'text' && (
                <TextAnswer value={draft} onChange={setDraft} disabled={locked} hint={question.hint} />
              )}
              {error && <div className="sheet-error">{error}</div>}
              <button type="button" className="btn btn-primary btn-block btn-lg sheet-send"
                disabled={!canSend} onClick={send}>
                {sending ? 'שולח…' : 'שלח תשובה'}
              </button>
              <div className="sheet-foot">התשובות אנונימיות. לאחר שליחה לא ניתן לשנות.</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
