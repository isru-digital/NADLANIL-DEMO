// ---------------------------------------------------------------------------
// נתוני דמו בלבד. כל השמות, הנכסים, המחירים והטקסטים בקובץ הזה מומצאים.
// אין כאן אנשים אמיתיים, טלפונים אמיתיים או נכסים אמיתיים.
// ---------------------------------------------------------------------------

import type { TopicId } from '../config/topics'
import { isKind, searchGroup } from '../config/propertyTypes'
import { priceFits } from '../config/matchPrice'
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
  /** Only on a real, signed-in person's own card (auth/profile.ts): their own number, or none. Never invented. */
  phone?: string
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
  /** the kind of property, one of the group's list in config/propertyTypes.ts (22.11.2026). An older card has none
      and is read through `kindOf` */
  ptype?: string
  sqm?: number
  floor?: string
  /** city used for community filtering and matching */
  city: string
  /** the address (22.11.2026): the street is shown to every broker in the community; the building's number only when
      the broker turned "להציג מספר בניין" on; the flat's number never leaves the broker's own card */
  street?: string
  houseNo?: string
  aptNo?: string
  showHouseNo?: boolean
  /** a street or a neighbourhood added by hand, not picked from the city's list (22.11.2026) */
  placeManual?: string[]
  /** the neighbourhood: published with the city */
  neighborhood?: string
  /** what the property has (a safe room, a lift...): on the broker's card and, since 22.11.2026, on the post too */
  extras?: string[]
  /** "להעלות גם כסטורי": the post of this property is in the row of stories too (it needs a photo) */
  asStory?: boolean
  /** "עמלת שת"פ" (22.11.2026), in percent of the price: 0 to 1, every 0.05. A card from before has none */
  coopPct?: number
  /** how many parking spaces (0 = none, 3 = three or more) */
  parking?: number
  /** marked for urban renewal (תמ"א 38 or פינוי בינוי) */
  renewal?: boolean
  /** "מצב הנכס" (25.11.2026): one of PROPERTY_CONDITIONS, picked on the new property form */
  condition?: string
  /** "תיאור הנכס" (27.11.2026): free words, a few lines. They are read by the community, so never a phone or a client's name */
  desc?: string
  /** clients only: what the buyer is looking for (never includes name or phone) */
  search?: SearchSpec
}

export type SearchSpec = {
  cities: string[]
  /** a buyer's request of the demo, put there so a match can be seen at all (23.11.2026): it carries a "דוגמה" tag */
  sample?: boolean
  roomsMin: number
  roomsMax: number
  /** the most the buyer pays, or the most rent a month when `deal` is 'rent' */
  budget: number
  wants: string[]
  deal?: 'sale' | 'rent'
  /** a full search (17.11.2026): the neighbourhoods, the kinds of home and the least the buyer pays */
  neighborhoods?: string[]
  /** the streets the buyer asked for (22.11.2026), picked from the city's list */
  streets?: string[]
  kinds?: string[]
  /** "מגורים" or "מסחרי" (22.11.2026); an older search is read from its kinds */
  group?: 'home' | 'business'
  budgetMin?: number
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
  'השכרות',
  'דירות יד שנייה',
  'קונים ראשונים',
]

