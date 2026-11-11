import { useEffect, useRef } from 'react'
import type { ComponentType, CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, BellRing, Check, Eye, Handshake, Link2, Lock, MessagesSquare, Mic, Radar, Scale, ShieldCheck, Wallet, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { EASE } from './ui'
import { lockScroll } from '../lib/scrollLock'
import { labSlots } from '../config/navExtras'
import DealRoomDemo from './DealRoomDemo'
import { FolderScene, MatchmakerScene, ProsScene, RadarScene, TrustScene, UrgentScene, VoiceScene, WalletScene, WhatsappScene } from './BetaScenes'
import '../styles/beta-lab.css'

/**
 * The beta lab: ideas that are visible in the personal area but cannot be entered yet. Each one has a
 * peek card (what it means, why it matters, a small moving picture). The deal room has its own,
 * larger pop-up. Everything is look-only.
 */

export type LabItem = {
  id: string
  title: string
  tagline: string
  explain: string
  why: string[]
  icon: LucideIcon
  scene?: ComponentType
}

export const labItems: LabItem[] = [
  {
    id: 'voice',
    title: 'הקלטה אחת, מודעה שלמה',
    tagline: 'דקה בנכס, והמודעה מוכנה.',
    explain: 'מקליטים הערה קולית ליד הנכס. המערכת כותבת את המודעה, מכינה פולדר ומפרסמת לקהילה, ומראה מיד מי מתאים.',
    why: ['בלי עבודה משרדית', 'המודעה נכתבת מהדיבור, לא מתבנית', 'מאשרים לפני שמפרסמים'],
    icon: Mic,
    scene: VoiceScene,
  },
  {
    id: 'room',
    title: 'חדר עסקה משותף',
    tagline: 'הוויכוח על הכסף נפתר לפני שהוא מתחיל.',
    explain: 'שני מתווכים מאשרים התאמה, ונפתח להם חדר עם צ\'אט פרטי, שלבי עסקה וחלוקת עמלה שנקבעה מראש.',
    why: ['חלוקת עמלה מוסכמת מראש', 'מי הביא מה, בכתב', 'צ\'אט פרטי שנפתח לבד'],
    icon: Handshake,
  },
  {
    id: 'urgent',
    title: 'בקשה בוערת',
    tagline: 'לקוח בדלת? שעה לתשובות.',
    explain: 'שולחים בקשה דחופה, והיא מגיעה רק למתווכים שיש להם נכס מתאים. התשובות חוזרות כהצעות מסודרות, עם שעון שרץ.',
    why: ['רק למי שרלוונטי', 'הצעות מסודרות במקום גלילה בקבוצה', 'מוגבלת בכמות, כדי שלא יהיה רעש'],
    icon: BellRing,
    scene: UrgentScene,
  },
  {
    id: 'radar',
    title: 'רדאר ביקוש',
    tagline: 'איפה יש קונים ואין נכסים.',
    explain: 'מפה חיה של מה שהקהילה מחפשת, לפי אזור, חדרים ותקציב. רואים איפה כדאי לחפש בלעדיות ואיפה כבר יש הכול.',
    why: ['פער בין ביקוש להיצע', 'אנונימי ומצטבר', 'מתעדכן בזמן אמת'],
    icon: Radar,
    scene: RadarScene,
  },
  {
    id: 'matchmaker',
    title: 'השדכן של NadlanUP',
    tagline: 'שותפים שמשלימים אותך.',
    explain: 'המערכת משווה בין מה שיש לך למה שיש לאחרים, ומציעה את המתווך שהכי מתאים לשת"פ, עם הסבר למה.',
    why: ['שת"פ מתחיל מהצעה', 'ציון התאמה עם נימוק', 'בלי לחפש בקבוצות'],
    icon: Link2,
    scene: MatchmakerScene,
  },
  {
    id: 'whatsapp',
    title: 'מוואטסאפ למערכת',
    tagline: 'ההודעה שכבר נכתבה, מסודרת.',
    explain: 'מעבירים הודעה מקבוצה, והמערכת הופכת אותה לנכס או לבקשה מסודרים ומחפשת התאמות. לא צריך לעזוב את הקבוצות.',
    why: ['נכנס מה שכבר קיים', 'אישור לפני פרסום', 'עובד עם מה שמעבירים אליו'],
    icon: MessagesSquare,
    scene: WhatsappScene,
  },
  {
    id: 'trust',
    title: 'מדד אמינות מקצועי',
    tagline: 'אמון שנבנה ממעשים.',
    explain: 'תג ליד השם שמראה איך מתווך עובד מול מתווכים אחרים: זמן תגובה, שת"פים שנסגרו, ביטולים ותשלום עמלה בזמן. לא דירוג של לקוחות.',
    why: ['נבנה לבד מהפעילות', 'חבר חדש מקבל "חדש", לא ציון נמוך', 'עוזר לבחור עם מי לעבוד'],
    icon: ShieldCheck,
    scene: TrustScene,
  },
  {
    id: 'folder',
    title: 'הפולדר שמרגיש',
    tagline: 'יודעים מתי להרים טלפון.',
    explain: 'רואים מי פתח את הפולדר, כמה פעמים חזר ועל איזה נכס עצר. כשהלקוח חוזר שוב ושוב לאותה דירה, מגיעה התראה.',
    why: ['התראה ברגע הנכון', 'מדד עניין לכל נכס', 'הפולדר הופך לכלי מכירה'],
    icon: Eye,
    scene: FolderScene,
  },
  {
    id: 'wallet',
    title: 'ארנק עמלות',
    tagline: 'כמה באמת נכנס החודש.',
    explain: 'תחזית הכנסה לפי העסקאות בצנרת וההסתברות שלהן, עם הפרשה אוטומטית למע"מ ולמס, ושורה אחת: נטו בכיס. ההערכות לפי הגדרות המתווך, ולא ייעוץ מס.',
    why: ['תחזית לשלושה חודשים', 'הפרשה אוטומטית', 'מתחבר לחדר העסקה'],
    icon: Wallet,
    scene: WalletScene,
  },
  {
    id: 'pros',
    title: 'שמאי או עו"ד תוך שעה',
    tagline: 'מקצוענים במחיר קהילה.',
    explain: 'מבקשים הערכה או ייעוץ ומקבלים הצעות ממקצוענים מהקהילה, במחיר מוזל לחברים.',
    why: ['הצעות תוך שעה', 'מחיר קהילה', 'מקצוענים מתוך הקהילה'],
    icon: Scale,
    scene: ProsScene,
  },
]

/** null: closed. "hub": the list of all ideas. Otherwise the id of the one being shown. */
export type LabView = null | 'hub' | string

function Shell({ onClose, children, label }: { onClose: () => void; children: ReactNode; label: string }) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const unlock = lockScroll()
    panel.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      unlock()
    }
  }, [onClose])
  return (
    <motion.div
      className="bl-scrim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={panel}
        className="bl"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        initial={{ opacity: 0, y: 36, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.42, ease: EASE }}
      >
        <i className="bl-aura" aria-hidden />
        {children}
      </motion.div>
    </motion.div>
  )
}

