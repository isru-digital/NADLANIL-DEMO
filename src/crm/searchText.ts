/**
 * The CRM's search (26.11.2026): what the broker types is looked for as they type, in the clients' table (name,
 * phone, city, neighbourhood) and on the properties' board (title, city, neighbourhood, street).
 * Typing is forgiving: marks a phone's keyboard adds (direction marks, a trailing space), niqqud, quotes and dashes
 * do not matter, a final letter is the same as a regular one, and every word typed has to be found, in any order.
 * A phone is looked for by its digits, so "050-555" and "050555" both find the same client.
 */
const FINALS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' }
const clean = (s: string) =>
  s
    .normalize('NFKC')
    // niqqud, and the marks no one sees (zero width, direction)
    .replace(/[֑-ׇ​-‏‪-‮⁦-⁩]/g, '')
    // quotes, dots, brackets and every kind of dash
    .replace(/["'`׳״.,()\-־–—/]/g, ' ')
    .replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

/** true when every word of `query` is in one of `texts`, or (for digits) in the phone number */
export function found(query: string, texts: (string | undefined)[], phone = ''): boolean {
  const words = clean(query).split(' ').filter(Boolean)
  if (!words.length) return true
  const hay = clean(texts.filter(Boolean).join(' '))
  const digits = phone.replace(/\D/g, '')
  return words.every((w) => hay.includes(w) || (/^\d{2,}$/.test(w) && digits.includes(w)))
}

/** is there anything to look for? (a query of spaces only is no query) */
export const hasQuery = (query: string) => clean(query).length > 0
