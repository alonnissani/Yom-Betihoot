import { useState } from 'react';
import { retryConnection } from '../lib/socket.js';

/**
 * חיווי תקשורת.
 *
 * המסכים כאן נטענים מקובץ סטטי, אבל כל המצב מגיע ב־WebSocket. ברשת
 * שחוסמת או מעכבת את החיבור — סלולר עם proxy, רשת אורחים, סינון ארגוני —
 * המשתמש נשאר מול שלוש נקודות בלי לדעת אם לחכות, לרענן או לוותר.
 * לכן: הודעה מפורשת, וכפתור שמנסה שוב עכשיו ולא בעוד חמש שניות.
 */

function useRetry() {
  const [busy, setBusy] = useState(false);
  return {
    busy,
    run: () => {
      setBusy(true);
      retryConnection();
      // חיווי קצר בלבד: אם החיבור הצליח הרכיב ממילא ייעלם מהמסך
      setTimeout(() => setBusy(false), 1600);
    },
  };
}

/** פס עליון דק, למסכים שכבר מציגים תוכן. */
export function ConnectionBar({ text = 'אין חיבור לשרת' }) {
  const { busy, run } = useRetry();
  return (
    <div className="conn-bar" role="status">
      <span>{busy ? 'מנסה להתחבר…' : `${text} — מתחברים מחדש…`}</span>
      <button type="button" className="conn-retry" onClick={run} disabled={busy}>נסה שוב</button>
    </div>
  );
}

/** כרטיס מלא, למסכים שאין להם מה להציג בלי השרת (Live, Admin). */
export function ConnectionCard({ title = 'אין חיבור לשרת' }) {
  const { busy, run } = useRetry();
  return (
    <div className="conn-card">
      <div className="conn-card-inner card">
        <h2 className="conn-card-title">{title}</h2>
        <p className="conn-card-body">
          המסך נטען, אבל לא הצלחנו לפתוח חיבור נתונים לשרת. זה קורה כשהרשת
          חוסמת חיבורים מתמשכים. אפשר לנסות שוב, להחליף רשת (Wi-Fi או סלולר),
          או לרענן את הדף.
        </p>
        <button type="button" className="btn btn-primary" onClick={run} disabled={busy}>
          {busy ? 'מנסה להתחבר…' : 'נסה להתחבר שוב'}
        </button>
      </div>
    </div>
  );
}
