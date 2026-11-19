import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { ChevronLeft, ImagePlus, PenLine, Trophy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CURRENT_BROKER_ID } from '../config'
import type { TopicId } from '../config/topics'
import { brokerById } from '../data/demo'
import type { CommunityItem } from '../data/demo'
import { Avatar, Modal } from '../components/ui'
import { IconAsk, IconBuyer, IconHome, IconRefer } from './KhIcons'
import { SignInCard } from '../auth/SignInPrompt'
// the feed's paper look (serif titles, the price on the photo, the wanted ticket) came with the old masthead: keep it
import '../styles/feed-paper.css'
import '../styles/feed-welcome.css'

/**
 * The top of the community feed (Itzik 19.11.2026): light and quick, like a social feed on a phone, so the first post
 * is seen without scrolling. One thin line, the broker's picture and "מה תרצה לשתף היום?", opens a small sheet from
 * the bottom with the four clear choices; each goes on to the form that was already there. Under it the rooms, as one
 * row of small round chips: the chosen one in full green, the others a light grey, "הכול" first. On a phone the row is
 * swiped sideways; on a computer it fits in one line. It stays at the top of the screen while the feed is scrolled.
 * What each room does did not change, only how the row looks.
 */
export type Intent = 'property' | 'buyer' | 'referral' | 'learn' | 'post' | 'photo' | 'win'
type View = 'all' | TopicId
type Icon = (p: { className?: string }) => ReactElement

/** the four choices of the sheet, in the brokers' own words */
const CHOICES: { id: Intent; icon: Icon; title: string; line: string }[] = [
  { id: 'property', icon: IconHome, title: 'נכס לשיתוף', line: 'הנכס נחשף למתווכים שיש להם קונים' },
  { id: 'buyer', icon: IconBuyer, title: 'מחפש לקונה', line: 'מי שיש לו נכס מתאים פונה אליך' },
  { id: 'referral', icon: IconRefer, title: 'מתווך בעיר אחרת', line: 'מתווך מקומי מטפל, ואתה מקבל דמי הפניה' },
  { id: 'learn', icon: IconAsk, title: 'שאלה', line: 'שואלים, ומתווכים מכל הארץ עונים' },
]
/** what the old line of the feed ("מה חדש אצלך?") also offered: kept, quieter, at the foot of the sheet */
const MORE: { id: Intent; icon: LucideIcon; label: string }[] = [
  { id: 'post', icon: PenLine, label: 'עדכון' },
  { id: 'photo', icon: ImagePlus, label: 'תמונה' },
  { id: 'win', icon: Trophy, label: 'עסקה שנסגרה' },
]

/**
 * The rooms, by the names brokers use. `short` is for a computer whose feed column is too narrow for the full names
 * in one line. The last two have no room of their own: on a computer they are in the side list, so their chips show
 * only where that list is not (a phone, a tablet), at the end of the row.
 */
const ROOMS: { id: TopicId; label: string; short: string; extra?: boolean }[] = [
  { id: 'coop', label: 'נכסים לשיתוף', short: 'נכסים' },
  { id: 'seeking', label: 'מחפש לקונה', short: 'קונים' },
  { id: 'referrals', label: 'מתווך בעיר אחרת', short: 'עיר אחרת' },
  { id: 'knowledge', label: 'ידע ושאלות', short: 'שאלות' },
  { id: 'posts', label: 'פוסטים', short: 'פוסטים', extra: true },
  { id: 'wins', label: 'עסקאות שנסגרו', short: 'עסקאות', extra: true },
]

