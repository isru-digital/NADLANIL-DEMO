import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Home,
  ImagePlus,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Plus,
  Radar,
  Search,
  Share2,
  Sparkles,
  Trophy,
  UserRound,
  X,
} from 'lucide-react'
import { CURRENT_BROKER_ID, asset } from '../config'
import { topicById, topics } from '../config/topics'
import type { TopicId } from '../config/topics'
import { brokerById, brokers, cities, fitsSearch, formatPriceShort, roomsLabel } from '../data/demo'
import type { CommunityItem } from '../data/demo'
import { useStore } from '../store'
import { actionSlots, communitySlots } from '../config/navExtras'
import FeedSearch from '../community/FeedSearch'
import { Avatar, EASE, Modal } from '../components/ui'
import CommunityCard from '../components/CommunityCard'
import { BuyerPicker, PropertyPicker, ReferralSheet } from '../community/PublishPickers'
import BrokerFinder from '../community/BrokerFinder'
import { VALUE_LINES } from '../community/FeedWelcome'
import type { Intent } from '../community/FeedWelcome'
import { isMutual, matchUi } from '../community/match'
import '../styles/match.css'
import '../styles/community.css'
import '../styles/feed.css'
import '../styles/property.css'

type View = TopicId | 'all'

/** The filters of properties and of buyers: city, rooms, price and sale or rent. Empty means "all". */
type Filter = { city: string; rooms: string; price: string; deal: '' | 'sale' | 'rent'; renewal: boolean }
const NO_FILTER: Filter = { city: '', rooms: '', price: '', deal: '', renewal: false }
const SALE_PRICES = [1500000, 2000000, 2500000, 3000000, 4000000, 6000000, 10000000]
const RENT_PRICES = [4000, 6000, 8000, 10000]
const ROOMS = ['2', '3', '4', '5']

/** does a property or a buyer's search pass the filter? */
function passes(it: CommunityItem, f: Filter) {
  if (it.property) {
    const p = it.property
    const rooms = parseFloat(p.rooms)
    if (f.city && it.city !== f.city) return false
    if (f.renewal && !p.renewal) return false
    if (f.deal && (p.deal ?? 'sale') !== f.deal) return false
    if (f.rooms && (f.rooms === '5' ? rooms < 5 : Math.floor(rooms) !== Number(f.rooms))) return false
    // a price is a sale price unless "השכרה" is chosen, so a rent never passes a sale price
    if (f.price && ((p.deal ?? 'sale') !== (f.deal || 'sale') || p.price > Number(f.price))) return false
    return true
  }
  if (it.search) {
    const s = it.search
    if (f.city && !s.cities.includes(f.city)) return false
    if (f.deal && (s.deal ?? 'sale') !== f.deal) return false
    if (f.rooms && (f.rooms === '5' ? s.roomsMax < 5 : Number(f.rooms) < s.roomsMin || Number(f.rooms) > s.roomsMax)) return false
    if (f.price && ((s.deal ?? 'sale') !== (f.deal || 'sale') || s.budget > Number(f.price))) return false
    return true
  }
  return true
}

const demoPhotos = ['img/win-01.webp', 'img/prop-07.webp', 'img/prop-05.webp', 'img/prop-01.webp']

