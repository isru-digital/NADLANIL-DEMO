import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Inbox, LayoutDashboard, PieChart, Settings2, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import '../styles/admin-nav.css'

/**
 * The menu of the approvers' screen's parts. Today it is a row of pills that slides sideways on a phone (Itzik
 * 18.11.2026: "לא נוח"). Three other ways to show it, to compare before choosing, each picked from the address:
 *   ?nav=grid   a grid of cards, each with what the part holds
 *   ?nav=side   a menu at the side on a computer, a "which part" button with a list on a phone
 *   ?nav=tabs   full-width tabs on a computer, a tab bar at the bottom of the screen on a phone
 * With no ?nav the screen is as it was. Nothing is chosen yet.
 */
export type NavStyle = 'rail' | 'grid' | 'side' | 'tabs'
export const navStyle = (): NavStyle => {
  const v = new URLSearchParams(window.location.search).get('nav')
  return v === 'grid' || v === 'side' || v === 'tabs' ? v : 'rail'
}

type Part<V extends string> = { id: V; label: string }
// what each part holds, in a few words: the card grid and the side menu show it
const ABOUT: Record<string, { icon: LucideIcon; about: string; short?: string }> = {
  overview: { icon: LayoutDashboard, about: 'המספרים, ומה ממתין לכם' },
  requests: { icon: Inbox, about: 'אישור, דחייה ומה הוחלט' },
  people: { icon: Users, about: 'כניסות אחרונות וכל המתווכים' },
  breakdown: { icon: PieChart, about: 'ערים, אזורים, משרד או עצמאי' },
  tools: { icon: Settings2, about: 'מאשרים, נרשם בדיקה ומיילים', short: 'צוות' },
}

export default function AdminNav<V extends string>({ parts, view, go, pending }: { parts: Part<V>[]; view: V; go: (v: V) => void; pending: number }) {
  const style = navStyle()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const current = parts.find((p) => p.id === view) ?? parts[0]

  // the phone's list (side menu) closes on Escape and on a tap outside it
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const out = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('keydown', key)
    window.addEventListener('pointerdown', out)
    return () => {
      window.removeEventListener('keydown', key)
      window.removeEventListener('pointerdown', out)
    }
  }, [open])

  const badge = (id: V) =>
    id === ('requests' as V) && pending > 0 ? (
      <b className="num an-badge" aria-label={`${pending} ממתינות`}>
        {pending}
      </b>
    ) : null

  const pick = (id: V) => {
    setOpen(false)
    go(id)
  }

  // the buttons of every style keep role="tab", data-view and the ids the screen's tab panel points at
  const tab = (p: Part<V>, inner: React.ReactNode, className = '') => (
    <button
      key={p.id}
      type="button"
      role="tab"
      id={`dk-tab-${p.id}`}
      aria-selected={view === p.id}
      aria-controls="dk-view"
      className={`${className}${view === p.id ? ' is-on' : ''}`}
      data-view={p.id}
      onClick={() => pick(p.id)}
    >
      {inner}
    </button>
  )

  if (style === 'rail') {
    return (
      <div className="dk-nav" role="tablist" aria-label="חלקי המסך">
        {parts.map((p) =>
          tab(
            p,
            <>
              {p.label}
              {badge(p.id)}
            </>,
          ),
        )}
      </div>
    )
  }

  if (style === 'grid') {
    return (
      <div className="an-grid" role="tablist" aria-label="חלקי המסך" data-nav="grid">
        {parts.map((p) => {
          const { icon: Icon, about } = ABOUT[p.id]
          return tab(
            p,
            <>
              <span className="an-icon" aria-hidden="true">
                <Icon />
              </span>
              <span className="an-text">
                <strong>{p.label}</strong>
                <small>{about}</small>
              </span>
              {badge(p.id)}
            </>,
            'an-card',
          )
        })}
      </div>
    )
  }

  if (style === 'side') {
    const CurIcon = ABOUT[current.id].icon
    return (
      <nav className={`an-side${open ? ' is-open' : ''}`} aria-label="חלקי המסך" data-nav="side" ref={box}>
        {/* phone: one button that says where you are, and opens the list */}
        <button type="button" className="an-side-now" aria-expanded={open} aria-controls="an-side-list" onClick={() => setOpen(!open)} data-act="nav-open">
          <span className="an-icon" aria-hidden="true">
            <CurIcon />
          </span>
          <span className="an-text">
            <small>אתם ב:</small>
            <strong>{current.label}</strong>
          </span>
          {view !== ('requests' as V) && pending > 0 && <b className="an-badge is-wide">{pending === 1 ? 'בקשה ממתינה' : `${pending} ממתינות`}</b>}
          <ChevronDown className="an-chev" aria-hidden="true" />
        </button>
        <div className="an-side-list" id="an-side-list" role="tablist" aria-orientation="vertical">
          <span className="an-side-head">חלקי המסך</span>
          {parts.map((p) => {
            const { icon: Icon, about } = ABOUT[p.id]
            return tab(
              p,
              <>
                <span className="an-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="an-text">
                  <strong>{p.label}</strong>
                  <small>{about}</small>
                </span>
                {badge(p.id)}
                {view === p.id && <Check className="an-tick" aria-hidden="true" />}
              </>,
              'an-side-item',
            )
          })}
        </div>
      </nav>
    )
  }

  // tabs
  return (
    <div className="an-tabs" role="tablist" aria-label="חלקי המסך" data-nav="tabs">
      {parts.map((p) => {
        const { icon: Icon, short } = ABOUT[p.id]
        return tab(
          p,
          <>
            <span className="an-tab-icon" aria-hidden="true">
              <Icon />
              {badge(p.id)}
            </span>
            <span className="an-tab-label">
              <span className="an-long">{p.label}</span>
              {short && <span className="an-short">{short}</span>}
            </span>
          </>,
          'an-tab',
        )
      })}
    </div>
  )
}
