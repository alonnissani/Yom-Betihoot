// ─────────────────────────────────────────────────────────────────────────────
//  מ־0 ל־100  ·  RAMON SAFETY DAY 2026
//  הגדרת התרחיש. זהו המקור היחיד לאמת עבור השרת, המשתתפים, ה־Admin וה־Live.
//  ניתן לערוך כאן טקסטים, סוגי מטוסים והערות מנחה מבלי לגעת בשאר המערכת.
// ─────────────────────────────────────────────────────────────────────────────

export const ACTIVITY_TITLE = 'מ0 ל100';
export const EVENT_TITLE = 'RAMON SAFETY DAY 2026';
export const SESSION_LABEL = 'מ0 ל100 – Safety Day 2026';

/** קוד הכניסה לפעילות. קבוע — נאמר בקול פעם אחת ומוקלד על עשרים טלפונים. */
export const JOIN_CODE = '11111';

/** ששת שלבי התרחיש – משמשים גם כציר ה־X בגרף העומס וגם ב־Timeline הסופי. */
export const STAGES = [
  { n: 1, id: 's1', title: 'פתיחה', axis: 'פתיחה' },
  { n: 2, id: 's2', title: 'הצטברות תנועה', axis: 'הצטברות' },
  { n: 3, id: 's3', title: 'LAHAK3 והמידע המאוחר', axis: 'LAHAK3' },
  { n: 4, id: 's4', title: 'התכנסות', axis: 'התכנסות' },
  { n: 5, id: 's5', title: 'הקורמורנים', axis: 'קורמורנים' },
  { n: 6, id: 's6', title: 'MAYDAY', axis: 'MAYDAY' },
];

export const LOAD_QUESTION = 'מה רמת העומס שאתה מרגיש כרגע?';
export const SCALE_LOW = 'עומס נמוך';
export const SCALE_HIGH = 'עומס גבוה';

/**
 * שאלות.
 *  scale10   – סולם 1–10 (מדידת עומס / שינוי תמונת עבודה)
 *  timeline  – בחירת נקודה אחת מתוך ששת השלבים
 *  text      – שאלה פתוחה, משפט אחד
 */
export const QUESTIONS = [
  { id: 'q1', kind: 'scale10', stage: 's1', track: 'load', text: LOAD_QUESTION, adminTitle: 'מדידת עומס · שלב 1', liveTitle: 'מדידת עומס פתוחה' },
  { id: 'q2', kind: 'scale10', stage: 's2', track: 'load', text: LOAD_QUESTION, adminTitle: 'מדידת עומס · שלב 2', liveTitle: 'מדידת עומס פתוחה' },
  {
    id: 'q3a', kind: 'scale10', stage: 's3', track: 'shift',
    text: 'עד כמה תמונת העבודה שלך השתנתה בעקבות המידע האחרון?',
    low: 'כמעט לא השתנתה', high: 'השתנתה לחלוטין',
    adminTitle: 'שינוי תמונת עבודה · שלב 3', liveTitle: 'השאלה פתוחה',
  },
  { id: 'q3b', kind: 'scale10', stage: 's3', track: 'load', text: LOAD_QUESTION, adminTitle: 'מדידת עומס · שלב 3', liveTitle: 'מדידת עומס פתוחה' },
  { id: 'q4', kind: 'scale10', stage: 's4', track: 'load', text: LOAD_QUESTION, adminTitle: 'מדידת עומס · שלב 4', liveTitle: 'מדידת עומס פתוחה' },
  { id: 'q5', kind: 'scale10', stage: 's5', track: 'load', text: LOAD_QUESTION, adminTitle: 'מדידת עומס · שלב 5', liveTitle: 'מדידת עומס פתוחה' },
  { id: 'q6', kind: 'scale10', stage: 's6', track: 'load', text: LOAD_QUESTION, adminTitle: 'מדידת עומס · שלב 6', liveTitle: 'מדידת עומס פתוחה' },
  {
    id: 'qTimeline', kind: 'timeline', stage: null, track: 'timeline',
    text: 'באיזה שלב הרגשת שהעומס מבחינתך השתנה באופן משמעותי?',
    adminTitle: 'נקודת השינוי', liveTitle: 'השאלה פתוחה',
  },
  {
    id: 'qOpen', kind: 'text', stage: null, track: 'open',
    text: 'מה גורם לך לזהות שאתה מתקרב ל־100?',
    hint: 'במשפט אחד',
    adminTitle: 'שאלה פתוחה', liveTitle: 'השאלה פתוחה',
  },
];

