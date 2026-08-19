/**
 * איור סכמטי של מסלול 01/19 ברמון — עמוד השדרה של לוח התנועה.
 * המסלול מצויר אנכית (01 בצפון) כדי שחציית הקורמורנים מצפון לדרום
 * תיקרא נכון על גבי האיור.
 */

const BIRDS = [
  { x: 22, d: 0.0, dur: 8.4, s: 1.0 },
  { x: 33, d: 0.5, dur: 9.1, s: 1.2 },
  { x: 43, d: 0.2, dur: 8.0, s: 0.9 },
  { x: 28, d: 1.1, dur: 8.8, s: 1.1 },
  { x: 47, d: 1.5, dur: 9.4, s: 0.85 },
  { x: 17, d: 1.9, dur: 8.6, s: 0.95 },
  { x: 38, d: 2.4, dur: 9.0, s: 1.05 },
];

export default function RunwayDiagram({ active = [], birds = false }) {
  const isOn = (id) => active.includes(id);
  const rwyHot = isOn('RWY 01');

  return (
    <div className="runway-col">
      <svg className="runway-svg" viewBox="0 0 76 420" preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="rwClip"><rect x="0" y="-4" width="76" height="428" /></clipPath>
        </defs>

        {/* צפון */}
        <g opacity="0.55">
          <path d="M8 30 L8 12 M8 12 L4.5 18 M8 12 L11.5 18" stroke="rgba(234,241,248,0.5)"
            strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <text className="rw-tw-label" x="8" y="41" fontSize="11" textAnchor="middle">N</text>
        </g>

        {/* מסלול */}
        <rect x="20" y="48" width="26" height="324" rx="1"
          fill={rwyHot ? 'rgba(247,218,171,0.14)' : 'rgba(255,255,255,0.06)'}
          stroke={rwyHot ? 'rgba(247,218,171,0.55)' : 'var(--line-strong)'} strokeWidth="1" />
        <line x1="33" y1="70" x2="33" y2="350" stroke="rgba(234,241,248,0.4)" strokeWidth="1.4"
          strokeDasharray="10 9" />
        <g fill="rgba(234,241,248,0.32)">
          {[23, 28.3, 33.6, 38.9].map((x) => <rect key={`t${x}`} x={x} y="52" width="2.6" height="12" />)}
          {[23, 28.3, 33.6, 38.9].map((x) => <rect key={`b${x}`} x={x} y="356" width="2.6" height="12" />)}
        </g>
        <text className="rw-label" x="33" y="40" fontSize="15" textAnchor="middle">01</text>
        <text className="rw-label" x="33" y="392" fontSize="15" textAnchor="middle">19</text>

        {/* מקושרות + מסלול הסעה מקביל A */}
        <line x1="56" y1="92" x2="56" y2="338" stroke="var(--line-strong)" strokeWidth="1.4" strokeLinecap="round" />
        <text className="rw-tw-label" x="56" y="86" fontSize="11" textAnchor="middle">A</text>
        {[['A1', 112], ['A2', 210], ['A3', 308]].map(([id, y]) => (
          <g key={id}>
            <line className={`rw-tw ${isOn(id) ? 'active' : ''}`} x1="46" y1={y} x2="56" y2={y}
              stroke="var(--line-strong)" strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
            <text className={`rw-tw-label ${isOn(id) ? 'active' : ''}`} x="60" y={y + 4} fontSize="12">{id}</text>
          </g>
        ))}

        {/* להקת הקורמורנים – מצפון לדרום מעל המסלול */}
        {birds && (
          <g clipPath="url(#rwClip)">
            {BIRDS.map((b, i) => (
              <g key={i} className="rw-bird-wrap"
                style={{ animation: `bird-pass ${b.dur}s linear ${b.d}s 1 both` }}>
                <g transform={`translate(${b.x} 0) scale(${b.s})`}>
                  <path className="rw-bird"
                    d="M-6 0 C-4 -3.4 -1.6 -3.6 0 -0.6 C1.6 -3.6 4 -3.4 6 0 C4 -1.4 1.8 -0.8 0 1.4 C-1.8 -0.8 -4 -1.4 -6 0 Z"
                    fill="#E6EEF7" style={{ animation: `bird-flap ${0.5 + i * 0.05}s ease-in-out infinite` }} />
                </g>
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}