export const brokers: Broker[] = [
  {
    id: 'b1',
    name: 'מאיה לנדאו',
    title: 'מתווכת דירות יד שנייה',
    area: 'תל אביב ורמת גן',
    region: 'תל אביב והמרכז',
    specialties: ['משפחות', 'דירות יד שנייה', 'השקעות'],
    avatar: img('broker-01'),
    years: 11,
    bio: 'מלווה משפחות ומשקיעים בתל אביב וברמת גן, בעיקר בדירות של 3 ו-4 חדרים. אוהבת עסקאות פשוטות, מחיר אמיתי ושיחה פתוחה עם שני הצדדים.',
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
  // ---- more brokers from all over the country (16.11.2026). Invented names; no photo means initials are shown.
  { id: 'b11', name: 'רועי אזולאי', title: 'מתווך דירות יד שנייה', area: 'אשדוד', region: 'הדרום', specialties: ['משפחות', 'דירות יד שנייה'], avatar: '', years: 12, bio: 'מכיר את אשדוד רובע אחרי רובע. רוב הלקוחות שלו משפרי דיור ומשפחות צעירות שמחפשות קרוב לים.' },
  { id: 'b12', name: 'ענבל גולן', title: 'מתווכת למשפרי דיור', area: 'פתח תקווה', region: 'תל אביב והמרכז', specialties: ['משפחות', 'דירות חדשות'], avatar: '', years: 8, bio: 'עובדת באם המושבות, בכפר גנים ובמרכז העיר. מלווה משפחות שעוברות מדירה קטנה לגדולה, כולל מכירה וקנייה במקביל.' },
  { id: 'b13', name: 'משה דהן', title: 'מתווך בתים פרטיים', area: 'חדרה', region: 'השרון', specialties: ['בתים פרטיים', 'משפחות'], avatar: '', years: 19, bio: 'כמעט עשרים שנה בחדרה ובסביבה. בתים פרטיים, דו משפחתיים ומגרשים, ומשפחות שעוברות מהמרכז צפונה.' },
  { id: 'b14', name: 'סיגל אברג\'יל', title: 'מתווכת בעמק יזרעאל', area: 'עפולה', region: 'חיפה והצפון', specialties: ['בתים פרטיים', 'קונים ראשונים'], avatar: '', years: 10, bio: 'עפולה, עפולה עילית והיישובים בעמק. הרבה קונים ראשונים ומשפחות צעירות, ותמיד בלי לחץ.' },
  { id: 'b15', name: 'נדב שושן', title: 'מתווך השכרות', area: 'תל אביב', region: 'תל אביב והמרכז', specialties: ['השכרות'], avatar: '', years: 4, bio: 'השכרות בלב תל אביב ובפלורנטין. דירות קטנות, שותפים וסטודנטים, ומשכירים שרוצים שקט.' },
  { id: 'b16', name: 'אסף לוי', title: 'מתווך השכרות והשקעות', area: 'באר שבע', region: 'הדרום', specialties: ['השכרות', 'השקעות'], avatar: '', years: 6, bio: 'דירות להשקעה ולהשכרה ליד האוניברסיטה ובשכונות החדשות. מלווה גם משקיעים מהמרכז מול השוכרים.' },
  { id: 'b17', name: 'קרן וייס', title: 'מתווכת דירות פרימיום', area: 'תל אביב', region: 'תל אביב והמרכז', specialties: ['יוקרה'], avatar: '', years: 15, bio: 'פנטהאוזים ודירות גג בצפון הישן. עובדת עם מעט לקוחות בכל פעם, בדיסקרטיות.' },
  { id: 'b18', name: 'יעל ברק', title: 'מתווכת השכרות ומשפחות', area: 'חיפה', region: 'חיפה והצפון', specialties: ['השכרות', 'משפחות'], avatar: '', years: 5, bio: 'נווה שאנן, אחוזה והדר. השכרות לסטודנטים של הטכניון ודירות משפחה על הכרמל.' },
  { id: 'b19', name: 'אבי מלכה', title: 'מתווך דירות חדשות', area: 'אשדוד', region: 'הדרום', specialties: ['דירות חדשות', 'התחדשות עירונית'], avatar: '', years: 17, bio: 'פרויקטים חדשים ותמ"א באשדוד ובאשקלון. יודע לקרוא חוזה של קבלן ולהסביר אותו בפשטות.' },
  { id: 'b20', name: 'מיטל כהן', title: 'מתווכת השכרות', area: 'תל אביב', region: 'תל אביב והמרכז', specialties: ['השכרות', 'תושבי חוץ'], avatar: '', years: 7, bio: 'השכרות לטווח ארוך בצפון תל אביב, לעובדי הייטק ולמשפחות שחוזרות מחו"ל.' },
  { id: 'b21', name: 'דוד אוחנה', title: 'מתווך דירות יד שנייה', area: 'חולון', region: 'תל אביב והמרכז', specialties: ['דירות יד שנייה', 'משפחות'], avatar: '', years: 21, bio: 'ותיק בחולון ובבת ים. דירות של 3 ו-4 חדרים, ירושות, ומשפחות שגדלו מהדירה.' },
  { id: 'b22', name: 'רינת פרץ', title: 'מתווכת דירות למשפחות', area: 'כפר סבא', region: 'השרון', specialties: ['משפחות', 'דירות חדשות'], avatar: '', years: 9, bio: 'כפר סבא והוד השרון. משפחות עם ילדים, קרבה לבתי ספר ולפארקים, ותהליך מסודר מההתחלה עד הסוף.' },
  { id: 'b23', name: 'עמית נגר', title: 'מתווך נכסים מסחריים', area: 'ראשון לציון', region: 'השפלה', specialties: ['השקעות'], avatar: '', years: 11, bio: 'משרדים, חנויות ומבני תעשייה קלה בראשון לציון ובחולון. גם דירות להשקעה למי שמתחיל.' },
  { id: 'b24', name: 'לימור חדד', title: 'מתווכת בגליל המערבי', area: 'נהריה', region: 'חיפה והצפון', specialties: ['משפחות', 'בתים פרטיים'], avatar: '', years: 13, bio: 'נהריה והיישובים בגליל המערבי. משפחות שעוברות צפונה ומחפשות שקט, ים ובית עם חצר.' },
  { id: 'b25', name: 'עידו רוזנברג', title: 'מתווך לקונים ראשונים', area: 'מודיעין', region: 'ירושלים והסביבה', specialties: ['קונים ראשונים', 'משפחות'], avatar: '', years: 3, bio: 'מלווה קונים ראשונים במודיעין ובסביבה. מסביר משכנתה, היטלים ומסים בלי מילים מסובכות.' },
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
  'דירות של 3 ו-4 חדרים בתל אביב וברמת גן, למשפחות ולמשקיעים. אני עובדת עם כמה לקוחות בכל פעם, ויודעת מי מחפש מה לפני שהמודעה יוצאת. 11 שנים בשטח.',
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
  title: 'מתווכת דירות יד שנייה',
  area: 'תל אביב ורמת גן',
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
  'פתח תקווה',
  'אשדוד',
  'חדרה',
  'עפולה',
  'חולון',
  'כפר סבא',
  'נהריה',
]

export type Comment = { authorId: string; body: string; time: string; replies?: Comment[] }

/** A property shared in the community. `price` is the asking price, or the monthly rent when `deal` is 'rent'. */
export type PropertyInfo = {
  area: string
  rooms: string
  price: number
  /** the old "חלוקת עמלה" line. Kept on what was published with it, and no longer shown (22.11.2026): "עמלת שת"פ"
      took its place */
  split?: string
  /** "עמלת שת"פ" in percent of the price (0 to 1, every 0.05). A post from before has none, and no tag */
  coopPct?: number
  /** one of the few properties of the demo that are marked "שת"פ מלא" so the filter has what to show
      (Itzik 23.11.2026). They carry a "דוגמה" tag beside the fee, so no one takes them for a real property. */
  sample?: boolean
  showPrice?: boolean
  deal?: 'sale' | 'rent'
  /** the kind of property (config/propertyTypes.ts) and its group; an older post is read through `kindOf` */
  kind?: string
  group?: 'home' | 'business'
  /** the street, shown to every broker in the community (22.11.2026); the building's number is here only when the
      broker chose to show it. The flat's number is never here. */
  street?: string
  houseNo?: string
  sqm?: number
  floor?: string
  /** how many parking spaces (0 = none, 3 = three or more) */
  parking?: number
  elevator?: boolean
  /** marked for urban renewal: a small tag on the card and the page, and a filter */
  renewal?: boolean
  /** every photo, the first one is the post's `image` */
  images?: string[]
  /** what stands out: a safe room, a balcony, a storage room... */
  extra?: string[]
}

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
  property?: PropertyInfo
  /** "תיאור הנכס" as the broker wrote it on the property form (27.11.2026): the post's own words, in place of the fixed line */
  desc?: string
  /** topic "מחפש לקונה": a saved search, never a client name */
  search?: SearchSpec
  /** topic "מתווך בעיר אחרת" (referrals) */
  referral?: { side: 'buyer' | 'seller'; toCity: string; terms: string }
  /** CRM item this message was created from */
  sourceId?: string
  fresh?: boolean
  /**
   * When it was published, in milliseconds (22.11.2026, with the order of the feed). The demo's posts tell their age
   * in words ("לפני 3 שעות") and have none: `atOf` reads those. `time` is the one shown, always, and never changes.
   */
  at?: number
  /**
   * "הקפצה למעלה" (22.11.2026): when its writer last lifted it to the top of the feed. It changes the post's place
   * in the feed and nothing else: the date on the property's page stays the day it was published.
   */
  bumpedAt?: number
  /**
   * Where it shows (22.11.2026): a post is in the feed only, a story in the row of stories only, unless its writer
   * turned on "להעלות גם כסטורי" / "לפרסם גם כפוסט בפיד". What was published before this had no such choice and
   * stays where it was: in the feed, and in the stories when it has a photo.
   */
  show?: 'feed' | 'story' | 'both'
  /** a buyer who looks in a city its broker does not work in (27.11.2026): the post carries "הפניה מעיר אחרת" */
  otherCity?: boolean
}

