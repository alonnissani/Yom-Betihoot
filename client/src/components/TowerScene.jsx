/**
 * TowerScene — רקע מסך הכניסה.
 * וקטור מלא בהשראת סמל מגדל הפיקוח אילת רמון: מגדל מפואט לבן, רכסי הרים
 * בערפל, שמי זריחה, מלחת מים משקפת, קורמורנים וטבעות מכ"ם.
 *
 * הקנבס מולחן ל־16:9 (מסך ההקרנה). בטלפון החיתוך הוא בצדדים בלבד, כך
 * שהמגדל, ההרים והמים נשארים בתמונה בכל מכשיר.
 */

const W = 1600;
const H = 900;
const WATER = 660;

/* ─── רכסים: פסגות לא סדירות, דטרמיניסטיות ──────────────────────────────── */

function makeRidge(seed, count, peak, valley) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pts = [];
  const step = W / count;
  for (let i = 0; i <= count; i += 1) {
    const jitter = i === 0 || i === count ? 0 : (rnd() - 0.5) * step * 0.7;
    const x = Math.round(step * i + jitter);
    const [lo, hi] = i % 2 ? peak : valley;
    pts.push(`${x},${Math.round(lo + rnd() * (hi - lo))}`);
  }
  return `0,${WATER} ${pts.join(' ')} ${W},${WATER}`;
}

const RIDGE_BACK = makeRidge(7, 38, [462, 506], [516, 546]);
const RIDGE_MID = makeRidge(23, 31, [508, 550], [560, 588]);
const RIDGE_FRONT = makeRidge(91, 25, [562, 598], [608, 634]);

/* ─── המגדל (קואורדינטות מקוריות, ממוקם דרך wrapper) ────────────────────── */

const TOWER_PATH = 'M400 262 L640 262 L626 505 L574 566 L566 748 L470 762 L452 566 L430 470 Z';
const TOWER_TRANSFORM = 'translate(305 -50) scale(0.95)';

function AntennaArray({ x }) {
  return (
    <g transform={`translate(${x} 0)`} stroke="#C3D3E3" strokeWidth="2.2" fill="none" strokeLinecap="round">
      <line x1="0" y1="202" x2="0" y2="118" />
      <line x1="-26" y1="132" x2="26" y2="132" />
      <line x1="-20" y1="146" x2="20" y2="146" />
      <line x1="-13" y1="160" x2="13" y2="160" />
      <g fill="#C3D3E3" stroke="none">
        <circle cx="-26" cy="132" r="3" /><circle cx="26" cy="132" r="3" />
        <circle cx="-20" cy="146" r="2.4" /><circle cx="20" cy="146" r="2.4" />
        <circle cx="0" cy="116" r="2.8" />
      </g>
    </g>
  );
}

function Tower() {
  return (
    <g transform={TOWER_TRANSFORM}>
      <g clipPath="url(#towerClip)">
        <polygon points="392,258 522,254 508,764 452,768 424,470" fill="#FDFEFF" />
        <polygon points="522,254 602,258 590,762 508,764" fill="#EFF4F9" />
        <polygon points="602,258 652,258 656,780 590,762" fill="#D3DEEA" />
        <polygon points="508,300 592,436 508,570" fill="#FFFFFF" opacity="0.85" />
        <polygon points="424,470 508,570 508,764 452,768" fill="#E9EFF6" opacity="0.7" />
        <rect x="380" y="240" width="290" height="560" fill="url(#panelGrid)" />
        <rect x="380" y="240" width="290" height="560" fill="url(#towerShade)" />
        <rect x="598" y="240" width="72" height="560" fill="url(#rimLight)" />
      </g>
      <path d={TOWER_PATH} fill="none" stroke="rgba(108,140,175,0.42)" strokeWidth="1.1" />

      <polygon points="452,330 500,318 500,354 452,366" fill="#88A4BF" opacity="0.7" />
      <polygon points="452,330 500,318 500,326 452,338" fill="#CBD9E6" opacity="0.55" />

      <polygon points="394,214 646,214 634,262 406,262" fill="url(#glass)" />
      <polygon points="394,214 646,214 640,229 400,229" fill="#5D82AB" opacity="0.5" />
      <polygon points="412,231 522,227 514,258 419,258" fill="#9CBBD8" opacity="0.3" />
      <g stroke="rgba(206,226,244,0.34)" strokeWidth="1">
        {[432, 466, 500, 534, 568, 602].map((x) => <line key={x} x1={x} y1="216" x2={x - 3} y2="260" />)}
      </g>
      <polygon points="386,198 654,198 650,216 390,216" fill="#EDF3F9" />
      <polygon points="386,198 654,198 652,204 388,204" fill="#FFFFFF" />

      <AntennaArray x={452} />
      <AntennaArray x={588} />
    </g>
  );
}

