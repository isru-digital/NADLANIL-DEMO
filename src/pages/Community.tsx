import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  Camera,
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
import { brokerById, brokers, cities, fitsSearch, formatPriceShort, inFeed, inStories, roomsLabel, sortFeed } from '../data/demo'
import type { CommunityItem } from '../data/demo'
import { GROUPS, KINDS, kindFits, searchGroup } from '../config/propertyTypes'
import type { PropGroup } from '../config/propertyTypes'
import { hoodOf, propertyKind } from '../community/match'
import { MoneyInput } from '../components/MoneyInput'
import { RangeSlider } from '../components/RangeSlider'
import { nameKey } from '../config/places'
import { streetOf } from '../community/place'
import { Toggle } from '../components/Toggle'
import { shrinkPhoto } from '../green/PhotoPicker'
import '../styles/post-form.css'
import { useStore } from '../store'
import { signedIn } from '../auth/session'
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

/**
 * The filters of properties and of buyers: city, rooms, money and sale or rent. Empty means "all".
 * The money is a range since 22.11.2026 (Itzik: two boxes, the least and the most, written like the price of a
 * property, with quick ranges beside them). Both are plain numbers as text; "" is "no end on this side".
 */
type Filter = { city: string; rooms: string; priceMin: string; priceMax: string; deal: '' | 'sale' | 'rent'; renewal: boolean; kind: string; hood: string }
const NO_FILTER: Filter = { city: '', rooms: '', priceMin: '', priceMax: '', deal: '', renewal: false, kind: '', hood: '' }
/** a neighbourhood in the filter: "city|key", the key being one way of writing its name (config/places.ts) */
const hoodValue = (city: string, hood: string) => `${city}|${nameKey(hood)}`
/** the kind of property in the filter: "home|דירה" is one kind, "home|" is the whole group */
const kindKey = (group: PropGroup, kind = '') => `${group}|${kind}`
const readKind = (key: string) => {
  const [group, kind] = key.split('|') as [PropGroup, string]
  return { group, kind }
}
/** the quick ranges beside the two boxes: [what it is called, the least, the most] ("" = no end on that side) */
const SALE_BANDS: [label: string, min: string, max: string][] = [
  ['עד 2 מיליון', '', '2000000'],
  ['2 עד 4 מיליון', '2000000', '4000000'],
  ['4 עד 7 מיליון', '4000000', '7000000'],
  ['7 מיליון ומעלה', '7000000', ''],
]
const RENT_BANDS: [label: string, min: string, max: string][] = [
  ['עד 4,000', '', '4000'],
  ['4,000 עד 6,000', '4000', '6000'],
  ['6,000 עד 9,000', '6000', '9000'],
  ['9,000 ומעלה', '9000', ''],
]
/** the ends of the small slider above the two boxes (23.11.2026). An amount written by hand may pass them */
const SALE_TOP = 10_000_000
const RENT_TOP = 15_000
const ROOMS = ['2', '3', '4', '5']

/** does a property or a buyer's search pass the filter? */
function passes(it: CommunityItem, f: Filter) {
  if (it.property) {
    const p = it.property
    const rooms = parseFloat(p.rooms)
    if (f.city && it.city !== f.city) return false
    if (f.hood && hoodValue(it.city, hoodOf(p)) !== f.hood) return false
    if (f.kind) {
      const want = readKind(f.kind)
      const has = propertyKind(p, it.title)
      if (has.group !== want.group || (want.kind && has.kind !== want.kind)) return false
    }
    if (f.renewal && !p.renewal) return false
    if (f.deal && (p.deal ?? 'sale') !== f.deal) return false
    if (f.rooms && (f.rooms === '5' ? rooms < 5 : Math.floor(rooms) !== Number(f.rooms))) return false
    // a price is a sale price unless "השכרה" is chosen, so a rent never passes a sale price
    if ((f.priceMin || f.priceMax) && (p.deal ?? 'sale') !== (f.deal || 'sale')) return false
    if (f.priceMin && p.price < Number(f.priceMin)) return false
    if (f.priceMax && p.price > Number(f.priceMax)) return false
    return true
  }
  if (it.search) {
    const s = it.search
    if (f.city && !s.cities.includes(f.city)) return false
    if (f.hood && !(s.neighborhoods ?? []).some((h) => s.cities.some((c) => hoodValue(c, h) === f.hood))) return false
    // a buyer who looks for this kind of property (a buyer who named no kind takes every kind of the group)
    if (f.kind) {
      const want = readKind(f.kind)
      if (searchGroup(s) !== want.group || (want.kind && !kindFits({ group: want.group, kind: want.kind }, s.kinds, want.group))) return false
    }
    if (f.deal && (s.deal ?? 'sale') !== f.deal) return false
    if (f.rooms && (f.rooms === '5' ? s.roomsMax < 5 : Number(f.rooms) < s.roomsMin || Number(f.rooms) > s.roomsMax)) return false
    if ((f.priceMin || f.priceMax) && (s.deal ?? 'sale') !== (f.deal || 'sale')) return false
    if (f.priceMin && s.budget < Number(f.priceMin)) return false
    if (f.priceMax && s.budget > Number(f.priceMax)) return false
    return true
  }
  return true
}

