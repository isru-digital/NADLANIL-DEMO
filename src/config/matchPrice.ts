/**
 * HOW FAR FROM THE BUYER'S BUDGET A PROPERTY MAY STILL BE A MATCH (Itzik 23.11.2026).
 * This table is the whole rule, and it is in one place on purpose: changing a number here changes the matching
 * everywhere (the community's match screen, the notices, and the "התאמות בשבילך" list).
 *
 * The band is chosen by THE BUYER'S BUDGET, not by the property's price, so two buyers with the same budget are
 * answered by the same window, whatever is offered to them. The window opens both ways: a property may be that
 * much ABOVE the budget, and that much BELOW it (Itzik's words: "סטייה למעלה ולמטה").
 *
 *   up to 999,999 ₪        100,000 ₪
 *   1,000,000 - 2,999,999  200,000 ₪
 *   3,000,000 - 3,999,999  350,000 ₪
 *   4,000,000 - 4,999,999  375,000 ₪
 *   5,000,000 - 5,999,999  500,000 ₪
 *   6,000,000 and up       10% of the budget
 *
 * THE GAPS between the numbers Itzik wrote (900,000 and then 1,000,000; 2,900,000 and then 3,000,000): a budget of
 * 950,000 is in no band of the list as it is written. The bands here are made CONTIGUOUS downwards: a budget keeps
 * the band it is in until it reaches the next band's opening number, so 950,000 takes the 100,000 window and
 * 2,950,000 takes the 200,000 one. That is the nearer band by where the number sits, and it is also the careful
 * side: a gap never widens a window beyond what was asked for.
 *
 * A RENT is not on this table: it is a few thousand shekels a month, and a window of 100,000 ₪ would make every
 * flat in the country a match. A rent keeps a window of 10% of the rent asked for, which is what the top band does
 * anyway, and never less than 200 ₪ a month.
 */
export type PriceBand = { upTo: number; off?: number; pct?: number }

/** the table itself. `upTo` is the last budget of the band; `off` in shekels, or `pct` in percent of the budget */
export const PRICE_BANDS: PriceBand[] = [
  { upTo: 999_999, off: 100_000 },
  { upTo: 2_999_999, off: 200_000 },
  { upTo: 3_999_999, off: 350_000 },
  { upTo: 4_999_999, off: 375_000 },
  { upTo: 5_999_999, off: 500_000 },
  { upTo: Infinity, pct: 10 },
]

/** a rent's window: a tenth of the rent, and never less than this */
export const RENT_PCT = 10
export const RENT_MIN_OFF = 200

/** how far from this budget a property may be, in shekels */
export function priceTolerance(budget: number, deal: 'sale' | 'rent' = 'sale'): number {
  const b = Math.max(0, budget)
  if (deal === 'rent') return Math.max(RENT_MIN_OFF, Math.round((b * RENT_PCT) / 100))
  const band = PRICE_BANDS.find((x) => b <= x.upTo) ?? PRICE_BANDS[PRICE_BANDS.length - 1]
  return band.off ?? Math.round((b * (band.pct ?? 0)) / 100)
}

/** is this price inside the buyer's window, above it or below it? */
export const priceFits = (price: number, budget: number, deal: 'sale' | 'rent' = 'sale') => Math.abs(price - budget) <= priceTolerance(budget, deal)

/** the two ends of the window, for a line that says it in words */
export const priceWindow = (budget: number, deal: 'sale' | 'rent' = 'sale') => {
  const off = priceTolerance(budget, deal)
  return { from: Math.max(0, budget - off), to: budget + off, off }
}
