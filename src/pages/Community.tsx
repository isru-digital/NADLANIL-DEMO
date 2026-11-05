import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Check, LayoutGrid, MapPin, MessageCircle, Radar, Search, Send, Share2, Sparkles, X } from 'lucide-react'
import { CURRENT_BROKER_ID } from '../config'
import { topicById, topics } from '../config/topics'
import type { TopicId } from '../config/topics'
import { brokerById, cities, fitsSearch, formatPriceShort, roomsLabel } from '../data/demo'
import type { CommunityItem } from '../data/demo'
import { useStore } from '../store'
import { Avatar, EASE, Modal, PageHead } from '../components/ui'
import CommunityCard from '../components/CommunityCard'
import '../styles/community.css'

type View = TopicId | 'all'

export default function Community() {
  const [params, setParams] = useSearchParams()
  const { items, myCities, setMyCities, notices, markNoticesRead, clearFresh, addItem, toast } = useStore()
  const me = brokerById(CURRENT_BROKER_ID)
  const raw = params.get('topic')
  const view: View = topics.some((t) => t.id === raw) ? (raw as TopicId) : 'all'
  const topic = view === 'all' ? null : topicById(view)
  const focusId = params.get('item')

  const [citiesOpen, setCitiesOpen] = useState(false)
  const [noticesOpen, setNoticesOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const composeTopics = topics.filter((t) => t.compose)
  const [draftTopic, setDraftTopic] = useState<TopicId>(composeTopics[0].id)
  const unread = notices.filter((n) => !n.read).length

  const setView = (v: View) => setParams(v === 'all' ? {} : { topic: v }, { replace: true })

  const inCities = (it: CommunityItem) =>
    myCities.length === 0 ||
    it.authorId === me.id ||
    myCities.includes(it.city) ||
    !!it.search?.cities.some((c) => myCities.includes(c)) ||
    (!!it.referral && myCities.includes(it.referral.toCity))

  const scoped = useMemo(() => items.filter(inCities), [items, myCities]) // eslint-disable-line react-hooks/exhaustive-deps
  const visible = view === 'all' ? scoped : scoped.filter((it) => it.topicId === view)

  // which messages fit something of mine
  const myProperties = items.filter((it) => it.authorId === me.id && it.property)
  const mySearches = items.filter((it) => it.authorId === me.id && it.search)
  const matchFor = (it: CommunityItem) => {
    if (it.authorId === me.id) return undefined
    if (it.search) {
      const p = myProperties.find((m) => fitsSearch(it.search!, { city: m.city, rooms: m.property!.rooms, price: m.property!.price }))
      return p ? `הנכס שלך "${p.title}" מתאים לבקשה הזאת` : undefined
    }
    if (it.property) {
      const s = mySearches.find((m) => fitsSearch(m.search!, { city: it.city, rooms: it.property!.rooms, price: it.property!.price }))
      return s ? `זה יכול להתאים לך: "${s.title}"` : undefined
    }
    return undefined
  }

  // "new" highlight settles after a while
  useEffect(() => {
    if (!items.some((c) => c.fresh)) return
    const t = window.setTimeout(clearFresh, 12000)
    return () => window.clearTimeout(t)
  }, [items, clearFresh])

  // deep link from an alert: bring the message into view
  useEffect(() => {
    if (!focusId) return
    const t = window.setTimeout(() => {
      document.getElementById(`ci-${focusId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 450)
    return () => window.clearTimeout(t)
  }, [focusId, view])

  useEffect(() => {
    if (topic?.compose) setDraftTopic(topic.id)
  }, [topic])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body) return
    addItem({
      id: `u${Date.now()}`,
      topicId: draftTopic,
      authorId: me.id,
      city: 'תל אביב',
      time: 'עכשיו',
      body,
      likes: 0,
      comments: [],
      fresh: true,
    })
    setDraft('')
    toast(`פורסם בנושא "${topicById(draftTopic).name}"`)
  }

  const toggleCity = (c: string) => setMyCities(myCities.includes(c) ? myCities.filter((x) => x !== c) : [...myCities, c])

  return (
    <>
      <PageHead
        eyebrow="קהילה"
        title={topic ? topic.name : 'כל הנושאים'}
        subtitle={topic ? topic.description : 'כל מה שקורה עכשיו בקהילה, לפי הערים שבחרת.'}
      >
        <button className="btn btn-ghost" onClick={() => setCitiesOpen(true)}>
          <MapPin />
          {myCities.length === 0 ? 'כל הערים' : myCities.length === 1 ? myCities[0] : `${myCities.length} ערים`}
        </button>
        <button
          className="btn btn-ghost bell"
          aria-label={`התראות, ${unread} חדשות`}
          onClick={() => setNoticesOpen(true)}
        >
          <Bell />
          התראות
          {unread > 0 && <b className="bell-count num">{unread}</b>}
        </button>
      </PageHead>

      <div className="comm">
        {/* ----------------------------------------------------- topics */}
        <nav className="comm-rail" aria-label="נושאי הקהילה">
          <RailButton
            active={view === 'all'}
            onClick={() => setView('all')}
            icon={<LayoutGrid />}
            label="כל הנושאים"
            count={scoped.length}
          />
          {topics.map((t) => (
            <RailButton
              key={t.id}
              active={view === t.id}
              onClick={() => setView(t.id)}
              icon={<t.icon />}
              label={t.name}
              count={scoped.filter((it) => it.topicId === t.id).length}
              fresh={scoped.some((it) => it.topicId === t.id && it.fresh)}
            />
          ))}
        </nav>

        {/* ------------------------------------------------------- feed */}
        <div className="comm-feed">
          {myCities.length > 0 && (
            <div className="city-bar">
              <span>מוצג לפי:</span>
              {myCities.map((c) => (
                <button key={c} className="tag tag-gold city-chip" onClick={() => toggleCity(c)} aria-label={`הסרת ${c}`}>
                  {c}
                  <X />
                </button>
              ))}
              <button className="city-clear" onClick={() => setMyCities([])}>
                הצגת כל הארץ
              </button>
            </div>
          )}

          {!topic || topic.compose ? (
            <form className="card composer" onSubmit={submit}>
              <div className="composer-top">
                <Avatar src={me.avatar} name={me.name} size={44} ring />
                <label className="sr-only" htmlFor="composer">
                  כתיבת פוסט
                </label>
                <textarea
                  id="composer"
                  className="composer-input"
                  rows={2}
                  placeholder={
                    draftTopic === 'knowledge'
                      ? 'יש שאלה? משא ומתן, בלעדיות, פולואפ למוכרים...'
                      : draftTopic === 'wins'
                        ? 'סגרת עסקה? ספרו לנו'
                        : 'מה חדש אצלך בשטח?'
                  }
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
              </div>
              <div className="composer-bottom">
                <div className="composer-topics" role="group" aria-label="נושא הפוסט">
                  {composeTopics.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`tag${draftTopic === t.id ? ' tag-gold' : ''}`}
                      aria-pressed={draftTopic === t.id}
                      onClick={() => setDraftTopic(t.id)}
                    >
                      <t.icon />
                      {t.short}
                    </button>
                  ))}
                </div>
                <button className="btn btn-gold btn-sm" disabled={!draft.trim()}>
                  <Send />
                  פרסום
                </button>
              </div>
            </form>
          ) : (
            <div className="card crm-hint">
              <span className="icon-badge">
                <topic.icon />
              </span>
              <div>
                <strong>הודעות בנושא הזה נוצרות ישירות מה-CRM</strong>
                <span>
                  {topic.id === 'seeking'
                    ? 'בוחרים לקוח, לוחצים "פרסם בקהילה", והבקשה נשמרת כאן. בלי שם ובלי טלפון של הלקוח.'
                    : topic.id === 'coop'
                      ? 'מסמנים שת"פ על נכס, והוא הופך להודעה כאן עם תמונה, אזור, חדרים ומחיר.'
                      : 'בוחרים לקוח או נכס, מציינים את עיר היעד, וההפניה מתפרסמת כאן.'}
                </span>
              </div>
              <Link to="/app/crm" className="btn btn-gold btn-sm">
                <Share2 />
                פרסום מה-CRM
              </Link>
            </div>
          )}

          <div className="ci-list">
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((it) => (
                <motion.div
                  key={it.id}
                  layout
                  initial={{ opacity: 0, y: 26, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <CommunityCard item={it} match={matchFor(it)} />
                </motion.div>
              ))}
            </AnimatePresence>
            {visible.length === 0 && (
              <div className="empty card">
                <Search />
                <strong>אין כרגע הודעות בנושא הזה בערים שבחרת</strong>
                <span>אפשר להרחיב את רשימת הערים או לעבור לנושא אחר.</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setMyCities([])}>
                  הצגת כל הארץ
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------- side */}
        <aside className="comm-side">
          <section className="card card-pad">
            <div className="block-head">
              <h2>הבקשות השמורות שלי</h2>
              <Radar className="side-radar" />
            </div>
            {mySearches.length === 0 ? (
              <p className="side-empty">
                עדיין לא שמרת בקשת חיפוש. מפרסמים לקוח מה-CRM בנושא "מחפש לקונה", והמערכת תתריע כשיתפרסם נכס מתאים.
              </p>
            ) : (
              <ul className="saved-list">
                {mySearches.map((s) => (
                  <li key={s.id}>
                    <strong>{s.title}</strong>
                    <span>
                      {s.search!.cities.join(', ')} · {roomsLabel(s.search!)} · עד {formatPriceShort(s.search!.budget)}
                    </span>
                    <em>
                      <i aria-hidden />
                      פעילה, מחפשת התאמות
                    </em>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/app/crm" className="link-more">
              פרסום בקשה מה-CRM
            </Link>
          </section>

          <section className="card card-pad">
            <div className="block-head">
              <h2>התראות אחרונות</h2>
              {unread > 0 && <span className="tag tag-gold num">{unread} חדשות</span>}
            </div>
            <ul className="notice-list">
              {notices.slice(0, 4).map((n) => (
                <li key={n.id} className={n.read ? '' : 'is-unread'}>
                  <button onClick={() => setParams({ topic: n.topicId, item: n.itemId }, { replace: true })}>
                    <span className={`notice-icon kind-${n.kind}`}>{n.kind === 'match' ? <Sparkles /> : <MessageCircle />}</span>
                    <span className="notice-main">
                      <strong>{n.title}</strong>
                      <span>{n.text}</span>
                      <time>{n.time}</time>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {/* ------------------------------------------------- cities picker */}
      <Modal
        open={citiesOpen}
        onClose={() => setCitiesOpen(false)}
        title="הערים שלי"
        subtitle="בוחרים עיר אחת או כמה ערים, ורואים רק מה שרלוונטי אליהן."
      >
        <div className="modal-body">
          <div className="city-grid">
            {cities.map((c) => {
              const on = myCities.includes(c)
              return (
                <button key={c} className={`city-opt${on ? ' is-on' : ''}`} role="checkbox" aria-checked={on} onClick={() => toggleCity(c)}>
                  <span className="pick-check">{on && <Check />}</span>
                  {c}
                  <b className="num">{items.filter((it) => it.city === c).length}</b>
                </button>
              )
            })}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-gold" onClick={() => setCitiesOpen(false)}>
            {myCities.length === 0 ? 'הצגת כל הארץ' : `הצגת ${myCities.length} ערים`}
          </button>
          {myCities.length > 0 && (
            <button className="btn btn-quiet" onClick={() => setMyCities([])}>
              ניקוי
            </button>
          )}
        </div>
      </Modal>

      {/* --------------------------------------------------- notifications */}
      <Modal
        open={noticesOpen}
        onClose={() => {
          setNoticesOpen(false)
          markNoticesRead()
        }}
        title="התראות"
        subtitle="תגובות לפוסטים שלך והתאמות לבקשות ולנכסים שפרסמת."
      >
        <div className="modal-body">
          <ul className="notice-list notice-list-lg">
            {notices.map((n) => (
              <li key={n.id} className={n.read ? '' : 'is-unread'}>
                <button
                  onClick={() => {
                    setNoticesOpen(false)
                    markNoticesRead()
                    setParams({ topic: n.topicId, item: n.itemId }, { replace: true })
                  }}
                >
                  <span className={`notice-icon kind-${n.kind}`}>{n.kind === 'match' ? <Sparkles /> : <MessageCircle />}</span>
                  <span className="notice-main">
                    <strong>{n.title}</strong>
                    <span>{n.text}</span>
                    <time>{n.time}</time>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </>
  )
}

function RailButton({
  active,
  onClick,
  icon,
  label,
  count,
  fresh,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count: number
  fresh?: boolean
}) {
  return (
    <button className={`rail-btn${active ? ' is-active' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}>
      {active && (
        <motion.span layoutId="rail-active" className="rail-pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />
      )}
      <span className="rail-icon">{icon}</span>
      <span className="rail-label">{label}</span>
      <b className={`rail-count num${fresh ? ' is-fresh' : ''}`}>{count}</b>
    </button>
  )
}