export default function FeedWelcome({ items, view, onView, onIntent }: { items: CommunityItem[]; view: View; onView: (v: View) => void; onIntent?: (i: Intent) => void }) {
  const me = brokerById(CURRENT_BROKER_ID)
  const [sheet, setSheet] = useState(false)
  const [stuck, setStuck] = useState(false)
  const rooms = useRef<HTMLElement>(null)
  const fresh = items.some((it) => it.fresh)

  const choose = (i: Intent) => {
    setSheet(false)
    // the sheet steps aside first, so the form opens on a clean screen
    window.setTimeout(() => onIntent?.(i), 180)
  }

  /* The row sticks under the app's top bar. On a phone that bar is itself stuck to the top and its height changes
     (one line, or two when "כניסה" is in it), so its height is measured; on a computer there is no such bar. The row
     also learns when it is stuck, to draw a hairline under itself only then. */
  useEffect(() => {
    const nav = rooms.current
    if (!nav) return
    const bar = document.querySelector<HTMLElement>('.topbar')
    let top = 0
    const measure = () => {
      top = bar && getComputedStyle(bar).position === 'sticky' ? Math.round(bar.getBoundingClientRect().height) : 0
      nav.style.setProperty('--wl-top', `${top}px`)
      onScroll()
    }
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setStuck(window.scrollY > 4 && nav.getBoundingClientRect().top <= top + 0.5))
    }
    measure()
    const ro = bar && 'ResizeObserver' in window ? new ResizeObserver(measure) : null
    if (bar) ro?.observe(bar)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      ro?.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  // the chosen chip is always in sight (on a phone it may be off the edge of the row)
  useEffect(() => {
    const on = rooms.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
    const row = rooms.current?.querySelector<HTMLElement>('.wl-rooms-in')
    if (!on || !row || row.scrollWidth <= row.clientWidth) return
    const a = on.getBoundingClientRect()
    const b = row.getBoundingClientRect()
    if (a.left < b.left + 28 || a.right > b.right - 12) row.scrollBy({ left: a.left + a.width / 2 - (b.left + b.width / 2), behavior: 'smooth' })
  }, [view])

  return (
    <>
      <section className="wl" aria-label="שיתוף" data-welcome>
        {/* whoever is not signed in: the way in (Itzik 18.11.2026), one slim row */}
        <SignInCard place="feed" />

        {/* the one line: who I am, and what I came to share */}
        <div className="wl-share">
          <Avatar src={me.avatar} name={me.name} size={42} />
          <button type="button" className="wl-share-field" onClick={() => setSheet(true)} aria-haspopup="dialog" data-act="share">
            מה תרצה לשתף היום?
          </button>
        </div>
      </section>

      {/* the rooms: one thin row of chips, stuck to the top while the feed is scrolled */}
      <nav ref={rooms} className={`wl-rooms${stuck ? ' is-stuck' : ''}`} aria-label="החדרים של הקהילה" data-rooms data-stuck={stuck ? '' : undefined}>
        <div className="wl-rooms-in" data-rooms-row>
          <button type="button" className="wl-room is-all" aria-pressed={view === 'all'} onClick={() => onView('all')} data-room="all">
            {fresh && <i className="wl-dot" aria-label="יש עדכונים חדשים" />}
            הכול
          </button>
          {ROOMS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`wl-room${r.extra ? ' is-extra' : ''}`}
              aria-pressed={view === r.id}
              aria-label={r.label}
              title={r.label}
              onClick={() => onView(view === r.id ? 'all' : r.id)}
              data-room={r.id}
            >
              <span className="wl-long">{r.label}</span>
              <span className="wl-short">{r.short}</span>
            </button>
          ))}
        </div>
      </nav>

      <Modal open={sheet} onClose={() => setSheet(false)} title="מה תרצה לשתף היום?">
        <div className="modal-body wl-sheet" data-share-sheet>
          {CHOICES.map((c) => (
            <button key={c.id} type="button" className="wl-choice" onClick={() => choose(c.id)} data-intent={c.id}>
              <span className="wl-choice-icon" aria-hidden>
                <c.icon />
              </span>
              <span className="wl-choice-words">
                <b>{c.title}</b>
                <small>{c.line}</small>
              </span>
              <ChevronLeft className="wl-choice-go" aria-hidden />
            </button>
          ))}
          <div className="wl-also" role="group" aria-label="עוד אפשרויות">
            <span>אפשר גם:</span>
            {MORE.map((m) => (
              <button key={m.id} type="button" onClick={() => choose(m.id)} data-intent={m.id}>
                <m.icon aria-hidden /> {m.label}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </>
  )
}

/** Short lines between the posts of the feed: what sharing brings. No numbers. */
export const VALUE_LINES = [
  'כל נכס שמשתפים נחשף למתווכים שיש להם קונים.',
  'קונה ששמרת כאן ממשיך לחפש בשבילך, גם כשאתה בפגישה.',
  'הפניה למתווך בעיר אחרת היא עסקה שלא הייתה לך.',
  'מתווכים שמשתפים הרבה מקבלים יותר פניות.',
  'שאלה טובה כאן חוסכת טעות יקרה בעסקה.',
]