function Cormorant({ x, y, s, delay, dur }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#14293F">
    <g className="ts-bird" style={{ animationDelay: `${delay}s`, animationDuration: `${dur}s` }}>
      <path d="M0 0 C -7 -11 -18 -16 -29 -14 C -20 -8 -9 -3 -2 1 Z" />
      <path d="M1 -0.6 C 5 -11 14 -17 25 -16 C 17 -10 8 -4 3 0.4 Z" />
      <ellipse cx="0" cy="0.8" rx="6.4" ry="2.1" />
      <path d="M5 0.2 C 9 -0.6 13 -1.4 17 -2 L 18.6 -1.2 L 16.6 -0.2 C 12.6 0.4 8.6 1 5 1.6 Z" />
      <path d="M-6 0.6 L -17 2.6 L -6 2 Z" />
    </g>
    </g>
  );
}

export default function TowerScene({ className = '' }) {
  return (
    <svg className={`tower-scene ${className}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0.14" y2="1">
          <stop offset="0%" stopColor="#5B8FBD" />
          <stop offset="22%" stopColor="#8AB5D6" />
          <stop offset="45%" stopColor="#BCD4E6" />
          <stop offset="64%" stopColor="#E4DBD6" />
          <stop offset="80%" stopColor="#F7D2AC" />
          <stop offset="93%" stopColor="#FBC48F" />
          <stop offset="100%" stopColor="#F3B683" />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F1D0AC" />
          <stop offset="15%" stopColor="#DCD8D4" />
          <stop offset="52%" stopColor="#B2C3D6" />
          <stop offset="100%" stopColor="#7E96B3" />
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#20486E" /><stop offset="55%" stopColor="#123353" />
          <stop offset="100%" stopColor="#0A2038" />
        </linearGradient>
        <linearGradient id="towerShade" x1="0" y1="0" x2="1" y2="0.25">
          <stop offset="0%" stopColor="rgba(150,185,220,0.16)" />
          <stop offset="46%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(58,90,130,0.22)" />
        </linearGradient>
        <linearGradient id="rimLight" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,204,146,0)" />
          <stop offset="100%" stopColor="rgba(255,204,146,0.45)" />
        </linearGradient>
        <linearGradient id="ridgeBack" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B6C5D8" /><stop offset="100%" stopColor="#D8DFE7" />
        </linearGradient>
        <linearGradient id="ridgeMid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A8B7CC" /><stop offset="100%" stopColor="#CBD4DF" />
        </linearGradient>
        <linearGradient id="ridgeFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94A6BE" /><stop offset="100%" stopColor="#B6C2D2" />
        </linearGradient>
        <linearGradient id="warmWash" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="rgba(255,192,132,0.55)" />
          <stop offset="50%" stopColor="rgba(255,192,132,0.14)" />
          <stop offset="100%" stopColor="rgba(255,192,132,0)" />
        </linearGradient>
        <radialGradient id="sunGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#FFF7E8" stopOpacity="1" />
          <stop offset="26%" stopColor="#FFE1BA" stopOpacity="0.62" />
          <stop offset="100%" stopColor="#FFC98C" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="burst" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="reflFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="reflMask"><rect x="0" y={WATER} width={W} height={H - WATER} fill="url(#reflFade)" /></mask>
        <pattern id="panelGrid" width="34" height="30" patternUnits="userSpaceOnUse">
          <path d="M0 0 H34 M0 30 H34 M0 0 L17 30 M34 0 L17 30 M17 0 L0 30 M17 0 L34 30"
            fill="none" stroke="rgba(126,158,192,0.20)" strokeWidth="0.55" />
        </pattern>
        <clipPath id="towerClip"><path d={TOWER_PATH} /></clipPath>
        <clipPath id="waterClip"><rect x="0" y={WATER} width={W} height={H - WATER} /></clipPath>
        <clipPath id="skyClip"><rect x="0" y="0" width={W} height={WATER} /></clipPath>
      </defs>

      {/* שמיים */}
      <rect width={W} height={WATER + 2} fill="url(#sky)" />
      <ellipse cx="250" cy="70" rx="620" ry="330" fill="url(#burst)" opacity="0.34" className="ts-breathe" />
      <g className="ts-rays" opacity="0.24">
        {[-38, -22, -6, 10, 26].map((a, i) => (
          <polygon key={i} fill="#FFFFFF" opacity={0.32 - i * 0.04}
            points={`230,60 ${760 + a * 7},${300 + a * 10} ${812 + a * 7},${350 + a * 10}`} />
        ))}
      </g>
      <ellipse cx="1332" cy="618" rx="360" ry="240" fill="url(#sunGlow)" className="ts-breathe" />
      <circle cx="1332" cy="620" r="30" fill="#FFF8EA" opacity="0.97" />

      {/* עננים דקים */}
      <g fill="#FFFFFF" opacity="0.42">
        <g className="ts-cloud ts-cloud-a">
          <ellipse cx="300" cy="268" rx="180" ry="12" />
          <ellipse cx="392" cy="252" rx="110" ry="8" />
        </g>
        <g className="ts-cloud ts-cloud-b">
          <ellipse cx="1180" cy="196" rx="210" ry="10" />
          <ellipse cx="1076" cy="182" rx="126" ry="7" />
        </g>
        <g className="ts-cloud ts-cloud-c" opacity="0.55">
          <ellipse cx="860" cy="470" rx="300" ry="9" />
          <ellipse cx="1300" cy="492" rx="220" ry="8" />
        </g>
      </g>

      {/* טבעות מכ"ם — מהטבעת ההנדסית של הסמל */}
      <g fill="none" stroke="#FFFFFF" opacity="0.18">
        <circle cx="800" cy="378" r="250" strokeWidth="0.9" strokeDasharray="2 11" />
        <circle cx="800" cy="378" r="370" strokeWidth="1" strokeDasharray="2 14" />
        <circle cx="800" cy="378" r="500" strokeWidth="1" strokeDasharray="2 18" />
        <g strokeWidth="1.6" opacity="0.9" strokeDasharray="none">
          <line x1="800" y1="-122" x2="800" y2="-100" />
          <line x1="300" y1="378" x2="322" y2="378" />
          <line x1="1278" y1="378" x2="1300" y2="378" />
        </g>
      </g>

      {/* רכסי הרים */}
      <g clipPath="url(#skyClip)">
        <polygon points={RIDGE_BACK} fill="url(#ridgeBack)" opacity="0.6" />
        <polygon points={RIDGE_MID} fill="url(#ridgeMid)" opacity="0.82" />
        <polygon points={RIDGE_FRONT} fill="url(#ridgeFront)" />
        <rect x="0" y="430" width={W} height={WATER - 430} fill="url(#warmWash)" />
      </g>

      {/* השתקפות במלחה */}
      <g mask="url(#reflMask)" clipPath="url(#waterClip)">
        <rect x="0" y={WATER} width={W} height={H - WATER} fill="url(#water)" />
        <g transform={`translate(0 ${WATER * 2}) scale(1 -1)`} className="ts-refl">
          <Tower />
          <polygon points={RIDGE_FRONT} fill="url(#ridgeFront)" />
        </g>
      </g>
      <rect x="0" y={WATER} width={W} height={H - WATER} fill="url(#water)" opacity="0.5" />
      <g stroke="#FFFFFF" opacity="0.24" strokeLinecap="round">
        {[[80, 706, 330], [700, 736, 400], [380, 772, 250], [1000, 800, 340], [180, 838, 430], [900, 872, 280]].map(
          ([x, y, w], i) => (
            <line key={i} x1={x} y1={y} x2={x + w} y2={y} strokeWidth="1.5"
              className="ts-ripple" style={{ animationDelay: `${i * 0.9}s` }} />
          ))}
      </g>
      <line x1="0" y1={WATER} x2={W} y2={WATER} stroke="#FFFFFF" strokeWidth="1.1" opacity="0.4" />

      <Tower />

      {/* קורמורנים – משמאל למגדל, כמו בסמל */}
      <g className="ts-flock">
        <Cormorant x={452} y={178} s={1.18} delay={0} dur={13} />
        <Cormorant x={548} y={238} s={0.9} delay={1.3} dur={15} />
        <Cormorant x={636} y={148} s={0.66} delay={2.5} dur={17} />
      </g>
    </svg>
  );
}
