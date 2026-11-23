// @ts-nocheck
/**
 * The rules of a match, read from the code itself (23.11.2026): the window around a buyer's budget, band by band,
 * and the promise that a match the broker said "לא מעניין אותי" to is not offered again.
 * It is run by scripts/match-rules-check.mjs through tsx, and prints one line of JSON.
 */
globalThis.__THEME__ = 'green'
// the store of answers lives in the browser; here it is a small box of its own, so a "no" can be put in it
const box = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => box.get(k) ?? null,
  setItem: (k: string, v: string) => void box.set(k, String(v)),
  removeItem: (k: string) => void box.delete(k),
  clear: () => box.clear(),
  key: () => null,
  length: 0,
} as never

const { priceTolerance, priceFits, PRICE_BANDS } = await import('../../src/config/matchPrice.ts')
const { matchesFor, scoreOf, matchStore, MATCH_MIN } = await import('../../src/community/match.ts')

const out: Record<string, unknown> = {}

// ---------------------------------------------------------------- the table, band by band
out.bands = [
  [500_000, 100_000],
  [900_000, 100_000],
  [950_000, 100_000], // in the gap: it keeps the band it has not left
  [999_999, 100_000],
  [1_000_000, 200_000],
  [2_900_000, 200_000],
  [2_950_000, 200_000], // in the gap
  [3_000_000, 350_000],
  [3_900_000, 350_000],
  [3_950_000, 350_000], // in the gap
  [4_000_000, 375_000],
  [4_900_000, 375_000],
  [5_000_000, 500_000],
  [5_900_000, 500_000],
  [6_000_000, 600_000], // 10%
  [12_000_000, 1_200_000], // 10%
].map(([budget, want]) => ({ budget, want, got: priceTolerance(budget) }))
out.bandsCount = PRICE_BANDS.length

// the window opens both ways, and closes one shekel past its edge
out.edges = [
  { name: 'above the edge, inside', ok: priceFits(2_200_000, 2_000_000), want: true },
  { name: 'one shekel past it', ok: priceFits(2_200_001, 2_000_000), want: false },
  { name: 'below the edge, inside', ok: priceFits(1_800_000, 2_000_000), want: true },
  { name: 'one shekel under it', ok: priceFits(1_799_999, 2_000_000), want: false },
]
// a rent keeps a window of its own size
out.rent = { tol: priceTolerance(6_900, 'rent'), fitsNear: priceFits(7_300, 6_900, 'rent'), fitsFar: priceFits(9_000, 6_900, 'rent') }

// ---------------------------------------------------------------- "לא מעניין אותי" does not come back
const property = {
  id: 'mine-1',
  topicId: 'coop',
  authorId: 'b1',
  city: 'רמת גן',
  time: 'עכשיו',
  title: 'דירת 4 חדרים',
  body: '',
  likes: 0,
  comments: [],
  property: { area: 'רמת גן - הבורסה', rooms: '4', price: 2_790_000, kind: 'דירה', parking: 1, elevator: true, extra: ['ממ"ד'] },
}
const buyer = (id: string, budget: number) => ({
  id,
  topicId: 'seeking',
  authorId: 'b8',
  city: 'רמת גן',
  time: 'עכשיו',
  title: `קונה ${id}`,
  body: '',
  likes: 0,
  comments: [],
  search: { cities: ['רמת גן'], roomsMin: 4, roomsMax: 4, budget, wants: ['מעלית'], neighborhoods: ['הבורסה'] },
})
const inside = buyer('b-in', 2_650_000) // 140,000 under the price: inside the 200,000 window
const over = buyer('b-over', 2_500_000) // the property is 290,000 above this budget: past the window
const under = buyer('b-under', 4_000_000) // the property is 1,210,000 under this budget: past the window the other way
const pool = [property, inside, over, under]
out.window = {
  inside: !!scoreOf(property.city, property.property, inside.search),
  over: !!scoreOf(property.city, property.property, over.search),
  under: !!scoreOf(property.city, property.property, under.search),
  min: MATCH_MIN,
  found: matchesFor(property, pool).map((m) => m.item.id),
}
matchStore.say(property.id, inside.id, 'no')
out.afterNo = { said: matchStore.said(property.id, inside.id), found: matchesFor(property, pool).map((m) => m.item.id) }

console.log(JSON.stringify(out))