/** Is it in the feed (and in every list that is made of the feed's posts)? */
export const inFeed = (it: Pick<CommunityItem, 'show'>) => it.show !== 'story'
/** Is it in the row of stories? A story is a picture, so it needs one. */
export const inStories = (it: Pick<CommunityItem, 'show' | 'image'>) => !!it.image && it.show !== 'feed'

export type Notice = {
  id: string
  kind: 'comment' | 'match' | 'interest'
  title: string
  text: string
  time: string
  read: boolean
  topicId: TopicId
  itemId: string
  /** a demo simulation (another broker's reaction): marked as an example where it is shown */
  demo?: boolean
  /** a match the broker can answer from the notice ("יש לי"): my post and the other broker's */
  pair?: { mine: string; theirs: string }
}

/**
 * The phone on a broker's profile. The demo's brokers are invented, so are their numbers: the 555 range, which is
 * not given to real lines.
 */
const PHONE_PREFIX = ['050', '052', '053', '054', '055', '058']
export const brokerPhone = (b: Pick<Broker, 'id' | 'phone'>) => {
  // a real person's own number (empty when they gave none): an invented one is never put next to their name
  if (b.phone !== undefined) return b.phone
  const n = Number(b.id.replace(/\D/g, '')) || 1
  return `${PHONE_PREFIX[n % PHONE_PREFIX.length]}-555-02${String(n).padStart(2, '0')}`
}

// ---------------------------------------------------------- more of the community (16.11.2026)
// Invented content from all over the country: properties for sale and for rent, buyers, referrals, questions and
// closed deals. Prices are sensible for each city. Nothing here is a real person, office or property.

const SPLIT = 'חלוקת עמלה שווה'

/** minutes ago of a time written in words, so the feed shows the newest first */
export function ageOf(time: string): number {
  if (time === 'עכשיו') return 0
  const n = (re: RegExp) => Number(time.match(re)?.[1] ?? 1)
  if (/דקות/.test(time)) return n(/(\d+)/)
  if (time === 'לפני שעה') return 60
  if (time === 'לפני שעתיים') return 120
  if (/שעות/.test(time)) return n(/(\d+)/) * 60
  if (time === 'הבוקר') return 300
  if (time === 'אתמול') return 1440
  if (time === 'לפני יומיים') return 2880
  if (/ימים/.test(time)) return n(/(\d+)/) * 1440
  return 1440 * 9
}

// ---------------------------------------------------------- the order of the feed (Itzik 22.11.2026)
// The feed is newest first, always. A post written in the app carries the moment it was published (`at`); the demo's
// posts tell their age in words, and `atOf` turns those words into a moment, counted back from when the page opened.
// "הקפצה למעלה" sets `bumpedAt`, and the post sits in the feed by that moment, while the words of its own date
// ("פורסם לפני 9 ימים") stay as they were, on the card and on the property's page.
const OPENED = Date.now()
/** when a post was published, in milliseconds */
export const atOf = (it: Pick<CommunityItem, 'at' | 'time'>) => it.at ?? OPENED - ageOf(it.time) * 60000
/** what puts a post in its place in the feed: when it was published, or when it was last lifted */
export const feedAt = (it: Pick<CommunityItem, 'at' | 'time' | 'bumpedAt'>) => Math.max(it.bumpedAt ?? 0, atOf(it))
/** newest first, by the moment that puts each post in its place */
export const sortFeed = <T extends Pick<CommunityItem, 'at' | 'time' | 'bumpedAt'>>(list: T[]): T[] => [...list].sort((a, b) => feedAt(b) - feedAt(a))

/** how long a post waits between one lift and the next: 24 hours (27.11.2026; it was two days) */
export const BUMP_GAP = 24 * 60 * 60 * 1000
/** the moment this post may be lifted again: 24 hours after it was published, or after the last lift */
export const bumpReadyAt = (it: Pick<CommunityItem, 'at' | 'time' | 'bumpedAt'>) => feedAt(it) + BUMP_GAP
/** may it be lifted now? */
export const canBump = (it: Pick<CommunityItem, 'at' | 'time' | 'bumpedAt'>, now = Date.now()) => now >= bumpReadyAt(it)
/** the wait, in the words the button says: "בעוד 13 שעות" */
export function waitWords(ms: number): string {
  const mins = Math.max(1, Math.ceil(ms / 60000))
  if (mins < 60) return mins === 1 ? 'בעוד דקה' : `בעוד ${mins} דקות`
  const hours = Math.ceil(mins / 60)
  if (hours === 1) return 'בעוד שעה'
  if (hours === 2) return 'בעוד שעתיים'
  return `בעוד ${hours} שעות`
}

