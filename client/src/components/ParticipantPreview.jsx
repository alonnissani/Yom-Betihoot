import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ParticipantStage } from '../views/Participant.jsx';

/**
 * תצוגת משתתף בזמן אמת, בתוך מסך המנחה.
 * לא הדמיה ולא צילום: אותו state מהשרת ואותו רכיב ParticipantStage שרץ
 * בטלפונים. הוא מוצג במסגרת בגודל טלפון שמוקטנת לרוחב הזמין, כדי שמה
 * שנראה כאן יהיה בדיוק מה שנראה שם.
 */

const FRAME_W = 390;
const FRAME_H = 780;

function ScaledFrame({ state, maxHeight }) {
  const boxRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const fit = () => {
      const w = box.clientWidth;
      const byWidth = w / FRAME_W;
      const byHeight = maxHeight ? maxHeight / FRAME_H : Infinity;
      setScale(Math.max(0.28, Math.min(byWidth, byHeight, 1.6)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, [maxHeight]);

  return (
    <div className="pv-box" ref={boxRef} style={{ height: `${FRAME_H * scale}px` }}>
      <div className="pv-frame"
        style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})` }}>
        {state ? <ParticipantStage state={state} onSubmit={() => {}} readOnly />
          : <div className="pv-empty">ממתין לנתונים…</div>}
      </div>
    </div>
  );
}

export default function ParticipantPreview({ state }) {
  const [expanded, setExpanded] = useState(false);
  const close = useCallback(() => setExpanded(false), []);

  useEffect(() => {
    if (!expanded) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded, close]);

  return (
    <section className="pv card">
      <header className="pv-head">
        <div className="pv-title">
          <span className="dot-live" aria-hidden="true" />
          תצוגת משתתף בזמן אמת
        </div>
        <div className="pv-sub">זה מה שהמשתתפים רואים כרגע</div>
        <button type="button" className="btn btn-ghost pv-expand" onClick={() => setExpanded(true)}>
          הגדל תצוגה
        </button>
      </header>
      <ScaledFrame state={state} />

      {expanded && createPortal(
        <div className="pv-modal" onClick={close}>
          <div className="pv-modal-inner" onClick={(e) => e.stopPropagation()}>
            <div className="pv-modal-bar">
              <span className="pv-title"><span className="dot-live" aria-hidden="true" />תצוגת משתתף בזמן אמת</span>
              <button type="button" className="btn btn-ghost" onClick={close}>סגור</button>
            </div>
            <ScaledFrame state={state} maxHeight={Math.max(320, window.innerHeight - 150)} />
          </div>
        </div>,
        document.body,
      )}
    </section>
  );
}
