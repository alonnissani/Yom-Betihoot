import { AnimatePresence, motion } from 'framer-motion';
import TowerScene from '../components/TowerScene.jsx';
import Board from '../components/Board.jsx';
import { TimelineReveal, TrajectoryChart, Distribution, AnswerWall } from '../components/Charts.jsx';
import { useServerState } from '../lib/socket.js';
import { ACTIVITY_TITLE, EVENT_TITLE, STAGES, REVEAL_COPY } from '@shared/scenario.js';

/* ─── לובי ───────────────────────────────────────────────────────────────── */

function Lobby({ code, connected }) {
  return (
    <div className="entry live-lobby">
      <TowerScene />
      <header className="entry-top">
        <div className="entry-event">{EVENT_TITLE}</div>
        <div className="entry-rule" />
      </header>
      <div className="entry-mid">
        <h1 className="entry-title">{ACTIVITY_TITLE}</h1>
        <div className="entry-sub">תרחיש בטיחות אינטראקטיבי</div>
      </div>
      <div className="entry-bottom">
        <div className="lobby-code">
          <div className="lobby-code-label">קוד פעילות</div>
          <div className="lobby-code-value tech">{code || '····'}</div>
        </div>
        <div className="lobby-count">
          <span className="dot-live" />
          <b className="tech">{connected}</b> משתתפים מחוברים
        </div>
      </div>
    </div>
  );
}

/* ─── פאנל בזמן הצבעה (ללא תוצאות) ──────────────────────────────────────── */

function VotingPanel({ counts, closed, title }) {
  const { answered = 0, total = 0 } = counts || {};
  const done = total > 0 && answered >= total;
  return (
    <motion.div className="vote-panel"
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
      <div className="vote-title">{closed ? 'ההצבעה נסגרה' : (title || 'השאלה פתוחה')}</div>
      {!closed && <div className="vote-sub">ענו עכשיו במכשיר האישי</div>}
      <div className="vote-counter">
        <span className="vote-nums">
          <motion.span key={answered} className="tech vote-n"
            initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}>{answered}</motion.span>
          <span className="tech vote-sep">/</span>
          <span className="tech vote-t">{total}</span>
        </span>
        <span className="vote-word">ענו</span>
        <AnimatePresence>
          {done && (
            <motion.span className="vote-done" initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}>✓</motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="vote-progress">
        <motion.div className="vote-progress-fill"
          animate={{ width: `${total ? (answered / total) * 100 : 0}%` }}
          transition={{ type: 'spring', stiffness: 160, damping: 26 }} />
      </div>
    </motion.div>
  );
}

/* ─── התצוגה ─────────────────────────────────────────────────────────────── */

export default function Live() {
  const { state } = useServerState('live');

  if (!state) return <div className="live-boot">מתחבר…</div>;
  if (state.status === 'lobby') return <Lobby code={state.code} connected={state.connected} />;

  const q = state.question;
  const revealedQ = q && q.status === 'revealed';
  const stage = STAGES.find((s) => s.n === state.stageNumber);

  if (state.status === 'ended' && state.reveal === 'closing') {
    return (
      <div className="closing">
        {REVEAL_COPY.closing.map((line, i) => (
          <motion.div key={line} className="closing-line"
            initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.7, duration: 0.9 }}>{line}</motion.div>
        ))}
        <motion.div className="closing-mark" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 2.9, duration: 1.2 }}>{EVENT_TITLE}</motion.div>
      </div>
    );
  }

  // חשיפת קיר התשובות
  if (revealedQ && q.kind === 'text') {
    return (
      <div className="live-stage">
        <LiveBrand />
        <AnswerWall texts={state.results?.texts || []} />
      </div>
    );
  }

  // חשיפת נקודת השינוי
  if (revealedQ && q.kind === 'timeline') {
    return (
      <div className="live-stage">
        <LiveBrand />
        <div className="live-reveal">
          <h2 className="live-reveal-title">באיזה שלב הרגשת שהעומס השתנה באופן משמעותי?</h2>
          <div className="live-reveal-body">
            <TimelineReveal dist={state.results?.dist || []} />
          </div>
          <motion.div className="live-reveal-foot" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 2.4, duration: 1 }}>
            אותה תמונת מצב. אותן התרחשויות. עומס שונה.
          </motion.div>
        </div>
      </div>
    );
  }

  // גרף מסלולי העומס
  if (state.reveal && state.reveal.startsWith('traj')) {
    return (
      <div className="live-stage">
        <LiveBrand />
        <div className="live-reveal">
          <h2 className="live-reveal-title">מסלולי העומס לאורך התרחיש</h2>
          <div className="live-reveal-body">
            <TrajectoryChart trajectories={state.trajectories || []} phase={state.reveal} />
          </div>
        </div>
      </div>
    );
  }

  const showVote = q && (q.status === 'open' || q.status === 'closed');

  return (
    <div className="live-shell">
      <LiveBrand compact />
      <div className="live-board">
        <Board board={state.board} stageNumber={state.stageNumber} stageCount={state.stageCount}
          stageTitle={stage?.title} variant="live" />
      </div>
      <AnimatePresence>
        {showVote && (
          <motion.div className="live-veil" key="veil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <VotingPanel counts={state.counts} closed={q.status === 'closed'} title={q.liveTitle} />
          </motion.div>
        )}
        {revealedQ && q.kind === 'scale10' && (
          <motion.div className="live-veil" key="res" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="vote-panel results">
              <div className="vote-title">{q.text}</div>
              <Distribution dist={state.results?.dist || []} avg={state.results?.avg} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LiveBrand({ compact = false }) {
  return (
    <div className={`live-brand${compact ? ' compact' : ''}`}>
      <span className="lb-activity">{ACTIVITY_TITLE}</span>
      <span className="lb-event tech">{EVENT_TITLE}</span>
    </div>
  );
}
