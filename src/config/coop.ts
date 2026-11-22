/**
 * The price of a property and the co-operation fee ("עמלת שת"פ"), Itzik 22.11.2026.
 *
 * THE PRICE moves in steps that grow with it, so the slider stays usable from a storage room to a penthouse:
 *   up to 5,000,000 ₪          every 25,000 ₪   (as he asked; most homes are here, so they get most of the track)
 *   5,000,000 to 10,000,000    every 50,000 ₪
 *   10,000,000 to 20,000,000   every 100,000 ₪
 *   20,000,000 to 30,000,000   every 250,000 ₪
 * A price that is not on these steps (2,479,000), or above 30,000,000, is typed by hand and kept exactly as typed.
 *
 * THE FEE is a share of the price that the broker gives the broker who brings the buyer: 0% to 1%, every 0.05%.
 * It is a must for a new property. A property published before it existed has none, and none is made up for it:
 * nothing about a fee shows on it.
 */

const BANDS: [upTo: number, step: number][] = [
  [5_000_000, 25_000],
  [10_000_000, 50_000],
  [20_000_000, 100_000],
  [30_000_000, 250_000],
]
export const PRICE_MIN = 25_000
/** where the slider waits before a price is picked: a usual home */
export const PRICE_START = 2_000_000
/** the most that can be typed by hand */
export const PRICE_TYPED_MAX = 999_999_999

/** every price the slider stops at, from the least to the most */
export const PRICE_STOPS: number[] = (() => {
  const out = [PRICE_MIN]
  let v = PRICE_MIN
  for (const [upTo, step] of BANDS) {
    while (v + step <= upTo) {
      v += step
      out.push(v)
    }
  }
  return out
})()
export const PRICE_MAX = PRICE_STOPS[PRICE_STOPS.length - 1]

/** the stop at or nearest to a price (a typed price that is between two stops sits at the nearer one) */
export function priceStop(price: number): number {
  if (price <= PRICE_MIN) return 0
  if (price >= PRICE_MAX) return PRICE_STOPS.length - 1
  let lo = 0
  let hi = PRICE_STOPS.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (PRICE_STOPS[mid] <= price) lo = mid
    else hi = mid
  }
  return price - PRICE_STOPS[lo] <= PRICE_STOPS[hi] - price ? lo : hi
}
/** the step the slider moves by around a price, said in words: "25,000 ₪" */
export const stepAt = (price: number) => (BANDS.find(([upTo]) => price < upTo) ?? BANDS[BANDS.length - 1])[1]

/** "2,475,000 ₪" */
export const shekels = (n: number) => `${Math.round(n).toLocaleString('he-IL')} ₪`

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
