import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import type { MotionValue, PanInfo } from 'framer-motion'
import { Bell, Check, Heart, Home, MapPin, MessageCircle, Search, Sparkles, X } from 'lucide-react'
import { CURRENT_BROKER_ID, asset } from '../config'
import { brokerById, brokers, communityItems, formatPriceShort, roomsLabel } from '../data/demo'
import type { CommunityItem, Notice, SearchSpec } from '../data/demo'
import { useStore } from '../store'
import { Avatar } from '../components/ui'
import ChatWindow from './ChatWindow'
import { matchStore, matchUi, matchesFor, otherSideInterested, isMutual, placeOf, propertyKind, scoreOf } from './match'
import { DEFAULT_KIND, hasRooms, isKind, searchGroup } from '../config/propertyTypes'
import type { Match, Pair } from './match'
import '../styles/match.css'

/**
 * The match moment, the heart of the community (Itzik 17.11.2026).
 *  1. A broker shares a property or a buyer: the posts of other brokers are checked at once (city, neighbourhood,
 *     kind of home, rooms, budget, parking, elevator, safe room). Two cards meet and "נמצאו X התאמות!" comes up,
 *     with how well each one fits. None: "נודיע לך ברגע שתהיה התאמה".
 *  2. The matches as cards: right is "מעניין אותי", left is "לא עכשיו", with buttons and the arrow keys as well.
 *     When both brokers say yes, a small "יש התאמה!" and the chat opens with a first line ready.
 *  3. The broker whose property or buyer fits a new post hears it: "יש קונה לנכס שלך בגבעתיים" and "יש לי".
 * No street and no house number anywhere here: the city and the neighbourhood only.
 * In the demo the other broker is played: a broker whose post fits at 70 and up counts as interested, and a few
 * seconds after a share a fitting post of another broker comes in. Both are said on the screen.
 */
const SIM_KEY = 'nadlanup-sim-interest-v1'
const SIM_DELAY = 7000
const simDone = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(SIM_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}
const simMark = (id: string) => {
  try {
    localStorage.setItem(SIM_KEY, JSON.stringify([...simDone(), id]))
  } catch {
    /* storage unavailable */
  }
}

const isRepost = (it: CommunityItem) => it.body.includes('שיתוף של פוסט')
const mineToMatch = (it: CommunityItem) => it.authorId === CURRENT_BROKER_ID && !isRepost(it) && ((it.topicId === 'coop' && !!it.property) || (it.topicId === 'seeking' && !!it.search))
const firstName = (id: string) => brokerById(id).name.split(' ')[0]
const priceOf = (it: CommunityItem) =>
  it.property ? `${formatPriceShort(it.property.price)}${it.property.deal === 'rent' ? ' לחודש' : ''}` : it.search ? `עד ${formatPriceShort(it.search.budget)}` : ''
const roomsOf = (it: CommunityItem) =>
  it.property ? (it.property.rooms ? `${it.property.rooms} חדרים` : '') : it.search ? (searchGroup(it.search) === 'business' ? it.search.kinds?.join(', ') || 'נכס מסחרי' : roomsLabel(it.search)) : ''

/** the first line of the chat, in the broker's own voice, left in the box to send or change */
function openerFor(mine: CommunityItem, theirs: CommunityItem, score: number) {
  const first = firstName(theirs.authorId)
  if (mine.property) return `היי ${first}, ראיתי את ${theirs.search?.deal === 'rent' ? 'השוכר' : 'הקונה'} שלך. יש לי נכס ב${placeOf(mine).replace(' · ', ', ')} שמתאים לו ב-${score}%. מתי נוח לדבר?`
  return `היי ${first}, יש לי ${mine.search?.deal === 'rent' ? 'שוכר' : 'קונה'} שמתאים לנכס שלך ב${placeOf(theirs).replace(' · ', ', ')} (התאמה של ${score}%). הנכס עדיין זמין?`
}

type Session = { mine: CommunityItem; matches: Match[]; stage: 'meet' | 'deck' | 'done'; index: number; yes: number }
type Mutual = { mine: CommunityItem; match: Match; fromDeck: boolean }
type Pop = { notice: Notice; mine: CommunityItem; theirs: CommunityItem; score: number }

