// ---------------------------------------------------------------------------
// נתוני דמו בלבד. כל השמות, הנכסים, המחירים והטקסטים בקובץ הזה מומצאים.
// אין כאן אנשים אמיתיים, טלפונים אמיתיים או נכסים אמיתיים.
// ---------------------------------------------------------------------------

import type { TopicId } from '../config/topics'
import { REFERRAL_TERMS } from '../config/topics'

export type Broker = {
  id: string
  name: string
  title: string
  area: string
  region: string
  specialties: string[]
  avatar: string
  bio: string
  years: number
}

export type CrmStatus = 'new' | 'active' | 'tour' | 'negotiation' | 'closed'
export type ItemKind = 'property' | 'client'

export type CrmItem = {
  id: string
  kind: ItemKind
  title: string
  area: string
  rooms: string
  price: number
  status: CrmStatus
  client: string
  note: string
  updated: string
  image?: string
  /** every photo of a property, the first one is `image` (green version: photos the broker uploaded) */
  images?: string[]
  /** green version: a private home (also when missing), an office or a business property */
  category?: 'home' | 'office' | 'business'
  sqm?: number
  floor?: string
  /** city used for community filtering and matching */
  city: string
  /** clients only: what the buyer is looking for (never includes name or phone) */
  search?: SearchSpec
}

export type SearchSpec = {
  cities: string[]
  roomsMin: number
  roomsMax: number
  budget: number
  wants: string[]
}

export type Testimonial = { id: string; name: string; role: string; body: string }

export type TemplateId = 'night' | 'gallery' | 'line'

export type Template = { id: TemplateId; name: string; mood: string; description: string }

export type FolderProperty = {
  id: string
  title: string
  area: string
  rooms: string
  sqm: number
  floor: string
  price: number
  image: string
  highlights: string[]
  brokerNote: string
}

const img = (name: string) => `img/${name}.webp`

// ----------------------------------------------------------------- brokers

export const regions = [
  'תל אביב והמרכז',
  'השרון',
  'ירושלים והסביבה',
  'חיפה והצפון',
  'השפלה',
  'הדרום',
]

export const specialties = [
  'יוקרה',
  'השקעות',
  'משפחות',
  'בתים פרטיים',
  'דירות חדשות',
  'תושבי חוץ',
  'התחדשות עירונית',
]

