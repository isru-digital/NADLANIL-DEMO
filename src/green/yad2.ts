import { extraWords, knownCities } from './whatsapp'

/**
 * "ממודעה ביד2" (Itzik 18.11.2026, after the check of what Yad2 allows): a broker copies the text of an ad they
 * published on Yad2 and pastes it here; we fill the new property card from it. That is all it does:
 *   - nothing here connects to Yad2. No address is fetched, a link pasted with the text is thrown away.
 *   - no photo is taken from the ad. The broker adds their own photos to the card.
 *   - phone numbers in the text are dropped, they never reach the card.
 * Yad2's page can be copied in two shapes, and both are read: words in a line ("4 חדרים, קומה 3 מתוך 8") and a label
 * on one line with its value on the next ("חדרים" / "4").
 */
export type Yad2Ad = {
  deal: 'sale' | 'rent'
  business: boolean
  city: string
  hood: string
  street: string
  houseNo: string
  rooms: number | null
  sqm: number | null
  floor: string
  floors: number | null
  price: number | null
  /** null = the ad does not say; 0 = no parking */
  parking: number | null
  extras: string[]
  renewal: boolean
  entry: string
  about: string
  /** what was left out on purpose, to say so to the broker */
  hadPhone: boolean
  hadLink: boolean
}

const PHONE = /(?:\+972[-\s]?|0)(?:[2-9]|5\d|7\d)[-\s]?\d{3}[-\s]?\d{4}/g
const LINK = /\b(?:https?:\/\/|www\.)\S+|\byad2\.co\.il\S*/gi
// a feature with "ללא", "אין" or "בלי" before it is not in the property
const NOT = /(?:ללא|אין|בלי|לא כולל)\s*/
// labels of Yad2's page, so a value on the next line is read with its label, and the description stops at them
const LABELS = ['חדרים', 'קומה', 'מ"ר', 'מ״ר', 'מ"ר בנוי', 'מחיר', 'תאריך כניסה', 'כניסה', 'שכונה', 'עיר', 'כתובת', 'רחוב', 'מצב הנכס', 'תיאור', 'תיאור הנכס', 'פרטים נוספים', 'מה יש בנכס', 'מאפיינים', 'חניות', 'מרפסות', 'סוג הנכס']

/** An invented ad, to try the import without a real one. Every detail in it is made up. */
export const sampleAd = `דירה למכירה
הדקל 14, כפר גנים, פתח תקווה
₪2,650,000
חדרים
4
קומה
3 מתוך 8
מ"ר
105
תאריך כניסה
גמיש
תיאור
דירה מוארת ושקטה, משופצת מהיסוד, מטבח חדש ומרפסת שמש לנוף פתוח. קרובה לבתי ספר ולפארק.
מה יש בנכס
חניה
מעלית
ממ"ד
מיזוג
מחסן
ללא סורגים
לפרטים: 052-0000000
https://www.yad2.co.il/item/demo`

