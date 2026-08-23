import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STAGES, REVEAL_COPY } from '@shared/scenario.js';

/* ═══ Reveal 1 · נקודת השינוי על ציר השלבים ══════════════════════════════ */

const TL = { w: 1000, h: 360, y: 268, x0: 96, x1: 904 };

export function TimelineReveal({ dist = [], animate = true }) {
  const total = dist.reduce((a, b) => a + b, 0);
  const step = (TL.x1 - TL.x0) / (STAGES.length - 1);
  // המסגרת מתכווצת לגובה הערימה הגבוהה — בלי שטח ריק מעל
  const rows = Math.max(1, Math.ceil(Math.max(0, ...dist) / 3));
  const top = Math.max(-40, TL.y - 54 - (rows - 1) * 32 - 22);

  // כל בחירה = נקודה. הנקודות נערמות מעל השלב שנבחר.
  const dots = useMemo(() => {
    const out = [];
    dist.forEach((count, si) => {
      for (let i = 0; i < count; i += 1) {
        const col = i % 3;
        const row = Math.floor(i / 3);
        out.push({
          key: `${si}-${i}`,
          x: TL.x0 + si * step + (col - 1) * 28,
          y: TL.y - 54 - row * 32,
          order: out.length,
        });
      }
    });
    // סדר הופעה מעורבב כדי שהחשיפה תרגיש כמו קבוצה, לא כמו טור
    return out.map((d, i) => ({ ...d, order: (i * 7) % Math.max(out.length, 1) }));
  }, [dist, step]);

  return (
    <svg className="chart" viewBox={`0 ${top} ${TL.w} ${TL.h - top}`} preserveAspectRatio="xMidYMid meet">
      <line x1={TL.x0 - 44} y1={TL.y} x2={TL.x1 + 44} y2={TL.y} stroke="var(--line-strong)" strokeWidth="1.6" />
      {STAGES.map((s, i) => {
        const x = TL.x0 + i * step;
        return (
          <g key={s.id}>
            <circle cx={x} cy={TL.y} r="20" fill="var(--navy-900)" stroke="var(--sky-400)" strokeWidth="1.8" />
            <text x={x} y={TL.y + 9} textAnchor="middle" className="c-node-num">{s.n}</text>
            <text x={x} y={TL.y + 52} textAnchor="middle" className="c-axis-label">{s.axis}</text>
            {total > 0 && (
              <motion.text x={x} y={TL.y + 96} textAnchor="middle" className="c-axis-count"
                initial={{ opacity: 0 }} animate={{ opacity: dist[i] ? 1 : 0.22 }}
                transition={{ delay: animate ? 0.4 + dots.length * 0.075 : 0 }}>
                {dist[i]}
              </motion.text>
            )}
          </g>
        );
      })}
      {dots.map((d) => (
        <motion.circle key={d.key} cx={d.x} cy={d.y} r="11.5"
          fill="var(--sky-200)" stroke="rgba(10,21,38,0.8)" strokeWidth="1.5"
          initial={animate ? { opacity: 0, scale: 0, cy: TL.y } : false}
          animate={{ opacity: 1, scale: 1, cy: d.y }}
          transition={{ delay: animate ? 0.35 + d.order * 0.075 : 0, type: 'spring', stiffness: 420, damping: 26 }} />
      ))}
    </svg>
  );
}

