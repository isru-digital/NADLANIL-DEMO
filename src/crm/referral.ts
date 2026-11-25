import { useSyncExternalStore } from 'react'
import { CURRENT_BROKER_ID } from '../config'
import { brokerById, brokerPhone, brokers, formatPriceShort } from '../data/demo'
import { clientActions } from './clients'
import type { Client } from './clients'

/**
 * "יש לי לקוח בעיר שלך" (24.11.2026, the flow changed 25.11.2026): a broker hands a buyer or a renter from the CRM to a
 * broker of the community who works in that city, for a referral fee of 25% or 50%. The offer carries what the client
 * looks for, never a name or a phone.
 *
 * The other broker answers "מעוניין, בוא נדבר" or "לא מתאים לי". "מעוניין" opens a chat between the two brokers with a
 * ready message to edit and send (it says the fee is agreed), and a "המשך בוואטסאפ" link to the referring broker's
 * phone. The client's name and phone are never passed on by themselves: only the referring broker sends them, from the
 * chat, after a "לשלוח?" question. Once both have agreed in the chat (the fee in the message, the details sent), the
 * summary shows on both sides.
 *
 * Everything here is demo data in this browser: the brokers' work areas are invented, nothing goes to the server, and
 * in the demo the other broker's side is played a few seconds after each step.
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

/** Where a referral stands; both brokers see the same word. */
export type RefStatus = 'sent' | 'pending' | 'talking' | 'shared' | 'closed' | 'declined'
export const STATUS_WORDS: Record<RefStatus, string> = {
  sent: 'נשלחה',
  pending: 'ממתינה לתגובה',
  talking: 'בשיחה',
  shared: 'פרטים נשלחו',
  closed: 'נסגרה',
  declined: 'לא רלוונטית',
}

/** A line of the chat between the two brokers. 'contact' is the client's details, sent by the referring broker. */
export type RefMsg = { id: string; from: 'me' | 'them'; kind: 'text' | 'contact'; text?: string; at: number }

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
  status: RefStatus
  at: number
  /** the chat between the two brokers, opened by "מעוניין, בוא נדבר" */
  msgs?: RefMsg[]
  /** the broker who would get the client agreed to the fee: their first message in the chat says so */
  takerAgreedAt?: number
  /** the referring broker sent the client's name and phone, from the chat */
  sharedAt?: number
  /** 'out': the client in my CRM */
  clientId?: string
  /** 'in': the client's name and phone, held by the referring broker's side of the demo. Shown only once they sent them */
  contact?: { name: string; phone: string }
  /** 'in': the client as it entered my CRM when the details came */
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
/** the fee agreed and the client's details sent: the summary shows */
export const agreed = (r: Referral) => !!r.takerAgreedAt && !!r.sharedAt
/** the referring broker, and the one who would get the client */
export const giverOf = (r: Pick<Referral, 'dir' | 'otherId'>) => (r.dir === 'out' ? CURRENT_BROKER_ID : r.otherId)
export const takerOf = (r: Pick<Referral, 'dir' | 'otherId'>) => (r.dir === 'out' ? r.otherId : CURRENT_BROKER_ID)

/**
 * The ready first message of the broker who would get the client, to the referring one: what was offered, and the fee
 * agreed. It is left in the chat's box, to change or to send as it is.
 */