/** how long ago, in words: "לפני 3 שעות", "לפני יומיים" */
export function agoWords(at: number, now = Date.now()): string {
  const mins = Math.floor((now - at) / 60000)
  if (mins < 1) return 'עכשיו'
  if (mins < 60) return mins === 1 ? 'לפני דקה' : `לפני ${mins} דקות`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return hours === 1 ? 'לפני שעה' : hours === 2 ? 'לפני שעתיים' : `לפני ${hours} שעות`
  const days = Math.floor(hours / 24)
  if (days < 14) return days === 1 ? 'לפני יום' : days === 2 ? 'לפני יומיים' : `לפני ${days} ימים`
  const weeks = Math.floor(days / 7)
  if (weeks < 9) return `לפני ${weeks} שבועות`
  const months = Math.floor(days / 30)
  return months < 12 ? `לפני ${months} חודשים` : 'לפני יותר משנה'
}
/** the line on every post (27.11.2026): how long since it was published, or since "הקפצה" lifted it */
export const postedWords = (it: Pick<CommunityItem, 'at' | 'time' | 'bumpedAt'>, now = Date.now()) => `פורסם ${agoWords(feedAt(it), now)}`

const home = (
  id: string,
  authorId: string,
  city: string,
  time: string,
  title: string,
  body: string,
  likes: number,
  property: Omit<PropertyInfo, 'split'> & { split?: string },
  comments: Comment[] = [],
): CommunityItem => ({ id, topicId: 'coop', authorId, city, time, title, body, likes, comments, image: property.images?.[0], property: { split: SPLIT, deal: 'sale', ...property } })

const buyer = (id: string, authorId: string, city: string, time: string, title: string, body: string, likes: number, search: SearchSpec, comments: Comment[] = []): CommunityItem => ({
  id,
  topicId: 'seeking',
  authorId,
  city,
  time,
  title,
  body,
  likes,
  comments,
  search: { deal: 'sale', ...search },
})

