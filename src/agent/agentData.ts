import { asset } from '../config'

/**
 * "הסוכן שלנו": the area a broker enters after paying. The broker answers about fifteen short questions and
 * gets a personal page (like a brokerage's agent page, but better) that is built to be found in Google by the
 * broker's name. Visual demo: everything is stored in this browser only.
 */

export type Gender = 'm' | 'f'

export type AgentProfile = {
  name: string
  gender: Gender
  office: string
  /** a data URL (an uploaded picture, scaled down) or a path inside /public */
  photo: string
  licenseFile: string
  licenseNo: string
  years: number
  areas: string[]
  specialties: string[]
  clients: string[]
  languages: string[]
  style: string
  threeWords: [string, string, string]
  proudDeal: string
  firstLine: string
  offHours: string
  gallery: string[]
  phone: string
  whatsapp: string
  email: string
}

export type AgentStage = 'locked' | 'onboarding' | 'ready'

export type AgentState = {
  stage: AgentStage
  step: number
  profile: AgentProfile
  paidAt: string | null
}

export const emptyProfile: AgentProfile = {
  name: '',
  gender: 'f',
  office: '',
  photo: '',
  licenseFile: '',
  licenseNo: '',
  years: 5,
  areas: [],
  specialties: [],
  clients: [],
  languages: ['עברית'],
  style: '',
  threeWords: ['', '', ''],
  proudDeal: '',
  firstLine: '',
  offHours: '',
  gallery: [],
  phone: '',
  whatsapp: '',
  email: '',
}

export const emptyState: AgentState = { stage: 'locked', step: 0, profile: emptyProfile, paidAt: null }

/** The areas a broker can pick; the coordinates place them on the dot map of the country. */
export const areaOptions = [
  { id: 'north', label: 'הצפון והגליל', lon: 35.57, lat: 33.21 },
  { id: 'tiberias', label: 'טבריה והעמקים', lon: 35.53, lat: 32.79 },
  { id: 'haifa', label: 'חיפה והכרמל', lon: 34.99, lat: 32.79 },
  { id: 'sharon', label: 'השרון ונתניה', lon: 34.85, lat: 32.33 },
  { id: 'tlv', label: 'תל אביב והמרכז', lon: 34.78, lat: 32.08 },
  { id: 'jerusalem', label: 'ירושלים והסביבה', lon: 35.21, lat: 31.77 },
  { id: 'shfela', label: 'אשדוד והשפלה', lon: 34.65, lat: 31.8 },
  { id: 'negev', label: 'באר שבע והנגב', lon: 34.79, lat: 31.25 },
  { id: 'arava', label: 'הערבה ומצפה רמון', lon: 34.8, lat: 30.61 },
  { id: 'eilat', label: 'אילת', lon: 34.95, lat: 29.56 },
] as const

export const specialtyOptions = [
  { id: 'דירות מגורים', icon: 'home' },
  { id: 'בתים פרטיים ווילות', icon: 'key' },
  { id: 'יוקרה', icon: 'gem' },
  { id: 'פרויקטים חדשים', icon: 'building' },
  { id: 'השקעות', icon: 'trend' },
  { id: 'נכסים מסחריים', icon: 'briefcase' },
  { id: 'נכסי נופש', icon: 'sun' },
  { id: 'התחדשות עירונית', icon: 'building' },
  { id: 'תושבי חוץ', icon: 'globe' },
] as const

export const clientOptions = ['זוגות צעירים', 'משפחות', 'משקיעים', 'תושבי חוץ', 'משפרי דיור', 'בעלי עסקים', 'גיל הזהב']
export const languageOptions = ['עברית', 'אנגלית', 'רוסית', 'צרפתית', 'ערבית', 'ספרדית', 'אמהרית']
export const offHoursIdeas = ['ריצה בבוקר', 'בישול', 'משפחה וילדים', 'טיולים', 'כדורגל', 'מוזיקה', 'קפה טוב']
export const firstLineIdeas = [
  'קודם נבין מה באמת חשוב לכם בבית.',
  'אני לא ממהר, אני מדייק.',
  'ספרו לי איך נראה יום רגיל בבית החלומות.',
]

export const styleOptions = [
  { id: 'warm', title: 'אישי וחם', line: 'מלווה כמו חבר, בלי לחץ.' },
  { id: 'sharp', title: 'מקצועי וחד', line: 'מספרים, נתונים ומשא ומתן נקי.' },
  { id: 'discreet', title: 'דיסקרטי ושקט', line: 'ללקוחות שמעדיפים שלא ידעו.' },
  { id: 'fast', title: 'מהיר ויעיל', line: 'כל טלפון נענה, כל יום חשוב.' },
] as const