const demoPhotos = ['img/win-01.webp', 'img/prop-07.webp', 'img/prop-05.webp', 'img/prop-01.webp']

export default function Community() {
  const [params, setParams] = useSearchParams()
  const { items: everything, myCities, setMyCities, notices, markNoticesRead, clearFresh, addItem, toast, crm } = useStore()
  // the feed and every list made of it hold posts only: a story that was not also published as a post is not in them.
  // The order is newest first, always (22.11.2026): what was lifted by "הקפצה למעלה" counts as published then.
  const items = useMemo(() => sortFeed(everything.filter(inFeed)), [everything])
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
  // what was typed in the box of the cities picker, and the cities it leaves
  const [cityFind, setCityFind] = useState('')
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
  const [composer, setComposer] = useState<{ topicId: TopicId; photo?: boolean; story?: boolean } | null>(null)
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
  // the row of stories: what was published as a story (and what was there before the two were told apart)
  const stories = useMemo(() => everything.filter((it) => inCities(it) && inStories(it)), [everything, myCities]) // eslint-disable-line react-hooks/exhaustive-deps

  // "new" highlight settles after a while
  useEffect(() => {
    if (!everything.some((c) => c.fresh)) return
    const t = window.setTimeout(clearFresh, 12000)
    return () => window.clearTimeout(t)
  }, [everything, clearFresh])

  // deep link from an alert: bring the post into view
  useEffect(() => {
    if (!focusId) return
    const t = window.setTimeout(() => {
      document.getElementById(`ci-${focusId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 450)
    return () => window.clearTimeout(t)
  }, [focusId, view])

  /**
   * The cities of the filter (Itzik 22.11.2026). Removing the last one used to leave nothing to press, and no city to
   * come back to: an empty list means the whole country, which is also where a broker starts, so the feed cannot tell
   * the two apart by itself. `emptied` remembers that the broker emptied the list here, and only then the gentle line
   * with "הוספת עיר" takes the row's place. Adding a city puts the row back.
   */
  const [emptied, setEmptied] = useState(false)
  const toggleCity = (c: string) => {
    const next = myCities.includes(c) ? myCities.filter((x) => x !== c) : [...myCities, c]
    setEmptied(next.length === 0)
    setMyCities(next)
  }
  const clearCities = () => {
    setEmptied(true)
    setMyCities([])
  }
  // one letter or more narrows the list; a city already chosen stays in it, with its tick, so it can be removed there
  const cityHits = useMemo(() => {
    const typed = cityFind.trim()
    return typed ? cities.filter((c) => c.includes(typed)) : cities
  }, [cityFind])
  // the box starts empty every time the picker opens
  useEffect(() => {
    if (!citiesOpen) setCityFind('')
  }, [citiesOpen])
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
  const openComposer = (topicId?: TopicId, photo?: boolean, story?: boolean) =>
    setComposer({ topicId: topicId ?? (topic?.compose ? topic.id : 'posts'), photo, story })

  const publish = (topicId: TopicId, body: string, image: string | undefined, show: 'feed' | 'story' | 'both') => {
    addItem({
      id: `u${Date.now()}`,
      topicId,
      authorId: me.id,
      // the example user works in תל אביב. A real person's post carries their own first city, or none (19.11.2026)
      city: signedIn ? me.area : 'תל אביב',
      time: 'עכשיו',
      body,
      likes: 0,
      comments: [],
      image,
      fresh: true,
      show,
    })
    setComposer(null)
    // a story is seen in the row of stories, which is at the top of the whole feed
    setView(show === 'story' || view === 'all' ? 'all' : topicId)
    toast(show === 'story' ? 'הסטורי עלה. הוא מופיע בשורת הסטורי בלבד' : show === 'both' ? `פורסם בנושא "${topicById(topicId).name}", וגם כסטורי` : `פורסם בנושא "${topicById(topicId).name}"`)
    if (show !== 'feed') window.setTimeout(() => document.querySelector('.stories')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 350)
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
              <span>{[me.title, me.area].filter(Boolean).join(' · ')}</span>
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
            <div className="stories" aria-label="סטורי">
              <button className="story story-add" onClick={() => openComposer('posts', true, true)} data-act="new-story">
                <img src={asset(me.avatar)} alt="" />
                <span className="story-plus">
                  <Plus />
                </span>
                <strong>סטורי חדש</strong>
              </button>
              {stories.map((s, i) => {
                const b = brokerById(s.authorId)
                return (
                  <button key={s.id} className="story" onClick={() => setStory(i)} aria-label={`סטורי מאת ${b.name}`} data-story={s.id}>
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
              hoods={(() => {
                const seen = new Map<string, { value: string; label: string; city: string }>()
                for (const it of items.filter((x) => x.topicId === view)) {
                  const pairs = it.property ? [[it.city, hoodOf(it.property)]] : (it.search?.neighborhoods ?? []).map((h) => [it.search!.cities[0] ?? it.city, h])
                  for (const [c, h] of pairs) if (h && c && !seen.has(hoodValue(c, h))) seen.set(hoodValue(c, h), { value: hoodValue(c, h), label: h, city: c })
                }
                return [...seen.values()].sort((a, b) => a.city.localeCompare(b.city, 'he') || a.label.localeCompare(b.label, 'he'))
              })()}
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
            <div className="city-bar" data-city-bar>
              <span>מוצג לפי:</span>
              {q && (
                <button className="tag tag-blue city-chip" onClick={() => setQuery('')}>
                  "{q}"
                  <X />
                </button>
              )}
              {myCities.map((c) => (
                <button key={c} className="tag tag-gold city-chip" onClick={() => toggleCity(c)} aria-label={`הסרת ${c}`} data-city-chip={c}>
                  {c}
                  <X />
                </button>
              ))}
              {/* a city that was removed comes back from here (22.11.2026): the list of the platform's cities, with a
                  box to type in, the way the streets are picked */}
              <button className="city-add" onClick={() => setCitiesOpen(true)} data-act="add-city">
                <Plus />
                הוספת עיר
              </button>
              {myCities.length > 0 && (
                <button className="city-clear" onClick={clearCities}>
                  הצגת כל הארץ
                </button>
              )}
            </div>
          )}
          {/* the broker removed the last city: one gentle line, and the way back */}
          {myCities.length === 0 && emptied && (
            <div className="city-none" role="status" data-city-none>
              <MapPin aria-hidden />
              <p>
                אין עיר בסינון, ומוצג כל הארץ. אפשר להוסיף עיר ולראות רק מה שרלוונטי אליה.
              </p>
              <button className="city-add" onClick={() => setCitiesOpen(true)} data-act="add-city-empty">
                <Plus />
                הוספת עיר
              </button>
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
          {/* typing narrows the list (22.11.2026), as in the picking of a street: the platform's cities are many, and
              on a phone a long list is a long scroll */}
          <label className="city-find">
            <Search aria-hidden />
            <span className="sr-only">חיפוש עיר</span>
            <input
              type="search"
              className="input"
              placeholder="חיפוש עיר"
              value={cityFind}
              onChange={(e) => setCityFind(e.target.value)}
              autoComplete="off"
              data-f="city-find"
            />
            {cityFind && (
              <button type="button" aria-label="ניקוי החיפוש" onClick={() => setCityFind('')}>
                <X />
              </button>
            )}
          </label>
          <div className="city-grid" data-city-list>
            {cityHits.map((c) => {
              const on = myCities.includes(c)
              return (
                <button key={c} className={`city-opt${on ? ' is-on' : ''}`} role="checkbox" aria-checked={on} onClick={() => toggleCity(c)} data-city-opt={c}>
                  <span className="pick-check">{on && <Check />}</span>
                  {c}
                  <b className="num">{items.filter((it) => it.city === c).length}</b>
                </button>
              )
            })}
          </div>
          {cityHits.length === 0 && <p className="city-empty">לא נמצאה עיר בשם הזה. אפשר לנקות את החיפוש ולבחור מהרשימה.</p>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-gold" onClick={() => setCitiesOpen(false)}>
            {myCities.length === 0 ? 'הצגת כל הארץ' : `הצגת ${myCities.length} ערים`}
          </button>
          {myCities.length > 0 && (
            <button className="btn btn-quiet" onClick={clearCities}>
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

function FilterBar({ kind, filter, onChange, count, cities, hoods }: { kind: 'properties' | 'buyers'; filter: Filter; onChange: (f: Filter) => void; count: number; cities: string[]; hoods: { value: string; label: string; city: string }[] }) {
  const set = (patch: Partial<Filter>) => onChange({ ...filter, ...patch })
  const rentNow = filter.deal === 'rent'
  const bands = rentNow ? RENT_BANDS : SALE_BANDS
  const money = rentNow ? 'שכירות לחודש' : kind === 'buyers' ? 'תקציב' : 'מחיר'
  // what the handles say in words: "הכול", "עד 4 מ' ₪", "מ-2 מ' ₪ ומעלה", "2 מ' ₪ עד 4 מ' ₪"
  const short = (s: string) => (rentNow ? `${Number(s).toLocaleString('he-IL')} ₪` : formatPriceShort(Number(s)))
  const rangeWords = !filter.priceMin && !filter.priceMax ? `כל ה${money === 'מחיר' ? 'מחירים' : 'סכומים'}` : !filter.priceMin ? `עד ${short(filter.priceMax)}` : !filter.priceMax ? `מ-${short(filter.priceMin)} ומעלה` : `${short(filter.priceMin)} עד ${short(filter.priceMax)}`
  const on = filter.city || filter.rooms || filter.priceMin || filter.priceMax || filter.deal || filter.renewal || filter.kind || filter.hood
  return (
    <section className="flt" aria-label={kind === 'properties' ? 'סינון נכסים' : 'סינון קונים'} data-filters={kind}>
      <label>
        <span>עיר</span>
        <select value={filter.city} onChange={(e) => set({ city: e.target.value, hood: filter.hood && e.target.value && !filter.hood.startsWith(`${e.target.value}|`) ? '' : filter.hood })} data-filter="city">
          <option value="">כל הערים</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      {/* the neighbourhoods of the posts in this room, written one way (22.11.2026); of the city picked, when there is one */}
      {hoods.length > 0 && (
        <label>
          <span>שכונה</span>
          <select value={filter.hood} onChange={(e) => set({ hood: e.target.value })} data-filter="hood">
            <option value="">כל השכונות</option>
            {hoods
              .filter((h) => !filter.city || h.city === filter.city)
              .map((h) => (
                <option key={h.value} value={h.value}>
                  {filter.city ? h.label : `${h.label}, ${h.city}`}
                </option>
              ))}
          </select>
        </label>
      )}
      {/* the same two lists as in the property form: the whole group, or one kind of it */}
      <label>
        <span>סוג נכס</span>
        <select value={filter.kind} onChange={(e) => set({ kind: e.target.value })} data-filter="kind">
          <option value="">כל הסוגים</option>
          {GROUPS.map((g) => (
            <optgroup key={g.id} label={g.label}>
              <option value={kindKey(g.id)}>כל ה{g.label}</option>
              {KINDS[g.id].map((k) => (
                <option key={k} value={kindKey(g.id, k)}>
                  {k}
                </option>
              ))}
            </optgroup>
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
      {/* the money: two boxes written by hand, and the usual ranges in one tap (22.11.2026, in place of one list) */}
      <div className="flt-money" data-filter="price">
        <span className="flt-money-name" id="flt-money-name">
          {filter.deal === 'rent' ? 'שכירות לחודש' : kind === 'buyers' ? 'תקציב' : 'מחיר'}
        </span>
        {/* the same range, dragged: whichever is touched, the boxes and the handles say the same thing */}
        <RangeSlider
          id="price"
          max={rentNow ? RENT_TOP : SALE_TOP}
          step={rentNow ? 250 : 100_000}
          from={filter.priceMin ? Number(filter.priceMin) : null}
          to={filter.priceMax ? Number(filter.priceMax) : null}
          onChange={(a, b) => set({ priceMin: a ? String(a) : '', priceMax: b ? String(b) : '' })}
          text={rangeWords}
          fromLabel={`${money}, החל מ`}
          toLabel={`${money}, עד`}
          say={(n, top) => (top ? `${formatPriceShort(n)} ומעלה` : n === 0 ? 'בלי מינימום' : formatPriceShort(n))}
        />
        <div className="flt-money-pair" role="group" aria-labelledby="flt-money-name">
          <label className="flt-money-one">
            <span>החל מ</span>
            <MoneyInput value={Number(filter.priceMin) || 0} onValue={(n) => set({ priceMin: n ? String(n) : '' })} label={`${money}, החל מ`} placeholder="הכול" name="price-min" />
          </label>
          <label className="flt-money-one">
            <span>עד</span>
            <MoneyInput value={Number(filter.priceMax) || 0} onValue={(n) => set({ priceMax: n ? String(n) : '' })} label={`${money}, עד`} placeholder="הכול" name="price-max" />
          </label>
        </div>
        <div className="flt-bands" role="group" aria-label={`טווחים של ${money}`}>
          {bands.map(([label, min, max]) => {
            const on = filter.priceMin === min && filter.priceMax === max
            return (
              <button key={label} type="button" aria-pressed={on} data-band={label} onClick={() => set(on ? { priceMin: '', priceMax: '' } : { priceMin: min, priceMax: max })}>
                {label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flt-deal" role="group" aria-label="מכירה או השכרה">
        {(
          [
            ['', 'הכול'],
            ['sale', 'מכירה'],
            ['rent', 'השכרה'],
          ] as const
        ).map(([v, label]) => (
          <button key={v} type="button" aria-pressed={filter.deal === v} data-deal={v || 'all'} onClick={() => set({ deal: v, priceMin: '', priceMax: '' })}>
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

/**
 * A post, or a story (Itzik 22.11.2026). The two are separate: a post is in the feed, a story is a picture in the row
 * of stories. One small switch in each puts it in the other place too, and it is off unless the broker turns it on.
 */
function ComposerModal({
  state,
  onClose,
  onPublish,
  hasCrmProperties,
  onPickProperty,
}: {
  state: { topicId: TopicId; photo?: boolean; story?: boolean } | null
  onClose: () => void
  onPublish: (topicId: TopicId, body: string, image: string | undefined, show: 'feed' | 'story' | 'both') => void
  hasCrmProperties: boolean
  onPickProperty: () => void
}) {
  const me = brokerById(CURRENT_BROKER_ID)
  const composeTopics = topics.filter((t) => t.compose)
  const [topicId, setTopicId] = useState<TopicId>('posts')
  const [body, setBody] = useState('')
  const [image, setImage] = useState<string | undefined>()
  const [photos, setPhotos] = useState(false)
  // a story or a post (kept here, so the window does not change its face while it closes)
  const [story, setStory] = useState(false)
  // the second place: a story that is a post too, a post that is a story too. Off unless it is turned on
  const [also, setAlso] = useState(false)
  const [miss, setMiss] = useState(false)
  const [busy, setBusy] = useState(false)
  const [photoErr, setPhotoErr] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!state) return
    setTopicId(state.topicId)
    setBody('')
    setImage(undefined)
    setPhotos(!!state.photo || !!state.story)
    setStory(!!state.story)
    setAlso(false)
    setMiss(false)
    setBusy(false)
    setPhotoErr('')
    // a story starts from its picture, a post from its words
    const t = window.setTimeout(() => !state.story && area.current?.focus(), 200)
    return () => window.clearTimeout(t)
  }, [state])

  // the broker's own picture, made smaller in the browser before it is kept (like the photos of a property)
  const own = !!image && image.startsWith('data:')
  const pickFile = async (f: File | undefined) => {
    if (!f) return
    if (!f.type.startsWith('image/')) return setPhotoErr('הקובץ הזה הוא לא תמונה. בוחרים תמונה מהגלריה או מצלמים.')
    setBusy(true)
    try {
      setImage(await shrinkPhoto(f))
      setPhotoErr('')
      setMiss(false)
    } catch {
      setPhotoErr('לא הצלחנו לפתוח את התמונה הזאת. אפשר לנסות תמונה אחרת.')
    }
    setBusy(false)
  }

  const asStory = story || also
  const show: 'feed' | 'story' | 'both' = story ? (also ? 'both' : 'story') : also ? 'both' : 'feed'
  const inFeedToo = !story || also
  const send = () => {
    // a story is a picture: without one it is said at the picture, not sent
    if (asStory && !image) {
      setMiss(true)
      setPhotos(true)
      return
    }
    onPublish(topicId, body.trim(), image, show)
  }

  return (
    <Modal open={!!state} onClose={onClose} title={story ? 'סטורי חדש' : 'יצירת פוסט'}>
      <div className="modal-body composer-modal" data-composer={story ? 'story' : 'post'}>
        {story && (
          <p className="pf-story-head">
            <Camera /> סטורי הוא תמונה בשורת הסטורי, בראש הפיד. הוא לא מופיע בפיד עצמו.
          </p>
        )}
        <div className="composer-author">
          <Avatar src={me.avatar} name={me.name} size={44} />
          <div>
            <strong>{me.name}</strong>
            {/* a topic belongs to a post in the feed: a story that is a story only has none */}
            {inFeedToo && (
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
            )}
          </div>
        </div>

        <label className="sr-only" htmlFor="composer-text">
          {story ? 'כמה מילים על התמונה' : 'תוכן הפוסט'}
        </label>
        <textarea
          id="composer-text"
          ref={area}
          className={`composer-area${body.length < 80 && !story ? ' is-big' : ''}`}
          placeholder={
            story
              ? 'כמה מילים על התמונה (לא חובה)'
              : topicId === 'knowledge'
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
              {/* the broker's own picture, from the gallery or the camera */}
              <div className="pf-own-photo">
                <input
                  ref={file}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    void pickFile(e.target.files?.[0])
                    e.target.value = ''
                  }}
                  data-f="post-photo"
                />
                {own && (
                  <span className="pf-shot" data-own-photo>
                    <img src={image} alt="התמונה שנבחרה" />
                    <button type="button" onClick={() => setImage(undefined)} aria-label="הסרת התמונה" data-act="remove-photo">
                      <X />
                    </button>
                  </span>
                )}
                <button type="button" className="pf-upload" onClick={() => file.current?.click()} disabled={busy} data-act="upload-photo">
                  <ImagePlus /> {busy ? 'מכינים את התמונה' : own ? 'תמונה אחרת' : 'העלאת תמונה'}
                </button>
              </div>
              {photoErr && (
                <em className="pf-err" role="alert" data-err="photo">
                  {photoErr}
                </em>
              )}
              {miss && asStory && !image && (
                <em className="pf-err" role="alert" data-err="story-photo">
                  סטורי הוא תמונה. מעלים תמונה, או בוחרים אחת מהדוגמאות.
                </em>
              )}
              <span>או תמונה לדוגמה</span>
              <div>
                {demoPhotos.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={image === p ? 'is-on' : ''}
                    aria-pressed={image === p}
                    aria-label="בחירת תמונה לדוגמה"
                    onClick={() => {
                      setImage(image === p ? undefined : p)
                      setMiss(false)
                    }}
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

        {!story && (
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
        )}

        {/* the one small switch: off, a story is a story only and a post is a post only */}
        {story ? (
          <Toggle id="also-post" on={also} onChange={setAlso} label="לפרסם גם כפוסט בפיד" hint={also ? 'הסטורי יופיע גם כפוסט בפיד, בנושא שנבחר למעלה.' : 'כבוי: הסטורי מופיע בשורת הסטורי בלבד.'} />
        ) : (
          <Toggle
            id="also-story"
            on={also}
            onChange={(v) => {
              setAlso(v)
              // a story needs a picture: the pictures open when it is turned on
              if (v) setPhotos(true)
            }}
            label="להעלות גם כסטורי"
            hint={also ? 'הפוסט יופיע גם בשורת הסטורי, עם התמונה.' : 'כבוי: הפוסט מופיע בפיד בלבד.'}
          />
        )}

        <button className="btn btn-gold btn-block" disabled={story ? busy : !body.trim() || busy} onClick={send} data-act="publish">
          {story ? 'העלאת הסטורי' : 'פרסום'}
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
          aria-label={`סטורי מאת ${author.name}`}
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
              <span className="tag tag-gold">{inFeed(s) ? topicById(s.topicId).name : 'סטורי'}</span>
              {(s.title ?? s.body) && <h3>{s.title ?? s.body}</h3>}
              {s.property && (
                <p className="num">
                  {[s.property.area, streetOf(s.property), s.property.rooms ? `${s.property.rooms} חדרים` : '', formatPriceShort(s.property.price)].filter(Boolean).join(' · ')}
                </p>
              )}
              {/* a story that is a story only has no post to open */}
              {inFeed(s) && (
                <button className="btn btn-gold btn-sm" onClick={() => onOpenPost(s)}>
                  לפוסט המלא
                  <ChevronLeft />
                </button>
              )}
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