export const brokers: Broker[] = [
  {
    id: 'b1',
    name: 'מאיה לנדאו',
    title: 'מתווכת נדל"ן יוקרה',
    area: 'תל אביב',
    region: 'תל אביב והמרכז',
    specialties: ['יוקרה', 'תושבי חוץ'],
    avatar: img('broker-01'),
    years: 11,
    bio: 'מלווה קונים ומוכרים בצפון הישן ובלב תל אביב. מאמינה בליווי אישי, בשקיפות מלאה ובהיכרות עמוקה עם כל רחוב.',
  },
  {
    id: 'b2',
    name: 'יונתן שגב',
    title: 'מתווך בתים פרטיים',
    area: 'הרצליה',
    region: 'השרון',
    specialties: ['בתים פרטיים', 'יוקרה'],
    avatar: img('broker-02'),
    years: 16,
    bio: 'מתמחה בבתים פרטיים ווילות בהרצליה פיתוח ובכפר שמריהו. עובד בדיסקרטיות מלאה עם משפחות ועם אנשי עסקים.',
  },
  {
    id: 'b3',
    name: 'תמר אלון',
    title: 'מתווכת נכסים לשימור',
    area: 'ירושלים',
    region: 'ירושלים והסביבה',
    specialties: ['יוקרה', 'תושבי חוץ'],
    avatar: img('broker-03'),
    years: 22,
    bio: 'מכירה כל סמטה ברחביה, בטלביה ובמושבה הגרמנית. מתמחה בדירות אבן ירושלמית ובבניינים לשימור.',
  },
  {
    id: 'b4',
    name: 'עומר נחום',
    title: 'מתווך למשפחות ולמשקיעים',
    area: 'חיפה והכרמל',
    region: 'חיפה והצפון',
    specialties: ['משפחות', 'השקעות'],
    avatar: img('broker-04'),
    years: 7,
    bio: 'עוזר למשפחות למצוא בית על הכרמל ולמשקיעים לזהות הזדמנויות בעיר התחתית ובהדר.',
  },
  {
    id: 'b5',
    name: 'נועה פרידמן',
    title: 'מתווכת למשפרי דיור',
    area: 'רעננה',
    region: 'השרון',
    specialties: ['משפחות', 'בתים פרטיים'],
    avatar: img('broker-05'),
    years: 13,
    bio: 'מלווה משפרי דיור ברעננה ובכפר סבא, מהפגישה הראשונה ועד קבלת המפתח. סבלנות ותהליך מסודר הם שם המשחק.',
  },
  {
    id: 'b6',
    name: 'איתי בן דוד',
    title: 'מתווך דירות חדשות',
    area: 'ראשון לציון',
    region: 'השפלה',
    specialties: ['דירות חדשות', 'התחדשות עירונית'],
    avatar: img('broker-06'),
    years: 9,
    bio: 'מתמחה בפרויקטים חדשים ובהתחדשות עירונית בראשון לציון ובנס ציונה. מדבר בגובה העיניים ועובד עם מספרים.',
  },
  {
    id: 'b7',
    name: 'שירה קדם',
    title: 'מתווכת קו ראשון לים',
    area: 'נתניה',
    region: 'השרון',
    specialties: ['תושבי חוץ', 'יוקרה'],
    avatar: img('broker-07'),
    years: 5,
    bio: 'דירות עם נוף לים בנתניה ועיר ימים. מלווה גם לקוחות מחו"ל, מרחוק ומקרוב, בעברית, באנגלית ובצרפתית.',
  },
  {
    id: 'b8',
    name: 'אלון רביב',
    title: 'מתווך השקעות ומגדלים',
    area: 'רמת גן וגבעתיים',
    region: 'תל אביב והמרכז',
    specialties: ['השקעות', 'דירות חדשות'],
    avatar: img('broker-08'),
    years: 27,
    bio: 'ותיק בשוק של רמת גן וגבעתיים. מלווה משקיעים בבחירת נכס, בבדיקת תשואה ובניהול מול שוכרים.',
  },
  {
    id: 'b9',
    name: 'ליאור שחם',
    title: 'מתווך השקעות',
    area: 'באר שבע',
    region: 'הדרום',
    specialties: ['השקעות', 'משפחות'],
    avatar: img('broker-09'),
    years: 6,
    bio: 'מכיר את באר שבע שכונה אחרי שכונה. עובד עם משקיעים מכל הארץ ועם משפחות צעירות שעוברות דרומה.',
  },
  {
    id: 'b10',
    name: 'הילה מזרחי',
    title: 'מתווכת דירות גן ומשפחות',
    area: 'מודיעין',
    region: 'ירושלים והסביבה',
    specialties: ['משפחות', 'דירות חדשות'],
    avatar: img('broker-10'),
    years: 14,
    bio: 'מתמחה בדירות גן ובדירות משפחה במודיעין ובסביבה. מאמינה שהתאמה נכונה חוסכת לכולם זמן וכסף.',
  },
]

export const brokerById = (id: string) => brokers.find((b) => b.id === id) ?? brokers[0]

// --------------------------------------------------------------------- crm

export const crmStages: { id: CrmStatus; label: string }[] = [
  { id: 'new', label: 'חדש' },
  { id: 'active', label: 'בטיפול' },
  { id: 'tour', label: 'סיור' },
  { id: 'negotiation', label: 'משא ומתן' },
  { id: 'closed', label: 'סגור' },
]

