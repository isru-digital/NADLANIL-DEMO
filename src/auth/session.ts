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

/** As they were when the page loaded. */
export const session: Session | null = read()
export const demo: boolean = get(DEMO) === '1'
/** The community's screens open for an approved broker, for staff, and for a presentation of the demo. */
export const hasAccess: boolean = demo || !!session
/** A real broker's own view: his name and his own empty area, not the example user's. */
export const asMember: MemberInfo | null = !demo && session?.member ? session.member : null

const base = import.meta.env.BASE_URL.replace(/\/$/, '')
/** Goes to a page of the site with a full reload. */
export const go = (path: string) => location.assign(`${base}${path}`)

export const sessionActions = {
  save(s: Session) {
    set(KEY, JSON.stringify(s))
    // a real sign-in ends a presentation that was left open on this device
    set(DEMO, null)
    set(PENDING, null)
  },
  async signOut(to = '/kehila') {
    const s = read()
    set(KEY, null)
    if (s) await call('/api/logout', { method: 'POST', token: s.token }).catch(() => null)
    go(to)
  },
  startDemo() {
    set(DEMO, '1')
    go('/app')
  },
  stopDemo() {
    set(DEMO, null)
    go('/kehila')
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
  } else if (r.ok) {
    set(KEY, JSON.stringify({ token: s.token, member: r.data.member, staff: r.data.staff }))
  }
}
