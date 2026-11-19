import { useState } from 'react'
import type { ReactElement } from 'react'
import { ChevronLeft, Ellipsis, ImagePlus, LayoutGrid, PenLine, Trophy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CURRENT_BROKER_ID } from '../config'
import { topicById } from '../config/topics'
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
 * the bottom with the four clear choices; each goes on to the form that was already there. Under it the rooms, in one
 * row. The hello of the hour, the four big cards, the yellow line and the numbered row of topics that stood here
 * before are gone from the top; nothing they led to was removed, it is all reached from the sheet and the rooms.
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

/** the four rooms, by the names brokers use; `short` is what fits under an icon on a phone */
const ROOMS: { id: TopicId; label: string; short: string; icon: Icon }[] = [
  { id: 'coop', label: 'נכסים לשיתוף', short: 'נכסים', icon: IconHome },
  { id: 'seeking', label: 'מחפש לקונה', short: 'קונים', icon: IconBuyer },
  { id: 'referrals', label: 'מתווך בעיר אחרת', short: 'עיר אחרת', icon: IconRefer },
  { id: 'knowledge', label: 'ידע ושאלות', short: 'שאלות', icon: IconAsk },
]
/** the topics that have no room of their own: on a phone they sit behind "עוד" (on a computer, in the side list) */
const OTHER: TopicId[] = ['posts', 'wins']

export default function FeedWelcome({ items, view, onView, onIntent }: { items: CommunityItem[]; view: View; onView: (v: View) => void; onIntent?: (i: Intent) => void }) {
  const me = brokerById(CURRENT_BROKER_ID)
  const [sheet, setSheet] = useState(false)
  const [more, setMore] = useState(false)
  const fresh = items.some((it) => it.fresh)
  const inOther = OTHER.includes(view as TopicId)

  const choose = (i: Intent) => {
    setSheet(false)
    // the sheet steps aside first, so the form opens on a clean screen
    window.setTimeout(() => onIntent?.(i), 180)
  }

  return (
    <section className="wl" aria-label="שיתוף וחדרים" data-welcome>
      {/* whoever is not signed in: the way in (Itzik 18.11.2026), one slim row */}
      <SignInCard place="feed" />

      {/* the one line: who I am, and what I came to share */}
      <div className="wl-share">
        <Avatar src={me.avatar} name={me.name} size={42} />
        <button type="button" className="wl-share-field" onClick={() => setSheet(true)} aria-haspopup="dialog" data-act="share">
          מה תרצה לשתף היום?
        </button>
      </div>

      {/* the rooms: one row, all in reach, nothing slides */}
      <nav className="wl-rooms" aria-label="החדרים של הקהילה" data-rooms>
        <button type="button" className="wl-room is-all" aria-pressed={view === 'all'} onClick={() => onView('all')} data-room="all">
          <span className="wl-room-icon">
            <LayoutGrid aria-hidden />
            {fresh && <i className="wl-dot" aria-label="יש עדכונים חדשים" />}
          </span>
          <span className="wl-room-name">הכול</span>
        </button>
        {ROOMS.map((r) => (
          <button key={r.id} type="button" className="wl-room" aria-pressed={view === r.id} aria-label={r.label} title={r.label} onClick={() => onView(view === r.id ? 'all' : r.id)} data-room={r.id}>
            <span className="wl-room-icon">
              <r.icon />
            </span>
            <span className="wl-room-name">
              <span className="wl-long">{r.label}</span>
              <span className="wl-short">{r.short}</span>
            </span>
          </button>
        ))}
        <button type="button" className="wl-room is-more" aria-pressed={inOther} aria-haspopup="dialog" onClick={() => setMore(true)} data-room="more">
          <span className="wl-room-icon">
            <Ellipsis aria-hidden />
          </span>
          <span className="wl-room-name">{inOther ? topicById(view as TopicId).name : 'עוד'}</span>
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

      <Modal open={more} onClose={() => setMore(false)} title="עוד נושאים">
        <div className="modal-body wl-sheet" data-more-rooms>
          {OTHER.map((id) => {
            const t = topicById(id)
            return (
              <button
                key={id}
                type="button"
                className="wl-choice"
                aria-pressed={view === id}
                onClick={() => {
                  setMore(false)
                  onView(view === id ? 'all' : id)
                }}
                data-topic={id}
              >
                <span className="wl-choice-icon" aria-hidden>
                  <t.icon />
                </span>
                <span className="wl-choice-words">
                  <b>{t.name}</b>
                  <small>{t.description}</small>
                </span>
                <ChevronLeft className="wl-choice-go" aria-hidden />
              </button>
            )
          })}
        </div>
      </Modal>
    </section>
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