export const crmItems: CrmItem[] = [
  {
    id: 'c1',
    city: 'תל אביב',
    kind: 'property',
    title: 'פנטהאוז 5 חדרים עם נוף לים',
    area: 'תל אביב - הצפון הישן',
    rooms: '5',
    sqm: 182,
    floor: 'קומה 9 מתוך 9',
    price: 9450000,
    status: 'negotiation',
    client: 'משפחת רוזן',
    note: 'בלעדיות עד סוף הרבעון. הצעה שנייה על השולחן.',
    updated: 'עודכן היום',
    image: img('prop-01'),
  },
  {
    id: 'c2',
    city: 'הרצליה',
    kind: 'property',
    title: 'וילה עם בריכה וגינה',
    area: 'הרצליה פיתוח',
    rooms: '7',
    sqm: 420,
    floor: 'שתי קומות ומרתף',
    price: 14900000,
    status: 'tour',
    client: 'גיל ס.',
    note: 'סיור שני עם הקונים ביום חמישי.',
    updated: 'עודכן אתמול',
    image: img('prop-02'),
  },
  {
    id: 'c3',
    city: 'רמת השרון',
    kind: 'property',
    title: 'דירת גן 4 חדרים',
    area: 'רמת השרון',
    rooms: '4',
    sqm: 128,
    floor: 'קומת קרקע, גינה 90 מ"ר',
    price: 4280000,
    status: 'active',
    client: 'ענבל ודור מ.',
    note: 'צילום מקצועי בוצע. מחכה לאישור טקסט המודעה.',
    updated: 'עודכן לפני יומיים',
    image: img('prop-04'),
  },
  {
    id: 'c4',
    city: 'גבעתיים',
    kind: 'property',
    title: 'דירת 4 חדרים חדשה עם מרפסת שמש',
    area: 'גבעתיים',
    rooms: '4',
    sqm: 112,
    floor: 'קומה 6 מתוך 12',
    price: 3690000,
    status: 'new',
    client: 'אורי ב.',
    note: 'נכס חדש, נכנס הבוקר. לתאם פגישת היכרות.',
    updated: 'עודכן היום',
    image: img('prop-08'),
  },
  {
    id: 'c5',
    city: 'תל אביב',
    kind: 'property',
    title: 'דירה מול הים 3.5 חדרים',
    area: 'תל אביב - קו ראשון לים',
    rooms: '3.5',
    sqm: 96,
    floor: 'קומה 14 מתוך 20',
    price: 5150000,
    status: 'active',
    client: 'קלייר ב.',
    note: 'בעלת הנכס בחו"ל. מפתח אצלי.',
    updated: 'עודכן לפני 3 ימים',
    image: img('prop-05'),
  },
  {
    id: 'c6',
    city: 'תל אביב',
    kind: 'property',
    title: 'דופלקס גג 5 חדרים',
    area: 'תל אביב - לב העיר',
    rooms: '5',
    sqm: 165,
    floor: 'קומות 5 ו-6, גג פרטי',
    price: 7800000,
    status: 'closed',
    client: 'משפחת הדר',
    note: 'נחתם חוזה. עסקה משותפת עם יונתן שגב.',
    updated: 'נסגר השבוע',
    image: img('prop-07'),
  },
  {
    id: 'c7',
    city: 'תל אביב',
    search: { cities: ['תל אביב'], roomsMin: 3, roomsMax: 3, budget: 3200000, wants: ['חניה בטאבו', 'מעלית חובה', 'פינוי מיידי'] },
    kind: 'client',
    title: 'זוג צעיר מחפש 3 חדרים',
    area: 'תל אביב - יפו',
    rooms: '3',
    price: 3200000,
    status: 'new',
    client: 'רון ומיכל ק.',
    note: 'קונה חם. אישור עקרוני למשכנתה ביד. גמישים על קומה, לא על מעלית.',
    updated: 'פנייה מהבוקר',
  },
  {
    id: 'c8',
    city: 'רמת השרון',
    search: { cities: ['רמת השרון', 'הרצליה'], roomsMin: 5, roomsMax: 7, budget: 8500000, wants: ['בית פרטי', 'גינה', 'קרוב לבית ספר'] },
    kind: 'client',
    title: 'משפחה מחפשת בית פרטי',
    area: 'רמת השרון והרצליה',
    rooms: '5+',
    price: 8500000,
    status: 'tour',
    client: 'משפחת אבירם',
    note: 'נשלח פולדר דיגיטלי עם 4 נכסים. סיור ביום שלישי.',
    updated: 'עודכן אתמול',
  },
  {
    id: 'c9',
    city: 'תל אביב',
    search: { cities: ['תל אביב', 'רמת גן'], roomsMin: 2, roomsMax: 3, budget: 2600000, wants: ['נכס מושכר', 'קרוב לרכבת הקלה'] },
    kind: 'client',
    title: 'משקיע מחפש דירה להשכרה',
    area: 'תל אביב והסביבה',
    rooms: '2-3',
    price: 2600000,
    status: 'active',
    client: 'עידן פ.',
    note: 'מחפש נכס מושכר. מעדיף קרוב לרכבת הקלה.',
    updated: 'עודכן לפני יומיים',
  },
  {
    id: 'c10',
    city: 'תל אביב',
    search: { cities: ['תל אביב'], roomsMin: 3, roomsMax: 3, budget: 6000000, wants: ['נוף לים', 'קומה גבוהה', 'מרפסת'] },
    kind: 'client',
    title: 'תושבת חוץ מחפשת דירת נופש',
    area: 'תל אביב - קו ראשון לים',
    rooms: '3',
    price: 6000000,
    status: 'new',
    client: 'סופי ל.',
    note: 'מגיעה לארץ בחודש הבא. רוצה לראות 3 עד 4 נכסים ביום אחד.',
    updated: 'פנייה מאתמול',
  },
]

