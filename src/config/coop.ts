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

/** where the caret should sit once the digits were grouped again: right after the same digit it was after */
export function priceCaret(shown: string, digitsBefore: number): number {
  if (digitsBefore <= 0) return 0
  let seen = 0
  for (let i = 0; i < shown.length; i++) {
    if (/\d/.test(shown[i])) {
      seen++
      if (seen === digitsBefore) return i + 1
    }
  }
  return shown.length
}

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

/* ------------------------------------------------- the ladder of the filter's slider (Itzik 23.11.2026) */

/**
 * THE SLIDER OF THE FEED'S FILTER goes from 0 to 100,000,000 ₪, and its jumps are not one size.
 * A slider of one step cannot do both ends of that range: 50,000 ₪ a step needs 2,000 drags to cross it, and
 * 1,000,000 ₪ a step cannot be set on 2,750,000 ₪ at all. So the track is a ladder: small steps where the prices
 * are (a flat in Israel), bigger ones where they are rare, and the handle moves one rung per step, so every rung
 * is the same number of pixels and a finger travels the whole range in one go.
 *   0 to 5M      every 50,000 ₪   (where almost every home is: 2,750,000 ₪ is a rung of its own)
 *   5M to 10M    every 250,000 ₪
 *   10M to 20M   every 500,000 ₪
 *   20M to 50M   every 1M ₪
 *   50M to 100M  every 2.5M ₪     (a building, a project: the end of the track, said "ומעלה")
 * An amount written by hand in the boxes is kept exactly as it was written, rung or not: only a handle that is
 * dragged lands on a rung.
 */
const ladder = (bands: [upTo: number, step: number][]) => {
  const out = [0]
  for (const [upTo, step] of bands) for (let v = out[out.length - 1] + step; v <= upTo; v += step) out.push(v)
  return out
}
export const SALE_LADDER = ladder([
  [5_000_000, 50_000],
  [10_000_000, 250_000],
  [20_000_000, 500_000],
  [50_000_000, 1_000_000],
  [100_000_000, 2_500_000],
])
/** a rent for a month: every 100 ₪ up to 10,000 ₪, then every 500 ₪ up to 30,000 ₪ */
export const RENT_LADDER = ladder([
  [10_000, 100],
  [30_000, 500],
])
/** which rung an amount sits on (the nearest one): where the handle of an amount typed by hand is drawn */
export function nearestStop(stops: number[], v: number): number {
  let best = 0
  for (let i = 1; i < stops.length; i++) if (Math.abs(stops[i] - v) < Math.abs(stops[best] - v)) best = i
  return best
}
