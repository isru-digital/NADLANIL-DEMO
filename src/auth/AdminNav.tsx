import { Inbox, LayoutDashboard, PieChart, Settings2, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import '../styles/admin-nav.css'

/**
 * The menu of the approvers' screen's parts, as tabs (Itzik 18.11.2026, chosen out of three after the row of pills
 * that slid sideways on a phone): full-width tabs on a computer, a tab bar at the bottom of the screen on a phone,
 * all five in reach without sliding. The waiting requests are counted on "בקשות".
 */
type Part<V extends string> = { id: V; label: string }
// each part's icon, and a shorter name for the phone's bar where the full one does not fit
const ICONS: Record<string, { icon: LucideIcon; short?: string }> = {
  overview: { icon: LayoutDashboard },
  requests: { icon: Inbox },
  people: { icon: Users },
  breakdown: { icon: PieChart },
  tools: { icon: Settings2, short: 'צוות' },
}

export default function AdminNav<V extends string>({ parts, view, go, pending }: { parts: Part<V>[]; view: V; go: (v: V) => void; pending: number }) {
  return (
    <div className="an-tabs" role="tablist" aria-label="חלקי המסך" data-nav="tabs">
      {parts.map((p) => {
        const { icon: Icon, short } = ICONS[p.id]
        return (
          // role="tab", data-view and the ids are what the screen's tab panel and its checks point at
          <button
            key={p.id}
            type="button"
            role="tab"
            id={`dk-tab-${p.id}`}
            aria-selected={view === p.id}
            aria-controls="dk-view"
            className={`an-tab${view === p.id ? ' is-on' : ''}`}
            data-view={p.id}
            onClick={() => go(p.id)}
          >
            {/* the icon is hidden from screen readers, the count on it is read */}
            <span className="an-tab-icon">
              <Icon aria-hidden="true" />
              {p.id === 'requests' && pending > 0 && (
                <b className="num an-badge" aria-label={`${pending} ממתינות`}>
                  {pending}
                </b>
              )}
            </span>
            <span className="an-tab-label">
              <span className="an-long">{p.label}</span>
              {short && <span className="an-short">{short}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