function Hub({ onClose, onPick }: { onClose: () => void; onPick: (id: string) => void }) {
  const Chip = labSlots.Chip
  // one flat list, or (green version) the tools in groups by layer
  const groups = labSlots.groups ?? [{ title: '', sub: '', ids: labItems.map((x) => x.id) }]
  let n = 0
  return (
    <>
      <header className="bl-head">
        <div className="bl-title">
          <h2>מעבדת בטא</h2>
          <p>{labSlots.hubSub ?? 'כלים שנמצאים בפיתוח. אפשר להציץ, עוד אי אפשר להיכנס.'}</p>
        </div>
        <button className="bl-x" onClick={onClose} aria-label="סגירה">
          <X />
        </button>
      </header>
      <div className="bl-scroll">
        {groups.map((g) => (
          <div key={g.title} className="bl-section">
            {g.title && (
              <h3 className="bl-group">
                <b>{g.title}</b>
                <small>{g.sub}</small>
              </h3>
            )}
            <ul className="bl-grid">
              {labItems
                .filter((it) => g.ids.includes(it.id))
                .map((it) => (
                  <li key={it.id} style={{ '--i': n++ } as CSSProperties}>
                    <button className="bl-tile" data-id={it.id} onClick={() => onPick(it.id)}>
                      <span className="bl-icon">
                        <it.icon />
                      </span>
                      <strong>{it.title}</strong>
                      <small>{it.tagline}</small>
                      {Chip ? (
                        <Chip id={it.id} />
                      ) : (
                        <em className="bl-chip">
                          <Lock /> בטא
                        </em>
                      )}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="bl-note">
        <Lock /> {labSlots.hubNote ?? 'גרסת בטא. הכרטיסים לצפייה בלבד, בלי כניסה ובלי נתונים אמיתיים.'}
      </div>
    </>
  )
}

function Peek({ item, onClose, onGo, onHub }: { item: LabItem; onClose: () => void; onGo: (id: string) => void; onHub: () => void }) {
  const index = labItems.findIndex((x) => x.id === item.id)
  const prev = labItems[(index - 1 + labItems.length) % labItems.length]
  const next = labItems[(index + 1) % labItems.length]
  const Scene = item.scene
  const Badge = labSlots.Badge
  return (
    <>
      <header className="bl-head">
        <span className="bl-icon is-lg">
          <item.icon />
        </span>
        <div className="bl-title">
          <h2>{item.title}</h2>
          <span className="bl-badges">
            <b>גרסת בטא</b>
            {Badge ? <Badge id={item.id} /> : <em>הצצה, עוד לא פתוח</em>}
          </span>
        </div>
        <button className="bl-x" onClick={onClose} aria-label="סגירה">
          <X />
        </button>
      </header>

      <div className="bl-scroll">
        <div className="bl-body" key={item.id}>
          <div className="bl-text">
            <p className="bl-tagline">{item.tagline}</p>
            <h3>מה זה אומר</h3>
            <p className="bl-explain">{item.explain}</p>
            <ul className="bl-why">
              {item.why.map((w) => (
                <li key={w}>
                  <Check /> {w}
                </li>
              ))}
            </ul>
          </div>
          <div className="bl-vis">{Scene && <Scene />}</div>
        </div>
      </div>

      <footer className="bl-foot">
        <button className="bl-nav" onClick={() => onGo(prev.id)} aria-label={`הקודם: ${prev.title}`}>
          <ArrowRight />
          <span>הקודם</span>
        </button>
        <ol className="bl-dots" aria-hidden>
          {labItems.map((x) => (
            <li key={x.id} className={x.id === item.id ? 'is-on' : ''} />
          ))}
        </ol>
        <button className="bl-nav" onClick={() => onGo(next.id)} aria-label={`הבא: ${next.title}`}>
          <span>הבא</span>
          <ArrowLeft />
        </button>
        <button className="bl-hubbtn" onClick={onHub}>
          כל המעבדה
        </button>
      </footer>
      <div className="bl-note">
        <Lock /> {labSlots.peekNote ?? 'גרסת בטא. עוד אי אפשר להיכנס, זו הצצה בלבד.'}
      </div>
    </>
  )
}

export default function BetaLab({ view, setView }: { view: LabView; setView: (v: LabView) => void }) {
  const close = () => setView(null)
  const item = labItems.find((x) => x.id === view)
  const inCard = view === 'hub' || (!!item && item.id !== 'room')

  return (
    <>
      <DealRoomDemo open={view === 'room'} onClose={close} />
      {createPortal(
        <AnimatePresence>
          {inCard && (
            <Shell key="shell" onClose={close} label={view === 'hub' ? 'מעבדת בטא' : item?.title ?? ''}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={view ?? ''}
                  className="bl-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: EASE }}
                >
                  {view === 'hub' ? <Hub onClose={close} onPick={setView} /> : item && <Peek item={item} onClose={close} onGo={setView} onHub={() => setView('hub')} />}
                </motion.div>
              </AnimatePresence>
            </Shell>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