export default function Community() {
  const [params, setParams] = useSearchParams()
  const { items, myCities, setMyCities, notices, markNoticesRead, clearFresh, addItem, toast, crm } = useStore()
  const me = brokerById(CURRENT_BROKER_ID)
  const firstName = me.name.split(' ')[0]
  const raw = params.get('topic')
  const view: View = topics.some((t) => t.id === raw) ? (raw as TopicId) : 'all'
  const topic = view === 'all' ? null : topicById(view)
  const focusId = params.get('item')

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>(NO_FILTER)
  const filterable = view === 'coop' || view === 'seeking'
  // properties and buyers have their own filters: moving between them starts clean
  useEffect(() => setFilter(NO_FILTER), [view])
  const [citiesOpen, setCitiesOpen] = useState(false)
  const [noticesOpen, setNoticesOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  // the search and the bell are icons of the app's top bar now (community/TopActions.tsx): they come here with
  // ?open=search or ?open=notices, from this screen or from any other
  const ask = params.get('open')
  useEffect(() => {
    if (!ask) return
    if (ask === 'search') setSearchOpen(true)
    if (ask === 'notices') setNoticesOpen(true)
    const next = new URLSearchParams(params)
    next.delete('open')
    setParams(next, { replace: true })
  }, [ask]) // eslint-disable-line react-hooks/exhaustive-deps
  const [composer, setComposer] = useState<{ topicId: TopicId; photo?: boolean } | null>(null)
  const [story, setStory] = useState<number | null>(null)
  const unread = notices.filter((n) => !n.read).length

  const setView = (v: View) => setParams(v === 'all' ? {} : { topic: v }, { replace: true })
  const focus = (topicId: TopicId, itemId: string) => setParams({ topic: topicId, item: itemId }, { replace: true })

  const inCities = (it: CommunityItem) =>
    myCities.length === 0 ||
    it.authorId === me.id ||
    myCities.includes(it.city) ||
    !!it.search?.cities.some((c) => myCities.includes(c)) ||
    (!!it.referral && myCities.includes(it.referral.toCity))

  const scoped = useMemo(() => items.filter(inCities), [items, myCities]) // eslint-disable-line react-hooks/exhaustive-deps
  const q = query.trim()
  const hasWords = (it: CommunityItem) =>
    !q || [it.title ?? '', it.body, it.city, brokerById(it.authorId).name, it.property?.area ?? '', ...(it.search?.wants ?? [])].some((v) => v.includes(q))
  const visible = scoped.filter((it) => (view === 'all' || it.topicId === view) && (!filterable || passes(it, filter)) && hasWords(it))
  // the search screen looks in every room
  const found = scoped.filter(hasWords)

  // which posts fit something of mine
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
  const matches = items.filter((it) => matchFor(it))
  const stories = scoped.filter((it) => it.image)

  // "new" highlight settles after a while
  useEffect(() => {
    if (!items.some((c) => c.fresh)) return
    const t = window.setTimeout(clearFresh, 12000)
    return () => window.clearTimeout(t)
  }, [items, clearFresh])

  // deep link from an alert: bring the post into view
  useEffect(() => {
    if (!focusId) return
    const t = window.setTimeout(() => {
      document.getElementById(`ci-${focusId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 450)
    return () => window.clearTimeout(t)
  }, [focusId, view])

  const toggleCity = (c: string) => setMyCities(myCities.includes(c) ? myCities.filter((x) => x !== c) : [...myCities, c])
  // sharing a property or a buyer: pick from the CRM, or add a new one (saved in the CRM and published)
  const [pick, setPick] = useState<'property' | 'buyer' | 'new-buyer' | 'referral' | null>(null)
  const [refCity, setRefCity] = useState('')
  // the choices of the share sheet at the top of the feed: each goes straight to the form that was already there
  const onIntent = (i: Intent) => {
    if (i === 'property') setPick('property')
    else if (i === 'buyer') setPick('buyer')
    else if (i === 'referral') {
      setRefCity('')
      setPick('referral')
    } else if (i === 'learn') openComposer('knowledge')
    else if (i === 'win') openComposer('wins')
    else openComposer('posts', i === 'photo')
  }
  const newProperty = () => (actionSlots.newCard ? actionSlots.newCard() : setPick('property'))
  const openComposer = (topicId?: TopicId, photo?: boolean) =>
    setComposer({ topicId: topicId ?? (topic?.compose ? topic.id : 'posts'), photo })

  const publish = (topicId: TopicId, body: string, image?: string) => {
    addItem({
      id: `u${Date.now()}`,
      topicId,
      authorId: me.id,
      city: 'תל אביב',
      time: 'עכשיו',
      body,
      likes: 0,
      comments: [],
      image,
      fresh: true,
    })
    setComposer(null)
    setView(view === 'all' ? 'all' : topicId)
    toast(`פורסם בנושא "${topicById(topicId).name}"`)
  }

  const myStats = [
    { label: 'נכסים בקהילה', value: myProperties.length },
    { label: 'חיפושים שמורים', value: mySearches.length },
    { label: 'פוסטים', value: items.filter((it) => it.authorId === me.id && !it.property && !it.search && !it.referral).length },
  ]

  return (
    <div className={`fbx-page${communitySlots.Top ? ' is-light' : ''}`}>
      {/* -------------------------------------------------------- top bar */}
      {/* In the green version these three moved off the page (Itzik 19.11.2026): the search and the cities are the
          search screen, behind the search icon of the app's top bar, and the bell is an icon there too. */}
      {communitySlots.Top && <h1 className="sr-only">קהילה</h1>}
      {!communitySlots.Top && (
      <header className="fbx-top">
        <h1>קהילה</h1>
        <label className="fbx-search">
          <Search />
          <span className="sr-only">חיפוש בקהילה</span>
          <input type="search" placeholder="חיפוש: עיר, מתווך, נכס" value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && (
            <button type="button" aria-label="ניקוי חיפוש" onClick={() => setQuery('')}>
              <X />
            </button>
          )}
        </label>
        <div className="page-head-actions fbx-top-actions">
          <button className="fbx-pill" onClick={() => setCitiesOpen(true)}>
            <MapPin />
            {myCities.length === 0 ? 'כל הערים' : myCities.length === 1 ? myCities[0] : `${myCities.length} ערים`}
          </button>
          <button className="fbx-round bell" aria-label={`התראות, ${unread} חדשות`} onClick={() => setNoticesOpen(true)}>
            <Bell />
            <span className="sr-only">התראות</span>
            {unread > 0 && <b className="bell-count num">{unread}</b>}
          </button>
        </div>
      </header>
      )}

      <div className="fbx">
        {/* ---------------------------------------------- start column */}
        <aside className="fbx-start">
          <section className="fb me-card">
            <div className="me-cover">
              <img src={asset('img/skyline.webp')} alt="" />
            </div>
            <div className="me-body">
              <Avatar src={me.avatar} name={me.name} size={68} ring />
              <strong>{me.name}</strong>
              <span>
                {me.title} · {me.area}
              </span>
              <ul>
                {myStats.map((s) => (
                  <li key={s.label}>
                    <b className="num">{s.value}</b>
                    {s.label}
                  </li>
                ))}
              </ul>
              <Link to="/b/demo" className="me-link">
                הדף העסקי שלי
                <ChevronLeft />
              </Link>
            </div>
          </section>

          <div className="fbx-label">נושאים</div>
          <nav className="comm-rail" aria-label="נושאי הקהילה">
            <RailButton active={view === 'all'} onClick={() => setView('all')} icon={<LayoutGrid />} label="כל הנושאים" count={scoped.length} />
            {topics.map((t) => (
              <RailButton
                key={t.id}
                active={view === t.id}
                onClick={() => setView(t.id)}
                icon={<t.icon />}
                label={t.name}
                tone={t.tone}
                count={scoped.filter((it) => it.topicId === t.id).length}
                fresh={scoped.some((it) => it.topicId === t.id && it.fresh)}
              />
            ))}
          </nav>
        </aside>

        {/* ------------------------------------------------------ feed */}
        <div className="comm-feed">
          {/* the green version's top of the feed: the share line and the rooms (Itzik 19.11.2026: light, the first
              post seen without scrolling) */}
          {communitySlots.Top && <communitySlots.Top items={scoped} view={view} onView={setView as (v: never) => void} onIntent={onIntent} />}
          {/* "מציאת מתווך בעיר אחרת": the referrals room opens with a search of brokers by city */}
          {topic?.id === 'referrals' && communitySlots.Top && (
            <BrokerFinder
              onOpenReferral={(c) => {
                setRefCity(c ?? '')
                setPick('referral')
              }}
            />
          )}
          {topic && !(topic.id === 'referrals' && communitySlots.Top) && (
            <section className={`fb topic-head tone-${topic.tone}`}>
              <span className="topic-head-icon">
                <topic.icon />
              </span>
              <div>
                <h2>{topic.name}</h2>
                <p>{topic.description}</p>
              </div>
              {topic.compose ? (
                <button className="btn btn-gold btn-sm" onClick={() => openComposer(topic.id)}>
                  <Plus />
                  פוסט חדש
                </button>
              ) : topic.id === 'coop' ? (
                <div className="topic-acts">
                  <button className="btn btn-gold btn-sm" onClick={() => setPick('property')} data-act="pick-property">
                    <Home />
                    בחירה מהנכסים הקיימים שלי
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={newProperty} data-act="add-property">
                    <Plus />
                    נכס חדש
                  </button>
                </div>
              ) : topic.id === 'seeking' ? (
                <div className="topic-acts">
                  <button className="btn btn-gold btn-sm" onClick={() => setPick('buyer')} data-act="pick-buyer">
                    <UserRound />
                    בחירת קונה מה-CRM
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPick('new-buyer')} data-act="add-buyer">
                    <Plus />
                    קונה חדש
                  </button>
                </div>
              ) : (
                <Link to="/app/crm" className="btn btn-gold btn-sm">
                  <Share2 />
                  פרסום מה-CRM
                </Link>
              )}
            </section>
          )}

          {!topic && stories.length > 0 && (
            <div className="stories" aria-label="עדכונים אחרונים">
              <button className="story story-add" onClick={() => openComposer('posts', true)}>
                <img src={asset(me.avatar)} alt="" />
                <span className="story-plus">
                  <Plus />
                </span>
                <strong>עדכון חדש</strong>
              </button>
              {stories.map((s, i) => {
                const b = brokerById(s.authorId)
                return (
                  <button key={s.id} className="story" onClick={() => setStory(i)} aria-label={`עדכון מאת ${b.name}`}>
                    <img src={asset(s.image!)} alt="" loading="lazy" />
                    <span className="story-face">
                      <Avatar src={b.avatar} name={b.avatar ? '' : b.name} size={36} ring />
                    </span>
                    <strong>{b.name}</strong>
                  </button>
                )
              })}
            </div>
          )}

          {filterable && (
            <FilterBar
              kind={view === 'coop' ? 'properties' : 'buyers'}
              filter={filter}
              onChange={setFilter}
              count={visible.length}
              cities={[...new Set(items.filter((it) => it.topicId === view).flatMap((it) => (it.search ? it.search.cities : [it.city])))].sort((a, b) => a.localeCompare(b, 'he'))}
            />
          )}

          {/* with the share line at the top (above), this older line would say the same thing twice */}
          {!communitySlots.Top && (!topic || topic.compose) && (
            <section className="fb composer-pill">
              <div className="composer-row">
                <Avatar src={me.avatar} name={me.name} size={42} />
                <button className="composer-fake" onClick={() => openComposer()}>
                  {topic?.id === 'knowledge' ? `יש שאלה, ${firstName}?` : topic?.id === 'wins' ? `סגרת עסקה, ${firstName}?` : `מה חדש אצלך, ${firstName}?`}
                </button>
              </div>
              <div className="composer-quick">
                <button onClick={() => openComposer('posts', true)}>
                  <ImagePlus style={{ color: '#74d3a8' }} />
                  תמונה
                </button>
                <button onClick={() => openComposer('knowledge')}>
                  <HelpCircle style={{ color: '#93b6f9' }} />
                  שאלה
                </button>
                <button onClick={() => openComposer('wins')}>
                  <Trophy style={{ color: '#e6cd92' }} />
                  עסקה שנסגרה
                </button>
                <button onClick={() => setPick('property')} data-act="quick-property">
                  <Share2 style={{ color: '#c3b1f4' }} />
                  נכס לשיתוף
                </button>
              </div>
            </section>
          )}

          {(myCities.length > 0 || q) && (
            <div className="city-bar">
              <span>מוצג לפי:</span>
              {q && (
                <button className="tag tag-blue city-chip" onClick={() => setQuery('')}>
                  "{q}"
                  <X />
                </button>
              )}
              {myCities.map((c) => (
                <button key={c} className="tag tag-gold city-chip" onClick={() => toggleCity(c)} aria-label={`הסרת ${c}`}>
                  {c}
                  <X />
                </button>
              ))}
              {myCities.length > 0 && (
                <button className="city-clear" onClick={() => setMyCities([])}>
                  הצגת כל הארץ
                </button>
              )}
            </div>
          )}

          <div className="ci-list">
            <AnimatePresence initial={false}>
              {visible.flatMap((it, i) => [
                <motion.div
                  key={it.id}
                  className="ci-wrap"
                  initial={{ opacity: 0, y: 26, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <CommunityCard item={it} match={matchFor(it)} />
                </motion.div>,
                // once, after the fourth post of "הכול": the office's quiet post (it left the top of the page)
                ...(communitySlots.Promo && view === 'all' && !q && i === 3 && visible.length > 4 ? [<communitySlots.Promo key="promo" />] : []),
                // now and then, between the posts, one short line on what sharing brings
                ...(communitySlots.Top && i % 5 === 2 && i < visible.length - 1
                  ? [
                      <p key={`v-${i}`} className="feed-value" data-value>
                        {VALUE_LINES[Math.floor(i / 5) % VALUE_LINES.length]}
                      </p>,
                    ]
                  : []),
              ])}
            </AnimatePresence>
            {visible.length === 0 && (
              <div className="empty fb">
                <Search />
                <strong>{q ? 'לא נמצאו פוסטים שמתאימים לחיפוש' : 'אין כרגע פוסטים בנושא הזה בערים שבחרת'}</strong>
                <span>אפשר להרחיב את רשימת הערים או לעבור לנושא אחר.</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setMyCities([])
                    setQuery('')
                  }}
                >
                  הצגת הכול
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------ end column */}
        <aside className="fbx-end">
          <section className={`fb side-card${matches.length > 0 ? ' is-gold' : ''}`}>
            <div className="side-head">
              <h2>התאמות בשבילך</h2>
              <Sparkles />
            </div>
            {matches.length === 0 ? (
              <p className="side-empty">
                כשנכס שפרסמת מתאים לבקשה שמורה, או כשמתפרסם נכס שמתאים ללקוח שלך, ההתאמה תופיע כאן.
              </p>
            ) : (
              <ul className="match-list">
                {matches.slice(0, 3).map((m) => {
                  const b = brokerById(m.authorId)
                  return (
                    <li key={m.id}>
                      <button onClick={() => focus(m.topicId, m.id)}>
                        <Avatar src={b.avatar} name={b.name} size={38} />
                        <span>
                          <strong>{m.title}</strong>
                          <em>
                            {b.name} · {m.city}
                          </em>
                        </span>
                        <ChevronLeft />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="fb side-card">
            <div className="side-head">
              <h2>הבקשות השמורות שלי</h2>
              <Radar className="side-radar" />
            </div>
            {mySearches.length === 0 ? (
              <p className="side-empty">מפרסמים לקוח מה-CRM בנושא "מחפש לקונה", והבקשה נשמרת עד שנמצא נכס.</p>
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
            <button type="button" className="me-link" onClick={() => setPick('buyer')} data-act="side-buyer">
              פרסום קונה בקהילה
              <ChevronLeft />
            </button>
          </section>

          <section className="fb side-card">
            <div className="side-head">
              <h2>התראות</h2>
              {unread > 0 && <span className="tag tag-gold num">{unread} חדשות</span>}
            </div>
            <NoticeList notices={notices.slice(0, 3)} onPick={(n) => focus(n.topicId, n.itemId)} />
          </section>

          <section className="fb side-card">
            <div className="side-head">
              <h2>מחוברים עכשיו</h2>
              <span className="faint num">{brokers.length - 4}</span>
            </div>
            <ul className="contacts">
              {brokers
                .filter((b) => b.id !== me.id)
                .slice(0, 6)
                .map((b) => (
                  <li key={b.id}>
                    <button onClick={() => toast(`הצ'אט עם ${b.name} ייפתח בקרוב`)}>
                      <span className="online-face">
                        <Avatar src={b.avatar} name={b.name} size={34} />
                        <i aria-hidden />
                      </span>
                      <span>
                        <strong>{b.name}</strong>
                        <em>{b.area}</em>
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </section>

        </aside>
      </div>

      {/* ----------------------------------------------------- composer */}
      <ComposerModal
        state={composer}
        onClose={() => setComposer(null)}
        onPublish={publish}
        hasCrmProperties={crm.some((c) => c.kind === 'property')}
        onPickProperty={() => setPick('property')}
      />
      <PropertyPicker open={pick === 'property'} onClose={() => setPick(null)} />
      <ReferralSheet open={pick === 'referral'} initialCity={refCity} onClose={() => setPick(null)} />
      <BuyerPicker open={pick === 'buyer' || pick === 'new-buyer'} startNew={pick === 'new-buyer'} onClose={() => setPick(null)} />

      {/* ------------------------------------------------- the search screen (the green version) */}
      {communitySlots.Top && (
        <FeedSearch
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          query={query}
          onQuery={setQuery}
          cities={cities}
          mine={myCities}
          countIn={(c) => items.filter((it) => it.city === c).length}
          onCity={toggleCity}
          onClearCities={() => setMyCities([])}
          found={found}
          onPick={(it) => {
            setSearchOpen(false)
            focus(it.topicId, it.id)
          }}
          onApply={() => {
            setSearchOpen(false)
            // what was found is from every room, so the feed shows every room
            if ((q || myCities.length > 0) && view !== 'all') setView('all')
          }}
        />
      )}

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
          <NoticeList
            large
            notices={notices}
            onPick={(n) => {
              setNoticesOpen(false)
              markNoticesRead()
              focus(n.topicId, n.itemId)
            }}
          />
        </div>
      </Modal>

      <StoryViewer
        stories={stories}
        index={story}
        onChange={setStory}
        onOpenPost={(s) => {
          setStory(null)
          focus(s.topicId, s.id)
        }}
      />
    </div>
  )
}

/* ============================================================ small parts */

function FilterBar({ kind, filter, onChange, count, cities }: { kind: 'properties' | 'buyers'; filter: Filter; onChange: (f: Filter) => void; count: number; cities: string[] }) {
  const set = (patch: Partial<Filter>) => onChange({ ...filter, ...patch })
  const prices = filter.deal === 'rent' ? RENT_PRICES : SALE_PRICES
  const on = filter.city || filter.rooms || filter.price || filter.deal || filter.renewal
  return (
    <section className="flt" aria-label={kind === 'properties' ? 'סינון נכסים' : 'סינון קונים'} data-filters={kind}>
      <label>
        <span>עיר</span>
        <select value={filter.city} onChange={(e) => set({ city: e.target.value })} data-filter="city">
          <option value="">כל הערים</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>חדרים</span>
        <select value={filter.rooms} onChange={(e) => set({ rooms: e.target.value })} data-filter="rooms">
          <option value="">הכול</option>
          {ROOMS.map((r) => (
            <option key={r} value={r}>
              {r === '5' ? '5 ומעלה' : r}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{filter.deal === 'rent' ? 'שכירות עד' : kind === 'buyers' ? 'תקציב עד' : 'מחיר עד'}</span>
        <select value={filter.price} onChange={(e) => set({ price: e.target.value })} data-filter="price">
          <option value="">כל מחיר</option>
          {prices.map((p) => (
            <option key={p} value={p}>
              {filter.deal === 'rent' ? `${p.toLocaleString('he-IL')} ₪ לחודש` : formatPriceShort(p)}
            </option>
          ))}
        </select>
      </label>
      <div className="flt-deal" role="group" aria-label="מכירה או השכרה">
        {(
          [
            ['', 'הכול'],
            ['sale', 'מכירה'],
            ['rent', 'השכרה'],
          ] as const
        ).map(([v, label]) => (
          <button key={v} type="button" aria-pressed={filter.deal === v} data-deal={v || 'all'} onClick={() => set({ deal: v, price: '' })}>
            {label}
          </button>
        ))}
      </div>
      {kind === 'properties' && (
        <button type="button" className="flt-renew" aria-pressed={filter.renewal} data-filter="renewal" onClick={() => set({ renewal: !filter.renewal })}>
          <span className="flt-box" aria-hidden>
            {filter.renewal && <Check />}
          </span>
          התחדשות עירונית בלבד
        </button>
      )}
      <div className="flt-foot" aria-live="polite">
        <span>
          <b className="num" data-count>
            {count}
          </b>{' '}
          {kind === 'properties' ? 'נכסים' : 'קונים מחפשים'}
        </span>
        {on && (
          <button type="button" onClick={() => onChange(NO_FILTER)}>
            ניקוי סינון
          </button>
        )}
      </div>
    </section>
  )
}

function RailButton({
  active,
  onClick,
  icon,
  label,
  count,
  fresh,
  tone,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  count: number
  fresh?: boolean
  tone?: string
}) {
  return (
    <button
      className={`rail-btn${active ? ' is-active' : ''}${tone ? ` tone-${tone}` : ''}`}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      {active && (
        <motion.span layoutId="rail-active" className="rail-pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />
      )}
      <span className="rail-icon">{icon}</span>
      <span className="rail-label">{label}</span>
      <b className={`rail-count num${fresh ? ' is-fresh' : ''}`}>{count}</b>
    </button>
  )
}

type NoticeT = ReturnType<typeof useStore>['notices'][number]

function NoticeList({ notices, onPick, large }: { notices: NoticeT[]; onPick: (n: NoticeT) => void; large?: boolean }) {
  return (
    <ul className={`notice-list${large ? ' notice-list-lg' : ''}`}>
      {notices.map((n) => (
        <li key={n.id} className={`${n.read ? '' : 'is-unread'}${n.pair ? ' has-pair' : ''}`}>
          <button onClick={() => onPick(n)}>
            <span className={`notice-icon kind-${n.kind}`}>{n.kind === 'match' ? <Sparkles /> : n.kind === 'interest' ? <UserRound /> : <MessageCircle />}</span>
            <span className="notice-main">
              <strong>
                {n.title}
                {n.demo && <em className="notice-demo">דוגמה</em>}
              </strong>
              <span>{n.text}</span>
              <time>{n.time}</time>
            </span>
          </button>
          {n.pair && (
            <button type="button" className="notice-yes" onClick={() => matchUi.answer(n.pair!)} data-act="notice-have">
              {isMutual(n.pair.mine, n.pair.theirs) ? "לצ'אט" : 'יש לי'}
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

/* ================================================================ composer */

function ComposerModal({
  state,
  onClose,
  onPublish,
  hasCrmProperties,
  onPickProperty,
}: {
  state: { topicId: TopicId; photo?: boolean } | null
  onClose: () => void
  onPublish: (topicId: TopicId, body: string, image?: string) => void
  hasCrmProperties: boolean
  onPickProperty: () => void
}) {
  const me = brokerById(CURRENT_BROKER_ID)
  const composeTopics = topics.filter((t) => t.compose)
  const [topicId, setTopicId] = useState<TopicId>('posts')
  const [body, setBody] = useState('')
  const [image, setImage] = useState<string | undefined>()
  const [photos, setPhotos] = useState(false)
  const area = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!state) return
    setTopicId(state.topicId)
    setBody('')
    setImage(undefined)
    setPhotos(!!state.photo)
    const t = window.setTimeout(() => area.current?.focus(), 200)
    return () => window.clearTimeout(t)
  }, [state])

  return (
    <Modal open={!!state} onClose={onClose} title="יצירת פוסט">
      <div className="modal-body composer-modal">
        <div className="composer-author">
          <Avatar src={me.avatar} name={me.name} size={44} />
          <div>
            <strong>{me.name}</strong>
            <div className="composer-topics" role="radiogroup" aria-label="נושא הפוסט">
              {composeTopics.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={topicId === t.id}
                  className={`tag${topicId === t.id ? ' tag-gold' : ''}`}
                  onClick={() => setTopicId(t.id)}
                >
                  <t.icon />
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="sr-only" htmlFor="composer-text">
          תוכן הפוסט
        </label>
        <textarea
          id="composer-text"
          ref={area}
          className={`composer-area${body.length < 80 ? ' is-big' : ''}`}
          placeholder={
            topicId === 'knowledge'
              ? 'מה השאלה? משא ומתן, בלעדיות, פולואפ למוכרים...'
              : topicId === 'wins'
                ? 'ספרו על העסקה שנסגרה'
                : 'מה חדש אצלך בשטח?'
          }
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <AnimatePresence initial={false}>
          {photos && (
            <motion.div
              className="composer-photos"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.26, ease: EASE }}
            >
              <span>בחירת תמונה</span>
              <div>
                {demoPhotos.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={image === p ? 'is-on' : ''}
                    aria-pressed={image === p}
                    aria-label="בחירת תמונה"
                    onClick={() => setImage(image === p ? undefined : p)}
                  >
                    <img src={asset(p)} alt="" />
                    {image === p && (
                      <i>
                        <Check />
                      </i>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="composer-add">
          <span>הוספה לפוסט</span>
          <button type="button" className={photos ? 'is-on' : ''} aria-pressed={photos} onClick={() => setPhotos((p) => !p)} aria-label="תמונה">
            <ImagePlus style={{ color: '#74d3a8' }} />
          </button>
          {hasCrmProperties && (
            <button
              type="button"
              aria-label="שיתוף נכס מהנכסים שלי"
              title="שיתוף נכס מהנכסים שלי"
              onClick={() => {
                onClose()
                onPickProperty()
              }}
            >
              <Share2 style={{ color: '#c3b1f4' }} />
            </button>
          )}
        </div>

        <button className="btn btn-gold btn-block" disabled={!body.trim()} onClick={() => onPublish(topicId, body.trim(), image)}>
          פרסום
        </button>
      </div>
    </Modal>
  )
}

/* ============================================================ story viewer */

const STORY_MS = 5000

function StoryViewer({
  stories,
  index,
  onChange,
  onOpenPost,
}: {
  stories: CommunityItem[]
  index: number | null
  onChange: (i: number | null) => void
  onOpenPost: (s: CommunityItem) => void
}) {
  const open = index != null && !!stories[index]
  const next = useCallback(() => onChange(index != null && index < stories.length - 1 ? index + 1 : null), [index, stories.length, onChange])
  const prev = useCallback(() => onChange(index != null && index > 0 ? index - 1 : index), [index, onChange])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(next, STORY_MS)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChange(null)
      if (e.key === 'ArrowLeft') next()
      if (e.key === 'ArrowRight') prev()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, index, next, prev, onChange])

  const s = open ? stories[index!] : null
  const author = s ? brokerById(s.authorId) : null

  return createPortal(
    <AnimatePresence>
      {s && author && (
        <motion.div
          className="story-scrim"
          role="dialog"
          aria-modal="true"
          aria-label={`עדכון מאת ${author.name}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => e.target === e.currentTarget && onChange(null)}
        >
          <button className="story-nav story-prev" onClick={prev} aria-label="העדכון הקודם" disabled={index === 0}>
            <ChevronRight />
          </button>
          <motion.div
            key={s.id}
            className="story-view"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <img src={asset(s.image!)} alt="" />
            <div className="story-bars" aria-hidden>
              {stories.map((x, i) => (
                <i key={x.id} className={i < index! ? 'is-done' : i === index ? 'is-now' : ''}>
                  <b style={i === index ? { animationDuration: `${STORY_MS}ms` } : undefined} />
                </i>
              ))}
            </div>
            <header>
              <Avatar src={author.avatar} name={author.name} size={40} ring />
              <div>
                <strong>{author.name}</strong>
                <span>
                  {s.time} · {s.city}
                </span>
              </div>
              <button className="icon-btn" onClick={() => onChange(null)} aria-label="סגירה">
                <X />
              </button>
            </header>
            <button className="story-tap story-tap-prev" onClick={prev} aria-label="הקודם" tabIndex={-1} />
            <button className="story-tap story-tap-next" onClick={next} aria-label="הבא" tabIndex={-1} />
            <footer>
              <span className="tag tag-gold">{topicById(s.topicId).name}</span>
              <h3>{s.title ?? s.body}</h3>
              {s.property && (
                <p className="num">
                  {s.property.area} · {s.property.rooms} חדרים · {formatPriceShort(s.property.price)}
                </p>
              )}
              <button className="btn btn-gold btn-sm" onClick={() => onOpenPost(s)}>
                לפוסט המלא
                <ChevronLeft />
              </button>
            </footer>
          </motion.div>
          <button className="story-nav story-next" onClick={next} aria-label="העדכון הבא">
            <ChevronLeft />
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
