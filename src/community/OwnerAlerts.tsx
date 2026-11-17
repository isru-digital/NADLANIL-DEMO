import { useEffect, useRef } from 'react'
import { CURRENT_BROKER_ID } from '../config'
import { brokers } from '../data/demo'
import { useStore } from '../store'

/**
 * The broker of a property hears when another broker has a buyer for it (Itzik 17.11.2026): a notice in the site and
 * a number on the bell. Each broker's own browser only shows that broker's notices, so in the demo the other side is
 * played out: a few seconds after I share a property, another broker (one who works in that city when there is one)
 * presses "יש לי קונה לנכס" on it. That notice is marked as an example. Renders nothing.
 */
const KEY = 'nadlanup-sim-interest-v1'
const DELAY = 7000
const done = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}
const mark = (id: string) => {
  try {
    localStorage.setItem(KEY, JSON.stringify([...done(), id]))
  } catch {
    /* storage unavailable */
  }
}

export default function OwnerAlerts() {
  const { items, addNotice, toast } = useStore()
  const waiting = useRef(new Set<string>())
  useEffect(() => {
    const fresh = items.filter((it) => it.authorId === CURRENT_BROKER_ID && it.topicId === 'coop' && it.property && it.fresh)
    fresh.forEach((it) => {
      if (waiting.current.has(it.id) || done().includes(it.id)) return
      waiting.current.add(it.id)
      window.setTimeout(() => {
        mark(it.id)
        const local = brokers.filter((b) => b.id !== CURRENT_BROKER_ID && b.area.includes(it.city))
        const pool = local.length ? local : brokers.filter((b) => b.id !== CURRENT_BROKER_ID)
        const b = pool[Math.floor(Math.random() * pool.length)]
        addNotice({ id: `int-${it.id}`, kind: 'interest', title: 'יש קונה לנכס שלך', text: `${b.name} · ${it.title ?? 'הנכס שלך'}`, time: 'עכשיו', read: false, topicId: 'coop', itemId: it.id, demo: true })
        toast(`התראה חדשה: ל${b.name} יש קונה לנכס שלך`)
      }, DELAY)
    })
  }, [items, addNotice, toast])
  return null
}