export function openerOf(r: Referral) {
  const giver = brokerById(giverOf(r)).name.split(' ')[0]
  const taker = brokerById(takerOf(r)).name
  const rooms = r.roomsMin === r.roomsMax ? `${r.roomsMin} חדרים` : `${r.roomsMin}-${r.roomsMax} חדרים`
  const mil = (n: number) => (n >= 1_000_000 ? String(Math.round(n / 100_000) / 10) : null)
  let budget: string
  if (r.side === 'renter') {
    const k = (n: number) => n.toLocaleString('he-IL')
    budget = r.budgetMin ? `בשכירות של ${k(r.budgetMin)}-${k(r.budget)} ₪ לחודש` : `בשכירות של עד ${k(r.budget)} ₪ לחודש`
  } else if (mil(r.budget)) {
    budget = r.budgetMin && mil(r.budgetMin) ? `בתקציב ${mil(r.budgetMin)}-${mil(r.budget)} מיליון` : `בתקציב של עד ${mil(r.budget)} מיליון`
  } else {
    budget = `בתקציב של עד ${formatPriceShort(r.budget)}`
  }
  const where = r.hoods.length ? `${r.city} - ${r.hoods.join(', ')}` : r.city
  return `היי ${giver}, זה ${taker}. קיבלתי את הודעת ההפניה שלך לגבי ${sideText(r)} שמחפש ${rooms} ${budget} ב${where}. מבחינתי אני מסכים/ה שאם נבצע עסקה עם הלקוח הזה, אעביר לך עמלת הפניה של ${r.pct}%. אשמח לאישורך ולקבלת פרטי הלקוח 🙂`
}

