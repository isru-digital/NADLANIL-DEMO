import { useSyncExternalStore } from 'react'
import { CURRENT_BROKER_ID } from '../config'
import { brokers, formatPriceShort } from '../data/demo'
import { clientActions } from './clients'
import type { Client } from './clients'

/**
 * "יש לי לקוח בעיר שלך" (24.11.2026): a broker hands a buyer or a renter from the CRM to a broker of the community who
 * works in that city, for a referral fee of 25% or 50%. The offer carries what the client looks for, never a name or a
 * phone. Only after the other broker says yes does the name and the phone reach them, and both get a short summary.
 *
 * Everything here is demo data in this browser: the brokers' work areas are invented, nothing goes to the server, and in
 * the demo the other broker's answer is played a few seconds after the offer is sent.
 */
export type Pct = 25 | 50
export const PCTS: Pct[] = [25, 50]
export const REFERRAL_NOTE = 'סיכום ההפניה אינו הסכם מחייב. מומלץ לחתום על הסכם שיתוף פעולה בכתב.'

/** Where each broker of the demo works: the cities and the neighbourhoods of their profile (invented). */
export const WORK: Record<string, { city: string; hoods: string[] }[]> = {
  b2: [{ city: 'הרצליה', hoods: ['הרצליה פיתוח', 'נווה עמל', 'מרכז העיר'] }],
  b3: [{ city: 'ירושלים', hoods: ['רחביה', 'בקעה', 'קטמון'] }],
  b4: [{ city: 'חיפה', hoods: ['הכרמל', 'אחוזה'] }],
  b5: [{ city: 'רעננה', hoods: ['מרכז העיר', 'נווה זמר'] }],
  b6: [{ city: 'ראשון לציון', hoods: ['נחלת יהודה', 'מערב העיר'] }],
  b7: [{ city: 'נתניה', hoods: ['עיר ימים', 'פולג'] }],
  b8: [
    { city: 'רמת גן', hoods: ['מרום נווה', 'הבורסה'] },
    { city: 'גבעתיים', hoods: ['בורוכוב', 'שינקין'] },
  ],
  b9: [{ city: 'באר שבע', hoods: ['רמות', 'נווה זאב'] }],
  b10: [{ city: 'מודיעין', hoods: ['מוריה', 'אבני חן'] }],
  b11: [{ city: 'אשדוד', hoods: ['רובע ז', 'רובע יז'] }],
  b12: [{ city: 'פתח תקווה', hoods: ['אם המושבות', 'כפר גנים', 'מרכז העיר'] }],
  b13: [{ city: 'חדרה', hoods: ['גבעת אולגה', 'מרכז העיר'] }],
  b14: [{ city: 'עפולה', hoods: ['עפולה עילית'] }],
  b15: [{ city: 'תל אביב', hoods: ['לב העיר', 'פלורנטין'] }],
  b16: [{ city: 'באר שבע', hoods: ['שכונה ד', 'רמות'] }],
  b17: [{ city: 'תל אביב', hoods: ['הצפון הישן', 'רמת אביב'] }],
  b18: [{ city: 'חיפה', hoods: ['נווה שאנן', 'אחוזה', 'הדר'] }],
  b19: [
    { city: 'אשדוד', hoods: ['רובע טו', 'המרינה'] },
    { city: 'אשקלון', hoods: ['ברנע'] },
  ],
}

/** The cities someone of the community works in, the client's own cities first. */
export function referralCities(first: string[] = []) {
  const all = [...new Set(Object.values(WORK).flatMap((w) => w.map((x) => x.city)))]
  return [...new Set([...first.filter((c) => all.includes(c)), ...all])]
}

export type CityBroker = { id: string; hoods: string[]; near: string[] }
/** The brokers who work in a city, by their profile's neighbourhoods; whoever works in the client's own ones first. */
export function brokersIn(city: string, wanted: string[] = []): CityBroker[] {
  return brokers
    .filter((b) => b.id !== CURRENT_BROKER_ID && WORK[b.id]?.some((w) => w.city === city))
    .map((b) => {
      const hoods = WORK[b.id].find((w) => w.city === city)!.hoods
      return { id: b.id, hoods, near: hoods.filter((h) => wanted.includes(h)) }
    })
    .sort((a, b) => b.near.length - a.near.length)
}

export type Referral = {
  id: string
  /** 'out': my client, to another broker. 'in': another broker's client, offered to me */
  dir: 'out' | 'in'
  /** the other broker */
  otherId: string
  side: 'buyer' | 'renter'
  city: string
  hoods: string[]
  roomsMin: number
  roomsMax: number
  budgetMin?: number
  budget: number
  pct: Pct
  status: 'pending' | 'accepted' | 'declined'
  at: number
  /** 'out': the client in my CRM */
  clientId?: string
  /** 'in': the client's name and phone. They are held back and shown only once I said yes */
  contact?: { name: string; phone: string }
  /** 'in': the client as it entered my CRM after the yes */
  addedId?: string
}

/** One line of what the offer says: buyer or renter, rooms, budget. No name and no phone. */
export const sideText = (r: Pick<Referral, 'side'>) => (r.side === 'renter' ? 'שוכר' : 'קונה')
export const roomsText = (r: Pick<Referral, 'roomsMin' | 'roomsMax'>) => (r.roomsMin === r.roomsMax ? `${r.roomsMin} חדרים` : `${r.roomsMin} עד ${r.roomsMax} חדרים`)
export const budgetText = (r: Pick<Referral, 'side' | 'budget' | 'budgetMin'>) => {
  const m = (n: number) => (r.side === 'renter' ? `${n.toLocaleString('he-IL')} ₪` : formatPriceShort(n))
  const top = `${m(r.budget)}${r.side === 'renter' ? ' לחודש' : ''}`
  return r.budgetMin ? `${m(r.budgetMin)} עד ${top}` : `עד ${top}`
}

