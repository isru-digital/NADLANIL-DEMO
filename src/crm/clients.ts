import { useSyncExternalStore } from 'react'
import type { CrmStatus } from '../data/demo'

/**
 * The clients of the CRM as a simple table (green version, Itzik 12.11.2026). Everything here is demo data: the names,
 * the phone numbers (the 555 range, not real lines) and the sums are invented. The list lives in this browser only.
 */
export type ClientType = 'buyer' | 'seller' | 'renter' | 'landlord' | 'manage' | 'commercial' | 'land' | 'pro'

export const TYPES: { id: ClientType; one: string; many: string; office?: boolean }[] = [
  { id: 'buyer', one: 'קונה', many: 'קונים' },
  { id: 'seller', one: 'מוכר', many: 'מוכרים' },
  { id: 'renter', one: 'שוכר', many: 'שוכרים' },
  { id: 'landlord', one: 'משכיר', many: 'משכירים' },
  // the office's own types: a community member sees them locked
  { id: 'manage', one: 'ניהול נכסים', many: 'ניהול נכסים', office: true },
  { id: 'commercial', one: 'מסחרי', many: 'מסחרי', office: true },
  { id: 'land', one: 'מגרש', many: 'מגרש', office: true },
  { id: 'pro', one: 'איש מקצוע', many: 'אנשי מקצוע', office: true },
]
export const typeOf = (id: ClientType) => TYPES.find((t) => t.id === id)!

/** Which side of a match the client is on: looking for a property, or holding one. Office types have no match button. */
export const sideOf = (t: ClientType): 'wants' | 'has' | null => (t === 'buyer' || t === 'renter' ? 'wants' : t === 'seller' || t === 'landlord' ? 'has' : null)
/** The words of the button, as Itzik set them: a buyer or a renter gets properties, a seller or a landlord gets buyers. */
export const matchLabel = (t: ClientType) => (sideOf(t) === 'wants' ? 'נכסים מתאימים' : sideOf(t) === 'has' ? 'קונים מתאימים' : null)

export type Client = {
  id: string
  name: string
  type: ClientType
  phone: string
  /** one short line: what they look for, or what they have */
  about: string
  cities: string[]
  rooms: number
  /** a budget or an asking price; a monthly rent for renters and landlords */
  sum: number
  stage: CrmStatus
  /** days since the last update: 0 is today */
  lastDays: number
  backToOwner: boolean
  tourSet: boolean
  exclusive: boolean
  note: string
  /** the office's fields */
  rating: number
  followUpDays: number | null
  createdDays: number
  /** the same client as a card of the shared CRM data, when there is one (it can be published to the community) */
  crmId?: string
  /** when the broker last touched the client here: the newest change comes first among today's */
  touched?: number
}

const c = (x: Partial<Client> & Pick<Client, 'id' | 'name' | 'type' | 'phone' | 'about' | 'cities' | 'rooms' | 'sum'>): Client => ({
  stage: 'active',
  lastDays: 0,
  backToOwner: false,
  tourSet: false,
  exclusive: false,
  note: '',
  rating: 3,
  followUpDays: null,
  createdDays: 30,
  ...x,
})

