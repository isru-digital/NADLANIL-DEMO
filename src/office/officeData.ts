import { BadgeCheck, Bot, CalendarCheck, FileSignature, Gift, LineChart, Megaphone, Presentation, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * What only the office gives (green version, stage C). Every number, name and lead here is demo data, and every
 * screen says so. Nothing connects to a real supplier, a real AI model or a real signature.
 */
export type Extra = {
  id: string
  title: string
  line: string
  points: string[]
  icon: LucideIcon
  /** shown instead of "פתוח" on the card */
  status?: string
  /** a screen that lives elsewhere in the app */
  to?: string
}

export const extras: Extra[] = [
  {
    id: 'leads',
    title: 'מכונת הלידים של המשרד',
    line: 'קמפיינים ארציים תחת המותג, והלידים מחולקים לחברים לפי אזור.',
    points: ['חשיפה ארצית תחת מותג אחד', 'ליד מגיע למתווך של האזור', 'לוח לידים אחד, מסודר'],
    icon: Megaphone,
  },
  {
    id: 'report',
    title: 'דוח שבועי למוכר',
    line: 'כמה צפו, כמה פנו וכמה הגיעו לראות. נשלח לבד, במיתוג המשרד.',
    points: ['המוכר מעודכן בלי לבקש', 'מספרים ברורים, בעמוד אחד', 'נשלח אוטומטית כל שבוע'],
    icon: LineChart,
  },
  {
    id: 'pitch',
    title: 'מצגת גיוס בלעדיות ב-AI',
    line: 'בוחרים נכס מה-CRM ומקבלים מצגת ממותגת עם הערכת מחיר ותוכנית שיווק.',
    points: ['מצגת מוכנה לפגישה עם המוכר', 'הערכת מחיר ותוכנית שיווק', 'במיתוג המשרד'],
    icon: Presentation,
  },
  {
    id: 'growth',
    title: 'תוכנית צמיחה ומנטור',
    line: 'יעדים אישיים ופגישות ליווי קבועות, עם מי שכבר עשה את הדרך.',
    points: ['יעדים אישיים לרבעון', 'פגישות ליווי קבועות', 'משימות ברורות לכל שבוע'],
    icon: CalendarCheck,
  },
  {
    id: 'deal',
    title: 'מנהלת עסקה',
    line: 'צוות המשרד מטפל בניירת, בהסכמים ובחתימה הדיגיטלית, עד החתימה.',
    points: ['הניירת עלינו', 'ציר התקדמות אחד לעסקה', 'חתימה דיגיטלית מרחוק'],
    icon: FileSignature,
  },
  {
    id: 'assistant',
    title: 'עוזר AI בדף הנחיתה',
    line: 'עונה ללידים בדף שלכם, גם בלילה, וקובע פגישה ביומן.',
    points: ['מענה מיידי לכל פנייה', 'קובע פגישה לבד', 'אתם מקבלים ליד מסודר'],
    icon: Bot,
  },
  {
    id: 'benefits',
    title: 'הטבות חברים',
    line: 'ביטוח אחריות מקצועית והנחות אצל ספקים, לחברי המשרד.',
    points: ['ביטוח אחריות מקצועית', 'הנחות אצל ספקים', 'מתעדכן כשההטבות ייסגרו'],
    icon: Gift,
    status: 'בהקמה',
  },
  {
    id: 'badge',
    title: 'תג מאומת "חבר משרד"',
    line: 'ליד השם בקהילה, באינדקס ובהתאמות, עם עדיפות בהתאמות ובבקשות בוערות.',
    points: ['תג מאומת ליד השם', 'ראשונים בהתאמות', 'עדיפות בבקשות בוערות'],
    icon: ShieldCheck,
  },
  {
    id: 'agent',
    title: 'הסוכן שלנו',
    line: 'דף אישי ממותג, שנבנה משאלון קצר כדי שימצאו אתכם בגוגל.',
    points: ['דף אישי בשמכם', '15 שאלות קלילות', 'נבנה להימצא בגוגל'],
    icon: BadgeCheck,
    to: '/app/agent',
  },
]

export const extraById = (id?: string) => extras.find((x) => x.id === id)

/** Demo brokers who are office members (besides the visitor, when the switch says so). */
export const OFFICE_BROKER_IDS = ['b2', 'b5', 'b8']

/** The ordinary apartment the office screens talk about (the same one as on the home page). */
export const sampleFlat = {
  title: 'דירת 4 חדרים עם מרפסת שמש',
  area: 'פתח תקווה, כפר גנים',
  price: 2650000,
  image: 'img/hero-flat.webp',
  seller: 'משפחת אבני',
}

/* ---------------------------------------------------------------- 1. the leads machine */
export type Lead = { id: string; name: string; want: string; area: string; source: 'קמפיין ארצי' | 'יד2' | 'מדלן'; ago: string; mine: boolean }

export const leads: Lead[] = [
  { id: 'l1', name: 'רונית מ.', want: 'מחפשת 4 חדרים עם מרפסת, עד 2.9 מ\' ₪', area: 'פתח תקווה', source: 'קמפיין ארצי', ago: 'לפני 8 דקות', mine: true },
  { id: 'l2', name: 'אבי ש.', want: 'מוכר דירת 3 חדרים ורוצה הערכת שווי', area: 'גבעתיים', source: 'יד2', ago: 'לפני 25 דקות', mine: true },
  { id: 'l3', name: 'נועה ועידן', want: 'דירה ראשונה, 3 חדרים, עד 2.2 מ\' ₪', area: 'רמת גן', source: 'מדלן', ago: 'לפני שעה', mine: true },
  { id: 'l4', name: 'משפחת דיין', want: 'משדרגים ל-5 חדרים, קרוב לבית ספר', area: 'חיפה', source: 'קמפיין ארצי', ago: 'לפני שעתיים', mine: false },
  { id: 'l5', name: 'שירן ל.', want: 'משקיעה, 2 עד 3 חדרים להשכרה', area: 'באר שבע', source: 'מדלן', ago: 'לפני 3 שעות', mine: false },
]

/** Leads of the week by area; the ids match the dotted map's areas. */
export const leadAreas = [
  { id: 'tlv', label: 'תל אביב והמרכז', count: 14, mine: true },
  { id: 'sharon', label: 'השרון ונתניה', count: 9, mine: false },
  { id: 'haifa', label: 'חיפה והכרמל', count: 7, mine: false },
  { id: 'jerusalem', label: 'ירושלים והסביבה', count: 6, mine: false },
  { id: 'negev', label: 'באר שבע והנגב', count: 4, mine: false },
]

/* ---------------------------------------------------------------- 2. the weekly report to the seller */
export const report = {
  week: 'שבוע 3 לשיווק',
  views: 312,
  inquiries: 9,
  visits: 4,
  days: [
    { d: 'א', v: 38 },
    { d: 'ב', v: 52 },
    { d: 'ג', v: 41 },
    { d: 'ד', v: 66 },
    { d: 'ה', v: 57 },
    { d: 'ו', v: 34 },
    { d: 'ש', v: 24 },
  ],
  done: ['המודעה קודמה בקהילת המתווכים', 'פולדר דיגיטלי נשלח ל-6 קונים מתאימים', '4 ביקורים בנכס, שניים מהם חוזרים'],
  next: 'שני קונים ביקשו ביקור שני. מומלץ לקבוע יום פתוח ביום שישי.',
}

/* ---------------------------------------------------------------- 4. growth and the mentor */
export const goals = [
  { id: 'g1', label: 'בלעדיויות חדשות ברבעון', done: 2, of: 3 },
  { id: 'g2', label: 'פגישות עם מוכרים החודש', done: 5, of: 8 },
  { id: 'g3', label: 'עסקאות ברבעון', done: 1, of: 2 },
]
export const sessions = [
  { id: 's1', day: 'יום ב\'', time: '09:30', title: 'פגישת ליווי אישית', kind: 'מנטור', next: true },
  { id: 's2', day: 'יום ד\'', time: '18:00', title: 'סדנה: איך מגייסים בלעדיות', kind: 'קבוצתי', next: false },
  { id: 's3', day: 'יום א\' הבא', time: '09:30', title: 'סיכום חודש ויעדים', kind: 'מנטור', next: false },
]
export const weekTasks = ['להתקשר ל-5 מוכרים מהלוח של השבוע', 'להעלות מצגת בלעדיות לנכס אחד', 'לשלוח דוח שבועי לשני מוכרים']

/* ---------------------------------------------------------------- 5. the deal manager */
export const dealSteps = [
  { id: 'offer', label: 'הצעה התקבלה', note: 'ההצעה אושרה על ידי המוכר', state: 'done' },
  { id: 'memo', label: 'זיכרון דברים', note: 'נחתם על ידי שני הצדדים', state: 'done' },
  { id: 'docs', label: 'בדיקת מסמכים', note: 'צוות המשרד בודק את המסמכים', state: 'now' },
  { id: 'draft', label: 'טיוטת הסכם', note: 'תועבר לעורכי הדין של הצדדים', state: 'todo' },
  { id: 'sign', label: 'חתימה דיגיטלית', note: 'חתימה מרחוק, בלי להגיע למשרד', state: 'todo' },
  { id: 'keys', label: 'מסירת מפתח', note: 'סוגרים עסקה', state: 'todo' },
] as const
export const dealDocs = [
  { label: 'נסח טאבו', state: 'התקבל' },
  { label: 'אישור זכויות', state: 'התקבל' },
  { label: 'אישורי עירייה', state: 'בטיפול הצוות' },
  { label: 'ייפוי כוח', state: 'ממתין למוכר' },
]

/* ---------------------------------------------------------------- 6. the assistant on the landing page */
export type ChatLine = { from: 'lead' | 'bot'; text: string; slots?: string[] }
export const chatScript: ChatLine[] = [
  { from: 'lead', text: 'היי, הדירה בכפר גנים עדיין רלוונטית?' },
  { from: 'bot', text: 'כן, היא פנויה. 4 חדרים עם מרפסת שמש, קומה 3 עם מעלית. רוצים לתאם ביקור?' },
  { from: 'lead', text: 'כן. מתי אפשר?' },
  { from: 'bot', text: 'יש שני מועדים פנויים השבוע. מה נוח לכם?', slots: ['יום ג\' 18:00', 'יום ד\' 10:30'] },
]

/* ---------------------------------------------------------------- 7. members' benefits */
export const benefits = [
  { id: 'insurance', title: 'ביטוח אחריות מקצועית', text: 'כיסוי לחברי המשרד. התנאים ייסגרו ויפורסמו כאן.' },
  { id: 'photo', title: 'צילום נכסים', text: 'הנחה לחברי המשרד אצל ספקי צילום. הספקים עוד לא נסגרו.' },
  { id: 'signs', title: 'שילוט והדפסות', text: 'הנחה לחברי המשרד. הספקים עוד לא נסגרו.' },
  { id: 'staging', title: 'הום סטייג\'ינג', text: 'הנחה לחברי המשרד. הספקים עוד לא נסגרו.' },
]