function moreItems(): CommunityItem[] {
  return [
    // ------------------------------------------------------------ properties
    home('p1', 'b4', 'חיפה', 'לפני 25 דקות', 'דירת 4 חדרים בנווה שאנן עם נוף למפרץ', 'בניין מטופח עם מעלית, מרפסת ונוף פתוח למפרץ. פנויה בעוד חודשיים.', 8,
      { area: 'חיפה - נווה שאנן', rooms: '4', price: 1690000, kind: 'דירה', sqm: 98, floor: '3 מתוך 6', parking: 1, elevator: true, images: [img('il-haifa-carmel'), img('il-ramat-gan-living'), img('il-kitchen'), img('il-bedroom')], extra: ['ממ"ד', 'מרפסת 10 מ"ר', 'מחסן'] },
      [{ authorId: 'b18', time: 'לפני 10 דקות', body: 'יש לי זוג מהטכניון שמחפש בדיוק באזור. מדברת איתך היום.' }]),
    home('p9', 'b15', 'תל אביב', 'לפני 40 דקות', 'להשכרה: 2 חדרים משופצים בלב העיר', 'בניין ישן ומטופח, ריצוף מקורי ותריסי עץ. מתאים לזוג או לשוכר אחד. כניסה מיידית.', 5,
      { area: 'תל אביב - לב העיר', rooms: '2', price: 6900, deal: 'rent', kind: 'דירה להשכרה', sqm: 52, floor: '2 מתוך 3', parking: 0, elevator: false, renewal: true, images: [img('il-tlv-rental'), img('il-bathroom')], extra: ['משופצת', 'מזגן בכל חדר', 'מרוהטת חלקית'] }),
    home('p2', 'b9', 'באר שבע', 'לפני שעה', 'דירת 5 חדרים ברמות, קומה גבוהה', 'בניין חדש יחסית, ממ"ד ושתי חניות. מתאים למשפחה או למשקיע שרוצה תשואה יציבה.', 6,
      { area: 'באר שבע - רמות', rooms: '5', price: 1850000, kind: 'דירה', coopPct: 0, sample: true, sqm: 125, floor: '7 מתוך 9', parking: 2, elevator: true, images: [img('il-beersheva'), img('il-kitchen'), img('il-mamad-kids'), img('il-bathroom')], extra: ['ממ"ד', 'שתי חניות', 'מרפסת שמש'] }),
    home('p3', 'b11', 'אשדוד', 'לפני שעתיים', 'דירת 4 חדרים במגדל ליד הים', 'חמש דקות הליכה לחוף, נוף חלקי לים ולובי מטופח.', 12,
      { area: 'אשדוד - רובע י"א', rooms: '4', price: 2450000, kind: 'דירה במגדל', coopPct: 0, sample: true, sqm: 110, floor: '12 מתוך 20', parking: 1, elevator: true, images: [img('il-ashdod'), img('il-ramat-gan-living'), img('il-bedroom'), img('il-bathroom')], extra: ['נוף לים', 'ממ"ד', 'מחסן'] },
      [{ authorId: 'b19', time: 'לפני שעה', body: 'מכיר את הבניין, מתוחזק מצוין. יש לי משפחה שמחפשת שם.' }]),
    home('p4', 'b12', 'פתח תקווה', 'לפני 3 שעות', 'דירת 5 חדרים חדשה באם המושבות', 'מפתח בעוד חודש. מטבח חדש, שתי חניות ומחסן, מרפסת לנוף פתוח.', 9,
      { area: 'פתח תקווה - אם המושבות', rooms: '5', price: 3250000, kind: 'דירה חדשה', sqm: 130, floor: '9 מתוך 16', parking: 2, elevator: true, images: [img('il-petah-tikva'), img('il-kitchen'), img('il-mamad-kids'), img('il-bathroom')], extra: ['שתי חניות', 'מחסן', 'מרפסת 14 מ"ר'] }),
    home('p5', 'b7', 'נתניה', 'לפני 4 שעות', 'דירת 4 חדרים עם נוף לים בעיר ימים', 'קומה גבוהה, מרפסת מול השקיעה. הבעלים גמישים במועד הכניסה.', 15,
      { area: 'נתניה - עיר ימים', rooms: '4', price: 3390000, kind: 'דירה', sqm: 112, floor: '14 מתוך 18', parking: 1, elevator: true, images: [img('il-netanya-balcony'), img('prop-05'), img('il-bedroom'), img('il-kitchen')], extra: ['נוף לים', 'מרפסת 12 מ"ר', 'ממ"ד'] },
      [{ authorId: 'b1', time: 'לפני 3 שעות', body: 'יש לי זוג שחוזר מחו"ל וזה בדיוק בשבילם. מתקשרת אלייך.' }]),
    home('p10', 'b8', 'רמת גן', 'לפני 5 שעות', 'להשכרה: 4 חדרים ליד הבורסה', 'דירה מוארת עם מרפסת שמש, מעלית וחניה. מתאים למשפחה או לזוג שעובד מהבית.', 4,
      { area: 'רמת גן - הבורסה', rooms: '4', price: 8200, deal: 'rent', kind: 'דירה להשכרה', coopPct: 0, sample: true, sqm: 100, floor: '5 מתוך 8', parking: 1, elevator: true, images: [img('il-ramat-gan-living'), img('il-kitchen'), img('il-bedroom')], extra: ['מרפסת שמש', 'ממ"ד', 'מחסן'] }),
    home('p6', 'b13', 'חדרה', 'הבוקר', 'בית פרטי 6 חדרים עם גינה', 'בית של שתי קומות על מגרש של 400 מ"ר, ברחוב שקט וקרוב לבתי ספר. מוכרים כי הילדים גדלו.', 11,
      { area: 'חדרה - בית אליעזר', rooms: '6', price: 3100000, kind: 'בית פרטי', sqm: 190, floor: 'שתי קומות, מגרש 400 מ"ר', parking: 2, elevator: false, images: [img('il-hadera-house'), img('il-garden'), img('il-kitchen'), img('il-bedroom')], extra: ['גינה', 'מרתף', 'שתי חניות'] },
      [{ authorId: 'b22', time: 'לפני שעתיים', body: 'מחיר טוב לבית בגודל הזה. יש לי משפחה מכפר סבא שמחפשת לעבור צפונה.' }]),
    home('p7', 'b14', 'עפולה', 'אתמול', 'דו משפחתי 5 חדרים עם נוף לעמק', 'בית חדש יחסית בעפולה עילית, חצר קדמית ונוף לגלבוע. מתאים לקונים ראשונים שרוצים בית.', 7,
      { area: 'עפולה - עפולה עילית', rooms: '5', price: 2150000, kind: 'דו משפחתי', sqm: 160, floor: 'שתי קומות', parking: 2, elevator: false, images: [img('il-afula-cottage'), img('il-ramat-gan-living'), img('il-mamad-kids'), img('il-bathroom')], extra: ['חצר', 'נוף לעמק', 'ממ"ד'] }),
    home('p8', 'b10', 'מודיעין', 'אתמול', 'דירת גן 5 חדרים עם גינה של 80 מ"ר', 'כניסה פרטית לגינה, פרגולה ומקום לילדים. קרוב לבית ספר ולפארק.', 10,
      { area: 'מודיעין - מוריה', rooms: '5', price: 3650000, kind: 'דירת גן', coopPct: 0, sample: true, sqm: 128, floor: 'קרקע, גינה 80 מ"ר', parking: 2, elevator: true, images: [img('il-modiin-building'), img('il-garden'), img('il-kitchen'), img('il-mamad-kids')], extra: ['גינה 80 מ"ר', 'פרגולה', 'ממ"ד'] },
      [{ authorId: 'b25', time: 'אתמול', body: 'יש לי זוג קונים ראשונים שזה מעל התקציב שלהם, אבל שווה להם לראות.' }]),
    home('p11', 'b16', 'באר שבע', 'לפני יומיים', 'להשכרה: 3 חדרים ליד האוניברסיטה', 'שלושה חדרי שינה שווים, מתאים לסטודנטים. משכיר עם ניסיון ושקט.', 3,
      { area: 'באר שבע - שכונה ד\'', rooms: '3', price: 3600, deal: 'rent', kind: 'דירה להשכרה', sqm: 75, floor: '2 מתוך 4', parking: 1, elevator: false, images: [img('il-beersheva'), img('il-bedroom'), img('il-bathroom')], extra: ['מרוהטת', 'קרוב לאוניברסיטה', 'מזגנים'] }),
    home('p12', 'b6', 'ראשון לציון', 'לפני 3 ימים', 'דירת 3 חדרים לקונים ראשונים', 'בניין שקט בלי מעלית, קומה שנייה. מחיר נכון לאזור, והבעלים רוצים לסגור מהר.', 13,
      { area: 'ראשון לציון - רמז', rooms: '3', price: 1980000, kind: 'דירה', sqm: 80, floor: '2 מתוך 4', parking: 1, elevator: false, renewal: true, images: [img('prop-09'), img('il-kitchen'), img('il-bedroom')], extra: ['משופצת', 'חניה', 'מחסן'] },
      [{ authorId: 'b25', time: 'לפני 3 ימים', body: 'שלחתי לזוג שלי. הם מבקשים סיור ביום ראשון.' }]),
    home('p13', 'b17', 'תל אביב', 'לפני 4 ימים', 'פנטהאוז 5 חדרים בצפון הישן', 'מרפסת גג של 60 מ"ר ונוף פתוח לים ולעיר. ללקוחות רציניים, דרך מתווך מלווה.', 19,
      { area: 'תל אביב - הצפון הישן', rooms: '5', price: 8900000, kind: 'פנטהאוז', sqm: 170, floor: '8 מתוך 8', parking: 2, elevator: true, images: [img('prop-01'), img('prop-07'), img('prop-06')], extra: ['מרפסת גג 60 מ"ר', 'שתי חניות', 'מחסן'] },
      [{ authorId: 'b2', time: 'לפני 4 ימים', body: 'יש לי לקוח שמחפש בדיוק את זה. חוזר אלייך עד הערב.' }]),
    // my own property in the feed (Itzik 22.11.2026): the demo needs one, so that "הקפצה למעלה" can be seen at all.
    // It is five days old, so it may be lifted now; after a lift the same button shows the two days it waits.
    home('p14', 'b1', 'רמת גן', 'לפני 5 ימים', 'דירת 4 חדרים משופצת ליד הבורסה', 'קומה רביעית עם מעלית וחניה בטאבו. הבעלים גמישים במועד הכניסה.', 6,
      { area: 'רמת גן - ליד הבורסה', rooms: '4', price: 2790000, kind: 'דירה', coopPct: 0.5, street: 'ביאליק', sqm: 104, floor: '4 מתוך 7', parking: 1, elevator: true, images: [img('prop-03'), img('prop-08'), img('il-kitchen')], extra: ['ממ"ד', 'מרפסת שמש', 'מחסן'] },
      [{ authorId: 'b2', time: 'לפני 4 ימים', body: 'יש לי זוג שמחפש בדיוק באזור. אשלח להם הערב.' }]),

    // ------------------------------------------------------------ buyers
    buyer('s1', 'b12', 'פתח תקווה', 'לפני 50 דקות', 'זוג צעיר מחפש 3 עד 4 חדרים', 'אישור עקרוני למשכנתה ביד. חשוב להם מעלית וחניה, גמישים על הקומה.', 3,
      { cities: ['פתח תקווה'], roomsMin: 3, roomsMax: 4, budget: 2400000, wants: ['מעלית', 'חניה'] }),
    buyer('s2', 'b16', 'באר שבע', 'לפני 3 שעות', 'משקיע מהמרכז מחפש דירה להשכרה', 'מחפש נכס מושכר או קל להשכרה, קרוב לאוניברסיטה או לבית החולים.', 5,
      { cities: ['באר שבע'], roomsMin: 3, roomsMax: 4, budget: 1300000, wants: ['מושכרת', 'קרוב לאוניברסיטה'] }),
    buyer('s3', 'b18', 'חיפה', 'הבוקר', 'סטודנטית מחפשת 2 חדרים להשכרה', 'מתחילה תואר שני בטכניון. מחפשת דירה שקטה, אפשר גם קטנה.', 2,
      { cities: ['חיפה'], roomsMin: 2, roomsMax: 2, budget: 3200, wants: ['קרוב לטכניון', 'מרוהטת'], deal: 'rent' }),
    buyer('s6', 'b20', 'תל אביב', 'לפני 6 שעות', 'זוג מחפש 3 חדרים להשכרה', 'עוברים בחודש הבא. מעדיפים את צפון העיר, חוזה לשנתיים.', 3,
      { cities: ['תל אביב'], roomsMin: 3, roomsMax: 3, budget: 9000, wants: ['מעלית', 'חניה', 'חוזה לשנתיים'], deal: 'rent' }),
    buyer('s4', 'b19', 'אשדוד', 'אתמול', 'משפחה מחפשת 5 חדרים קרוב לים', 'עוברים מירושלים. חשוב להם בית ספר בהליכה וממ"ד.', 6,
      { cities: ['אשדוד'], roomsMin: 5, roomsMax: 5, budget: 2700000, wants: ['ממ"ד', 'קרוב לים', 'בית ספר בהליכה'] },
      [{ authorId: 'b11', time: 'אתמול', body: 'יש לי משהו ברובע י"א שיכול להתאים. שולח לך בפרטי.' }]),
    buyer('s5', 'b14', 'עפולה', 'לפני יומיים', 'קונים ראשונים מחפשים בית בעמק', 'זוג עם תינוק, רוצים חצר ושקט. מוכנים לשפץ.', 4,
      { cities: ['עפולה'], roomsMin: 4, roomsMax: 5, budget: 2300000, wants: ['חצר', 'צמוד קרקע'] }),
    // Two requests of the demo (Itzik 23.11.2026), so there is a match to see: both fit "דירת 4 חדרים משופצת
    // ליד הבורסה", the property of the broker the demo is played as. They are marked `sample`, so a "דוגמה" tag
    // is on them wherever they show. No client is behind them: a request holds no name and no phone, as always.
    buyer('s8', 'b8', 'רמת גן', 'לפני שעה', 'משפחה מחפשת 4 חדרים ליד הבורסה', 'מוכרים בגבעתיים ועוברים לרמת גן. חשוב להם מעלית, חניה וממ"ד.', 4,
      { cities: ['רמת גן'], roomsMin: 4, roomsMax: 4, budget: 2650000, wants: ['מעלית', 'חניה', 'ממ"ד'], neighborhoods: ['ליד הבורסה'], sample: true }),
    buyer('s9', 'b2', 'רמת גן', 'הבוקר', 'זוג מחפש 4 עד 4.5 חדרים ברמת גן', 'מחפשים משופצת עם מעלית. גמישים על השכונה ועל הקומה.', 2,
      { cities: ['רמת גן'], roomsMin: 4, roomsMax: 4.5, budget: 3000000, wants: ['מעלית'], neighborhoods: ['נחלת יצחק'], sample: true }),
    buyer('s7', 'b13', 'חדרה', 'לפני 3 ימים', 'משפחה מחפשת 4 חדרים בחדרה או בנתניה', 'עוברים מהמרכז בגלל העבודה. מחליטים מהר כשמשהו מתאים.', 2,
      { cities: ['חדרה', 'נתניה'], roomsMin: 4, roomsMax: 4, budget: 2200000, wants: ['ממ"ד', 'חניה'] }),

    // ------------------------------------------------------------ referrals between brokers
    { id: 'r1', topicId: 'referrals', authorId: 'b24', city: 'נהריה', time: 'לפני שעתיים', title: 'זוג מנהריה מחפש על הכרמל', body: 'זוג שמוכר אצלי בנהריה ומחפש 4 חדרים על הכרמל, קרוב לנכדים. מי בחיפה לוקח?', likes: 4, comments: [{ authorId: 'b4', time: 'לפני שעה', body: 'אני על הכרמל, אשמח. שולח לך הודעה.' }], referral: { side: 'buyer', toCity: 'חיפה', terms: REFERRAL_TERMS } },
    { id: 'r2', topicId: 'referrals', authorId: 'b21', city: 'חולון', time: 'אתמול', title: 'יורשים דירה בבאר שבע', body: 'לקוחות שלי מחולון ירשו 3 חדרים בבאר שבע ורוצים למכור. מחפש מתווך שמכיר את השכונה.', likes: 3, comments: [{ authorId: 'b9', time: 'אתמול', body: 'אני בבאר שבע ומכיר טוב. מתקשר אליך.' }], referral: { side: 'seller', toCity: 'באר שבע', terms: REFERRAL_TERMS } },
    { id: 'r3', topicId: 'referrals', authorId: 'b22', city: 'כפר סבא', time: 'לפני 4 ימים', title: 'משפחה מכפר סבא עוברת לאשדוד', body: 'משפחה של לקוחות ותיקים עוברת דרומה. 5 חדרים, תקציב מסודר. מי באשדוד?', likes: 5, comments: [{ authorId: 'b19', time: 'לפני 4 ימים', body: 'אני באשדוד, נשמח לעזור להם.' }], referral: { side: 'buyer', toCity: 'אשדוד', terms: REFERRAL_TERMS } },

    // ------------------------------------------------------------ questions, posts and closed deals
    { id: 'q1', topicId: 'knowledge', authorId: 'b25', city: 'מודיעין', time: 'לפני 35 דקות', body: 'קונה שאל אותי היום על מס רכישה בדירה שנייה. מה אתם אומרים ללקוח במשפט אחד, לפני שאתם שולחים אותו לרואה חשבון?', likes: 9, comments: [{ authorId: 'b8', time: 'לפני 20 דקות', body: 'אני אומר לו שעל דירה נוספת יש מס כבר מהשקל הראשון, ושהחישוב המדויק אצל רואה החשבון. לא נכנס למספרים.', replies: [{ authorId: 'b25', time: 'לפני 15 דקות', body: 'תודה, בדיוק מה שהייתי צריך.' }] }] },
    { id: 'q2', topicId: 'wins', authorId: 'b11', city: 'אשדוד', time: 'לפני שעתיים', body: 'שיתוף פעולה ראשון שלי מהקהילה: הנכס של אבי, הקונה שלי. נחתם היום באשדוד. ככה זה צריך לעבוד.', likes: 41, image: img('il-ashdod'), comments: [{ authorId: 'b19', time: 'לפני שעה', body: 'תענוג. מחכה לבאה.' }, { authorId: 'b12', time: 'לפני שעה', body: 'מזל טוב לשניכם.' }] },
    { id: 'q3', topicId: 'posts', authorId: 'b14', city: 'עפולה', time: 'לפני 5 שעות', body: 'שבוע עמוס בעמק: ארבעה זוגות צעירים שמחפשים בית עם חצר. מי שיש לו נכס צמוד קרקע בעפולה או בסביבה, דברו איתי.', likes: 8, comments: [{ authorId: 'b24', time: 'לפני 4 שעות', body: 'יש לי משהו בנהריה, רחוק קצת. אם הם גמישים, תגידי.' }] },
    { id: 'q4', topicId: 'knowledge', authorId: 'b15', city: 'תל אביב', time: 'אתמול', body: 'משכיר רוצה שלושה ערבים, והשוכר מסרב. מה אתם מציעים כפשרה?', likes: 12, comments: [{ authorId: 'b20', time: 'אתמול', body: 'ערבות בנקאית בגובה חודשיים ושטר חוב. לרוב שני הצדדים מסכימים.' }, { authorId: 'b16', time: 'אתמול', body: 'אצלי זה ערב אחד ושטר. בבאר שבע משכירים פחות מתעקשים.' }] },
    { id: 'q5', topicId: 'wins', authorId: 'b9', city: 'באר שבע', time: 'לפני יומיים', body: 'נסגרה עסקה ברמות, הפניה מהקהילה. המוכרים מהמרכז, אני בשטח. תודה לדוד על ההפניה.', likes: 27, image: img('il-beersheva'), comments: [{ authorId: 'b21', time: 'לפני יומיים', body: 'שמח שזה הסתדר. הם מאוד מרוצים.' }] },
    { id: 'q6', topicId: 'posts', authorId: 'b18', city: 'חיפה', time: 'לפני יומיים', body: 'טיפ קטן להשכרות לסטודנטים: מצלמים כל חדר שינה בנפרד וכותבים את הגודל. פחות שאלות ויותר סיורים.', likes: 18, comments: [] },
    { id: 'q7', topicId: 'knowledge', authorId: 'b22', city: 'כפר סבא', time: 'לפני 3 ימים', body: 'מוכר מבקש להוריד את דמי התיווך אחרי שהבאתי קונה. איך אתם מדברים על זה בלי לפגוע ביחסים?', likes: 22, comments: [{ authorId: 'b5', time: 'לפני 3 ימים', body: 'מזכירה בעדינות מה סיכמנו בהזמנה החתומה, ואם יש סיבה אמיתית מדברים על משהו קטן אחרי החתימה.' }, { authorId: 'b21', time: 'לפני 3 ימים', body: 'בגלל זה אני מחתים על הזמנה לפני כל סיור. חוסך שיחות כאלה.' }] },
    { id: 'q8', topicId: 'posts', authorId: 'b23', city: 'ראשון לציון', time: 'לפני 5 ימים', body: 'מישהו כאן עובד עם נכסים מסחריים? יש לי חנות קטנה בראשון לציון להשכרה, ואשמח לחלוק עמלה עם מי שמביא שוכר.', likes: 6, comments: [{ authorId: 'b6', time: 'לפני 5 ימים', body: 'אני בראשון, מכיר כמה עסקים שמחפשים. נדבר.' }] },
    { id: 'q9', topicId: 'wins', authorId: 'b25', city: 'מודיעין', time: 'לפני 6 ימים', body: 'העסקה הראשונה שלי כמתווך עצמאי. זוג קונים ראשונים במודיעין, והילה עזרה לי עם החוזה. תודה לקהילה.', likes: 58, comments: [{ authorId: 'b10', time: 'לפני 6 ימים', body: 'גאה בך. זו רק ההתחלה.' }, { authorId: 'b1', time: 'לפני 6 ימים', body: 'מזל טוב, עידו.' }] },
  ]
}