const seed: Client[] = [
  c({ id: 'k1', crmId: 'c7', name: 'רון ומיכל ק.', type: 'buyer', phone: '050-555-0101', about: 'מחפשים 3 חדרים בתל אביב - יפו, עד 3.2 מיליון', cities: ['תל אביב'], rooms: 3, sum: 3200000, stage: 'new', lastDays: 0, note: 'אישור עקרוני למשכנתה ביד.', rating: 5, followUpDays: 1, createdDays: 2 }),
  c({ id: 'k2', name: 'אורי ב.', type: 'seller', phone: '052-555-0102', about: 'מוכר 4 חדרים בגבעתיים', cities: ['גבעתיים'], rooms: 4, sum: 3650000, stage: 'active', lastDays: 0, backToOwner: true, note: 'מחכה להערכת שווי.', rating: 4, followUpDays: 2, createdDays: 9 }),
  c({ id: 'k3', name: 'נועה כ.', type: 'renter', phone: '054-555-0103', about: 'מחפשת 2 חדרים ברמת גן, עד 5,500 ₪ לחודש', cities: ['רמת גן'], rooms: 2, sum: 5500, stage: 'tour', lastDays: 1, tourSet: true, note: 'כניסה בתחילת החודש הבא.', rating: 3, followUpDays: 3, createdDays: 6 }),
  c({ id: 'k4', crmId: 'c8', name: 'משפחת אבירם', type: 'buyer', phone: '050-555-0104', about: 'מחפשים בית פרטי ברמת השרון או בהרצליה', cities: ['רמת השרון', 'הרצליה'], rooms: 5, sum: 8500000, stage: 'tour', lastDays: 1, tourSet: true, note: 'סיור ביום שלישי.', rating: 4, followUpDays: 4, createdDays: 21 }),
  c({ id: 'k5', name: 'אבי ד.', type: 'landlord', phone: '053-555-0105', about: 'משכיר 3 חדרים בחולון, 5,200 ₪ לחודש', cities: ['חולון'], rooms: 3, sum: 5200, stage: 'active', lastDays: 2, exclusive: true, note: 'הדירה מתפנה בעוד שלושה שבועות.', rating: 3, followUpDays: 6, createdDays: 14 }),
  c({ id: 'k6', name: 'דנה ויואב מ.', type: 'seller', phone: '052-555-0106', about: 'מוכרים 3 חדרים בפתח תקווה', cities: ['פתח תקווה'], rooms: 3, sum: 2450000, stage: 'negotiation', lastDays: 2, backToOwner: true, exclusive: true, note: 'הצעה ראשונה התקבלה.', rating: 5, followUpDays: 1, createdDays: 40 }),
  c({ id: 'k7', crmId: 'c9', name: 'עידן פ.', type: 'buyer', phone: '054-555-0107', about: 'משקיע, מחפש 2 עד 3 חדרים בתל אביב או ברמת גן', cities: ['תל אביב', 'רמת גן'], rooms: 3, sum: 2600000, stage: 'active', lastDays: 3, note: 'מעדיף נכס מושכר.', rating: 3, followUpDays: 7, createdDays: 18 }),
  c({ id: 'k8', name: 'תומר ושיר א.', type: 'renter', phone: '050-555-0108', about: 'מחפשים 3 חדרים בתל אביב, עד 8,000 ₪ לחודש', cities: ['תל אביב'], rooms: 3, sum: 8000, stage: 'new', lastDays: 4, note: '', rating: 2, followUpDays: null, createdDays: 4 }),
  c({ id: 'k9', name: 'מרים ה.', type: 'landlord', phone: '052-555-0109', about: 'משכירה 4 חדרים בנתניה, 6,300 ₪ לחודש', cities: ['נתניה'], rooms: 4, sum: 6300, stage: 'new', lastDays: 5, note: 'מבקשת שוכרים לטווח ארוך.', rating: 3, followUpDays: 9, createdDays: 5 }),
  c({ id: 'k10', crmId: 'c10', name: 'סופי ל.', type: 'buyer', phone: '053-555-0110', about: 'תושבת חוץ, מחפשת 3 חדרים בתל אביב', cities: ['תל אביב'], rooms: 3, sum: 6000000, stage: 'new', lastDays: 6, note: 'מגיעה לארץ בחודש הבא.', rating: 4, followUpDays: 12, createdDays: 7 }),
  c({ id: 'k11', name: 'יעל ש.', type: 'seller', phone: '054-555-0111', about: 'מוכרת 5 חדרים בראשון לציון', cities: ['ראשון לציון'], rooms: 5, sum: 3100000, stage: 'active', lastDays: 8, note: '', rating: 2, followUpDays: 14, createdDays: 33 }),
  // the office's types
  c({ id: 'k12', name: 'משפחת לוי', type: 'manage', phone: '050-555-0112', about: 'ניהול שתי דירות מושכרות בבת ים', cities: ['בת ים'], rooms: 3, sum: 0, stage: 'active', lastDays: 3, note: 'חידוש חוזה בחודש הבא.', rating: 4, followUpDays: 10, createdDays: 120 }),
  c({ id: 'k13', name: 'ח. גולן', type: 'commercial', phone: '052-555-0113', about: 'חנות ברחוב ראשי בחדרה, למכירה', cities: ['חדרה'], rooms: 1, sum: 1900000, stage: 'new', lastDays: 7, note: '', rating: 3, followUpDays: 5, createdDays: 8 }),
  c({ id: 'k14', name: 'ש. נחום', type: 'land', phone: '054-555-0114', about: 'מגרש לבנייה במושב בשרון', cities: ['השרון'], rooms: 0, sum: 2800000, stage: 'active', lastDays: 10, note: 'ממתין לאישור תב"ע.', rating: 2, followUpDays: 20, createdDays: 60 }),
  c({ id: 'k15', name: 'עו"ד רונית ב.', type: 'pro', phone: '053-555-0115', about: 'עורכת דין למקרקעין', cities: ['תל אביב'], rooms: 0, sum: 0, stage: 'active', lastDays: 12, note: 'מלווה עסקאות של לקוחות המשרד.', rating: 5, followUpDays: null, createdDays: 200 }),
]

