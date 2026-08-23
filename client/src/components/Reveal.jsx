import { motion } from 'framer-motion';
import {
  TimelineRevealCompact, TrajectoryChart, Distribution, AnswerWall,
} from './Charts.jsx';
import { REVEAL_COPY } from '@shared/scenario.js';

/**
 * חשיפות במסך אישי.
 * מוצג רק כאשר המנחה חשף בפועל — הנתונים עצמם אינם נשלחים למכשיר לפני כן.
 * זהו אותו רגע ואותו תוכן שמופיע במסך ההקרנה, בפריסה שנבנתה למסך קטן.
 */
export function hasReveal(state) {
  if (!state) return false;
  const q = state.question;
  if (q && q.status === 'revealed') return true;
  return !!(state.reveal && state.reveal.startsWith('traj'));
}

export default function RevealPanel({ state }) {
  const q = state?.question;
  const revealed = q && q.status === 'revealed';
  const traj = state?.reveal && state.reveal.startsWith('traj');

  let title = null;
  let body = null;
  let footer = null;

  if (revealed && q.kind === 'text') {
    title = REVEAL_COPY.wallTitle;
    body = <AnswerWall texts={state.results?.texts || []} title="" compact />;
  } else if (revealed && q.kind === 'timeline') {
    title = 'באיזה שלב הרגשת שהעומס השתנה?';
    body = <TimelineRevealCompact dist={state.results?.dist || []} />;
    footer = 'אותה תמונת מצב. אותן התרחשויות. עומס שונה.';
  } else if (revealed && q.kind === 'scale10') {
    title = q.text;
    body = <Distribution dist={state.results?.dist || []} avg={state.results?.avg} />;
  } else if (traj) {
    title = 'מסלולי העומס לאורך התרחיש';
    // המסר מוצג בתוך הגרף עצמו, אין צורך לחזור עליו מתחתיו
    body = <TrajectoryChart trajectories={state.trajectories || []} phase={state.reveal} compact />;
  } else {
    return null;
  }

  return (
    <motion.div className="reveal-sheet" role="region" aria-label={title}
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4 }}>
      <div className="reveal-inner scroll-y">
        <div className="reveal-tag">
          <span className="dot-live" aria-hidden="true" />תוצאות הקבוצה
        </div>
        {title && <h2 className="reveal-title">{title}</h2>}
        <div className="reveal-body">{body}</div>
        {footer && (
          <motion.p className="reveal-foot" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.7 }}>{footer}</motion.p>
        )}
      </div>
    </motion.div>
  );
}