export const areaLabel = (id: string) => areaOptions.find((a) => a.id === id)?.label ?? id

/** "In" an area, the Hebrew way: the preposition replaces the article ("השרון ונתניה" becomes "בשרון ונתניה"). */
export const inArea = (id: string) => {
  const l = areaLabel(id)
  return l.startsWith('ה') ? `ב${l.slice(1)}` : `ב${l}`
}

/** "In" each item of a list: "ביוקרה, בדירות מגורים ובהשקעות". */
export const joinIn = (items: string[]) => joinList(items.map((i) => `ב${i}`))

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || ''

/** The address of the broker's page: the name, in the URL. */
export const slugOf = (name: string) =>
  name
    .trim()
    .replace(/["'׳״]/g, '')
    .replace(/\s+/g, '-') || 'demo'

/** Joins items the Hebrew way: "a, b ו-c". */
export function joinList(items: string[]) {
  const list = items.filter(Boolean)
  if (list.length <= 1) return list[0] ?? ''
  return `${list.slice(0, -1).join(', ')} ו${list[list.length - 1]}`
}

const g = (p: Pick<AgentProfile, 'gender'>, m: string, f: string) => (p.gender === 'f' ? f : m)

/**
 * The "about me" text of the page, written from the answers in the FIRST person (it is the broker speaking on the broker's
 * own page). Gendered Hebrew follows the choice made in the first question.
 */
export function composeAbout(p: AgentProfile): string[] {
  const out: string[] = []
  const where = p.areas.length ? ` ${joinList(p.areas.map(inArea))}` : ''
  out.push(`אני מלווה לקוחות${where}${p.years ? ` כבר ${p.years} שנים` : ''}.`)
  const style = styleOptions.find((s) => s.id === p.style)
  if (style) {
    const lines: Record<string, string> = {
      warm: 'הגישה שלי אישית וחמה: בלי לחץ, בלי קיצורי דרך, ועם שיחה אמיתית על מה שחשוב ללקוח.',
      sharp: 'הגישה שלי מקצועית וחדה: מספרים, נתונים ומשא ומתן נקי עד לסגירה.',
      discreet: `אני ${g(p, 'עובד', 'עובדת')} בדיסקרטיות מלאה, ללקוחות שמעדיפים שהעסקה תישאר ביני לבינם.`,
      fast: `אני ${g(p, 'זמין ומהיר', 'זמינה ומהירה')}: כל טלפון נענה, ואין עסקה שנתקעת בגלל חוסר מענה.`,
    }
    out.push(lines[style.id])
  }
  const works = g(p, 'עובד', 'עובדת')
  if (p.specialties.length && p.clients.length) {
    out.push(`אני מתמחה ${joinIn(p.specialties)}, ו${works} עם ${joinList(p.clients)}.`)
  } else if (p.specialties.length) {
    out.push(`אני מתמחה ${joinIn(p.specialties)}.`)
  } else if (p.clients.length) {
    out.push(`אני ${works} עם ${joinList(p.clients)}.`)
  }
  if (p.proudDeal.trim()) out.push(p.proudDeal.trim())
  if (p.offHours.trim()) out.push(`מחוץ לעבודה: ${p.offHours.trim()}.`)
  return out
}

/** A complete example, used by the "fill it in for me" button and by the sample page. */
export const sampleProfile: AgentProfile = {
  name: 'מאיה לנדאו',
  gender: 'f',
  office: 'מתווכת עצמאית, חברת קהילת NadlanUP',
  photo: asset('img/broker-01.webp'),
  licenseFile: 'רישיון-תיווך.pdf',
  licenseNo: '123456',
  years: 11,
  areas: ['tlv', 'sharon', 'jerusalem'],
  specialties: ['יוקרה', 'דירות מגורים', 'תושבי חוץ'],
  clients: ['משפחות', 'משקיעים', 'תושבי חוץ'],
  languages: ['עברית', 'אנגלית', 'צרפתית'],
  style: 'warm',
  threeWords: ['סבלנית', 'מדויקת', 'כנה'],
  proudDeal: 'העסקה שאני הכי גאה בה: משפחה שחיפשה שנתיים, ומצאה בית בשלושה שבועות.',
  firstLine: 'קודם נבין מה באמת חשוב לכם בבית.',
  offHours: 'ריצה בבוקר, בישול ביום שישי וקפה טוב בכל עיר',
  gallery: [],
  phone: '050-1234567',
  whatsapp: '050-1234567',
  email: 'maya@example.com',
}
