import { cities } from '../data/demo'

/**
 * "מוואטסאפ למערכת" (green version, free for every member): a message copied from a WhatsApp group is taken apart
 * into an orderly property or request. It is pasted by hand; nothing connects to WhatsApp, and nothing is sent
 * anywhere. Names and phone numbers are never published.
 */
export type Parsed = {
  kind: 'property' | 'request'
  city: string
  rooms: number | null
  price: number | null
  extras: string[]
  hadPhone: boolean
}

/** cities the demo knows, in the order they are looked for */
export const knownCities = [...new Set([...cities, 'פתח תקווה', 'חולון', 'בת ים', 'אשדוד', 'אשקלון', 'כפר סבא', 'הוד השרון', 'רחובות', 'נס ציונה', 'קריית אונו', 'בני ברק', 'ראש העין', 'גבעת שמואל', 'חדרה', 'יבנה', 'עפולה', 'טבריה', 'אילת'])]

/** what a message may mention, and how it is written on the card */
export const extraWords: [RegExp, string][] = [
  [/מרפסת/, 'מרפסת שמש'],
  [/חני[הי]/, 'חניה'],
  [/מעלית/, 'מעלית'],
  [/ממ["״']?ד/, 'ממ"ד'],
  [/מחסן/, 'מחסן'],
  [/משופצ|שיפוץ/, 'משופצת'],
  [/גינה/, 'גינה'],
  [/נוף/, 'נוף פתוח'],
  [/מיזוג|מזגנ/, 'מיזוג'],
]
export const allExtras = extraWords.map(([, label]) => label)

const phone = /(?:\+972|0)[-\s]?\d{1,2}[-\s]?\d{3}[-\s]?\d{4}/g

export const sampleMessage = 'למכירה בפתח תקווה, כפר גנים: דירת 4 חדרים, קומה 3 עם מעלית, מרפסת שמש וחניה. משופצת. 2.65 מיליון. לפרטים דני 052-1234567'
export const sampleRequest = 'לקוח שלי מחפש 3 חדרים ברמת גן עד 2.3 מיליון, חייב מעלית וממ"ד. מישהו? 050-7654321'

export function parseWhatsapp(text: string): Parsed {
  const t = text.replace(/\s+/g, ' ')
  const kind = /מחפש|דרוש|לקוח שלי|קונה מחפש|מעוניין לקנות|מישהו\?/.test(t) && !/למכירה|להשכרה/.test(t) ? 'request' : 'property'

  // the city that appears first in the message
  let city = ''
  let at = Infinity
  for (const c of knownCities) {
    const i = t.indexOf(c)
    if (i >= 0 && i < at) {
      at = i
      city = c
    }
  }

  const r = t.match(/(\d+(?:[.,]5)?)\s*(?:חדרים|חדר|חד['׳])/)
  const rooms = r ? Number(r[1].replace(',', '.')) : null

  // "2.65 מיליון", "2,650,000", "950 אלף"
  let price: number | null = null
  const withoutPhones = t.replace(phone, ' ')
  const million = withoutPhones.match(/(\d+(?:[.,]\d+)?)\s*(?:מיליון|מליון|מלש["״]?ח|מ['׳]\s*(?:₪|ש["״]ח))/)
  const full = withoutPhones.match(/(\d{1,3}(?:,\d{3})+)/)
  const thousand = withoutPhones.match(/(\d+)\s*אלף/)
  if (million) price = Math.round(Number(million[1].replace(',', '.')) * 1_000_000)
  else if (full) price = Number(full[1].replace(/,/g, ''))
  else if (thousand) price = Number(thousand[1]) * 1000

  const extras = extraWords.filter(([re]) => re.test(t)).map(([, label]) => label)
  return { kind, city, rooms, price, extras, hadPhone: withoutPhones !== t }
}

/** "דירת 4 חדרים בפתח תקווה" / "מחפש 3 חדרים ברמת גן" */
export const titleOf = (kind: Parsed['kind'], rooms: number | null, city: string) => {
  const r = rooms ? `${rooms} חדרים` : ''
  const where = city ? ` ב${city}` : ''
  return kind === 'property' ? `דירת ${r || 'מגורים'}${where}` : `מחפשים ${r || 'דירה'}${where}`
}
