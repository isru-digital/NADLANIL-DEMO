// ---------------------------------------------------------------------------
// נתוני דמו בלבד. כל השמות, הנכסים, המחירים והטקסטים בקובץ הזה מומצאים.
// אין כאן אנשים אמיתיים, טלפונים אמיתיים או נכסים אמיתיים.
// ---------------------------------------------------------------------------

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

export type Comment = { authorId: string; body: string; time: string }

export type Post = {
  id: string
  authorId: string
  topic: string
  body: string
  likes: number
  time: string
  comments: Comment[]
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
  sqm?: number
  floor?: string
}

export type BoardCard = {
  id: string
  kind: ItemKind
  title: string
  area: string
  rooms?: string
  price?: number
  note?: string
  split: string
  brokerId: string
  time: string
  image?: string
  fresh?: boolean
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

// ------------------------------------------------------------------- posts

export const topics = [
  'שיתופי פעולה',
  'שיווק',
  'טיפים מהשטח',
  'שאלות',
  'משפטי ומיסוי',
  'שוק ומגמות',
]

export const posts: Post[] = [
  {
    id: 'p1',
    authorId: 'b2',
    topic: 'שיתופי פעולה',
    time: 'לפני 12 דקות',
    likes: 18,
    body: 'יש לי לקוח רציני שמחפש בית פרטי בהרצליה פיתוח, מגרש של חצי דונם לפחות, תקציב גבוה. מי שמחזיק נכס שעוד לא יצא לשוק - דברו איתי. חלוקה שווה, כמובן.',
    comments: [
      { authorId: 'b5', time: 'לפני 8 דקות', body: 'יש לי משהו שיכול להתאים ברחוב שקט. שולחת לך פרטים.' },
      { authorId: 'b1', time: 'לפני 3 דקות', body: 'מעבירה לך לקוחה שמוכרת בדיוק נכס כזה. תעדכן איך הלך.' },
    ],
  },
  {
    id: 'p2',
    authorId: 'b7',
    topic: 'שיווק',
    time: 'לפני שעה',
    likes: 34,
    body: 'ניסיתי החודש לצלם סיור וידאו קצר לכל נכס חדש במקום רק תמונות. ההבדל בכמות הפניות מורגש מאוד. מי שרוצה, אשמח לשתף את מבנה הסרטון שעובד לי.',
    comments: [
      { authorId: 'b6', time: 'לפני 50 דקות', body: 'אשמח מאוד. אצלי הסרטונים יוצאים ארוכים מדי.' },
      { authorId: 'b10', time: 'לפני 41 דקות', body: 'גם אני. במיוחד מעניין אותי איך את פותחת את הסרטון.' },
      { authorId: 'b7', time: 'לפני 30 דקות', body: 'מעלה מחר פוסט מסודר עם דוגמה.' },
    ],
  },
  {
    id: 'p3',
    authorId: 'b8',
    topic: 'טיפים מהשטח',
    time: 'לפני שעתיים',
    likes: 52,
    body: 'טיפ של ותיק: לפני כל פגישת בלעדיות אני מכין דף אחד עם שלוש עסקאות דומות שנסגרו באזור ועם תוכנית שיווק ברורה. בעלי נכסים רוצים לראות תהליך, לא הבטחות.',
    comments: [
      { authorId: 'b4', time: 'לפני שעה', body: 'אימצתי. פשוט ועובד.' },
      { authorId: 'b9', time: 'לפני שעה', body: 'תודה אלון, כל פוסט שלך שווה זהב.' },
    ],
  },
  {
    id: 'p4',
    authorId: 'b10',
    topic: 'שאלות',
    time: 'לפני 3 שעות',
    likes: 9,
    body: 'מחפשת המלצה על צלם נדל"ן טוב באזור מודיעין והשפלה. מישהו שמגיע בזמן ויודע לצלם גם דירות קטנות בצורה מחמיאה.',
    comments: [
      { authorId: 'b6', time: 'לפני שעתיים', body: 'שולח לך בפרטי את מי שאני עובד איתו כבר שלוש שנים.' },
    ],
  },
  {
    id: 'p5',
    authorId: 'b3',
    topic: 'שיתופי פעולה',
    time: 'לפני 5 שעות',
    likes: 27,
    body: 'משפחה מחו"ל מגיעה לשבוע הבא ומחפשת דירת אבן ברחביה או בטלביה, ארבעה חדרים ומעלה עם מרפסת. מי שיש לו נכס מתאים, גם שקט, אשמח לתאם סיור.',
    comments: [
      { authorId: 'b1', time: 'לפני 4 שעות', body: 'אין לי בירושלים, אבל אם הם שוקלים גם תל אביב אני כאן.' },
    ],
  },
  {
    id: 'p6',
    authorId: 'b4',
    topic: 'שוק ומגמות',
    time: 'אתמול',
    likes: 21,
    body: 'מרגיש בשבועות האחרונים יותר תנועה של משפחות צעירות שבודקות את הכרמל. מעניין אם גם אצלכם באזורים אחרים יש שינוי בסוג הפניות.',
    comments: [
      { authorId: 'b9', time: 'אתמול', body: 'אצלנו בדרום יש יותר פניות של משקיעים מהמרכז.' },
      { authorId: 'b5', time: 'אתמול', body: 'ברעננה בעיקר משפרי דיור, פחות קונים ראשונים.' },
    ],
  },
  {
    id: 'p7',
    authorId: 'b5',
    topic: 'טיפים מהשטח',
    time: 'אתמול',
    likes: 40,
    body: 'הרגל קטן ששינה לי את העבודה: אחרי כל סיור אני שולחת ללקוח סיכום של שלוש שורות. מה אהב, מה פחות, ומה הצעד הבא. זה חוסך המון אי הבנות.',
    comments: [
      { authorId: 'b2', time: 'אתמול', body: 'מעולה. מתחיל מהיום.' },
    ],
  },
  {
    id: 'p8',
    authorId: 'b6',
    topic: 'משפטי ומיסוי',
    time: 'לפני יומיים',
    likes: 15,
    body: 'מי מכיר עורך דין מקרקעין שזמין ומסביר בגובה העיניים באזור השפלה? יש לי לקוחות צעירים בעסקה ראשונה ואני רוצה שירגישו בטוחים.',
    comments: [
      { authorId: 'b8', time: 'לפני יומיים', body: 'יש לי המלצה חמה, מעביר לך.' },
      { authorId: 'b10', time: 'לפני יומיים', body: 'גם לי, תבדוק את שניהם.' },
    ],
  },
  {
    id: 'p9',
    authorId: 'b9',
    topic: 'שיווק',
    time: 'לפני יומיים',
    likes: 12,
    body: 'העליתי השבוע דף נחיתה אישי דרך הבונה שכאן. לקח לי פחות מרבע שעה, ושני לקוחות כבר אמרו שזה נראה כמו של משרד גדול. ממליץ למי שעוד לא ניסה.',
    comments: [
      { authorId: 'b7', time: 'לפני יומיים', body: 'ראיתי, נראה מצוין. באיזו תבנית בחרת?' },
    ],
  },
  {
    id: 'p10',
    authorId: 'b1',
    topic: 'שיתופי פעולה',
    time: 'לפני 3 ימים',
    likes: 31,
    body: 'סגרנו השבוע עסקה משותפת עם יונתן על פנטהאוז בצפון הישן. הלקוח שלו, הנכס שלי, חלוקה שווה ואפס דרמות. ככה שיתוף פעולה אמור להיראות.',
    comments: [
      { authorId: 'b2', time: 'לפני 3 ימים', body: 'תענוג לעבוד איתך. לעסקה הבאה.' },
      { authorId: 'b3', time: 'לפני 3 ימים', body: 'מזל טוב לשניכם.' },
    ],
  },
  {
    id: 'p11',
    authorId: 'b8',
    topic: 'שאלות',
    time: 'לפני 4 ימים',
    likes: 7,
    body: 'איך אתם מנהלים תזכורות לחידוש בלעדיות? אני עדיין עובד עם יומן נייר ומרגיש שהגיע הזמן להתקדם.',
    comments: [
      { authorId: 'b4', time: 'לפני 4 ימים', body: 'בלוח הלקוחות כאן. מוסיף תזכורת לכל נכס וזה קופץ בדשבורד.' },
    ],
  },
  {
    id: 'p12',
    authorId: 'b7',
    topic: 'שוק ומגמות',
    time: 'לפני 5 ימים',
    likes: 19,
    body: 'הרבה פניות מתושבי חוץ בחודש האחרון, בעיקר לדירות עם נוף פתוח לים. מי שעובד עם קהל דומה, שווה שנדבר על שיתוף מלאי.',
    comments: [],
  },
]

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
    kind: 'client',
    title: 'זוג צעיר מחפש 3 חדרים',
    area: 'תל אביב - יפו',
    rooms: '3',
    price: 3200000,
    status: 'new',
    client: 'רון ומיכל ק.',
    note: 'אישור עקרוני למשכנתה ביד. גמישים על קומה, לא על מעלית.',
    updated: 'פנייה מהבוקר',
  },
  {
    id: 'c8',
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

// ------------------------------------------------------------ shared board

export const sharedBoard: BoardCard[] = [
  {
    id: 's1',
    kind: 'property',
    title: 'דירת אבן 4 חדרים בבניין לשימור',
    area: 'ירושלים - רחביה',
    rooms: '4',
    price: 6900000,
    note: 'תקרות גבוהות, חלונות קשת, מרפסת לגינה פנימית. מתאים גם לתושבי חוץ.',
    split: 'חלוקת עמלה שווה',
    brokerId: 'b3',
    time: 'לפני שעתיים',
    image: img('prop-03'),
  },
  {
    id: 's2',
    kind: 'client',
    title: 'משקיע מחפש 2 דירות קטנות',
    area: 'באר שבע - ליד האוניברסיטה',
    rooms: '2-3',
    price: 1400000,
    note: 'קונה במזומן, מחליט מהר. מעדיף דירות מושכרות.',
    split: 'חלוקת עמלה שווה',
    brokerId: 'b9',
    time: 'לפני 4 שעות',
  },
  {
    id: 's3',
    kind: 'property',
    title: 'דירת 5 חדרים במגדל חדש',
    area: 'רמת גן - מתחם הבורסה',
    rooms: '5',
    price: 5350000,
    note: 'קומה גבוהה, מטבח מעוצב, שתי חניות ומחסן. כניסה מיידית.',
    split: 'חלוקת עמלה שווה',
    brokerId: 'b8',
    time: 'אתמול',
    image: img('prop-06'),
  },
  {
    id: 's4',
    kind: 'client',
    title: 'משפחה עם 3 ילדים מחפשת דירת גן',
    area: 'מודיעין והסביבה',
    rooms: '5',
    price: 3900000,
    note: 'חשוב להם קרבה לבית ספר וגינה של 60 מ"ר לפחות.',
    split: 'חלוקת עמלה שווה',
    brokerId: 'b10',
    time: 'אתמול',
  },
  {
    id: 's5',
    kind: 'client',
    title: 'זוג מחו"ל מחפש דירה עם נוף לים',
    area: 'נתניה - עיר ימים',
    rooms: '4',
    price: 4700000,
    note: 'מגיעים לביקור בסוף החודש. רוצים מרפסת גדולה וקומה גבוהה.',
    split: 'חלוקת עמלה שווה',
    brokerId: 'b7',
    time: 'לפני יומיים',
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
  'כבר יותר מעשור אני מלווה קונים ומוכרים בלב תל אביב ובצפון הישן. אני מאמינה שעסקת נדל"ן טובה מתחילה בהקשבה: להבין מה באמת חשוב לכם, ורק אז לחפש את הנכס או את הקונה הנכון. אצלי תקבלו ליווי אישי, שקיפות מלאה בכל שלב והיכרות עמוקה עם כל רחוב ובניין באזור.',
  'נדל"ן יוקרה הוא עולם של פרטים קטנים. אני מתמחה בפנטהאוזים, בדירות גג ובנכסים מיוחדים בתל אביב, ועובדת עם מספר מצומצם של לקוחות בכל זמן נתון כדי לתת לכל אחד את מלוא תשומת הלב. דיסקרטיות, דיוק וזמינות הם הבסיס לכל עסקה שאני מובילה.',
  'אני מאיה, מתווכת עצמאית בתל אביב. התחלתי בתחום כי אני אוהבת את העיר ואת האנשים שבה, ונשארתי בו כי אין תחושה טובה יותר מלמסור מפתח למשפחה שמצאה בית. בין אם אתם קונים, מוכרים או רק מתחילים לחשוב על זה, אשמח לשבת איתכם לקפה ולבנות תוכנית ברורה.',
]

export const testimonials: Testimonial[] = [
  {
    id: 't1',
    name: 'משפחת הדר',
    role: 'רכשו דופלקס גג בלב העיר',
    body: 'מאיה הבינה מה אנחנו מחפשים עוד לפני שידענו להסביר את זה בעצמנו. תהליך רגוע, מדויק ובלי הפתעות.',
  },
  {
    id: 't2',
    name: 'רון ומיכל ק.',
    role: 'קונים ראשונים',
    body: 'היינו לחוצים מאוד מהרכישה הראשונה. מאיה ליוותה אותנו בסבלנות, ענתה לכל שאלה והייתה זמינה גם בשעות לא שגרתיות.',
  },
  {
    id: 't3',
    name: 'דנה ר.',
    role: 'מכרה דירה בצפון הישן',
    body: 'קיבלתי תוכנית שיווק ברורה מהיום הראשון ועדכון אחרי כל סיור. הדירה נמכרה במחיר שקיוויתי לו.',
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
