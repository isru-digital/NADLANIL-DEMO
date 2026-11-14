import { useSyncExternalStore } from 'react'
import type { CrmItem } from '../data/demo'

/**
 * "קישור לבעל הנכס" (green version, Itzik 12.11.2026): once a property is published in the community, the broker
 * gets a link to a small page for the owner: the property was published, when, and how many brokers in the area see
 * it. The broker copies the link and sends it himself. There is no server, so what the page shows travels inside
 * the link: the property only. The owner's name, phone and the broker's notes are never part of it.
 */
const KEY = 'nadlanup-owner-v1'

function load(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

let dates: Record<string, string> = load()
const listeners = new Set<() => void>()
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const ownerActions = {
  /** Remembers the day a property was published (once). */
  stamp(id: string) {
    if (dates[id]) return
    dates = { ...dates, [id]: today() }
    try {
      localStorage.setItem(KEY, JSON.stringify(dates))
    } catch {
      /* storage unavailable: the date lasts until the page is closed */
    }
    listeners.forEach((l) => l())
  },
  reset() {
    dates = {}
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* nothing to remove */
    }
    listeners.forEach((l) => l())
  },
}

export function usePublishDates() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => dates,
  )
}

export const OWNER_PATH = '/o/p'

/** What the owner's page shows. Nothing here identifies the owner. */
export type OwnerView = { title: string; area: string; city: string; rooms: string; sqm?: number; price: number; date: string; image?: string; brokerId: string }

export function ownerLink(item: CrmItem, date: string | undefined, brokerId: string) {
  // an office or a business property is described by its size, not by rooms
  const commercial = !!item.category && item.category !== 'home'
  const q = new URLSearchParams({ t: item.title, a: item.area, c: item.city, r: commercial ? '' : item.rooms, p: String(item.price), d: date ?? today(), b: brokerId })
  if (commercial && item.sqm) q.set('s', String(item.sqm))
  if (item.image && /^img\/[\w.-]+$/.test(item.image)) q.set('i', item.image)
  return `${location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}${OWNER_PATH}?${q.toString()}`
}

export function readOwnerView(q: URLSearchParams): OwnerView | null {
  const title = q.get('t')
  if (!title) return null
  const image = q.get('i') ?? undefined
  return {
    title,
    area: q.get('a') ?? '',
    city: q.get('c') ?? '',
    rooms: q.get('r') ?? '',
    sqm: Number(q.get('s')) || undefined,
    price: Number(q.get('p')) || 0,
    date: /^\d{4}-\d{2}-\d{2}$/.test(q.get('d') ?? '') ? q.get('d')! : today(),
    // only a picture from the demo's own folder
    image: image && /^img\/[\w.-]+$/.test(image) ? image : undefined,
    brokerId: q.get('b') ?? 'b1',
  }
}

export const dateHe = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

/** How many brokers in the area see the property. A demo number: the same city always gives the same one. */
export function viewersIn(city: string) {
  let h = 0
  for (const ch of city) h = (h * 31 + ch.charCodeAt(0)) % 9973
  return 38 + (h % 95)
}
