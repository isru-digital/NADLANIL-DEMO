import { CURRENT_BROKER_ID } from '../config'
import type { CommunityItem, PropertyInfo, SearchSpec } from '../data/demo'
import { isBusinessWord, isKind, kindFits, kindOf, searchGroup } from '../config/propertyTypes'
import { nameKey, samePlace } from '../config/places'
import { priceTolerance } from '../config/matchPrice'

/**
 * The match between a property and a buyer's search (Itzik 17.11.2026): city, neighbourhood, kind of home, rooms,
 * budget, parking, elevator and safe room. The deal (sale or rent) and the city must agree; the rest adds up to a
 * score out of 100, and each part says whether it fits, so a card can show why. Nothing here reads a street or a
 * house number: a match is made of the city and the neighbourhood.
 * The kind (22.11.2026) is one of the two lists of config/propertyTypes.ts: "מגורים" never matches "מסחרי", and
 * inside a group a search that names kinds is answered by a property of one of those kinds.
 */
export type Reason = { label: string; ok: boolean }
export type Match = { item: CommunityItem; score: number; reasons: Reason[] }

export const MATCH_MIN = 55
const AMENITIES = ['חניה', 'מעלית', 'ממ"ד', 'ממ"ק'] as const

export const hoodOf = (p: PropertyInfo) => p.area.split(' - ')[1]?.split(' · ')[0].trim() ?? ''
/** an office or a business property, or a search for one: they match each other only */
export const isBizKind = (k: string) => isBusinessWord(k)
/** the group and the kind of a post's property; a post from before the list is read from its old words */
export const propertyKind = (p: PropertyInfo, title?: string) => kindOf({ group: p.group, kind: p.kind, title, business: !p.rooms && p.area.includes('מ"ר') })
const isBiz = (p: PropertyInfo) => propertyKind(p).group === 'business'
const has = (p: PropertyInfo, a: (typeof AMENITIES)[number]) => {
  const extra = (p.extra ?? []).join(' ')
  if (a === 'חניה') return (p.parking ?? 0) > 0 || extra.includes('חניה')
  if (a === 'מעלית') return p.elevator === true || extra.includes('מעלית')
  if (a === 'ממ"ק') return extra.includes('ממ"ק') || extra.includes('ממק')
  return extra.includes('ממ"ד') || extra.includes('ממד')
}

/** how well a property fits a search, 0 to 100, or null when it cannot fit at all (another city, rent for a buyer) */
export function scoreOf(city: string, p: PropertyInfo, s: SearchSpec): { score: number; reasons: Reason[] } | null {
  if ((p.deal ?? 'sale') !== (s.deal ?? 'sale')) return null
  if (s.cities.length && !s.cities.includes(city)) return null
  const want = searchGroup(s)
  if (isBiz(p) !== (want === 'business')) return null
  const reasons: Reason[] = [{ label: city, ok: true }]
  let pts = 25

  // neighbourhood: counts fully when the buyer did not ask for one
  const hood = hoodOf(p)
  if (s.neighborhoods?.length) {
    // one way of writing a name (22.11.2026): "נוה שאנן" and "שכונת נווה שאנן" are the same neighbourhood
    const ok = !!hood && s.neighborhoods.some((h) => samePlace(h, hood) || nameKey(hood).includes(nameKey(h)) || nameKey(h).includes(nameKey(hood)))
    pts += ok ? 10 : 3
    reasons.push({ label: ok ? `שכונה: ${hood}` : 'שכונה אחרת', ok })
  } else pts += 10

  // the streets a buyer asked for: a property on one of them is a little better (the street is public since 22.11.2026)
  if (s.streets?.length) {
    const ok = !!p.street && s.streets.some((x) => samePlace(x, p.street!))
    if (ok) pts += 5
    reasons.push({ label: ok ? `רחוב ${p.street}` : 'רחוב אחר', ok })
  }

  // kind of home
  const mine = propertyKind(p)
  const kind = mine.kind
  // a search that names kinds of the list is answered by one of them; an older, general search takes the whole group
  if (s.kinds?.some((k) => isKind(want, k))) {
    const ok = kindFits(mine, s.kinds, want)
    pts += ok ? 10 : 2
    reasons.push({ label: ok ? kind : `${kind}, לא מה שביקש`, ok })
  } else pts += 10

  // rooms: in the range, or half a room or a room off
  const rooms = parseFloat(p.rooms)
  if (!Number.isNaN(rooms) && !isBiz(p)) {
    const off = rooms < s.roomsMin ? s.roomsMin - rooms : rooms > s.roomsMax ? rooms - s.roomsMax : 0
    if (off > 1) return null
    pts += off === 0 ? 20 : off <= 0.5 ? 14 : 7
    reasons.push({ label: `${rooms} חדרים`, ok: off === 0 })
  } else pts += 10

  // the budget, with the window of config/matchPrice.ts (23.11.2026): so much above it, and so much below it
  const off = p.price - s.budget
  const tol = priceTolerance(s.budget, s.deal ?? 'sale')
  if (Math.abs(off) > tol) return null
  pts += off <= 0 ? 20 : off <= tol / 2 ? 14 : 8
  if (s.budgetMin && p.price < s.budgetMin * 0.8) pts -= 5
  reasons.push({ label: off <= 0 ? 'בתקציב' : off <= tol / 2 ? 'מעט מעל התקציב' : 'מעל התקציב, בטווח', ok: off <= 0 })

  // the must-haves the buyer asked for
  const wants = AMENITIES.filter((a) => s.wants.includes(a))
  if (wants.length) {
    const got = wants.filter((a) => has(p, a))
    pts += Math.round((15 * got.length) / wants.length)
    wants.forEach((a) => reasons.push({ label: a, ok: has(p, a) }))
  } else pts += 15

  return { score: Math.max(0, Math.min(100, Math.round(pts))), reasons }
}