// --------------------------------------------------------------- dashboard

export const dashboardLeads = [
  { id: 'l1', name: 'רון ומיכל ק.', source: 'דף הנחיתה שלי', need: 'מחפשים 3 חדרים בתל אביב - יפו', time: 'לפני 25 דקות' },
  { id: 'l2', name: 'סופי ל.', source: 'הפניה מהקהילה', need: 'דירת נופש בקו ראשון לים', time: 'לפני שעתיים' },
  { id: 'l3', name: 'אורי ב.', source: 'המלצה מלקוח', need: 'מעוניין למכור 4 חדרים בגבעתיים', time: 'הבוקר' },
  { id: 'l4', name: 'נטע ג.', source: 'דף הנחיתה שלי', need: 'שאלה על הפנטהאוז בצפון הישן', time: 'אתמול' },
]

export const dashboardReminders = [
  { id: 'r1', text: 'סיור שני בווילה בהרצליה פיתוח', when: 'היום, 17:30' },
  { id: 'r2', text: 'לחזור למשפחת רוזן עם תשובה על ההצעה', when: 'היום, עד הערב' },
  { id: 'r3', text: 'לשלוח פולדר דיגיטלי למשפחת אבירם', when: 'מחר, 09:00' },
  { id: 'r4', text: 'חידוש בלעדיות - דירת הגן ברמת השרון', when: 'יום ראשון' },
]

// ----------------------------------------------------------------- builder

export const templates: Template[] = [
  {
    id: 'night',
    name: 'לילה',
    mood: 'כהה ודרמטי',
    description: 'נייבי עמוק, זהב ותמונת נכס על כל המסך.',
  },
  {
    id: 'gallery',
    name: 'גלריה',
    mood: 'בהיר וקלאסי',
    description: 'שמנת, אות סריף אלגנטית וקווים דקים.',
  },
  {
    id: 'line',
    name: 'קו נקי',
    mood: 'מודרני וחד',
    description: 'שחור ולבן, טיפוגרפיה גדולה ורשת נכסים.',
  },
]

export const aiBioText = [
  'אני מאיה, 11 שנים בתל אביב, רוב הזמן בצפון הישן. אני מכירה כל בניין ברחוב, והלקוחות שלי יודעים שאפשר להתקשר גם בערב. ספרו לי מה אתם מחפשים ואני אחזור אליכם עוד היום.',
  'פנטהאוזים, דירות גג ונכסים שלא תמיד עולים לאתרים. אני עובדת עם כמה לקוחות בכל פעם, ויודעת מי מחפש מה לפני שהמודעה יוצאת. 11 שנים בתל אביב.',
  'מאיה, מתווכת בתל אביב. מחפשים דירה? תגידו לי תקציב ואזור, ואחזור עם שלוש אפשרויות. מוכרים? נדבר על מחיר אמיתי.',
]

export const testimonials: Testimonial[] = [
  {
    id: 't1',
    name: 'משפחת הדר',
    role: 'רכשו דופלקס גג בלב העיר',
    body: 'אמרנו שאנחנו רוצים גג, והיא כבר ידעה איזו דירה. סגרנו בשלושה שבועות.',
  },
  {
    id: 't2',
    name: 'רון ומיכל ק.',
    role: 'קונים ראשונים',
    body: 'היינו לחוצים. היא ענתה על כל שאלה, גם ביום שישי בערב.',
  },
  {
    id: 't3',
    name: 'דנה ר.',
    role: 'מכרה דירה בצפון הישן',
    body: 'אחרי כל סיור קיבלתי הודעה עם מה אמרו. הדירה נמכרה קרוב למחיר שרציתי.',
  },
]

export type BuilderState = {
  name: string
  title: string
  area: string
  tagline: string
  bio: string
  years: number
  testimonialIds: string[]
  propertyIds: string[]
  showForm: boolean
  showWhatsapp: boolean
  showPhone: boolean
  template: TemplateId
}

export const builderDefaults: BuilderState = {
  name: 'מאיה לנדאו',
  title: 'מתווכת נדל"ן יוקרה',
  area: 'תל אביב',
  tagline: 'הבית הבא שלכם מתחיל בשיחה טובה.',
  bio: brokers[0].bio,
  years: 11,
  testimonialIds: ['t1', 't2', 't3'],
  propertyIds: ['c1', 'c2', 'c5'],
  showForm: true,
  showWhatsapp: true,
  showPhone: false,
  template: 'night',
}