/** גרסת טלפון: ציר אנכי. הנקודות עדיין נוחתות אחת אחרי השנייה. */
export function TimelineRevealCompact({ dist = [], animate = true }) {
  let order = 0;
  return (
    <ol className="tlc">
      {STAGES.map((st, i) => {
        const count = dist[i] || 0;
        return (
          <li key={st.id} className={count ? 'on' : ''}>
            <span className="tlc-num tech">{st.n}</span>
            <span className="tlc-name">{st.axis}</span>
            <span className="tlc-dots">
              {Array.from({ length: count }, (_, k) => {
                const delay = animate ? 0.3 + (order++) * 0.09 : 0;
                return (
                  <motion.i key={k}
                    initial={animate ? { opacity: 0, scale: 0 } : false}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay, type: 'spring', stiffness: 460, damping: 24 }} />
                );
              })}
            </span>
            <span className="tlc-count tech">{count}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* ═══ Reveal 2 · מסלולי העומס ════════════════════════════════════════════ */

const TR = { w: 1000, h: 460, l: 74, r: 40, t: 48, b: 76 };
// מסך צר: אותו גרף בקנה מידה אחר, כך שהטקסט תופס חלק גדול יותר מהמסגרת
const TR_COMPACT = { w: 520, h: 430, l: 52, r: 18, t: 40, b: 62 };

function lineFor(values, step, yScale, offset = 0, G = TR) {
  const pts = values
    .map((v, i) => (v === null || v === undefined ? null : { x: G.l + i * step, y: yScale(v) + offset }))
    .filter(Boolean);
  if (pts.length < 2) return null;
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

export function TrajectoryChart({ trajectories = [], phase = 'traj1', compact = false }) {
  const G = compact ? TR_COMPACT : TR;
  const cols = STAGES.length;
  const step = (G.w - G.l - G.r) / (cols - 1);
  const yScale = (v) => G.t + (10 - v) / 9 * (G.h - G.t - G.b);

  const showAvg = phase === 'traj2' || phase === 'traj3' || phase === 'traj4';
  const avgDim = phase === 'traj4';

  const avg = useMemo(() => {
    return Array.from({ length: cols }, (_, i) => {
      const vals = trajectories.map((t) => t.values[i]).filter((v) => v !== null && v !== undefined);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    });
  }, [trajectories, cols]);

  const avgPath = lineFor(avg, step, yScale, 0, G);

  return (
    <div className={`traj-wrap${compact ? ' compact' : ''}`}>
      <svg className="chart" viewBox={`0 0 ${G.w} ${G.h}`} preserveAspectRatio="xMidYMid meet">
        {/* רשת */}
        {[2, 4, 6, 8, 10].map((v) => (
          <g key={v}>
            <line x1={TR.l} y1={yScale(v)} x2={TR.w - TR.r} y2={yScale(v)}
              stroke="var(--line)" strokeWidth="1" strokeDasharray="3 7" />
            <text x={TR.l - 16} y={yScale(v) + 5} textAnchor="end" className="c-axis-num">{v}</text>
          </g>
        ))}
        <text className="c-axis-title" x={TR.l} y={TR.t - 22} textAnchor="middle">עומס</text>

        {STAGES.map((s, i) => {
          const x = TR.l + i * step;
          return (
            <g key={s.id}>
              <line x1={x} y1={TR.t} x2={x} y2={TR.h - TR.b} stroke="var(--line)" strokeWidth="1" opacity="0.5" />
              <text x={x} y={TR.h - TR.b + 30} textAnchor="middle" className="c-axis-num">{s.n}</text>
              <text x={x} y={TR.h - TR.b + 54} textAnchor="middle" className="c-axis-label">{s.axis}</text>
            </g>
          );
        })}

        {/* קווים אישיים – אנונימיים לחלוטין */}
        <g className={avgDim ? 'traj-lines up' : 'traj-lines'}>
          {trajectories.map((t, i) => {
            // הזחה קטנה וקבועה לכל משתתף: 20 קווים על ערכים שלמים אחרת נבלעים זה בזה
            const d = lineFor(t.values, step, yScale, ((i % 7) - 3) * (compact ? 1.6 : 2.6), G);
            if (!d) return null;
            const hue = 196 + ((i * 37) % 46) - 23;
            return (
              <motion.path key={t.key || i} d={d} fill="none"
                stroke={`hsl(${hue} 62% 68%)`} strokeWidth={compact ? 1.6 : 2}
                strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: showAvg && !avgDim ? 0.34 : 0.62 }}
                transition={{ pathLength: { delay: 0.15 + i * 0.055, duration: 1.05, ease: 'easeOut' }, opacity: { duration: 0.6 } }} />
            );
          })}
        </g>

        {/* ממוצע הקבוצה */}
        <AnimatePresence>
          {showAvg && avgPath && (
            <motion.g key="avg" initial={{ opacity: 0 }} animate={{ opacity: avgDim ? 0.22 : 1 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
              <motion.path d={avgPath} fill="none" stroke="var(--gold)" strokeWidth={compact ? 3.4 : 5}
                strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: 'easeOut' }} />
              {avg.map((v, i) => v === null ? null : (
                <circle key={i} cx={G.l + i * step} cy={yScale(v)} r={compact ? 4 : 6}
                  fill="var(--navy-900)" stroke="var(--gold)" strokeWidth={compact ? 2 : 2.5} />
              ))}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      <div className="traj-legend">
        <span className="lg lg-ind">קו אחד = פקח אחד (אנונימי)</span>
        <AnimatePresence>
          {showAvg && (
            <motion.span className="lg lg-avg" initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: avgDim ? 0.4 : 1, y: 0 }} exit={{ opacity: 0 }}>ממוצע הקבוצה</motion.span>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {(phase === 'traj3' || phase === 'traj4') && (
          <motion.div key={phase} className="traj-message"
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.65 }}>
            <span>{REVEAL_COPY[phase]}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══ התפלגות 1–10 (Admin, וחשיפה יזומה ב־Live) ══════════════════════════ */

export function Distribution({ dist = [], avg = null, compact = false }) {
  const max = Math.max(1, ...dist);
  const total = dist.reduce((a, b) => a + b, 0);
  return (
    <div className={`dist${compact ? ' compact' : ''}`}>
      <div className="dist-bars">
        {dist.map((c, i) => (
          <div key={i} className="dist-col">
            <div className="dist-track">
              <motion.div className="dist-bar" initial={{ height: 0 }}
                animate={{ height: `${(c / max) * 100}%` }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
                <span className="dist-val tech">{c || ''}</span>
              </motion.div>
            </div>
            <div className="dist-lab tech">{i + 1}</div>
          </div>
        ))}
      </div>
      <div className="dist-foot">
        <span>{total} תשובות</span>
        {avg !== null && avg !== undefined && <span>ממוצע <b className="tech">{avg}</b></span>}
      </div>
    </div>
  );
}

/* ═══ קיר התשובות ════════════════════════════════════════════════════════ */

export function AnswerWall({ texts = [], title, compact = false }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    if (!texts.length) return undefined;
    const t = setInterval(() => setShown((n) => (n >= texts.length ? n : n + 1)), 380);
    return () => clearInterval(t);
  }, [texts.length]);

  return (
    <div className={`wall${compact ? ' compact' : ''}`}>
      <h2 className="wall-title">{title || REVEAL_COPY.wallTitle}</h2>
      <div className="wall-grid">
        <AnimatePresence>
          {texts.slice(0, shown).map((t, i) => (
            <motion.figure key={`${i}-${t.slice(0, 12)}`} className="wall-card"
              initial={{ opacity: 0, y: 22, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
              <span className="wall-quote" aria-hidden="true">”</span>
              <blockquote>{t}</blockquote>
            </motion.figure>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
