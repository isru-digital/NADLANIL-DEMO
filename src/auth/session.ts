/**
 * Who is using the site (green version, 15.11.2026). The community is closed to anyone who was not approved:
 * a broker signs up, an approver says yes, and the broker signs in with a link from his e-mail. This file talks to
 * the server (server/ in this repository) and remembers the signed-in session in this browser.
 *
 * Two more ways in exist: staff (the approvers) sign in the same way, and a presentation can open the old open
 * demo with the example user, through the /demo link.
 *
 * Nothing here is reactive on purpose: signing in, signing out and starting the demo all reload the page, because
 * the demo's stores read the browser's storage once, when they are loaded (see auth/profile.ts).
 */
import { identity } from '../config/identity'

export type MemberInfo = {
  id: string
  name: string
  phone: string
  email: string
  license: string
  work: 'office' | 'solo'
  office_name: string
  cities: string[]
  areas: string
  status: 'pending' | 'approved' | 'rejected'
  reason: string
  is_test: boolean
  created_at: number
  decided_at: number | null
  decided_by: string | null
  /** 24.11.2026: 'verified' when the licence number was found in the Registrar of Real Estate Brokers */
  license_status?: '' | 'verified' | 'not_found' | 'unavailable'
  registry_name?: string
}
export type StaffInfo = { name: string; email: string; approver: boolean }
export type Session = { token: string; member: MemberInfo | null; staff: StaffInfo | null }

/**
 * The server. On this computer it is the local copy in test mode; anywhere else, the real one, at its Pages address.
 * Some Israeli providers cannot look up *.workers.dev names at all (16.11.2026: the DNS times out), so the Pages
 * address comes first and the Worker's own address is only a fallback when the first cannot be reached.
 */
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
const FIXED = import.meta.env.VITE_API_URL as string | undefined
export const API: string = FIXED ?? (LOCAL ? 'http://localhost:8787' : 'https://nadlanup-api.pages.dev')
const BACKUP: string | null = FIXED || LOCAL ? null : 'https://nadlanup-api.isru.workers.dev'

const KEY = 'nadlanup-session-v1'
const DEMO = 'nadlanup-demo-v1'
const PENDING = 'nadlanup-pending-v1'

const get = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const set = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k)
    else localStorage.setItem(k, v)
  } catch {
    /* storage unavailable: the visitor stays signed out */
  }
}

function read(): Session | null {
  try {
    const s = JSON.parse(get(KEY) ?? 'null') as Session | null
    return s && typeof s.token === 'string' && (s.member || s.staff) ? s : null
  } catch {
    return null
  }
}

/** The presentation was opened in this very tab (the /demo link). It ends with the tab. */
const tab = {
  on() {
    try {
      return sessionStorage.getItem(DEMO) === '1'
    } catch {
      return false
    }
  },
  set(v: boolean) {
    try {
      if (v) sessionStorage.setItem(DEMO, '1')
      else sessionStorage.removeItem(DEMO)
    } catch {
      /* no storage: the presentation is not remembered */
    }
  },
}

/** As they were when the page loaded. */
export const session: Session | null = read()
/**
 * A presentation of the demo, with the example user (מאיה). The example user must never stand in for a real
 * person (Itzik 19.11.2026), so on a device where somebody is signed in the presentation lives only in the tab that
 * opened /demo: every other tab, and the app the next time it opens, show that person's own account. A mark that
 * an old presentation left on such a device is cleared here.
 */
export const demo: boolean = session ? tab.on() : tab.on() || get(DEMO) === '1'
if (session && !demo && get(DEMO) !== null) set(DEMO, null)
/** The community's screens open for an approved broker, for staff, and for a presentation of the demo. */
export const hasAccess: boolean = demo || !!session
/** A real broker's own view: his name and his own empty area, not the example user's. */
export const asMember: MemberInfo | null = !demo && session?.member ? session.member : null

/**
 * The real person who is signed in, as every screen of the app shows them: an approved broker, or one of the staff
 * who has no broker's card. Null for a visitor and inside a presentation of the demo. auth/profile.ts turns the
 * app's "current broker" into this person, so a screen never has to pick a name by itself.
 */
export type SignedIn = { key: string; name: string; title: string; phone: string; email: string; cities: string[]; areas: string; photo: string; isStaff: boolean; isBroker: boolean; nameLocked?: boolean }
export const signedIn: SignedIn | null = demo || !session
  ? null
  : asMember
    ? {
        key: `m:${asMember.id}`,
        name: asMember.name,
        title: asMember.work === 'office' ? `מתווך, ${asMember.office_name}` : 'מתווך עצמאי',
        phone: asMember.phone,
        email: asMember.email,
        cities: asMember.cities,
        areas: asMember.areas,
        photo: '',
        isStaff: !!session.staff,
        isBroker: true,
        // the full name came from the registry: the broker cannot change it himself (24.11.2026)
        nameLocked: asMember.license_status === 'verified',
      }
    : session.staff
      ? { key: `s:${session.staff.email.toLowerCase()}`, name: session.staff.name, title: 'צוות הקהילה', phone: '', email: session.staff.email, cities: [], areas: '', photo: '', isStaff: true, isBroker: false }
      : null