// ------------------------------------------------------------------ folder

export const folder = {
  client: 'משפחת אבירם',
  title: 'בתים שבחרתי עבורכם',
  intro:
    'ריכזתי עבורכם ארבעה נכסים שמתאימים למה שסיכמנו בפגישה: חמישה חדרים ומעלה, אזור שקט וקרבה לבתי ספר. ליד כל נכס הוספתי הערה אישית שלי.',
  date: 'עודכן ב-05.11.2026',
  properties: [
    {
      id: 'f1',
      title: 'וילה עם בריכה וגינה',
      area: 'הרצליה פיתוח',
      rooms: '7',
      sqm: 420,
      floor: 'שתי קומות ומרתף',
      price: 14900000,
      image: img('prop-02'),
      highlights: ['בריכה מחוממת', 'מגרש 600 מ"ר', 'רחוב ללא מוצא'],
      brokerNote: 'מעל התקציב שהגדרתם, אבל זה הבית שהכי קרוב לתיאור שלכם. שווה לראות.',
    },
    {
      id: 'f2',
      title: 'דירת גן 4 חדרים',
      area: 'רמת השרון',
      rooms: '4',
      sqm: 128,
      floor: 'קומת קרקע, גינה 90 מ"ר',
      price: 4280000,
      image: img('prop-04'),
      highlights: ['גינה פרטית', 'שתי חניות', '5 דקות הליכה לבית הספר'],
      brokerNote: 'קטנה ממה שביקשתם, אבל הגינה והמיקום יוצאי דופן. אפשרות להרחבה בעתיד.',
    },
    {
      id: 'f3',
      title: 'דופלקס גג 5 חדרים',
      area: 'רמת השרון - מרכז',
      rooms: '5',
      sqm: 165,
      floor: 'קומות 5 ו-6, גג פרטי',
      price: 7800000,
      image: img('prop-07'),
      highlights: ['גג של 70 מ"ר', 'נוף פתוח', 'משופץ מהיסוד'],
      brokerNote: 'ההתאמה הטובה ביותר לתקציב. הגג מרגיש כמו חצר, וזה חשוב לכם.',
    },
    {
      id: 'f4',
      title: 'דירת 5 חדרים חדשה עם מרפסת שמש',
      area: 'הרצליה - מרכז',
      rooms: '5',
      sqm: 140,
      floor: 'קומה 6 מתוך 12',
      price: 5600000,
      image: img('prop-08'),
      highlights: ['בניין חדש', 'מרפסת 18 מ"ר', 'ממ"ד ומחסן'],
      brokerNote: 'אפשרות בטוחה ונוחה. פחות אופי, יותר שקט נפשי. כניסה מיידית.',
    },
  ] as FolderProperty[],
}

// ------------------------------------------------------------------ helpers

export const formatPrice = (n: number) => `${n.toLocaleString('he-IL')} ₪`

export const formatPriceShort = (n: number) => {
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return `${Number.isInteger(m) ? m : m.toFixed(2).replace(/0$/, '')} מ' ₪`
  }
  return `${Math.round(n / 1000)} א' ₪`
}

// --------------------------------------------------------------- community
// הודעות הקהילה, לפי נושא (הנושאים עצמם מוגדרים ב-src/config/topics.ts).

export const cities = [
  'תל אביב',
  'רמת גן',
  'גבעתיים',
  'הרצליה',
  'רמת השרון',
  'רעננה',
  'נתניה',
  'ירושלים',
  'מודיעין',
  'חיפה',
  'ראשון לציון',
  'באר שבע',
]

export type Comment = { authorId: string; body: string; time: string; replies?: Comment[] }

export type CommunityItem = {
  id: string
  topicId: TopicId
  authorId: string
  city: string
  time: string
  title?: string
  body: string
  likes: number
  comments: Comment[]
  image?: string
  /** topic "נכסים לשיתוף פעולה" */
  property?: { area: string; rooms: string; price: number; split: string; showPrice?: boolean }
  /** topic "מחפש לקונה": a saved search, never a client name */
  search?: SearchSpec
  /** topic "הפניות בין מתווכים" */
  referral?: { side: 'buyer' | 'seller'; toCity: string; terms: string }
  /** CRM item this message was created from */
  sourceId?: string
  fresh?: boolean
}

export type Notice = {
  id: string
  kind: 'comment' | 'match' | 'interest'
  title: string
  text: string
  time: string
  read: boolean
  topicId: TopicId
  itemId: string
}