export default function MatchMoment({ sim = false }: { sim?: boolean }) {
  const { items, addItem, addNotice, toast, matchAlert, showMatch } = useStore()
  const [session, setSession] = useState<Session | null>(null)
  const [mutual, setMutual] = useState<Mutual | null>(null)
  const [chat, setChat] = useState<{ item: CommunityItem; opener: string } | null>(null)
  const [pop, setPop] = useState<Pop | null>(null)
  const seen = useRef<Set<string> | null>(null)
  const timers = useRef<number[]>([])
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), [])

  // the older small match card steps aside while this screen is open
  useEffect(() => {
    if ((session || mutual) && matchAlert) showMatch(null)
  }, [session, mutual, matchAlert, showMatch])

  /* --------------------------------------------- the other broker's side, played in the demo */
  const playOtherSide = useCallback(
    (mine: CommunityItem) => {
      if (simDone().includes(mine.id)) return
      timers.current.push(
        window.setTimeout(() => {
          simMark(mine.id)
          const theirs = counterpartOf(mine)
          if (!theirs) return
          const r = mine.property && theirs.search ? scoreOf(mine.city, mine.property, theirs.search) : mine.search && theirs.property ? scoreOf(theirs.city, theirs.property, mine.search) : null
          if (!r) return
          addItem(theirs)
          const b = brokerById(theirs.authorId)
          const forProperty = !!mine.property
          const city = forProperty ? mine.city : theirs.city
          const notice: Notice = {
            id: `int-${mine.id}`,
            kind: forProperty ? 'interest' : 'match',
            title: forProperty ? `יש ${theirs.search?.deal === 'rent' ? 'שוכר' : 'קונה'} לנכס שלך ב${city}` : `יש נכס ל${mine.search?.deal === 'rent' ? 'שוכר' : 'קונה'} שלך ב${city}`,
            text: `${b.name} · ${theirs.title ?? ''} · התאמה של ${r.score}%`,
            time: 'עכשיו',
            read: false,
            topicId: 'coop',
            itemId: forProperty ? mine.id : theirs.id,
            demo: true,
            pair: { mine: mine.id, theirs: theirs.id },
          }
          addNotice(notice)
          toast(`התראה חדשה: ${notice.title}`)
          setPop({ notice, mine, theirs, score: r.score })
        }, SIM_DELAY),
      )
    },
    [addItem, addNotice, toast],
  )

  /* --------------------------------------------- a new post of mine: check it at once */
  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(items.map((i) => i.id))
      return
    }
    const fresh = items.filter((i) => !seen.current!.has(i.id))
    fresh.forEach((i) => seen.current!.add(i.id))
    const mine = fresh.find(mineToMatch)
    if (!mine) return
    const t = window.setTimeout(() => {
      setSession((cur) => cur ?? { mine, matches: matchesFor(mine, itemsRef.current), stage: 'meet', index: 0, yes: 0 })
      if (sim) playOtherSide(mine)
    }, 650)
    timers.current.push(t)
  }, [items, sim, playOtherSide])

  /* --------------------------------------------- "יש לי" on a notice, from anywhere */
  const answerPair = useCallback(
    (p: Pair) => {
      const all = itemsRef.current
      const mine = all.find((i) => i.id === p.mine)
      const theirs = all.find((i) => i.id === p.theirs)
      if (!mine || !theirs) return toast('הפוסט כבר לא בקהילה')
      const r = mine.property && theirs.search ? scoreOf(mine.city, mine.property, theirs.search) : mine.search && theirs.property ? scoreOf(theirs.city, theirs.property, mine.search) : null
      const match: Match = { item: theirs, score: r?.score ?? 0, reasons: r?.reasons ?? [] }
      setPop(null)
      if (isMutual(p.mine, p.theirs)) return setChat({ item: theirs, opener: openerFor(mine, theirs, match.score) })
      matchStore.say(p.mine, p.theirs, 'yes')
      matchStore.mutual(p.mine, p.theirs)
      setMutual({ mine, match, fromDeck: false })
    },
    [toast],
  )
  useEffect(() => matchUi.on(answerPair), [answerPair])

  /* --------------------------------------------- the deck */
  const decide = (yes: boolean) => {
    if (!session) return
    const m = session.matches[session.index]
    if (!m) return
    matchStore.say(session.mine.id, m.item.id, yes ? 'yes' : 'no')
    const next = session.index + 1
    setSession({ ...session, index: next, yes: session.yes + (yes ? 1 : 0), stage: next >= session.matches.length ? 'done' : 'deck' })
    if (!yes) return
    if (otherSideInterested(m)) {
      matchStore.mutual(session.mine.id, m.item.id)
      setMutual({ mine: session.mine, match: m, fromDeck: true })
    } else toast('שמרנו את ההתאמה. נודיע לך כשהצד השני יאשר')
  }

  const openChat = (mu: Mutual) => {
    setMutual(null)
    setChat({ item: mu.match.item, opener: openerFor(mu.mine, mu.match.item, mu.match.score) })
  }
  // a short fade, then the screen is gone (nothing left over the page)
  const [leaving, setLeaving] = useState(false)
  const closeAll = () => {
    if (leaving) return
    setLeaving(true)
    timers.current.push(
      window.setTimeout(() => {
        setSession(null)
        setLeaving(false)
      }, 170),
    )
  }

  return (
    <>
      {session && <MatchScreen key={session.mine.id} session={session} leaving={leaving} onStart={() => setSession({ ...session, stage: session.matches.length ? 'deck' : 'done' })} onDecide={decide} onClose={closeAll} paused={!!mutual || !!chat} />}
      {mutual && <ItsAMatch key="mutual" mu={mutual} onChat={() => openChat(mutual)} onLater={() => setMutual(null)} />}
      {pop && !session && !mutual && <MatchNotice key={pop.notice.id} pop={pop} onYes={() => answerPair(pop.notice.pair!)} onLater={() => setPop(null)} />}
      {chat && <ChatWindow key={chat.item.id} item={chat.item} open opener={chat.opener} onClose={() => setChat(null)} />}
    </>
  )
}

