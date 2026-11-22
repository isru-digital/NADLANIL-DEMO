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
const ROOMS: { id: TopicId; label: string; short: string; extra?: boolean; offRow?: boolean }[] = [
  { id: 'coop', label: 'נכסים לשיתוף', short: 'נכסים' },
  { id: 'seeking', label: 'מחפש לקונה', short: 'קונים' },
  { id: 'referrals', label: 'מתווך בעיר אחרת', short: 'עיר אחרת' },
  { id: 'knowledge', label: 'ידע ושאלות', short: 'שאלות' },
  // "פוסטים" is off the row (Itzik 22.11.2026): on a phone the row was crowded, and this is the room it can spare,
  // because the posts are in the feed of "הכול" anyway. The room itself was not removed: on a computer it is in the
  // side list, as it always was, and ?topic=posts still opens it from anywhere.
  { id: 'posts', label: 'פוסטים', short: 'פוסטים', extra: true, offRow: true },
  { id: 'wins', label: 'עסקאות שנסגרו', short: 'עסקאות', extra: true },
]
const ROW = ROOMS.filter((r) => !r.offRow)

export default function FeedWelcome({ items, view, onView, onIntent }: { items: CommunityItem[]; view: View; onView: (v: View) => void; onIntent?: (i: Intent) => void }) {
  const me = brokerById(CURRENT_BROKER_ID)
  const [sheet, setSheet] = useState(false)
  const rooms = useRef<HTMLElement>(null)
  const row = useRef<HTMLDivElement>(null)
  const fresh = items.some((it) => it.fresh)

  const choose = (i: Intent) => {
    setSheet(false)
    // the sheet steps aside first, so the form opens on a clean screen
    window.setTimeout(() => onIntent?.(i), 180)
  }

  /* HOW THE ROW STAYS STILL (Itzik 19.11.2026: on a real iPhone it jumped up and down while the feed was scrolled).
     It sticks by CSS alone: `position: sticky` with an offset written in the stylesheet (the app's top bar has one
     fixed height there, see --app-bar-h). Nothing here listens to the page's scroll, measures anything while it
     scrolls, or changes the row when it sticks. That was the cause: the first version measured the row on every
     scroll frame, measured the top bar's height into an inline style, and switched a line on when the row stuck;
     on an iPhone the system places sticky elements itself while scrolling, and a page that measures and re-styles
     them mid-scroll makes them jump. So: no scroll listener, no ResizeObserver on the bar, no "stuck" state.

     What does run is about the row's own sideways scroll only, and never while the page scrolls:
       - two observers say whether the row's start and its end are in sight (for the fades and the small arrow)
       - once, the gap between the chips is chosen so that a chip is cut by the row's far edge (it shows there is more)
       - on the very first visit only, the row moves a little and comes back, once, as a hint */
  useEffect(() => {
    const nav = rooms.current
    const r = row.current
    if (!nav || !r) return
    const start = r.querySelector<HTMLElement>('.wl-edge.is-start')
    const end = r.querySelector<HTMLElement>('.wl-edge.is-end')
    const io =
      'IntersectionObserver' in window && start && end
        ? new IntersectionObserver(
            (seen) =>
              seen.forEach((e) => {
                if (e.target === start) nav.toggleAttribute('data-back', !e.isIntersecting)
                else nav.toggleAttribute('data-more', !e.isIntersecting)
              }),
            { root: r, threshold: 0.5 },
          )
        : null
    if (start && end) {
      io?.observe(start)
      io?.observe(end)
    }

    // A chip cut by the far edge says "there is more". Where the edge falls depends on the phone's width, so the
    // spacing of the row is chosen to leave one chip cut as near its middle as can be: a good part of it showing
    // past the arrow, and a good part of it hidden. Two small things may move for that, both within a few pixels of
    // their usual size: the gap between the chips, and the chips' side padding. Done at the row's start only, once
    // the fonts are in (the chips' widths depend on them); on a computer, where the row fits, nothing is touched.
    const ARROW = 40
    const cut = () => {
      const tuned = !!r.style.getPropertyValue('--wl-gap')
      if (tuned) {
        r.style.removeProperty('--wl-gap')
        r.style.removeProperty('--wl-pad')
      }
      if (r.scrollWidth <= r.clientWidth + 1 || Math.abs(r.scrollLeft) > 1) return
      const chips = [...r.querySelectorAll<HTMLElement>('.wl-room')].filter((c) => c.offsetWidth > 0)
      const edge = r.getBoundingClientRect().left
      let best = { gap: 6, pad: 15, score: -Infinity }
      for (let gap = 5; gap <= 12; gap++) {
        for (let pad = 12; pad <= 17; pad++) {
          r.style.setProperty('--wl-gap', `${gap}px`)
          r.style.setProperty('--wl-pad', `${pad}px`)
          let fit = 0
          for (const c of chips) {
            const box = c.getBoundingClientRect()
            if (box.left < edge && box.right > edge) fit = Math.min(box.right - edge - ARROW, edge - box.left)
          }
          // the usual spacing is kept unless moving it buys a clearly better cut
          const score = fit - 1.5 * (Math.abs(gap - 6) + Math.abs(pad - 15))
          if (score > best.score) best = { gap, pad, score }
        }
      }
      r.style.setProperty('--wl-gap', `${best.gap}px`)
      r.style.setProperty('--wl-pad', `${best.pad}px`)
    }
    cut()
    document.fonts?.ready.then(cut).catch(() => {})
    // the row's width changes only when the phone is turned or the window resized, never while the page scrolls
    let width = r.clientWidth
    const onResize = () => {
      if (r.clientWidth === width) return
      width = r.clientWidth
      cut()
    }
    window.addEventListener('resize', onResize)

    // the first visit only: the row moves a little toward the rest of the rooms and back, once
    let t1 = 0
    let t2 = 0
    const HINT = 'nadlanup-rooms-hint-v1'
    const seenHint = () => {
      try {
        return localStorage.getItem(HINT) === '1'
      } catch {
        return true
      }
    }
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!seenHint() && !calm && r.scrollWidth > r.clientWidth + 1) {
      t1 = window.setTimeout(() => {
        if (Math.abs(r.scrollLeft) > 1 || window.scrollY > 40) return
        try {
          localStorage.setItem(HINT, '1')
        } catch {
          /* no storage: the hint may show again */
        }
        nav.setAttribute('data-hint', '')
        // a little: "הכול", the chosen room, stays in sight the whole time
        r.scrollBy({ left: -48, behavior: 'smooth' })
        t2 = window.setTimeout(() => {
          r.scrollBy({ left: 48, behavior: 'smooth' })
          nav.removeAttribute('data-hint')
        }, 720)
      }, 1300)
    }
    return () => {
      io?.disconnect()
      window.removeEventListener('resize', onResize)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [])

  // the chosen chip is always in sight (on a phone it may be off the edge of the row)
  useEffect(() => {
    const on = rooms.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
    const r = row.current
    if (!on || !r || r.scrollWidth <= r.clientWidth) return
    const a = on.getBoundingClientRect()
    const b = r.getBoundingClientRect()
    if (a.left < b.left + 56 || a.right > b.right - 12) r.scrollBy({ left: a.left + a.width / 2 - (b.left + b.width / 2), behavior: 'smooth' })
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

      {/* the rooms: one thin row of chips, stuck to the top while the feed is scrolled (by CSS alone, see above) */}
      <nav ref={rooms} className="wl-rooms" aria-label="החדרים של הקהילה" data-rooms>
        <div ref={row} className="wl-rooms-in" data-rooms-row>
          <i className="wl-edge is-start" aria-hidden />
          <button type="button" className="wl-room is-all" aria-pressed={view === 'all'} onClick={() => onView('all')} data-room="all">
            {fresh && <i className="wl-dot" aria-label="יש עדכונים חדשים" />}
            הכול
          </button>
          {ROW.map((r) => (
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
          <i className="wl-edge is-end" aria-hidden />
        </div>
        {/* the row goes on: a fade over its far edge with a small arrow (gone at the end), and a fade at its start
            once it was moved. The arrow is a help for the eye and the finger; the chips themselves are the controls. */}
        <i className="wl-fade is-back" aria-hidden />
        <button type="button" className="wl-fade is-more" tabIndex={-1} aria-hidden onClick={() => row.current?.scrollBy({ left: -Math.round((row.current?.clientWidth ?? 300) * 0.6), behavior: 'smooth' })} data-act="rooms-more">
          <span>
            <ChevronLeft />
          </span>
        </button>
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
