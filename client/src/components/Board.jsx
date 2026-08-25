import { useEffect, useRef, useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import RunwayDiagram from './RunwayDiagram.jsx';

/* ─── סטריפ בודד ─────────────────────────────────────────────────────────── */

function Strip({ s }) {
  const prevRev = useRef(s.rev);
  const [flash, setFlash] = useState(false);

  // ההדגשה נדלקת רק כשה־rev של הסטריפ באמת התקדם. ב־mount (רענון, חיבור
  // מחדש, פתיחת מסך נוסף) ה־ref מאותחל לערך הנוכחי ולכן שום דבר לא מהבהב.
  useEffect(() => {
    if (s.rev !== prevRev.current) {
      prevRev.current = s.rev;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 2600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [s.rev]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10, scaleY: 0.86 }}
      animate={{ opacity: 1, y: 0, scaleY: 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: -7, transition: { duration: 0.28 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }}
      className={`strip k-${s.kind}${flash ? ' flash' : ''}${s.emergency ? ' emergency' : ''}`}
      style={{ transformOrigin: 'top' }}
    >
      {s.pending && !s.emergency && <span className="strip-pending" aria-hidden="true" />}
      <div className="strip-top">
        <span className="strip-cs">{s.callsign}</span>
        {s.acType && <span className="strip-type">{s.acType}</span>}
        {s.pos && <span className="strip-pos">{s.pos}</span>}
      </div>
      {s.emergency && <div className="strip-mayday">MAYDAY</div>}
      {s.note && <div className="strip-note">{s.note}</div>}
      {s.request && <div className="strip-req">{s.request}</div>}
    </motion.div>
  );
}

/* ─── ההתפתחות הנוכחית ───────────────────────────────────────────────────── */

function CurrentDevelopment({ current }) {
  return (
    <motion.div className={`cur k-${current.kind || 'local'}`}
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
      <div className="cur-tag">התפתחות אחרונה</div>
      <div className="cur-body">
        <span className="cur-cs">{current.callsign}</span>
        <span className="cur-line">{current.line}</span>
      </div>
    </motion.div>
  );
}

/* ─── שכבות אירוע ────────────────────────────────────────────────────────── */

const ovMotion = {
  initial: { opacity: 0, y: -14, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.97, transition: { duration: 0.3 } },
  transition: { type: 'spring', stiffness: 380, damping: 30 },
};

function Overlay({ o }) {
  if (o.kind === 'phone') {
    return (
      <motion.div {...ovMotion} className="ov ov-phone" layout>
        <div className="ov-phone-icon">📞</div>
        <div>
          {o.state === 'ringing' ? (
            <div className="ov-phone-title">שיחה נכנסת</div>
          ) : (
            <>
              <div className="ov-phone-cs">{o.callsign}</div>
              <ul className="ov-lines">
                {(o.lines || []).map((l, i) => (
                  <motion.li key={l} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12 + i * 0.16 }}>{l}</motion.li>
                ))}
              </ul>
            </>
          )}
        </div>
      </motion.div>
    );
  }
  if (o.kind === 'birds') {
    return (
      <motion.div {...ovMotion} className="ov ov-birds" layout>
        <div className="ov-title tech">{o.title}</div>
        <div className="ov-vals">
          {(o.lines || []).map((l) => <span key={l} className="tech">{l}</span>)}
        </div>
      </motion.div>
    );
  }
  if (o.kind === 'mayday') {
    const banner = o.phase === 'banner';
    return (
      <motion.div {...ovMotion} layout className={`ov ov-mayday${banner ? ' banner' : ''}`}>
        <div className="m-word">MAYDAY</div>
        <div className="m-cs">{o.callsign}</div>
        <div className="m-lines">
          {(o.lines || []).map((l) => <div key={l} className="m-line">{l}</div>)}
        </div>
      </motion.div>
    );
  }
  return null;
}

/* ─── הלוח ───────────────────────────────────────────────────────────────── */

export default function Board({ board, stageNumber, stageCount, stageTitle, variant = 'participant', tight = false }) {
  const strips = board?.strips || [];
  const overlays = board?.overlays || [];
  const current = board?.current || null;
  const arr = strips.filter((s) => s.kind === 'arr');
  const dep = strips.filter((s) => s.kind !== 'arr');

  const density = useMemo(() => {
    const max = Math.max(arr.length, dep.length) + (tight ? 2 : 0);
    if (max >= 5) return 'dense';
    if (max >= 3) return 'compact';
    return '';
  }, [arr.length, dep.length, tight]);

  const activePositions = useMemo(() => strips.map((s) => s.pos).filter(Boolean), [strips]);
  const birdsActive = overlays.some((o) => o.kind === 'birds');

  return (
    <div className={`board ${density} board-${variant}`}>
      <div className="board-head">
        <div className="stage-pill">
          {stageNumber ? (
            <>
              <span className="tech">{stageNumber}/{stageCount}</span>
              <span className="stage-name">{stageTitle}</span>
            </>
          ) : (
            <span className="stage-name">תמונת התנועה</span>
          )}
        </div>
        <div className="board-clock tech">RAMON · LLER</div>
      </div>

      <div className="overlay-stack">
        <AnimatePresence initial={false}>
          {overlays.map((o) => <Overlay key={o.id} o={o} />)}
        </AnimatePresence>
        {/* ללא AnimatePresence בכוונה: ה־key מחליף את הכרטיס באותו render,
            כך שתמיד קיים בדיוק אחד. אנימציית יציאה הייתה תלויה ב־rAF, ובטאב
            שאינו בחזית (מסך ההקרנה) הדפדפן מאט אותו — מה שהשאיר שם את
            ההתפתחות הקודמת. הכניסה עדיין מונפשת. */}
        {current && <CurrentDevelopment key={`cur-${current.seq}`} current={current} />}
      </div>

      <div className="board-grid">
        <div className="lane lane-arr">
          <div className="lane-head">
            <span className="swatch" />נחיתות
            <span className="count tech">{arr.length}</span>
          </div>
          <div className="lane-body">
            <AnimatePresence initial={false}>
              {arr.map((s) => <Strip key={s.id} s={s} />)}
            </AnimatePresence>
          </div>
        </div>

        <RunwayDiagram active={activePositions} birds={birdsActive} />

        <div className="lane lane-dep">
          <div className="lane-head">
            <span className="swatch" />המראות ומקומיות
            <span className="count tech">{dep.length}</span>
          </div>
          <div className="lane-body">
            <AnimatePresence initial={false}>
              {dep.map((s) => <Strip key={s.id} s={s} />)}
            </AnimatePresence>
          </div>
        </div>
      </div>

    </div>
  );
}