export const communityItems: CommunityItem[] = [
  {
    id: 'k1',
    topicId: 'seeking',
    authorId: 'b8',
    city: 'גבעתיים',
    time: 'לפני 12 דקות',
    title: 'משפחה מחפשת 4 חדרים',
    body: 'הון עצמי מוכן. בניין חדש יחסית, מרפסת שמש.',
    likes: 4,
    comments: [],
    search: { cities: ['גבעתיים', 'רמת גן'], roomsMin: 4, roomsMax: 4, budget: 3800000, wants: ['מעלית', 'חניה', 'מרפסת שמש'] },
  },
  {
    id: 'k2',
    topicId: 'posts',
    authorId: 'b7',
    city: 'נתניה',
    time: 'לפני שעה',
    body: 'התחלתי לצלם סרטון של דקה לכל נכס חדש, במקום רק תמונות. הפניות עלו. מי שרוצה את המבנה, תגידו.',
    likes: 34,
    comments: [
      {
        authorId: 'b6',
        time: 'לפני 50 דקות',
        body: 'אשמח מאוד. אצלי הסרטונים יוצאים ארוכים מדי.',
        replies: [{ authorId: 'b7', time: 'לפני 44 דקות', body: 'וחשוב לפתוח בחדר הכי חזק. מעלה מחר דוגמה.' }],
      },
      { authorId: 'b10', time: 'לפני 41 דקות', body: 'גם אני. במיוחד מעניין אותי איך את פותחת את הסרטון.' },
    ],
  },
  {
    id: 'k3',
    topicId: 'coop',
    authorId: 'b3',
    city: 'ירושלים',
    time: 'לפני שעתיים',
    title: 'דירת אבן 4 חדרים בבניין לשימור',
    body: 'תקרות גבוהות, חלונות קשת, מרפסת לגינה פנימית. מתאים גם לתושבי חוץ.',
    likes: 11,
    comments: [{ authorId: 'b10', time: 'לפני שעה', body: 'יש לי זוג שמחפש בדיוק באזור. מתקשרת אלייך.' }],
    image: img('prop-03'),
    property: { area: 'ירושלים - רחביה', rooms: '4', price: 6900000, split: 'חלוקת עמלה שווה' },
  },
  {
    id: 'k4',
    topicId: 'knowledge',
    authorId: 'b8',
    city: 'רמת גן',
    time: 'לפני שעתיים',
    body: 'לפני כל פגישת בלעדיות אני מביא דף אחד: שלוש עסקאות שנסגרו באזור ותוכנית שיווק. בעלי דירות מחליטים לפי מספרים.',
    likes: 52,
    comments: [
      { authorId: 'b4', time: 'לפני שעה', body: 'אימצתי. פשוט ועובד.' },
      {
        authorId: 'b9',
        time: 'לפני שעה',
        body: 'ומה עושים כשאין עסקאות דומות באזור?',
        replies: [{ authorId: 'b8', time: 'לפני 50 דקות', body: 'מרחיבים רדיוס ואומרים את זה בגלוי.' }],
      },
    ],
  },
  {
    id: 'k5',
    topicId: 'referrals',
    authorId: 'b4',
    city: 'חיפה',
    time: 'לפני 3 שעות',
    title: 'זוג שעובר מחיפה למרכז',
    body: 'זוג שמוכר אצלי בכרמל ועובר לתל אביב בגלל העבודה. 4 חדרים, תקציב מסודר. מי בתל אביב לוקח?',
    likes: 6,
    comments: [],
    referral: { side: 'buyer', toCity: 'תל אביב', terms: REFERRAL_TERMS },
  },
  {
    id: 'k6',
    topicId: 'seeking',
    authorId: 'b2',
    city: 'הרצליה',
    time: 'לפני 4 שעות',
    title: 'לקוח מחפש בית פרטי עם בריכה',
    body: 'לקוח רציני, מחליט מהר. פתוח גם לנכס שעוד לא יצא לשוק.',
    likes: 18,
    comments: [{ authorId: 'b5', time: 'לפני 3 שעות', body: 'יש לי משהו שיכול להתאים ברחוב שקט. שולחת לך פרטים.' }],
    search: { cities: ['הרצליה'], roomsMin: 6, roomsMax: 8, budget: 16000000, wants: ['מגרש של חצי דונם', 'בריכה'] },
  },
  {
    id: 'k7',
    topicId: 'wins',
    authorId: 'b6',
    city: 'ראשון לציון',
    time: 'לפני 5 שעות',
    body: 'מסרתי היום מפתח לזוג צעיר, הדירה הראשונה שלהם. ארבעה חודשים, שתי עסקאות שנפלו בדרך. סוף סוף.',
    likes: 47,
    comments: [
      { authorId: 'b10', time: 'לפני 4 שעות', body: 'איזה כיף. מזל טוב להם ולך.' },
      { authorId: 'b1', time: 'לפני 4 שעות', body: 'מגיע לך. עבודה יפה.' },
    ],
    image: img('win-01'),
  },
  {
    id: 'k8',
    topicId: 'knowledge',
    authorId: 'b2',
    city: 'הרצליה',
    time: 'לפני 6 שעות',
    body: 'מוכר שלא זז מהמחיר כבר שלושה חודשים, אפס הצעות. איך מדברים איתו בלי לאבד את הבלעדיות?',
    likes: 15,
    comments: [
      { authorId: 'b3', time: 'לפני 5 שעות', body: 'אני מביאה לפגישה את כל הפידבקים מהסיורים, כתובים. המספרים מדברים במקומי.' },
      { authorId: 'b8', time: 'לפני 5 שעות', body: 'קובעים מראש נקודת בדיקה: אם אין הצעה עד תאריך מסוים, מעדכנים מחיר.' },
    ],
  },
  {
    id: 'k9',
    topicId: 'coop',
    authorId: 'b8',
    city: 'רמת גן',
    time: 'אתמול',
    title: 'דירת 5 חדרים במגדל חדש',
    body: 'קומה גבוהה, מטבח מעוצב, שתי חניות ומחסן. כניסה מיידית.',
    likes: 9,
    comments: [],
    image: img('prop-06'),
    property: { area: 'רמת גן - מתחם הבורסה', rooms: '5', price: 5350000, split: 'חלוקת עמלה שווה' },
  },
  {
    id: 'k10',
    topicId: 'referrals',
    authorId: 'b3',
    city: 'ירושלים',
    time: 'אתמול',
    title: 'מוכרת עם דירה בנתניה',
    body: 'לקוחה ותיקה ירשה 4 חדרים בנתניה ורוצה למכור. אני לא מכירה שם את השוק. מי לוקח?',
    likes: 5,
    comments: [{ authorId: 'b7', time: 'אתמול', body: 'אני בנתניה, אשמח. שולחת לך הודעה.' }],
    referral: { side: 'seller', toCity: 'נתניה', terms: REFERRAL_TERMS },
  },
  {
    id: 'k11',
    topicId: 'seeking',
    authorId: 'b10',
    city: 'מודיעין',
    time: 'אתמול',
    title: 'משפחה עם 3 ילדים מחפשת דירת גן',
    body: 'חשוב להם קרבה לבית ספר וגינה של 60 מ"ר לפחות.',
    likes: 3,
    comments: [],
    search: { cities: ['מודיעין'], roomsMin: 5, roomsMax: 5, budget: 3900000, wants: ['דירת גן', 'קרוב לבית ספר'] },
  },
  {
    id: 'k12',
    topicId: 'posts',
    authorId: 'b4',
    city: 'חיפה',
    time: 'אתמול',
    body: 'בשבועות האחרונים יש לי יותר משפחות צעירות שמסתכלות על הכרמל. אצלכם משתנה משהו בסוג הפניות?',
    likes: 21,
    comments: [
      { authorId: 'b9', time: 'אתמול', body: 'אצלנו בדרום יש יותר פניות של משקיעים מהמרכז.' },
      { authorId: 'b5', time: 'אתמול', body: 'ברעננה בעיקר משפרי דיור, פחות קונים ראשונים.' },
    ],
  },
  {
    id: 'k13',
    topicId: 'knowledge',
    authorId: 'b5',
    city: 'רעננה',
    time: 'לפני יומיים',
    body: 'אחרי כל סיור אני שולחת למוכר שלוש שורות: מה הקונה אהב, מה פחות, מה הצעד הבא. פחות טלפונים בערב.',
    likes: 40,
    comments: [{ authorId: 'b2', time: 'לפני יומיים', body: 'מעולה. מתחיל מהיום.' }],
  },
  {
    id: 'k14',
    topicId: 'wins',
    authorId: 'b1',
    city: 'תל אביב',
    time: 'לפני 3 ימים',
    body: 'נסגר השבוע דופלקס גג בלב העיר, שת"פ עם יונתן. הלקוח שלו, הנכס שלי, חלוקה שווה, אפס דרמות.',
    likes: 31,
    comments: [
      { authorId: 'b2', time: 'לפני 3 ימים', body: 'תענוג לעבוד איתך. לעסקה הבאה.' },
      { authorId: 'b3', time: 'לפני 3 ימים', body: 'מזל טוב לשניכם.' },
    ],
    image: img('prop-07'),
  },
  {
    id: 'k15',
    topicId: 'seeking',
    authorId: 'b7',
    city: 'נתניה',
    time: 'לפני 3 ימים',
    title: 'זוג מחו"ל מחפש דירה עם נוף לים',
    body: 'מגיעים לביקור בסוף החודש. רוצים לראות כמה שיותר ביום אחד.',
    likes: 7,
    comments: [],
    search: { cities: ['נתניה'], roomsMin: 4, roomsMax: 4, budget: 4700000, wants: ['נוף לים', 'קומה גבוהה', 'מרפסת גדולה'] },
  },
  {
    id: 'k16',
    topicId: 'posts',
    authorId: 'b9',
    city: 'באר שבע',
    time: 'לפני 4 ימים',
    body: 'בניתי השבוע דף אישי בבונה. רבע שעה, ושני לקוחות כבר שאלו אם יש לי משרד גדול. ממליץ.',
    likes: 12,
    comments: [{ authorId: 'b7', time: 'לפני 4 ימים', body: 'ראיתי, נראה מצוין. באיזו תבנית בחרת?' }],
  },
]