/* ================================================================ the other side, invented for the demo */

const AMEN = ['חניה', 'מעלית', 'ממ"ד', 'ממ"ק']
function counterpartOf(mine: CommunityItem): CommunityItem | null {
  const local = (city: string) => {
    // a broker who works in that city, and for a sale not one who does rentals only
    const fits = (b: (typeof brokers)[number]) => b.id !== CURRENT_BROKER_ID && !(b.specialties.length === 1 && b.specialties[0] === 'השכרות')
    const near = brokers.filter((b) => fits(b) && b.area.includes(city))
    const pool = near.length ? near : brokers.filter(fits)
    return pool[Math.floor(Math.random() * pool.length)]
  }
  const stamp = Date.now()
  if (mine.property) {
    const p = mine.property
    const b = local(mine.city)
    const rooms = parseFloat(p.rooms)
    const rent = p.deal === 'rent'
    const step = rent ? 100 : 10000
    const hood = p.area.split(' - ')[1]?.split(' · ')[0].trim()
    // the invented buyer looks for the same kind of property, in the same group (מגורים or מסחרי)
    const k = propertyKind(p, mine.title)
    const biz = k.group === 'business'
    const extra = (p.extra ?? []).join(' ')
    const wants = AMEN.filter((a) => (a === 'חניה' ? (p.parking ?? 0) > 0 : a === 'מעלית' ? p.elevator : extra.includes(a)))
    const search: SearchSpec = {
      cities: [mine.city],
      roomsMin: Number.isNaN(rooms) ? 3 : Math.max(1, Math.floor(rooms)),
      roomsMax: Number.isNaN(rooms) ? 4 : Math.ceil(rooms + 0.5),
      budget: Math.ceil((p.price * 1.04) / step) * step,
      wants,
      deal: rent ? 'rent' : 'sale',
      neighborhoods: hood ? [hood] : undefined,
      kinds: [k.kind],
      group: k.group,
    }
    return {
      id: `sim-b-${mine.id}-${stamp}`,
      topicId: 'seeking',
      authorId: b.id,
      city: mine.city,
      time: 'עכשיו',
      likes: 0,
      comments: [],
      title: biz || !hasRooms(k.group, k.kind) ? `מחפש ללקוח: ${k.kind} ב${mine.city}` : `${rent ? 'מחפש לשוכר' : 'מחפש לקונה'}: ${roomsLabel(search)} ב${mine.city}`,
      body: `${hood ? `שכונה: ${hood}. ` : ''}${rent ? 'שוכר רציני' : 'קונה רציני'}. מי שיש לו נכס מתאים, דברו איתי.`,
      search,
    }
  }
  if (mine.search) {
    const s = mine.search
    const city = s.cities[0] ?? mine.city
    if (!city) return null
    const b = local(city)
    const rent = s.deal === 'rent'
    const step = rent ? 100 : 10000
    const hood = s.neighborhoods?.[0]
    // the invented property is of the kind the search names (the first one), in the search's own group
    const group = searchGroup(s)
    const kind = s.kinds?.find((x) => isKind(group, x)) ?? DEFAULT_KIND[group]
    const sized = !hasRooms(group, kind)
    const rooms = sized ? '' : String(s.roomsMax)
    // a photo of the demo's own (generated) properties, of the same city when there is one
    const pics = communityItems.filter((i) => i.property && i.image && i.authorId !== CURRENT_BROKER_ID)
    const pic = (pics.find((i) => i.city === city) ?? pics[0])?.image
    return {
      id: `sim-p-${mine.id}-${stamp}`,
      topicId: 'coop',
      authorId: b.id,
      city,
      time: 'עכשיו',
      likes: 0,
      comments: [],
      image: pic,
      title: sized ? `${kind} ב${hood ?? city}` : `${kind} ${rooms} חדרים ב${hood ?? city}`,
      body: 'נכס חדש אצלי. פתוח לשיתוף פעולה עם מתווך שיש לו קונה מתאים.',
      property: {
        area: hood ? `${city} - ${hood}` : city,
        rooms,
        price: Math.floor((s.budget * 0.96) / step) * step,
        split: 'חלוקת עמלה שווה',
        showPrice: true,
        deal: rent ? 'rent' : 'sale',
        kind,
        group,
        parking: 1,
        elevator: true,
        extra: ['ממ"ד', 'מרפסת'],
      },
    }
  }
  return null
}

