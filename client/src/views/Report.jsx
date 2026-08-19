import { useEffect, useState, useMemo } from 'react';
import { SESSION_LABEL, EVENT_TITLE, STAGES } from '@shared/scenario.js';

const fmtDate = (ts) => (ts ? new Date(ts).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
const fmtTime = (ts) => (ts ? new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '—');

/* ─── גרפים סטטיים לדוח (פלטה בהירה להדפסה) ─────────────────────────────── */

function ChangePointChart({ dist = [] }) {
  const W = 720, H = 250, L = 40, R = 20, T = 24, B = 62;
  const max = Math.max(1, ...dist);
  const step = (W - L - R) / STAGES.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="r-chart">
      <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="#B9C4D4" strokeWidth="1" />
      {STAGES.map((s, i) => {
        const x = L + i * step + step / 2;
        const h = (dist[i] || 0) / max * (H - T - B);
        return (
          <g key={s.id}>
            <rect x={x - step * 0.3} y={H - B - h} width={step * 0.6} height={h} rx="3" fill="#2A4E86" opacity="0.85" />
            <text x={x} y={H - B - h - 8} textAnchor="middle" className="r-num">{dist[i] || 0}</text>
            <text x={x} y={H - B + 20} textAnchor="middle" className="r-lab">{s.n}</text>
            <text x={x} y={H - B + 38} textAnchor="middle" className="r-lab sm">{s.axis}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LoadChart({ trajectories = [], avg = [] }) {
  const W = 720, H = 320, L = 46, R = 20, T = 18, B = 58;
  const cols = STAGES.length;
  const step = (W - L - R) / (cols - 1);
  const y = (v) => T + (10 - v) / 9 * (H - T - B);
  const path = (vals) => {
    const pts = vals.map((v, i) => (v == null ? null : [L + i * step, y(v)])).filter(Boolean);
    if (pts.length < 2) return null;
    return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="r-chart">
      {[2, 4, 6, 8, 10].map((v) => (
        <g key={v}>
          <line x1={L} y1={y(v)} x2={W - R} y2={y(v)} stroke="#DCE3EC" strokeWidth="1" />
          <text x={L - 10} y={y(v) + 4} textAnchor="end" className="r-lab">{v}</text>
        </g>
      ))}
      {STAGES.map((s, i) => (
        <g key={s.id}>
          <text x={L + i * step} y={H - B + 20} textAnchor="middle" className="r-lab">{s.n}</text>
          <text x={L + i * step} y={H - B + 38} textAnchor="middle" className="r-lab sm">{s.axis}</text>
        </g>
      ))}
      {trajectories.map((t, i) => {
        const d = path(t.values);
        return d ? <path key={i} d={d} fill="none" stroke="#5B8FC9" strokeWidth="1.3" opacity="0.45" /> : null;
      })}
      {(() => { const d = path(avg); return d ? <path d={d} fill="none" stroke="#C1873B" strokeWidth="3.2" strokeLinecap="round" /> : null; })()}
    </svg>
  );
}

function MiniDist({ dist = [], avg }) {
  const max = Math.max(1, ...dist);
  return (
    <div className="r-mini">
      <div className="r-mini-bars">
        {dist.map((c, i) => (
          <div key={i} className="r-mini-col">
            <div className="r-mini-bar" style={{ height: `${(c / max) * 100}%` }} title={`${i + 1}: ${c}`} />
            <span>{i + 1}</span>
          </div>
        ))}
      </div>
      {avg != null && <div className="r-mini-avg">ממוצע <b>{avg}</b></div>}
    </div>
  );
}

/* ─── הדוח ───────────────────────────────────────────────────────────────── */

export default function Report() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('key') || sessionStorage.getItem('z2h.adminKey') || '';
    const id = params.get('session');
    const url = id ? `/api/sessions/${encodeURIComponent(id)}` : '/api/report/current';
    fetch(url, { headers: { 'x-admin-key': key } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setData)
      .catch((e) => setError(e.message === '401' ? 'אין הרשאה. פתח את הדוח מתוך מסך המנחה.' : 'לא נמצאו נתונים.'));
  }, []);

  const loadQs = useMemo(() => (data?.questions || []).filter((q) => q.track === 'load'), [data]);
  const avgSeries = useMemo(() => loadQs.map((q) => q.average), [loadQs]);
  const timelineQ = data?.questions?.find((q) => q.kind === 'timeline');
  const shiftQ = data?.questions?.find((q) => q.track === 'shift');
  const openQ = data?.questions?.find((q) => q.kind === 'text');

  if (error) return <div className="report-msg">{error}</div>;
  if (!data) return <div className="report-msg">טוען דוח…</div>;

  const download = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${data.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="report">
      <div className="r-toolbar no-print">
        <button className="btn btn-primary" onClick={() => window.print()}>הורד PDF / הדפס</button>
        <button className="btn" onClick={download}>הורד נתונים (JSON)</button>
        {data.mode === 'rehearsal' && <span className="r-badge-reh">נתוני חזרה — לא פעילות אמיתית</span>}
      </div>

      <article className="r-page">
        <header className="r-head">
          <div className="r-event">{EVENT_TITLE}</div>
          <h1 className="r-title">{data.label || SESSION_LABEL}</h1>
          <div className="r-sub">דוח פעילות אנונימי · מגדל הפיקוח אילת רמון</div>
        </header>

        <section className="r-facts">
          <div><span>תאריך</span><b>{fmtDate(data.startedAt || data.endedAt)}</b></div>
          <div><span>שעה</span><b className="ltr">{fmtTime(data.startedAt)}–{fmtTime(data.endedAt)}</b></div>
          <div><span>משתתפים</span><b>{data.participantCount}</b></div>
          <div><span>מזהה Session</span><b className="tech sm">{data.id}</b></div>
        </section>

        <section className="r-sec">
          <h2>נקודת השינוי — באיזה שלב הרגשת שהעומס השתנה באופן משמעותי</h2>
          <ChangePointChart dist={timelineQ?.distribution || []} />
          <p className="r-cap">
            מספר המשיבים: {timelineQ?.responded ?? 0}. פיזור הבחירות לאורך ששת שלבי התרחיש
            הוא הממצא המרכזי של הפעילות — אותה תמונת מצב נחוותה בנקודות שונות.
          </p>
        </section>

        <section className="r-sec">
          <h2>התפתחות העומס לאורך התרחיש</h2>
          <LoadChart trajectories={data.trajectories || []} avg={avgSeries} />
          <p className="r-cap">
            כל קו דק = משתתף אנונימי אחד. הקו העבה = ממוצע הקבוצה.
          </p>
          <table className="r-table">
            <thead>
              <tr>
                <th>שלב</th>
                {STAGES.map((s) => <th key={s.id} className="tech">{s.n}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>ממוצע עומס</td>
                {loadQs.map((q) => <td key={q.id} className="tech">{q.average ?? '—'}</td>)}
              </tr>
              <tr>
                <td>מספר משיבים</td>
                {loadQs.map((q) => <td key={q.id} className="tech">{q.responded}</td>)}
              </tr>
            </tbody>
          </table>
        </section>

        <section className="r-sec r-break">
          <h2>התפלגות מדידות העומס</h2>
          <div className="r-grid">
            {loadQs.map((q, i) => (
              <figure key={q.id} className="r-mini-wrap">
                <figcaption>שלב {STAGES[i]?.n} · {STAGES[i]?.axis}</figcaption>
                <MiniDist dist={q.distribution} avg={q.average} />
              </figure>
            ))}
          </div>
        </section>

        {shiftQ && (
          <section className="r-sec">
            <h2>שינוי תמונת העבודה בעקבות המידע על LAHAK3</h2>
            <div className="r-mini-wrap wide">
              <MiniDist dist={shiftQ.distribution} avg={shiftQ.average} />
            </div>
            <p className="r-cap">מספר המשיבים: {shiftQ.responded}.</p>
          </section>
        )}

        {openQ && (
          <section className="r-sec r-break">
            <h2>מה גורם לך לזהות שאתה מתקרב ל־100</h2>
            <ul className="r-quotes">
              {(openQ.answers || []).map((t, i) => <li key={i}>{t}</li>)}
              {(!openQ.answers || openQ.answers.length === 0) && <li className="muted">לא נאספו תשובות.</li>}
            </ul>
            <p className="r-cap">התשובות מוצגות כלשונן, ללא עריכה, סיכום או שכתוב.</p>
          </section>
        )}

        <footer className="r-foot">
          כל הנתונים בדוח זה אנונימיים. המערכת אינה שומרת שם, מספר עובד או כל מזהה אישי.
          אין בפעילות תשובות נכונות או שגויות ואין בה הערכה מקצועית של המשתתפים.
        </footer>
      </article>
    </div>
  );
}