/** A broker's WhatsApp with a message: a link the broker taps. The site sends nothing. */
export function whatsappTo(brokerId: string, text: string) {
  const phone = brokerPhone(brokerById(brokerId)).replace(/\D/g, '').replace(/^0/, '972')
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : ''
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
const seed = (): Referral[] => [
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

// v2 (25.11.2026): the chat and the six statuses; an offer kept by the old flow is not carried over
const KEY = 'nadlanup-referrals-v2'
// the other broker's side in the demo: it sees my offer, answers it, answers in the chat and sends the details
export const SEEN_MS = 1500
export const ANSWER_MS = 5000
export const REPLY_MS = 2500
export const SHARE_MS = 4500

function load(): Referral[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Referral[] | null
    return Array.isArray(raw) ? raw : seed()
  } catch {
    return seed()
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
const find = (id: string) => list.find((x) => x.id === id)
const patch = (id: string, p: Partial<Referral> | ((r: Referral) => Partial<Referral>)) =>
  save(list.map((r) => (r.id === id ? { ...r, ...(typeof p === 'function' ? p(r) : p) } : r)))
const msg = (from: RefMsg['from'], kind: RefMsg['kind'], text?: string): RefMsg => ({ id: `m${Date.now()}${Math.random().toString(36).slice(2, 6)}`, from, kind, text, at: Date.now() })
const push = (id: string, m: RefMsg) => patch(id, (r) => ({ msgs: [...(r.msgs ?? []), m] }))
const theyAnsweredSince = (r: Referral, at: number) => (r.msgs ?? []).some((m) => m.from === 'them' && m.at > at)

/** a word on the screen when the other broker of the demo does something, unless that referral is open */
let onEvent: ((r: Referral, what: 'talk' | 'details') => void) | null = null
export const whenAnswered = (fn: typeof onEvent) => {
  onEvent = fn
}
/** the offer whose window is open: what happens shows there, so no word on top of it */
const watched = new Set<string>()
export const watchOffer = (id: string | null, on = true) => {
  if (!id) return
  if (on) watched.add(id)
  else watched.delete(id)
}

/** The chat that is open, one at a time, wherever it was opened from. */
let chatId: string | null = null
const chatListeners = new Set<() => void>()
export const openChat = (id: string | null) => {
  chatId = id
  chatListeners.forEach((l) => l())
}
export const useOpenChat = () =>
  useSyncExternalStore(
    (cb) => {
      chatListeners.add(cb)
      return () => chatListeners.delete(cb)
    },
    () => chatId,
  )

const tell = (id: string, what: 'talk' | 'details') => {
  const r = find(id)
  if (r && !watched.has(id) && chatId !== id) onEvent?.(r, what)
}

/**
 * The other broker's side in the demo, played by the clock so that a reload loses no step. My offer: seen, then
 * "מעוניין" with their ready message in the chat; after my details, a thank you. An offer to me: after my first
 * message, a short answer, then the details of the client.
 */
function tick() {
  const now = Date.now()
  for (const { id } of [...list]) {
    let r = find(id)!
    if (r.dir === 'out') {
      if (r.status === 'sent' && now >= r.at + SEEN_MS) patch(id, { status: 'pending' })
      r = find(id)!
      if (r.status === 'pending' && now >= r.at + ANSWER_MS && !r.takerAgreedAt) {
        patch(id, { status: 'talking', takerAgreedAt: now, msgs: [msg('them', 'text', openerOf(r))] })
        tell(id, 'talk')
      }
      r = find(id)!
      if (r.sharedAt && now >= r.sharedAt + REPLY_MS && !theyAnsweredSince(r, r.sharedAt)) push(id, msg('them', 'text', 'תודה רבה! אתקשר ללקוח עוד היום ואעדכן אותך.'))
    } else if (r.status === 'talking' && r.takerAgreedAt && !r.sharedAt) {
      if (now >= r.takerAgreedAt + REPLY_MS && !theyAnsweredSince(r, 0)) push(id, msg('them', 'text', `מעולה, סגור על ${r.pct}%. הנה הפרטים של הלקוח:`))
      if (now >= r.takerAgreedAt + SHARE_MS) {
        receiveDetails(id)
        tell(id, 'details')
      }
    }
  }
}
const due = (r: Referral) =>
  r.dir === 'out'
    ? r.status === 'sent' || (r.status === 'pending' && !r.takerAgreedAt) || (!!r.sharedAt && !theyAnsweredSince(r, r.sharedAt))
    : r.status === 'talking' && !!r.takerAgreedAt && !r.sharedAt
let timer: number | null = null
const run = () => {
  tick()
  if (list.some(due)) {
    if (timer === null) timer = window.setInterval(run, 400)
  } else if (timer !== null) {
    window.clearInterval(timer)
    timer = null
  }
}
// a step that was due while the page was closed happens now
if (typeof window !== 'undefined') window.setTimeout(run, 0)

/** an offer to me: the referring broker of the demo sends the details, and the client enters my CRM */
function receiveDetails(id: string) {
  const r = find(id)
  if (!r || r.dir !== 'in' || !r.contact || r.sharedAt) return
  const from = brokerById(r.otherId).name
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
  patch(id, (x) => ({ status: 'shared', sharedAt: Date.now(), addedId, msgs: [...(x.msgs ?? []), msg('them', 'contact')] }))
}

export const referralActions = {
  send(offer: ReturnType<typeof offerOf>, otherId: string, pct: Pct) {
    const id = `rf-${Date.now()}`
    save([{ ...offer, id, dir: 'out', otherId, pct, status: 'sent', at: Date.now() }, ...list])
    run()
    return id
  },
  /** "מעוניין, בוא נדבר": the chat opens with the ready message in its box. Nothing of the client is shown */
  interested(id: string) {
    const r = find(id)
    if (!r || r.dir !== 'in' || r.status !== 'pending') return
    patch(id, { status: 'talking', msgs: r.msgs ?? [] })
    openChat(id)
  },
  /** "לא מתאים לי" */
  decline(id: string) {
    patch(id, { status: 'declined' })
  },
  /** a line in the chat. The first one of the broker who would get the client is their yes to the fee */
  say(id: string, text: string) {
    const t = text.trim()
    if (!t || !find(id)) return
    patch(id, (x) => ({ msgs: [...(x.msgs ?? []), msg('me', 'text', t)], ...(x.dir === 'in' && !x.takerAgreedAt ? { takerAgreedAt: Date.now() } : {}) }))
    run()
  },
  /** "שלח את פרטי הלקוח": only the referring broker, only after the "לשלוח?" question */
  shareDetails(id: string) {
    const r = find(id)
    if (!r || r.dir !== 'out' || r.sharedAt || r.status === 'declined' || r.status === 'closed') return
    patch(id, (x) => ({ status: 'shared', sharedAt: Date.now(), msgs: [...(x.msgs ?? []), msg('me', 'contact')] }))
    run()
  },
  /** after the details: the deal closed, or it went nowhere */
  mark(id: string, status: 'closed' | 'declined') {
    patch(id, { status })
  },
  reset() {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* nothing to remove */
    }
    list = seed()
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