/* ================================================================ pieces */

/** how well it fits, as a ring that fills */
function Ring({ value, size = 64, delay = 0 }: { value: number; size?: number; delay?: number }) {
  const still = useReducedMotion()
  const r = size / 2 - 5
  const c = 2 * Math.PI * r
  const tone = value >= 85 ? 'is-high' : value >= 70 ? 'is-good' : 'is-ok'
  return (
    <span className={`mm-ring ${tone}`} style={{ width: size, height: size }} data-score={value} aria-label={`התאמה של ${value} אחוז`} role="img">
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle className="mm-ring-bg" cx={size / 2} cy={size / 2} r={r} />
        <motion.circle
          className="mm-ring-fg"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeDasharray={c}
          initial={{ strokeDashoffset: still ? c * (1 - value / 100) : c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: still ? 0 : 0.9, delay: still ? 0 : delay, ease: [0.2, 0.8, 0.3, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <b className="num">{value}%</b>
    </span>
  )
}

/** the small face of a post: its photo, or a buyer's search sign */
function Thumb({ it, size = 'md' }: { it: CommunityItem; size?: 'md' | 'lg' }) {
  if (it.image) return <img className={`mm-thumb is-${size}`} src={asset(it.image)} alt="" draggable={false} />
  return <span className={`mm-thumb is-${size} ${it.search ? 'is-buyer' : 'is-home'}`}>{it.search ? <Search aria-hidden /> : <Home aria-hidden />}</span>
}

/** a small card for the meeting: what it is, where, how much */
function MiniCard({ it, tag }: { it: CommunityItem; tag: string }) {
  return (
    <div className="mm-mini">
      <Thumb it={it} />
      <span className="mm-mini-tag">{tag}</span>
      <b>{it.title}</b>
      <small>
        <MapPin aria-hidden /> {placeOf(it)}
      </small>
      <strong className="num">{priceOf(it)}</strong>
    </div>
  )
}

/* ================================================================ the screen */

function MatchScreen({
  session,
  onStart,
  onDecide,
  onClose,
  paused,
  leaving,
}: {
  session: Session
  leaving: boolean
  onStart: () => void
  onDecide: (yes: boolean) => void
  onClose: () => void
  paused: boolean
}) {
  const still = useReducedMotion()
  const { mine, matches, stage, index } = session
  const n = matches.length
  const best = matches[0]
  const close = useRef<HTMLButtonElement>(null)
  const x = useMotionValue(0)
  const flying = useRef(false)

  // a new card on top starts in the middle
  useLayoutEffect(() => {
    x.set(0)
    flying.current = false
  }, [index, x])

  const fly = useCallback(
    (yes: boolean) => {
      if (flying.current || stage !== 'deck') return
      flying.current = true
      animate(x, yes ? 700 : -700, { duration: still ? 0 : 0.28, ease: [0.4, 0, 1, 1] }).then(() => onDecide(yes))
    },
    [x, still, stage, onDecide],
  )

  useEffect(() => {
    document.body.classList.add('has-match')
    const t = window.setTimeout(() => close.current?.focus(), 60)
    return () => {
      clearTimeout(t)
      document.body.classList.remove('has-match')
    }
  }, [])
  useEffect(() => {
    if (paused) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose()
      if (stage !== 'deck') return
      if (e.key === 'ArrowRight') fly(true)
      if (e.key === 'ArrowLeft') fly(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [paused, stage, fly, onClose])

  // the two cards end touching each other, a little over the seam
  const meetX = window.innerWidth <= 560 ? 80 : 106
  const what = mine.property ? 'לנכס שלך' : `ל${mine.search?.deal === 'rent' ? 'שוכר' : 'קונה'} שלך`
  const headline = n === 0 ? 'אין עדיין התאמה' : n === 1 ? 'נמצאה התאמה אחת!' : `נמצאו ${n} התאמות!`

  return createPortal(
    <motion.div className={`mm${leaving ? ' is-leaving' : ''}`} role="dialog" aria-modal="true" aria-label={headline} data-match-screen={stage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.22 }}>
      <button ref={close} type="button" className="mm-close" onClick={onClose} aria-label="סגירה" data-act="close-match">
        <X />
      </button>

      {stage === 'meet' && (
        <div className="mm-stage">
          <div className={`mm-meet${n ? '' : ' is-alone'}`} aria-hidden>
            {n > 0 && <i className="mm-burst" />}
            <motion.div
              className="mm-meet-card is-mine"
              initial={still ? false : { x: n ? 220 : 0, rotate: n ? 14 : 0, opacity: 0, scale: n ? 1 : 0.9 }}
              animate={{ x: n ? meetX : 0, rotate: n ? 5 : 0, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 170, damping: 19, delay: 0.1 }}
            >
              <MiniCard it={mine} tag={mine.property ? 'הנכס שלך' : `ה${mine.search?.deal === 'rent' ? 'שוכר' : 'קונה'} שלך`} />
            </motion.div>
            {best && (
              <motion.div
                className="mm-meet-card is-theirs"
                initial={still ? false : { x: -220, rotate: -14, opacity: 0 }}
                animate={{ x: -meetX, rotate: -5, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 170, damping: 19, delay: 0.1 }}
              >
                <MiniCard it={best.item} tag={brokerById(best.item.authorId).name} />
              </motion.div>
            )}
            {best && (
              <motion.span
                className="mm-meet-score"
                initial={still ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.62 }}
              >
                <Ring value={best.score} size={78} delay={0.7} />
              </motion.span>
            )}
            {!n && (
              <span className="mm-radar">
                <i />
                <i />
                <i />
              </span>
            )}
          </div>
          <motion.div className="mm-copy" initial={still ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: n ? 0.85 : 0.35, duration: 0.3 }}>
            <p className="mm-eyebrow">
              <Sparkles aria-hidden /> בדקנו מה מתאים {what}
            </p>
            <h2 className="mm-title" data-match-title>
              {headline}
            </h2>
            {n > 0 ? (
              <>
                <p className="mm-sub">לפי עיר, שכונה, סוג נכס, חדרים, תקציב, חניה, מעלית וממ"ד</p>
                <ul className="mm-faces" aria-label="המתווכים בהתאמות">
                  {matches.slice(0, 5).map((m) => (
                    <li key={m.item.id}>
                      <Avatar src={brokerById(m.item.authorId).avatar} name={brokerById(m.item.authorId).name} size={34} />
                      <b className="num">{m.score}%</b>
                    </li>
                  ))}
                </ul>
                <div className="mm-actions">
                  <button type="button" className="btn btn-gold mm-go" onClick={onStart} data-act="see-matches">
                    לראות את ההתאמות
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={onClose}>
                    אחר כך
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mm-sub" data-match-none>
                  <Bell aria-hidden /> נודיע לך ברגע שתהיה התאמה
                </p>
                <div className="mm-actions">
                  <button type="button" className="btn btn-gold mm-go" onClick={onClose} data-act="ok-none">
                    הבנתי
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {stage === 'deck' && (
        <div className="mm-stage is-deck">
          <p className="mm-count">
            <span className="num">{index + 1}</span> מתוך <span className="num">{n}</span>
          </p>
          <div className="mm-deck">
            {matches.slice(index, index + 3).map((m, i) => (i === 0 ? <SwipeCard key={m.item.id} m={m} x={x} onFly={fly} /> : <BackCard key={m.item.id} m={m} depth={i} />)).reverse()}
          </div>
          <div className="mm-buttons">
            <button type="button" className="mm-btn is-yes" onClick={() => fly(true)} data-act="match-yes">
              <Heart aria-hidden />
              מעניין אותי
            </button>
            <button type="button" className="mm-btn is-no" onClick={() => fly(false)} data-act="match-no">
              <X aria-hidden />
              לא עכשיו
            </button>
          </div>
          <p className="mm-hint">מחליקים ימינה או שמאלה, או בוחרים בכפתור</p>
          <p className="mm-demo">
            <em className="notice-demo">דוגמה</em> בדמו, מתווך שהפוסט שלו מתאים ב-70% ומעלה נחשב כמי שסימן מעניין
          </p>
        </div>
      )}

      {stage === 'done' && n > 0 && (
        <div className="mm-stage is-done" data-match-done>
          <span className="mm-done-ico">
            <Check aria-hidden />
          </span>
          <h2 className="mm-title">עברת על כל ההתאמות</h2>
          <p className="mm-sub">
            {session.yes ? (
              <>
                סימנת מעניין ל-<span className="num">{session.yes}</span>. כשהצד השני יאשר, ייפתח צ'אט.
              </>
            ) : (
              'נודיע לך ברגע שתהיה התאמה חדשה'
            )}
          </p>
          <div className="mm-actions">
            <button type="button" className="btn btn-gold mm-go" onClick={onClose} data-act="done-match">
              חזרה לקהילה
            </button>
          </div>
        </div>
      )}
    </motion.div>,
    document.body,
  )
}

/** the card on top: it follows the finger, leans, and says which way it is going */
function SwipeCard({ m, x, onFly }: { m: Match; x: MotionValue<number>; onFly: (yes: boolean) => void }) {
  const rotate = useTransform(x, [-260, 0, 260], [-13, 0, 13])
  const yes = useTransform(x, [24, 120], [0, 1])
  const no = useTransform(x, [-120, -24], [1, 0])
  const onEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 110 || info.velocity.x > 650) onFly(true)
    else if (info.offset.x < -110 || info.velocity.x < -650) onFly(false)
    else animate(x, 0, { type: 'spring', stiffness: 420, damping: 30 })
  }
  return (
    <motion.article
      className="mm-card is-top"
      style={{ x, rotate }}
      drag="x"
      dragMomentum={false}
      dragElastic={1}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={onEnd}
      initial={{ scale: 0.95, y: 14 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      data-match-card={m.item.id}
      data-score={m.score}
    >
      <motion.span className="mm-stamp is-yes" style={{ opacity: yes }} aria-hidden>
        מעניין אותי
      </motion.span>
      <motion.span className="mm-stamp is-no" style={{ opacity: no }} aria-hidden>
        לא עכשיו
      </motion.span>
      <CardBody m={m} />
    </motion.article>
  )
}

function BackCard({ m, depth }: { m: Match; depth: number }) {
  return (
    <motion.article className="mm-card is-back" aria-hidden initial={false} animate={{ scale: 1 - depth * 0.05, y: depth * 14, opacity: depth > 1 ? 0.6 : 1 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }}>
      <CardBody m={m} />
    </motion.article>
  )
}

function CardBody({ m }: { m: Match }) {
  const it = m.item
  const b = brokerById(it.authorId)
  const buyer = !!it.search
  return (
    <>
      <div className={`mm-card-top${it.image ? '' : buyer ? ' is-buyer' : ' is-home'}`}>
        {it.image ? (
          <img src={asset(it.image)} alt="" draggable={false} />
        ) : (
          <span className="mm-card-sign" aria-hidden>
            {buyer ? <Search /> : <Home />}
          </span>
        )}
        <span className="mm-card-kind">{buyer ? (it.search?.deal === 'rent' ? 'מחפש לשוכר' : 'מחפש לקונה') : it.property?.deal === 'rent' ? 'להשכרה' : 'למכירה'}</span>
        <span className="mm-card-ring">
          <Ring value={m.score} size={70} delay={0.15} />
          <small>התאמה</small>
        </span>
      </div>
      <div className="mm-card-body">
        <h3>{it.title}</h3>
        <p className="mm-card-place">
          <MapPin aria-hidden /> {placeOf(it)}
        </p>
        <p className="mm-card-facts">
          <strong className="num">{priceOf(it)}</strong>
          {roomsOf(it) && <span className="num">{roomsOf(it)}</span>}
        </p>
        <ul className="mm-reasons" aria-label="למה זה מתאים">
          {m.reasons.slice(0, 7).map((r) => (
            <li key={r.label} className={r.ok ? 'is-ok' : 'is-off'}>
              {r.ok ? <Check aria-hidden /> : <X aria-hidden />}
              {r.label}
            </li>
          ))}
        </ul>
        <div className="mm-card-who">
          <Avatar src={b.avatar} name={b.name} size={40} />
          <span>
            <b>{b.name}</b>
            <small>{b.title}</small>
          </span>
        </div>
      </div>
    </>
  )
}

/* ================================================================ "יש התאמה!" */

function ItsAMatch({ mu, onChat, onLater }: { mu: Mutual; onChat: () => void; onLater: () => void }) {
  const still = useReducedMotion()
  const me = brokerById(CURRENT_BROKER_ID)
  const them = brokerById(mu.match.item.authorId)
  const go = useRef<HTMLButtonElement>(null)
  const chat = useRef(onChat)
  chat.current = onChat
  // the chat opens by itself a moment later, unless the broker keeps going through the matches
  useEffect(() => {
    const f = window.setTimeout(() => go.current?.focus(), 80)
    const t = window.setTimeout(() => chat.current(), 3200)
    return () => {
      clearTimeout(f)
      clearTimeout(t)
    }
  }, [])
  return createPortal(
    <motion.div className="mm-mutual-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.section
        className="mm-mutual"
        role="alertdialog"
        aria-label="יש התאמה!"
        data-mutual
        initial={still ? false : { scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <div className="mm-mutual-faces" aria-hidden>
          <motion.span initial={still ? false : { x: 46 }} animate={{ x: 10 }} transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.1 }}>
            <Avatar src={me.avatar} name={me.name} size={72} ring />
          </motion.span>
          <motion.i className="mm-mutual-heart" initial={still ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.42 }}>
            <Heart />
          </motion.i>
          <motion.span initial={still ? false : { x: -46 }} animate={{ x: -10 }} transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.1 }}>
            <Avatar src={them.avatar} name={them.name} size={72} ring />
          </motion.span>
        </div>
        <h2 className="mm-mutual-title">יש התאמה!</h2>
        <p>
          גם {them.name} רוצה לדבר על זה. התאמה של <b className="num">{mu.match.score}%</b>.
        </p>
        <div className="mm-mutual-bar" aria-hidden>
          <i />
        </div>
        <div className="mm-actions">
          <button ref={go} type="button" className="btn btn-gold mm-go" onClick={onChat} data-act="open-match-chat">
            <MessageCircle aria-hidden /> פתיחת הצ'אט
          </button>
          <button type="button" className="btn btn-ghost" onClick={onLater} data-act="later-match">
            {mu.fromDeck ? 'המשך להתאמות' : 'אחר כך'}
          </button>
        </div>
      </motion.section>
    </motion.div>,
    document.body,
  )
}

/* ================================================================ the notice in the site */

function MatchNotice({ pop, onYes, onLater }: { pop: Pop; onYes: () => void; onLater: () => void }) {
  const b = brokerById(pop.theirs.authorId)
  return createPortal(
    <motion.aside
      className="mm-notice"
      role="status"
      aria-live="polite"
      data-match-notice={pop.notice.id}
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
    >
      <span className="mm-notice-ico" aria-hidden>
        <Bell />
      </span>
      <div className="mm-notice-main">
        <b>
          {pop.notice.title}
          <em className="notice-demo">דוגמה</em>
        </b>
        <span className="mm-notice-who">
          <Avatar src={b.avatar} name={b.name} size={26} /> {b.name} · {placeOf(pop.theirs)}
        </span>
      </div>
      <Ring value={pop.score} size={52} />
      <div className="mm-notice-acts">
        <button type="button" className="btn btn-gold" onClick={onYes} data-act="match-have">
          יש לי
        </button>
        <button type="button" className="btn btn-ghost" onClick={onLater} data-act="match-later">
          אחר כך
        </button>
      </div>
    </motion.aside>,
    document.body,
  )
}
