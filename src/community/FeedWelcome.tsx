import type { ReactElement } from 'react'
import { ArrowLeft, LayoutGrid, Moon, Sun, Sunrise, Sunset } from 'lucide-react'
import { CURRENT_BROKER_ID } from '../config'
import type { TopicId } from '../config/topics'
import { brokerById } from '../data/demo'
import type { CommunityItem } from '../data/demo'
import { IconAsk, IconBuyer, IconHome, IconRefer } from './KhIcons'
// the feed's paper look (serif titles, the price on the photo, the wanted ticket) came with the old masthead: keep it
import '../styles/feed-paper.css'
import '../styles/feed-welcome.css'

/**
 * The top of the community feed (Itzik 17.11.2026, in place of the figures that were not clear): a personal hello
 * that changes with the hour, four big cards for what a broker came to do, each going straight to the action, and
 * the four rooms of the community, clear at the top. The lines say what sharing brings, with no invented numbers.
 */
export type Intent = 'property' | 'buyer' | 'referral' | 'learn'
type View = 'all' | TopicId
type Icon = (p: { className?: string }) => ReactElement

/**
 * The hello of the hour, by Israel's clock (Itzik 17.11.2026, exactly):
 * 05:00-11:59 בוקר טוב, 12:00-17:59 צהריים טובים, 18:00-21:59 ערב טוב, 22:00-04:59 לילה טוב.
 * With it, a small quiet icon of the time of day, in the site's own line style (no emoji).
 */
export function greetingOf(hour: number) {
  if (hour >= 5 && hour <= 11) return { text: 'בוקר טוב', icon: Sunrise, part: 'morning' }
  if (hour >= 12 && hour <= 17) return { text: 'צהריים טובים', icon: Sun, part: 'noon' }
  if (hour >= 18 && hour <= 21) return { text: 'ערב טוב', icon: Sunset, part: 'evening' }
  return { text: 'לילה טוב', icon: Moon, part: 'night' }
}
/** the hour now in Israel, 0 to 23, whatever the visitor's own clock says */
export const israelHour = (d = new Date()) => Number(d.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jerusalem' })) % 24

const INTENTS: { id: Intent; icon: Icon; title: string; line: string }[] = [
  { id: 'property', icon: IconHome, title: 'יש לי נכס ואני רוצה לשתף אותו עם מתווכים', line: 'הנכס נחשף למתווכים שיש להם קונים' },
  { id: 'buyer', icon: IconBuyer, title: 'יש לי קונה ואני רוצה למצוא לו דירה', line: 'הבקשה נשמרת, ומי שיש לו נכס מתאים פונה אליך' },
  { id: 'referral', icon: IconRefer, title: 'יש לי מוכר בעיר אחרת ואני רוצה מתווך שם', line: 'מתווך מקומי מטפל, ואתה מקבל דמי הפניה' },
  { id: 'learn', icon: IconAsk, title: 'אני רוצה לשאול או ללמוד', line: 'שואלים, ומתווכים מכל הארץ עונים' },
]

/** the four rooms, by the names brokers use */
const ROOMS: { id: TopicId; label: string; icon: Icon }[] = [
  { id: 'coop', label: 'נכסים לשיתוף', icon: IconHome },
  { id: 'seeking', label: 'מחפש לקונה', icon: IconBuyer },
  { id: 'referrals', label: 'מתווך בעיר אחרת', icon: IconRefer },
  { id: 'knowledge', label: 'ידע ושאלות', icon: IconAsk },
]

export default function FeedWelcome({ items, view, onView, onIntent }: { items: CommunityItem[]; view: View; onView: (v: View) => void; onIntent?: (i: Intent) => void }) {
  const me = brokerById(CURRENT_BROKER_ID)
  const first = me.name.split(' ')[0]
  const now = new Date()
  const hello = greetingOf(israelHour(now))
  const today = now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jerusalem' })
  const fresh = items.filter((it) => it.fresh).length

  return (
    <section className="wl" aria-label="פתיחה" data-welcome>
      {/* the four rooms first: clear, at the very top */}
      <nav className="wl-rooms" aria-label="החדרים של הקהילה" data-rooms>
        <button type="button" className="wl-room is-all" aria-pressed={view === 'all'} onClick={() => onView('all')} data-room="all">
          <LayoutGrid aria-hidden /> הכול
        </button>
        {ROOMS.map((r) => (
          <button key={r.id} type="button" className="wl-room" aria-pressed={view === r.id} onClick={() => onView(view === r.id ? 'all' : r.id)} data-room={r.id}>
            <r.icon /> {r.label}
          </button>
        ))}
      </nav>
      <div className="wl-line">
        <span>{today}</span>
        {fresh > 0 && (
          <span className="wl-live">
            <i aria-hidden /> יש עדכונים חדשים
          </span>
        )}
      </div>
      <h1 className="wl-hello" data-greeting data-part={hello.part}>
        <span className="wl-time" aria-hidden>
          <hello.icon />
        </span>
        {hello.text}, {first}
      </h1>
      <p className="wl-ask">מה רוצים לעשות היום?</p>

      <div className="wl-cards">
        {INTENTS.map((c, i) => (
          <button key={c.id} type="button" className={`wl-card is-${c.id}`} onClick={() => onIntent?.(c.id)} data-intent={c.id} style={{ animationDelay: `${60 + i * 60}ms` }}>
            <span className="wl-ico" aria-hidden>
              <c.icon />
            </span>
            <span className="wl-text">
              <b>{c.title}</b>
              <small>{c.line}</small>
            </span>
            <ArrowLeft className="wl-go" aria-hidden />
          </button>
        ))}
      </div>

      <p className="wl-value" data-value>
        <b>יותר שיתופים, יותר עסקאות.</b> כל נכס וכל קונה שמשתפים כאן נחשפים למתווכים מכל הארץ.
      </p>

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
