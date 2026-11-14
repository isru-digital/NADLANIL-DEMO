import { useEffect, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { COMMUNITY_SUB } from '../config/community'
import { topicById } from '../config/topics'
import type { TopicId } from '../config/topics'
import type { CommunityItem } from '../data/demo'
import '../styles/feed-paper.css'

/**
 * The top of the community feed in the green version: the front page of a daily paper of deals. The community's
 * name is the nameplate, today's date is the date line, and the big figures are the day's open business by topic.
 * A figure is also a filter: a click shows that topic. Every number is counted from the feed itself, nothing invented.
 */
type View = 'all' | TopicId
const FIGURES: { id: TopicId; label: string }[] = [
  { id: 'coop', label: 'נכסים לשיתוף פעולה' },
  { id: 'seeking', label: 'מחפשים לקונה' },
  { id: 'referrals', label: 'הפניות בין מתווכים' },
  { id: 'wins', label: 'עסקאות שנסגרו' },
]

/** Counts up to a number once, quickly. With reduced motion the number is simply there. */
function Count({ to }: { to: number }) {
  const [n, setN] = useState(() => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? to : 0))
  const from = useRef(n)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setN(to)
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = Math.round(a + (to - a) * eased)
      setN(v)
      if (t < 1) raf = requestAnimationFrame(tick)
      else from.current = to
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <>{n}</>
}

export default function FeedMasthead({ items, view, onView }: { items: CommunityItem[]; view: View; onView: (v: View) => void }) {
  const today = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const fresh = items.filter((it) => it.fresh).length
  // the running line under the figures: the newest things in the feed, by city
  const lines = items.slice(0, 10).map((it) => ({ id: it.id, city: it.city, topic: topicById(it.topicId).name, text: it.title ?? `${it.body.slice(0, 46)}${it.body.length > 46 ? '...' : ''}` }))

  return (
    <section className="mast" aria-label="העמוד הראשון של הקהילה">
      <div className="mast-line">
        <span className="mast-date">{today}</span>
        <span className="mast-live">
          <i aria-hidden /> {fresh > 0 ? `${fresh} חדשים עכשיו` : 'מתעדכן כל הזמן'}
        </span>
        <span className="mast-demo">נתוני דמו</span>
      </div>

      <p className="mast-name">
        מתווכים <em>לעסקאות</em>
      </p>
      <p className="mast-motto">
        {COMMUNITY_SUB.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </p>

      <div className="mast-figures" role="group" aria-label="מה פתוח עכשיו, לפי נושא">
        {FIGURES.map((f, i) => {
          const n = items.filter((it) => it.topicId === f.id).length
          const on = view === f.id
          return (
            <button key={f.id} type="button" className={`mast-fig${on ? ' is-on' : ''}`} style={{ animationDelay: `${120 + i * 70}ms` }} aria-pressed={on} data-topic={f.id} onClick={() => onView(on ? 'all' : f.id)}>
              <b className="num">
                <Count to={n} />
              </b>
              <span>{f.label}</span>
              <em>
                {on ? 'חזרה לכל הנושאים' : 'לצפייה'} <ArrowLeft />
              </em>
            </button>
          )
        })}
      </div>

      {lines.length > 2 && (
        <div className="mast-ticker" aria-hidden>
          <div className="mast-ticker-track">
            {[...lines, ...lines].map((l, i) => (
              <span key={`${l.id}-${i}`}>
                <b>{l.city}</b>
                {l.text}
                <i>{l.topic}</i>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