export const notices: Notice[] = [
  {
    id: 'n1',
    kind: 'comment',
    title: 'יונתן שגב הגיב לפוסט שלך',
    text: 'תענוג לעבוד איתך. לעסקה הבאה.',
    time: 'לפני 3 ימים',
    read: false,
    topicId: 'wins',
    itemId: 'k14',
  },
  {
    id: 'n2',
    kind: 'comment',
    title: 'תמר אלון הגיבה לפוסט שלך',
    text: 'מזל טוב לשניכם.',
    time: 'לפני 3 ימים',
    read: true,
    topicId: 'wins',
    itemId: 'k14',
  },
]

/**
 * הדמיה לדמו בלבד: כמה שניות אחרי שמפרסמים בקשת "מחפש לקונה" מה-CRM,
 * "מתווך אחר" מפרסם נכס שמתאים לה, כדי להראות את התראת ההתאמה.
 */
export const simulatedListings: Record<string, CommunityItem> = {
  c7: {
    id: 'sim-c7',
    topicId: 'coop',
    authorId: 'b8',
    city: 'תל אביב',
    time: 'עכשיו',
    title: 'דירת 3 חדרים משופצת עם מעלית',
    body: 'בניין משופץ, מעלית וחניה רשומה בטאבו. פנויה, כניסה מיידית.',
    likes: 0,
    comments: [],
    image: img('prop-09'),
    property: { area: 'תל אביב - יפו', rooms: '3', price: 3050000, split: 'חלוקת עמלה שווה' },
  },
}