export const communityItems: CommunityItem[] = (<CommunityItem[]>[
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
  // more buyers for the match moment (17.11.2026): invented, like every post of the demo
  {
    id: 'k21',
    topicId: 'seeking',
    authorId: 'b17',
    city: 'תל אביב',
    time: 'לפני 40 דקות',
    title: 'משקיע מחפש פנטהאוז בצפון הישן',
    body: 'שכונה: הצפון הישן. 5 חדרים ומעלה, נוף פתוח. מוכן לסגור מהר על הנכס הנכון.',
    likes: 6,
    comments: [],
    search: { deal: 'sale', cities: ['תל אביב'], neighborhoods: ['הצפון הישן'], roomsMin: 5, roomsMax: 6, budget: 9800000, wants: ['מעלית', 'חניה'] },
  },
  {
    id: 'k22',
    topicId: 'seeking',
    authorId: 'b5',
    city: 'תל אביב',
    time: 'לפני שעתיים',
    title: 'זוג שחוזר מחו"ל מחפש 4.5 עד 5 חדרים',
    body: 'רוצים לגור בתל אביב, קרוב לים. ממ"ד חשוב להם.',
    likes: 3,
    comments: [],
    search: { deal: 'sale', cities: ['תל אביב'], roomsMin: 4.5, roomsMax: 5, budget: 9200000, wants: ['ממ"ד'] },
  },
  {
    id: 'k23',
    topicId: 'seeking',
    authorId: 'b3',
    city: 'תל אביב',
    time: 'לפני 3 שעות',
    title: 'לקוח מירושלים מחפש 4 חדרים בלב העיר',
    body: 'שכונה: לב העיר. עובר לתל אביב בקיץ, מחפש בניין עם מעלית וחניה.',
    likes: 2,
    comments: [],
    search: { deal: 'sale', cities: ['תל אביב'], neighborhoods: ['לב העיר'], roomsMin: 4, roomsMax: 4, budget: 9000000, wants: ['חניה', 'מעלית'] },
  },
  {
    id: 'k24',
    topicId: 'seeking',
    authorId: 'b6',
    city: 'גבעתיים',
    time: 'לפני 5 שעות',
    title: 'משפחה מחפשת 4 עד 5 חדרים בגבעתיים',
    body: 'שני ילדים, צריכים ממ"ד ומעלית. גמישים בקומה.',
    likes: 5,
    comments: [],
    search: { deal: 'sale', cities: ['גבעתיים'], roomsMin: 4, roomsMax: 5, budget: 3700000, wants: ['מעלית', 'ממ"ד'] },
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
    property: { area: 'ירושלים - רחביה', rooms: '4', price: 6900000, split: 'חלוקת עמלה שווה', deal: 'sale', kind: 'דירת אבן', sqm: 110, floor: '2 מתוך 4', parking: 0, elevator: false, images: [img('prop-03'), img('il-kitchen'), img('il-bedroom'), img('il-bathroom')], extra: ['תקרות גבוהות', 'חלונות קשת', 'מחסן'] },
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
    property: { area: 'רמת גן - מתחם הבורסה', rooms: '5', price: 5350000, split: 'חלוקת עמלה שווה', deal: 'sale', kind: 'דירה במגדל', sqm: 128, floor: '18 מתוך 32', parking: 2, elevator: true, images: [img('prop-06'), img('il-ramat-gan-living'), img('il-bedroom'), img('il-bathroom')], extra: ['שתי חניות', 'מחסן', 'מרפסת 14 מ"ר'] },
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
  ...moreItems(),
]).sort((a, b) => ageOf(a.time) - ageOf(b.time))


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
  // the same window around the budget as the match screen uses (config/matchPrice.ts, 23.11.2026)
  return s.cities.includes(p.city) && rooms >= s.roomsMin && rooms <= s.roomsMax && priceFits(p.price, s.budget, s.deal ?? 'sale')
}

/** what a search is for, in a few words: the rooms of a home, or the kinds of a commercial property (it has no rooms) */
export const roomsLabel = (s: SearchSpec) =>
  searchGroup(s) === 'business'
    ? s.kinds?.filter((k) => isKind('business', k)).join(', ') || 'נכס מסחרי'
    : s.roomsMin === s.roomsMax
      ? `${s.roomsMin} חדרים`
      : `${s.roomsMin} עד ${s.roomsMax} חדרים`

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