/**
 * "עריכת פרופיל" (Itzik 20.11.2026): how a signed-in person chose to appear. A display name or a nickname, a phone,
 * the cities and neighbourhoods they work in, and a small round picture (320 px, a few dozen KB).
 *
 * It is kept in THIS browser only, per person, next to everything else a person has here. The server and its
 * database are not touched: what the person signed up with stays as it was there, and the approvers' screen still
 * shows that. So the edit does not follow the person to another device yet; that needs the server (Itzik decides).
 * The phone is for the person's own forms: nothing in the feed shows it.
 */
export type OwnProfile = { name: string; phone: string; cities: string[]; areas: string; photo: string }
const ownKey = (who: string) => `nadlanup-profile-v1:${who}`
function readOwn(who: string): Partial<OwnProfile> | null {
  try {
    const v = JSON.parse(get(ownKey(who)) ?? 'null') as Partial<OwnProfile> | null
    return v && typeof v === 'object' ? v : null
  } catch {
    return null
  }
}
function takeOwn(to: SignedIn, own: Partial<OwnProfile>) {
  if (!to.nameLocked && typeof own.name === 'string' && own.name.trim().length >= 2) to.name = own.name.trim()
  if (typeof own.phone === 'string') to.phone = own.phone.trim()
  if (Array.isArray(own.cities)) to.cities = own.cities.filter((c) => typeof c === 'string' && c.trim()).map((c) => c.trim())
  if (typeof own.areas === 'string') to.areas = own.areas.trim()
  if (typeof own.photo === 'string' && (own.photo === '' || own.photo.startsWith('data:image/'))) to.photo = own.photo
}
if (signedIn) {
  const own = readOwn(signedIn.key)
  if (own) takeOwn(signedIn, own)
}

/**
 * Saves the person's own profile and shows it everywhere at once (config/identity.ts). False when the browser could
 * not keep it (storage is full or closed): nothing changes then, so the screen can say so.
 */
export function saveOwnProfile(next: OwnProfile): boolean {
  if (!signedIn) return false
  try {
    localStorage.setItem(ownKey(signedIn.key), JSON.stringify(next))
  } catch {
    return false
  }
  takeOwn(signedIn, next)
  identity.changed()
  return true
}

const base = import.meta.env.BASE_URL.replace(/\/$/, '')
/** Goes to a page of the site with a full reload. */
export const go = (path: string) => location.assign(`${base}${path}`)

export const sessionActions = {
  save(s: Session) {
    set(KEY, JSON.stringify(s))
    // a real sign-in ends a presentation that was left open on this device
    set(DEMO, null)
    tab.set(false)
    set(PENDING, null)
  },
  async signOut(to = '/kehila') {
    const s = read()
    set(KEY, null)
    // whoever leaves the account is a visitor: no name at all, not the example user's
    set(DEMO, null)
    tab.set(false)
    if (s) await call('/api/logout', { method: 'POST', token: s.token }).catch(() => null)
    go(to)
  },
  startDemo() {
    tab.set(true)
    // on a device with nobody signed in the presentation is remembered, as it always was
    if (!read()) set(DEMO, '1')
    go('/app')
  },
  /** Out of the presentation: back to the person's own account, or to the community's page for a visitor. */
  stopDemo() {
    set(DEMO, null)
    tab.set(false)
    go(read() ? '/app' : '/kehila')
  },
}

/** The request that waits for approval, remembered so the waiting screen is still there after a reload. */
export const pending = {
  get(): { name: string; email: string } | null {
    try {
      return JSON.parse(get(PENDING) ?? 'null')
    } catch {
      return null
    }
  },
  set(v: { name: string; email: string } | null) {
    set(PENDING, v ? JSON.stringify(v) : null)
  },
}

export type Reply<T> = { ok: boolean; status: number; data: T & { error?: string; code?: string; fields?: Record<string, string> } }

/** One call to the server. A failure to reach it comes back as status 0, never as an exception. */
export async function call<T = Record<string, unknown>>(path: string, opts: { method?: string; body?: unknown; token?: string } = {}): Promise<Reply<T>> {
  const token = opts.token ?? read()?.token
  const send = (base: string) =>
    fetch(base + path, {
      method: opts.method ?? 'GET',
      headers: { ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  try {
    // the second address only when the first could not be reached at all (no answer, not an error answer)
    const res = await send(API).catch((e) => (BACKUP ? send(BACKUP) : Promise.reject(e)))
    const data = (await res.json().catch(() => ({}))) as Reply<T>['data']
    return { ok: res.ok, status: res.status, data }
  } catch {
    return { ok: false, status: 0, data: { error: 'אין חיבור לשרת. בדקו את החיבור לאינטרנט ונסו שוב.' } as Reply<T>['data'] }
  }
}

/**
 * Asks the server whether the remembered session still holds (a broker can be removed, a session runs out).
 * When it does not, the device is signed out. The details are refreshed while at it.
 */
export async function recheck() {
  const s = read()
  if (!s) return
  const r = await call<{ member: MemberInfo | null; staff: StaffInfo | null }>('/api/me')
  if (r.status === 401 || r.status === 403) {
    set(KEY, null)
    go('/kehila/login')
  } else if (r.ok && (r.data.member !== undefined || r.data.staff !== undefined)) {
    // an answer cut off halfway (the page moved on while it was asked) comes back empty: what is known stays
    set(KEY, JSON.stringify({ token: s.token, member: r.data.member, staff: r.data.staff }))
  }
}