export const QUESTION_BY_ID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
/** סדר מדידות העומס לאורך התרחיש – זהו ציר ה־X של גרף מסלולי העומס. */
export const LOAD_TRACK = QUESTIONS.filter((q) => q.track === 'load').map((q) => q.id);

// ─────────────────────────────────────────────────────────────────────────────
//  זרימת התרחיש. כל פריט = לחיצה אחת על "הפעל התפתחות הבאה".
//  kind: 'beat' (התפתחות בתמונת התנועה) | 'question' | 'reveal' | 'closing'
// ─────────────────────────────────────────────────────────────────────────────

const S = (callsign, patch) => ({ op: 'update', id: callsign, patch });
const ADD = (strip) => ({ op: 'add', strip });

export const FLOW = [
  // ── שלב 1 · תמונת פתיחה רגועה ──────────────────────────────────────────────
  {
    id: 'f-s1-open', stage: 's1', kind: 'beat',
    label: 'תמונת פתיחה',
    summary: 'AIZ801 מוכן לקלירנס · FM1 על המסלול · ISR045 חמש דקות מ־RASAF',
    note: 'זו התמונה הרגועה. תן לה לשבת. המתן 15–20 שניות לפני פתיחת מדידת העומס הראשונה.',
    actions: [
      ADD({ id: 'ISR045', callsign: 'ISR045', acType: 'A320', kind: 'arr', pos: 'RASAF', note: 'עוד 5 דקות ב־RASAF לנחיתה' }),
      ADD({ id: 'AIZ801', callsign: 'AIZ801', acType: 'A21N', kind: 'dep', pos: 'APRON', note: 'מוכן לקבל קלירנס' }),
      ADD({ id: 'FM1', callsign: 'FM1', acType: 'P28A', kind: 'local', pos: 'RWY 01', note: 'על המסלול' }),
    ],
  },
  { id: 'f-q1', stage: 's1', kind: 'question', questionId: 'q1', label: 'מדידת עומס ראשונה', note: 'פתח את המדידה רק לאחר שהתמונה שבה. אל תחשוף תוצאות.' },

  // ── שלב 2 · תחילת הצטברות ──────────────────────────────────────────────────
  {
    id: 'f-s2-cge', stage: 's2', kind: 'beat',
    label: '4XCGE קורא לקלירנס',
    summary: 'תנועה חדשה נכנסת לתמונה – אימון מכשירים',
    note: 'האירועים נכנסים אחד אחרי השני. אל תפעיל את השני לפני שהראשון נקלט – כ־3–5 שניות ביניהם.',
    actions: [ADD({ id: '4XCGE', callsign: '4XCGE', acType: 'C172', kind: 'local', pos: 'APRON', note: 'קורא לקבלת קלירנס לאימון מכשירים' })],
  },
  {
    id: 'f-s2-aiz', stage: 's2', kind: 'beat',
    label: 'AIZ801 – מוכן לפושבק',
    summary: 'עדכון סטטוס על סטריפ קיים',
    note: 'שים לב שההדגשה על הסטריפ נראית לכולם לפני שאתה ממשיך.',
    actions: [S('AIZ801', { note: 'מוכן לפושבק', pos: 'APRON' })],
  },
  {
    id: 'f-s2-isr', stage: 's2', kind: 'beat',
    label: 'ISR045 – קורא בקשר',
    summary: 'הנחיתה נכנסת לתדר',
    note: 'לאחר האירוע הזה – פתח מדידת עומס נוספת.',
    actions: [S('ISR045', { note: 'קורא בקשר' })],
  },
  { id: 'f-q2', stage: 's2', kind: 'question', questionId: 'q2', label: 'מדידת עומס · שלב 2', note: 'אל תחשוף תוצאות. סגור כשהמונה מגיע לכולם או כשהקצב מחייב.' },

  // ── שלב 3 · מידע לא צפוי ───────────────────────────────────────────────────
  {
    id: 'f-s3-call', stage: 's3', kind: 'beat',
    label: '📞 שיחה נכנסת',
    summary: 'רק חיווי השיחה – בלי תוכן',
    note: 'תן לשיחה לצלצל כ־3 שניות לפני שאתה חושף את התוכן. השקט הזה עובד.',
    actions: [{ op: 'overlay', overlay: { kind: 'phone', state: 'ringing' } }],
  },
  {
    id: 'f-s3-lahak', stage: 's3', kind: 'beat',
    label: 'תוכן השיחה · LAHAK3',
    summary: 'הזנקה באיחור · באוויר בעוד כדקה · פינוי לסורוקה',
    note: 'המתן כ־2 שניות לאחר LAHAK3 ואז הפעל את AIZ801. לאחר מכן המשך ברצף עד סוף השלב.',
    actions: [
      {
        op: 'overlay',
        overlay: {
          kind: 'phone', state: 'content', callsign: 'LAHAK3',
          lines: ['הזנקה התקבלה באיחור', 'צפוי להיות באוויר בעוד כדקה', 'פינוי לסורוקה'],
        },
      },
      ADD({ id: 'LAHAK3', callsign: 'LAHAK3', acType: 'UH60', kind: 'local', pos: 'הזנקה', note: 'הזנקה באיחור · צפוי באוויר בעוד כדקה · פינוי לסורוקה', pending: true }),
    ],
  },
  {
    id: 'f-s3-aiz', stage: 's3', kind: 'beat', label: 'AIZ801 – מוכן להסיע',
    summary: 'עדכון סטטוס', note: 'רצף. אל תמהר יותר מדי – כל עדכון צריך להיראות.',
    actions: [S('AIZ801', { note: 'מוכן להסיע' })],
  },
  {
    id: 'f-s3-isr', stage: 's3', kind: 'beat', label: 'ISR045 – ב־ADIVI',
    summary: 'הנחיתה מתקדמת', note: 'רצף.',
    actions: [S('ISR045', { note: 'ב־ADIVI', pos: 'ADIVI' })],
  },
  {
    id: 'f-s3-fm1', stage: 's3', kind: 'beat', label: 'FM1 – על A3, ממתין לפני A',
    summary: 'עדכון מיקום', note: 'רצף.',
    actions: [S('FM1', { note: 'על A3, ממתין לפני A', pos: 'A3' })],
  },
  {
    id: 'f-s3-cge', stage: 's3', kind: 'beat', label: '4XCGE – מוכן להסיע',
    summary: 'עדכון סטטוס', note: 'בסיום השלב – שתי שאלות נפרדות: קודם שינוי תמונת העבודה, אחר כך עומס.',
    actions: [S('4XCGE', { note: 'מוכן להסיע' })],
  },
  { id: 'f-q3a', stage: 's3', kind: 'question', questionId: 'q3a', label: 'שינוי תמונת עבודה', note: 'זו לא שאלת עומס. סגור אותה לפני שאתה פותח את מדידת העומס.' },
  { id: 'f-q3b', stage: 's3', kind: 'question', questionId: 'q3b', label: 'מדידת עומס · שלב 3', note: 'מיד אחרי הקודמת, באותו רגע רגשי.' },

  // ── שלב 4 · התכנסות ────────────────────────────────────────────────────────
  {
    id: 'f-s4-aiz', stage: 's4', kind: 'beat', label: 'AIZ801 – מוכן להמראה, מקושרת A1',
    summary: 'ההמראה מתקרבת למסלול', note: 'מכאן העדכונים מגיעים בזה אחר זה. שמור על קצב אחיד.',
    actions: [S('AIZ801', { note: 'מוכן להמראה, מקושרת A1', pos: 'A1' })],
  },
  {
    id: 'f-s4-cge', stage: 's4', kind: 'beat', label: '4XCGE – מוכן להמראה, מקושרת A2',
    summary: 'תנועה שנייה במקושרת', note: 'רצף.',
    actions: [S('4XCGE', { note: 'מוכן להמראה, מקושרת A2', pos: 'A2' })],
  },
  {
    id: 'f-s4-lahak', stage: 's4', kind: 'beat', label: 'LAHAK3 – קורא בקשר',
    summary: 'גובה 1,000 באילות, לחצייה צפונה', note: 'רצף.',
    actions: [S('LAHAK3', { note: 'קורא בקשר, גובה 1,000 באילות, לחצייה צפונה', pos: '1,000 FT', pending: false })],
  },
  {
    id: 'f-s4-isr', stage: 's4', kind: 'beat', label: 'ISR045 – בקשת HOLD',
    summary: 'HOLD AT ADIVI FOR SYSTEM CHECK', note: 'לאחר האירוע הזה – מדידת עומס נוספת.',
    actions: [S('ISR045', { note: 'ב־ADIVI ומבקש', request: 'HOLD AT ADIVI FOR SYSTEM CHECK', pos: 'ADIVI' })],
  },
  { id: 'f-q4', stage: 's4', kind: 'question', questionId: 'q4', label: 'מדידת עומס · שלב 4', note: 'ללא חשיפה.' },

  // ── שלב 5 · Bird Hazard ────────────────────────────────────────────────────
  {
    id: 'f-s5-shets', stage: 's5', kind: 'beat', label: 'SHETS78 קורא לקלירנס',
    summary: 'עוד תנועה נכנסת לתמונה', note: 'קודם התנועה, ורק אחר כך הציפורים.',
    actions: [ADD({ id: 'SHETS78', callsign: 'SHETS78', acType: 'F16', kind: 'dep', pos: 'APRON', note: 'קורא לקבלת קלירנס' })],
  },
  {
    id: 'f-s5-birds', stage: 's5', kind: 'beat', label: 'להקת קורמורנים',
    summary: '~100 קורמורנים · 500 רגל · מצפון לדרום מעל המסלול',
    note: 'האנימציה נמשכת כ־9 שניות. תן לה להסתיים לפני שאתה פותח את מדידת העומס.',
    actions: [{ op: 'overlay', overlay: { kind: 'birds', title: 'BIRD ACTIVITY', lines: ['~100 CORMORANTS', '500 FT', 'N → S'] } }],
  },
  { id: 'f-q5', stage: 's5', kind: 'question', questionId: 'q5', label: 'מדידת עומס · שלב 5', note: 'ללא חשיפה.' },

  // ── שלב 6 · MAYDAY ─────────────────────────────────────────────────────────
  {
    id: 'f-s6-mayday', stage: 's6', kind: 'beat', label: 'MAYDAY · ISR045',
    summary: 'ENGINE EMERGENCY · IMMEDIATE LANDING',
    note: 'לחיצה אחת. יש השהיה מובנית של כ־2.5 שניות של שקט לפני שהסטריפ נצבע. אל תלחץ שוב.',
    actions: [
      { op: 'update', id: 'ISR045', patch: { emergency: true, note: 'ENGINE EMERGENCY', request: 'IMMEDIATE LANDING' }, delay: 2500 },
      {
        op: 'overlay', delay: 2500,
        overlay: { kind: 'mayday', callsign: 'ISR045', lines: ['ENGINE EMERGENCY', 'IMMEDIATE LANDING'] },
      },
    ],
  },
  { id: 'f-q6', stage: 's6', kind: 'question', questionId: 'q6', label: 'מדידת עומס אחרונה', note: 'זו המדידה האחרונה בתרחיש. ללא חשיפה.' },

  // ── סיום · השאלה המרכזית וה־Reveal ─────────────────────────────────────────
  {
    id: 'f-qtimeline', stage: null, kind: 'question', questionId: 'qTimeline',
    label: 'נקודת השינוי',
    note: 'התרחיש נעצר כאן. חכה שכולם יענו – ורק אז סגור וחשוף. זה רגע השיא הראשון.',
  },
  {
    id: 'f-traj-1', stage: null, kind: 'reveal', reveal: 'traj1',
    label: 'גרף מסלולי העומס · קווים אישיים',
    note: 'תן לקווים להיכנס. אל תדבר מעליהם בשתי השניות הראשונות.',
  },
  { id: 'f-traj-2', stage: null, kind: 'reveal', reveal: 'traj2', label: 'גרף · הוספת ממוצע הקבוצה', note: 'עכשיו הממוצע נכנס מעל הקווים.' },
  { id: 'f-traj-3', stage: null, kind: 'reveal', reveal: 'traj3', label: 'גרף · המסר', note: '"העומס לא עלה אצל כולנו באותו קצב."' },
  { id: 'f-traj-4', stage: null, kind: 'reveal', reveal: 'traj4', label: 'גרף · הממוצע מתעמעם', note: '"הממוצע לא מספר את כל הסיפור." הקווים האישיים חוזרים לחזית.' },
  {
    id: 'f-qopen', stage: null, kind: 'question', questionId: 'qOpen',
    label: 'שאלה פתוחה',
    note: 'תן זמן לכתוב. חשוף רק כשרוב התשובות בפנים – קיר התשובות הוא הסיום.',
  },
  { id: 'f-closing', stage: null, kind: 'closing', reveal: 'closing', label: 'מסך סיום', note: 'אותה תמונה. אנשים שונים. 100 שונה. מכאן עוברים להרצאה.' },
];

export const FLOW_BY_ID = Object.fromEntries(FLOW.map((f) => [f.id, f]));

export const REVEAL_COPY = {
  traj3: 'העומס לא עלה אצל כולנו באותו קצב.',
  traj4: 'הממוצע לא מספר את כל הסיפור.',
  wallTitle: 'איך אנחנו יודעים שאנחנו מתקרבים ל־100?',
  closing: ['אותה תמונה.', 'אנשים שונים.', '100 שונה.'],
};

/** מספר השלב (1–6) שאליו שייך פריט הזרימה, לצורך "שלב X/6" ב־Admin. */
export function stageNumberOf(item) {
  if (!item || !item.stage) return null;
  const s = STAGES.find((x) => x.id === item.stage);
  return s ? s.n : null;
}