const norm = (s: string) =>
  s
    .replace(/\r/g, '')
    .replace(/[״"]/g, '"')
    .replace(/[׳']/g, "'")
    .replace(/[ \t]+/g, ' ')

/** the value written on the line after a label ("חדרים" / "4"), or in the same line after it ("חדרים: 4") */
function after(lines: string[], label: RegExp): string {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim()
    const m = l.match(new RegExp(`^(?:${label.source})\\s*[:\\-]?\\s*(.*)$`))
    if (!m) continue
    if (m[1].trim()) return m[1].trim()
    const next = lines[i + 1]?.trim()
    if (next) return next
  }
  return ''
}

export function parseYad2(raw: string): Yad2Ad {
  const hadLink = LINK.test(raw)
  LINK.lastIndex = 0
  const noLinks = raw.replace(LINK, ' ')
  const hadPhone = PHONE.test(noLinks)
  PHONE.lastIndex = 0
  const text = norm(noLinks.replace(PHONE, ' '))
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const t = lines.join(' · ')

  const deal: Yad2Ad['deal'] = /להשכרה|לשכירות|שכר דירה|לחודש/.test(t) && !/למכירה/.test(t) ? 'rent' : 'sale'
  // Hebrew letters are not "word" letters to \b, so the edges are spaces and marks
  const business = /(?:^|[\s·,.])(?:משרד|משרדים|חנות|מסחרי|מסחרית|עסקי|קליניקה|מבנה תעשייה|אולם)(?=$|[\s·,.])/.test(t)

  // the city that appears first
  let city = ''
  let at = Infinity
  for (const c of knownCities) {
    const i = t.indexOf(c)
    if (i >= 0 && i < at) {
      at = i
      city = c
    }
  }

  // the address line: "הדקל 14, כפר גנים, פתח תקווה" (street and number, neighbourhood, city)
  let street = ''
  let houseNo = ''
  let hood = after(lines, /שכונה|שכונת/)
  const addressLine = after(lines, /כתובת/) || lines.find((l) => l.includes(',') && (!city || l.includes(city)) && /\d/.test(l) && l.length < 70) || ''
  if (addressLine) {
    const parts = addressLine.split(',').map((p) => p.trim()).filter((p) => p && p !== city && !knownCities.includes(p))
    for (const p of parts) {
      const sn = p.match(/^(?:רחוב|רח'|ברחוב)?\s*([^\d,]{2,24}?)\s+(\d{1,4}[א-ת]?)$/)
      if (sn && !street) {
        street = sn[1].trim()
        houseNo = sn[2]
      } else if (!hood && !/\d/.test(p) && p.length <= 24) hood = p.replace(/^שכונת\s*/, '')
    }
  }
  if (!street) {
    const s = after(lines, /רחוב/)
    const sn = s.match(/^([^\d]{2,24}?)\s*(\d{1,4}[א-ת]?)?$/)
    if (sn) {
      street = sn[1].trim()
      houseNo = sn[2] ?? ''
    }
  }
  // inside a sentence: "שכונת הבורסה", "רחוב ביאליק 22"
  if (!hood) hood = t.match(/שכונת\s+([^\s,.·\d]+(?:\s[^\s,.·\d]+)?)/)?.[1] ?? ''
  if (!street) {
    const sn = t.match(/(?:רחוב|ברחוב|רח')\s+([^\d,.·]{2,20}?)\s+(\d{1,4}[א-ת]?)(?=$|[\s,.·])/)
    if (sn) {
      street = sn[1].trim()
      houseNo = sn[2]
    }
  }
  hood = hood.replace(/^שכונת\s*/, '').slice(0, 30)

  const roomsWord = t.match(/(\d{1,2}(?:[.,]5)?)\s*(?:חדרים|חדר|חד')/)
  const roomsLabel = after(lines, /חדרים/).match(/^(\d{1,2}(?:[.,]5)?)\b/)
  const roomsRaw = roomsWord?.[1] ?? roomsLabel?.[1]
  const rooms = roomsRaw ? Number(roomsRaw.replace(',', '.')) : null

  const sqmWord = t.match(/(\d{2,4})\s*(?:מ"ר|מטרים|מטר|מ'ר)/)
  const sqmLabel = after(lines, /(?:מ"ר בנוי|מ"ר|גודל(?: הנכס)?|שטח)/).match(/^(\d{2,4})\b/)
  const sqmRaw = sqmWord?.[1] ?? sqmLabel?.[1]
  const sqm = sqmRaw ? Number(sqmRaw) : null

  let floor = ''
  let floors: number | null = null
  const fw = t.match(/קומ(?:ה|ת)\s*:?\s*(קרקע|מרתף|\d{1,2})(?:\s*(?:מתוך|\/)\s*(\d{1,2}))?/) ?? after(lines, /קומה/).match(/^(קרקע|מרתף|\d{1,2})(?:\s*(?:מתוך|\/)\s*(\d{1,2}))?/)
  if (fw) {
    floor = fw[1]
    floors = fw[2] ? Number(fw[2]) : null
  }

  // the price: "₪2,650,000", "2,650,000 ₪", "מחיר: 2,650,000", "2.65 מיליון", "7,500 לחודש"
  let price: number | null = null
  const shekel = t.match(/₪\s*(\d{1,3}(?:,\d{3})+|\d{4,})|(\d{1,3}(?:,\d{3})+|\d{4,})\s*(?:₪|ש"ח|שקלים)/)
  const labelled = after(lines, /מחיר/).match(/(\d{1,3}(?:,\d{3})+|\d{4,})/)
  const million = t.match(/(\d+(?:[.,]\d+)?)\s*(?:מיליון|מליון)/)
  if (shekel) price = Number((shekel[1] ?? shekel[2]).replace(/,/g, ''))
  else if (labelled) price = Number(labelled[1].replace(/,/g, ''))
  else if (million) price = Math.round(Number(million[1].replace(',', '.')) * 1_000_000)

  // parking: "2 חניות", "חניות: 2", "חניה", "ללא חניה"
  let parking: number | null = null
  const pn = t.match(/(\d)\s*חניות/) ?? after(lines, /חניות/).match(/^(\d)/)
  if (pn) parking = Number(pn[1])
  else if (new RegExp(`${NOT.source}חני[הי]`).test(t)) parking = 0
  else if (/חני[הי]/.test(t)) parking = 1

  // the extras the card knows, unless the ad says the property does not have them
  const extras = extraWords
    .filter(([re, label]) => label !== 'חניה' && re.test(t) && !new RegExp(`${NOT.source}(?:${re.source})`).test(t))
    .map(([, label]) => label)

  const renewal = /תמ"א|פינוי[ -]בינוי|התחדשות עירונית/.test(t)

  const entryRaw = after(lines, /תאריך כניסה|כניסה/) || (t.match(/כניסה\s*:?\s*(מיידית|גמיש(?:ה)?|\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?)/)?.[1] ?? '')
  const entry = entryRaw.match(/^(מיידית|גמיש(?:ה)?|\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?)/)?.[1] ?? ''

  // the description: after "תיאור" until the next label, or else the longest line that reads like a sentence
  let about = ''
  const di = lines.findIndex((l) => /^(?:תיאור(?: הנכס)?|פרטים נוספים)\s*:?\s*$/.test(l) || /^תיאור(?: הנכס)?\s*:/.test(l))
  if (di >= 0) {
    const first = lines[di].replace(/^(?:תיאור(?: הנכס)?|פרטים נוספים)\s*:?\s*/, '')
    const rest: string[] = first ? [first] : []
    for (let i = di + 1; i < lines.length && !LABELS.includes(lines[i].replace(/:$/, '')); i++) rest.push(lines[i])
    about = rest.join(' ')
  } else {
    about = [...lines].filter((l) => l.split(' ').length >= 7).sort((a, b) => b.length - a.length)[0] ?? ''
  }
  about = about.replace(/לפרטים\s*:?\s*$/, '').replace(/\s{2,}/g, ' ').trim().slice(0, 400)

  return { deal, business, city, hood, street, houseNo, rooms, sqm, floor, floors, price, parking, extras, renewal, entry, about, hadPhone, hadLink }
}

/** The details the card has no field for, kept in its note: "השכרה, לחודש · קומה 3 מתוך 8 · 105 מ"ר · כניסה: גמיש" */
export function adNotes(ad: Yad2Ad): string {
  const bits = [
    ad.deal === 'rent' ? 'להשכרה, המחיר לחודש' : '',
    ad.floor ? `קומה ${ad.floor}${ad.floors ? ` מתוך ${ad.floors}` : ''}` : '',
    !ad.business && ad.sqm ? `${ad.sqm} מ"ר` : '',
    ad.entry ? `כניסה: ${ad.entry}` : '',
  ].filter(Boolean)
  return [bits.join(' · '), ad.about].filter(Boolean).join('\n')
}

/** What was filled, and what was not found, to show the broker before they check the card. */
export function adReport(ad: Yad2Ad): { found: string[]; missing: string[] } {
  const pairs: [string, boolean][] = [
    ['עיר', !!ad.city],
    ['שכונה', !!ad.hood],
    ['רחוב ומספר', !!ad.street && !!ad.houseNo],
    [ad.business ? 'שטח' : 'חדרים', ad.business ? !!ad.sqm : !!ad.rooms],
    ['מחיר', !!ad.price],
    ['קומה', !!ad.floor],
    ['חניה', ad.parking !== null],
    ['תוספות', ad.extras.length > 0],
    ['תיאור', !!ad.about],
  ]
  return { found: pairs.filter(([, ok]) => ok).map(([l]) => l), missing: pairs.filter(([, ok]) => !ok).map(([l]) => l) }
}