/** Does a property fit a saved search? Used for the "נמצאה התאמה" alerts. */
export const fitsSearch = (s: SearchSpec, p: { city: string; rooms: string; price: number }) => {
  const rooms = parseFloat(p.rooms)
  return s.cities.includes(p.city) && rooms >= s.roomsMin && rooms <= s.roomsMax && p.price <= s.budget
}

export const roomsLabel = (s: SearchSpec) =>
  s.roomsMin === s.roomsMax ? `${s.roomsMin} חדרים` : `${s.roomsMin} עד ${s.roomsMax} חדרים`

// -------------------------------------------------------------- onboarding
// טקסטים לדוגמה. הנוסח הסופי ייכתב על ידי המייסדים.

export const whyCommunity = [
  {
    title: 'הבקשה שלך לא נבלעת',
    text: 'בקבוצת וואטסאפ הודעה נעלמת תוך דקות. כאן כל בקשה נשמרת בנושא שלה, ותקבלו התראה כשמתפרסם נכס מתאים.',
  },
  {
    title: 'שת"פ בכל הארץ',
    text: 'נכס לשיתוף פעולה, הפניה למתווך בעיר אחרת או חיפוש לקונה. עם מתווכים מכל הארץ.',
  },
  {
    title: 'יש מי שאחראי',
    text: 'צוות שמלווה את הקהילה, מפקח ושומר על רמה. ועוד: מחירים מוזלים אצל שמאים ועורכי דין.',
  },
]