/** What an offer of my client says, read from the client's card. */
export function offerOf(cl: Client, city: string): Omit<Referral, 'id' | 'dir' | 'otherId' | 'pct' | 'status' | 'at'> {
  // an older client has one number of rooms: the offer says it as it is
  const roomsMin = cl.roomsMin ?? (cl.rooms || 3)
  const roomsMax = cl.roomsMax ?? (cl.rooms || 4)
  return {
    side: cl.type === 'renter' ? 'renter' : 'buyer',
    city,
    hoods: (cl.neighborhoods ?? []).slice(0, 4),
    roomsMin,
    roomsMax,
    budgetMin: cl.budgetMin,
    budget: cl.sum,
    clientId: cl.id,
  }
}

// one offer from another broker is there from the start, so the other side of the flow can be seen
const seed: Referral[] = [
  {
    id: 'rf-in-1',
    dir: 'in',
    otherId: 'b12',
    side: 'buyer',
    city: 'תל אביב',
    hoods: ['לב העיר', 'הצפון הישן'],
    roomsMin: 3,
    roomsMax: 4,
    budgetMin: 3200000,
    budget: 3800000,
    pct: 25,
    status: 'pending',
    at: Date.now() - 40 * 60_000,
    contact: { name: 'גלעד ונטע ר.', phone: '052-555-0161' },
  },
]

const KEY = 'nadlanup-referrals-v1'
// in the demo, the other broker answers this long after the offer
export const ANSWER_MS = 5000

function load(): Referral[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Referral[] | null
    return Array.isArray(raw) ? raw : seed
  } catch {
    return seed
  }
}

let list: Referral[] = load()
const listeners = new Set<() => void>()
const save = (next: Referral[]) => {
  list = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable: the offers last until the page is closed */
  }
  listeners.forEach((l) => l())
}
const patch = (id: string, p: Partial<Referral>) => save(list.map((r) => (r.id === id ? { ...r, ...p } : r)))

/** what to do when the other broker of the demo answers (a word on the screen) */
let onAnswer: ((r: Referral) => void) | null = null
export const whenAnswered = (fn: ((r: Referral) => void) | null) => {
  onAnswer = fn
}
/** the offer whose window is open: the answer shows there, so no word on top of it */
let watched: string | null = null
export const watchOffer = (id: string | null) => {
  watched = id
}

/** The other broker's answer in the demo: a yes, a few seconds after the offer was sent. */
function playAnswer(id: string, wait: number) {
  window.setTimeout(() => {
    const r = list.find((x) => x.id === id)
    if (!r || r.status !== 'pending') return
    patch(id, { status: 'accepted' })
    if (watched !== id) onAnswer?.({ ...r, status: 'accepted' })
  }, Math.max(0, wait))
}
// an offer that was waiting when the page was closed gets its answer now
list.filter((r) => r.dir === 'out' && r.status === 'pending').forEach((r) => playAnswer(r.id, r.at + ANSWER_MS - Date.now()))

export const referralActions = {
  send(offer: ReturnType<typeof offerOf>, otherId: string, pct: Pct) {
    const id = `rf-${Date.now()}`
    save([{ ...offer, id, dir: 'out', otherId, pct, status: 'pending', at: Date.now() }, ...list])
    playAnswer(id, ANSWER_MS)
    return id
  },
  /** I say yes to an offer: the name and the phone are shown, and the client enters my CRM */
  accept(id: string) {
    const r = list.find((x) => x.id === id)
    if (!r || r.dir !== 'in' || r.status !== 'pending' || !r.contact) return
    const from = brokers.find((b) => b.id === r.otherId)?.name ?? 'מתווך מהקהילה'
    const addedId = clientActions.add({
      name: r.contact.name,
      phone: r.contact.phone,
      type: r.side,
      cities: [r.city],
      neighborhoods: r.hoods,
      rooms: r.roomsMax,
      roomsMin: r.roomsMin,
      roomsMax: r.roomsMax,
      sum: r.budget,
      budgetMin: r.budgetMin,
      about: `${r.side === 'renter' ? 'מחפש לשכור' : 'מחפש לקנות'} ${roomsText(r)} ב${r.hoods.length ? `${r.hoods.join(', ')} (${r.city})` : r.city}, ${budgetText(r)}`,
      note: `הפניה מ${from}, עמלת הפניה ${r.pct}%.`,
    })
    patch(id, { status: 'accepted', addedId })
  },
  decline(id: string) {
    patch(id, { status: 'declined' })
  },
  reset() {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* nothing to remove */
    }
    list = seed.map((r) => ({ ...r, at: Date.now() - 40 * 60_000 }))
    listeners.forEach((l) => l())
  },
}

export function useReferrals() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => list,
  )
}

export const agoText = (at: number) => {
  const min = Math.round((Date.now() - at) / 60_000)
  return min < 1 ? 'עכשיו' : min < 60 ? `לפני ${min} דקות` : min < 24 * 60 ? `לפני ${Math.round(min / 60)} שעות` : `לפני ${Math.round(min / 1440)} ימים`
}