/**
 * The posts of other brokers that match one of mine: buyers for my property, properties for my buyer.
 * A match the broker said "לא מעניין אותי" to is gone for good (Itzik 23.11.2026): it is not offered again, here
 * or anywhere else that asks for matches.
 */
export function matchesFor(mine: CommunityItem, items: CommunityItem[]): Match[] {
  const out: Match[] = []
  for (const it of items) {
    if (it.authorId === CURRENT_BROKER_ID || it.id === mine.id) continue
    if (matchStore.said(mine.id, it.id) === 'no') continue
    const r = mine.property && it.search ? scoreOf(mine.city, mine.property, it.search) : mine.search && it.property ? scoreOf(it.city, it.property, mine.search) : null
    if (r && r.score >= MATCH_MIN) out.push({ item: it, ...r })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 8)
}

/* ------------------------------------------------------------ what I answered, kept in this browser */

const KEY = 'nadlanup-match-v1'
type Saved = { said: Record<string, 'yes' | 'no'>; mutual: string[] }
const read = (): Saved => {
  try {
    return { said: {}, mutual: [], ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Saved>) }
  } catch {
    return { said: {}, mutual: [] }
  }
}
const write = (s: Saved) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable */
  }
}
export const pairKey = (mine: string, theirs: string) => `${mine}|${theirs}`
export const matchStore = {
  said: (mine: string, theirs: string) => read().said[pairKey(mine, theirs)],
  say(mine: string, theirs: string, v: 'yes' | 'no') {
    const s = read()
    s.said[pairKey(mine, theirs)] = v
    write(s)
  },
  mutual(mine: string, theirs: string) {
    const s = read()
    const k = pairKey(mine, theirs)
    if (!s.mutual.includes(k)) s.mutual.push(k)
    write(s)
  },
}

/**
 * In the demo the other broker's side is played: a broker whose post fits well (70 and up) is taken as interested
 * too, so "מעניין אותי" on such a card makes a match. Said so on the screen.
 */
export const otherSideInterested = (m: Match) => m.score >= 70

/** has any match of this broker's been made yet? (the calm line of the co-operation room, 23.11.2026) */
export const anyMutual = () => read().mutual.length > 0

/** both sides said yes on this pair (kept so the notice's button opens the chat the second time) */
export const isMutual = (mine: string, theirs: string) => read().mutual.includes(pairKey(mine, theirs))

/** "יש לי" on a notice, anywhere in the site, opens the same "יש התאמה!" and chat as the match screen does */
export type Pair = { mine: string; theirs: string }
const listeners = new Set<(p: Pair) => void>()
export const matchUi = {
  answer: (p: Pair) => listeners.forEach((l) => l(p)),
  on(l: (p: Pair) => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
}

/** city and neighbourhood, never more */
export const placeOf = (it: CommunityItem) => {
  const hood = it.property ? hoodOf(it.property) : it.search?.neighborhoods?.[0] ?? ''
  const city = it.property ? it.city : it.search?.cities.join(', ') || it.city
  return hood ? `${city} · ${hood}` : city
}