const KEY = 'nadlanup-clients-v1'

function load(): Client[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Client[] | null
    return Array.isArray(raw) && raw.length ? raw : seed
  } catch {
    return seed
  }
}

let list: Client[] = load()
const listeners = new Set<() => void>()
const save = (next: Client[]) => {
  list = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable: the changes last until the page is closed */
  }
  listeners.forEach((l) => l())
}

export const clientActions = {
  /** A change made by the broker: the client moves to "updated today". */
  patch(id: string, p: Partial<Client>) {
    save(list.map((x) => (x.id === id ? { ...x, ...p, lastDays: 0, touched: Date.now() } : x)))
  },
  add(p: Pick<Client, 'name' | 'type' | 'phone'>) {
    const id = `k-${Date.now()}`
    save([c({ id, ...p, about: '', cities: [], rooms: 0, sum: 0, stage: 'new', lastDays: 0, createdDays: 0, touched: Date.now() }), ...list])
    return id
  },
  reset() {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* nothing to remove */
    }
    list = seed
    listeners.forEach((l) => l())
  },
}

export function useClients() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => list,
  )
}

// ---------------------------------------------------------------- words for dates
export const lastText = (days: number) => (days <= 0 ? 'היום' : days === 1 ? 'אתמול' : days < 7 ? `לפני ${days} ימים` : days < 14 ? 'לפני שבוע' : `לפני ${Math.round(days / 7)} שבועות`)
const dateIn = (days: number) => new Date(Date.now() + days * 86_400_000)
export const dateText = (days: number) => dateIn(days).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
/** yyyy-mm-dd for a date field, and back to a number of days from today. */
export const dateValue = (days: number) => {
  const d = dateIn(days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const daysFrom = (value: string) => {
  const [y, m, d] = value.split('-').map(Number)
  const today = new Date()
  return Math.round((new Date(y, m - 1, d).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000)
}

// ---------------------------------------------------------------- matches from the community (demo data)
export type Match = { id: string; brokerId: string; title: string; city: string; rooms: number; sum: number; rent?: boolean; line: string }

const forSale: Match[] = [
  { id: 'm1', brokerId: 'b2', title: 'דירת 3 חדרים משופצת', city: 'תל אביב', rooms: 3, sum: 3100000, line: 'קומה 2, מעלית, מרפסת' },
  { id: 'm2', brokerId: 'b4', title: 'דירת 3 חדרים ליד השוק', city: 'תל אביב', rooms: 3, sum: 2950000, line: 'בניין ישן, תקרות גבוהות' },
  { id: 'm3', brokerId: 'b6', title: 'דירת 2.5 חדרים מושכרת', city: 'רמת גן', rooms: 3, sum: 2400000, line: 'קרוב לרכבת הקלה' },
  { id: 'm4', brokerId: 'b3', title: 'בית פרטי עם גינה', city: 'רמת השרון', rooms: 5, sum: 8200000, line: 'מגרש 400 מ"ר, קרוב לבית ספר' },
  { id: 'm5', brokerId: 'b7', title: 'קוטג\' 5 חדרים', city: 'הרצליה', rooms: 5, sum: 7900000, line: 'גינה, חניה כפולה' },
  { id: 'm6', brokerId: 'b5', title: 'דירת 3 חדרים עם נוף לים', city: 'תל אביב', rooms: 3, sum: 5800000, line: 'קומה גבוהה, מרפסת' },
]
const forRent: Match[] = [
  { id: 'r1', brokerId: 'b6', title: 'דירת 2 חדרים מרוהטת', city: 'רמת גן', rooms: 2, sum: 5200, rent: true, line: 'קומה 3, מעלית' },
  { id: 'r2', brokerId: 'b2', title: 'דירת 2 חדרים ליד הפארק', city: 'רמת גן', rooms: 2, sum: 5400, rent: true, line: 'משופצת, מרפסת קטנה' },
  { id: 'r3', brokerId: 'b4', title: 'דירת 3 חדרים עם מרפסת', city: 'תל אביב', rooms: 3, sum: 7800, rent: true, line: 'קומה 1, בלי מעלית' },
  { id: 'r4', brokerId: 'b8', title: 'דירת 3 חדרים במרכז', city: 'תל אביב', rooms: 3, sum: 7600, rent: true, line: 'כניסה מיידית' },
]
const buyers: Match[] = [
  { id: 'q1', brokerId: 'b3', title: 'קונה מחפש 4 חדרים', city: 'גבעתיים', rooms: 4, sum: 3800000, line: 'גמיש על קומה, צריך חניה' },
  { id: 'q2', brokerId: 'b5', title: 'משפחה מחפשת 4 חדרים', city: 'גבעתיים', rooms: 4, sum: 3700000, line: 'קרוב לבית ספר' },
  { id: 'q3', brokerId: 'b7', title: 'זוג מחפש 3 חדרים', city: 'פתח תקווה', rooms: 3, sum: 2500000, line: 'אישור עקרוני למשכנתה' },
  { id: 'q4', brokerId: 'b2', title: 'משקיע מחפש 3 חדרים', city: 'פתח תקווה', rooms: 3, sum: 2400000, line: 'סגירה מהירה' },
  { id: 'q5', brokerId: 'b8', title: 'משפחה מחפשת 5 חדרים', city: 'ראשון לציון', rooms: 5, sum: 3200000, line: 'מרפסת שמש, מחסן' },
]
const renters: Match[] = [
  { id: 's1', brokerId: 'b4', title: 'זוג מחפש 3 חדרים לשכירות', city: 'חולון', rooms: 3, sum: 5400, rent: true, line: 'לטווח ארוך' },
  { id: 's2', brokerId: 'b6', title: 'סטודנטים מחפשים 3 חדרים', city: 'חולון', rooms: 3, sum: 5200, rent: true, line: 'כניסה בעוד חודש' },
  { id: 's3', brokerId: 'b3', title: 'משפחה מחפשת 4 חדרים לשכירות', city: 'נתניה', rooms: 4, sum: 6500, rent: true, line: 'לטווח ארוך, עם ילדים' },
]

/** Demo matches for a client: by the kind of deal, the city, the rooms and the sum. */
export function matchesFor(cl: Client): Match[] {
  const pool = cl.type === 'buyer' ? forSale : cl.type === 'renter' ? forRent : cl.type === 'seller' ? buyers : cl.type === 'landlord' ? renters : []
  const wants = sideOf(cl.type) === 'wants'
  return pool
    .filter((m) => cl.cities.includes(m.city) && Math.abs(m.rooms - cl.rooms) <= 1 && (wants ? m.sum <= cl.sum * 1.05 : m.sum >= cl.sum * 0.9))
    .slice(0, 4)
}

// ---------------------------------------------------------------- the pull from Yad2: a simulation only
export const yad2Demo = [
  { id: 'y1', title: 'דירת 4 חדרים עם מרפסת שמש', city: 'פתח תקווה', area: 'פתח תקווה, כפר גנים', rooms: '4', sqm: 104, price: 2650000, image: 'img/hero-flat.webp' },
  { id: 'y2', title: 'דירת 3 חדרים בקומה שנייה', city: 'חולון', area: 'חולון, קריית שרת', rooms: '3', sqm: 76, price: 2180000, image: 'img/panel-home.webp' },
  { id: 'y3', title: 'דירת 3.5 חדרים ליד הפארק', city: 'רמת גן', area: 'רמת גן, מרום נווה', rooms: '3.5', sqm: 84, price: 2890000, image: 'img/panel-keys.webp' },
  { id: 'y4', title: 'דירת 5 חדרים עם מחסן', city: 'ראשון לציון', area: 'ראשון לציון, נחלת יהודה', rooms: '5', sqm: 128, price: 3150000, image: 'img/panel-street.webp' },
]
