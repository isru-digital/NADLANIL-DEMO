/**
 * The price of a property and the co-operation fee ("עמלת שת"פ"), Itzik 22.11.2026.
 *
 * THE PRICE is typed, nothing is dragged (Itzik, 22.11.2026: "אין צורך בחלק הזה, רק לרשום סכום"). The slider that
 * stopped every 25,000 ₪ was taken out of the form, and in its place there is one box: the digits are grouped while
 * they are typed (2790000 -> 2,790,000), what was typed is kept EXACTLY, and it is kept as a plain number, so the
 * filter of the feed and the shekels of the fee read it as they always did.
 * A price under 100,000 ₪ is almost always a missing zero, so the box offers, quietly, the price times a thousand.
 *
 * THE FEE is a share of the price that the broker gives the broker who brings the buyer: 0% to 1%, every 0.05%.
 * It is a must for a new property. A property published before it existed has none, and none is made up for it:
 * nothing about a fee shows on it.
 */

/** the most that can be typed */
export const PRICE_TYPED_MAX = 999_999_999
/** under this, a price is almost certainly a zero short (a storage room is 100,000 ₪ and up) */
export const PRICE_LIKELY_LOW = 100_000

/** only the digits of what was typed, as a number, never more than can be kept: "2,790,00x" -> 2790000 */
export const priceDigits = (text: string) => Math.min(PRICE_TYPED_MAX, Number(text.replace(/\D/g, '')) || 0)
/** the digits, grouped the way they are read: 2790000 -> "2,790,000" ("" for nothing) */
export const priceGroups = (n: number) => (n > 0 ? n.toLocaleString('he-IL') : '')

/** "2,475,000 ₪" */
export const shekels = (n: number) => `${Math.round(n).toLocaleString('he-IL')} ₪`

/** the size of the price in words, so a missing zero is seen at once: "2.79 מיליון שקלים", "850 אלף שקלים" */
export function priceWords(n: number): string {
  if (n <= 0) return ''
  if (n >= 1_000_000) {
    const m = Number((n / 1_000_000).toFixed(2))
    return m === 1 ? 'מיליון שקלים' : `${m.toLocaleString('he-IL')} מיליון שקלים`
  }
  if (n >= 1_000 && n % 1_000 === 0) return `${(n / 1_000).toLocaleString('he-IL')} אלף שקלים`
  return `${n.toLocaleString('he-IL')} שקלים`
}

/* ---------------------------------------------------------------- the fee */

/** 0, 0.05, 0.1 ... 1 (in percent), kept as whole hundredths so 0.1 + 0.05 never becomes 0.15000000000000002 */
export const COOP_STOPS: number[] = Array.from({ length: 21 }, (_, i) => (i * 5) / 100)
export const COOP_MAX = 1
export const coopStop = (pct: number) => Math.max(0, Math.min(COOP_STOPS.length - 1, Math.round(pct * 20)))
/** "0.5%", "0.05%", "1%", "0%" */
export const coopText = (pct: number) => `${Number(pct.toFixed(2))}%`
/** the fee in shekels, about: rounded to 100 ₪ (it is said "בערך") */
export const coopAmount = (price: number, pct: number) => Math.round((price * pct) / 100 / 100) * 100
/** is this a fee that was really chosen (a number from 0 to 1)? A property from before has none. */
export const hasCoop = (pct: unknown): pct is number => typeof pct === 'number' && Number.isFinite(pct) && pct >= 0 && pct <= COOP_MAX
