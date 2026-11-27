import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, ClipboardPaste, Eye, FileText, Home, ImagePlus, Info, Lock, MessageSquareText, RotateCcw, Save, Search, Send, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { CURRENT_BROKER_ID } from '../config'
import { brokerById, formatPriceShort } from '../data/demo'
import type { CommunityItem, CrmItem } from '../data/demo'
import { useStore } from '../store'
import { Modal } from '../components/ui'
import { greenUi } from './ui'
import type { GreenAsk } from './ui'
import { allExtras, knownCities, parseWhatsapp, sampleMessage, sampleRequest, titleOf } from './whatsapp'
import type { Parsed } from './whatsapp'
import { adNotes, adReport, parseYad2, sampleAd } from './yad2'
import type { Yad2Ad } from './yad2'
import { clientActions } from '../crm/clients'
import { clientKey } from '../community/PublishPickers'
import PhotoPicker from './PhotoPicker'
import { CATEGORIES, commercialExtras } from '../crm/categories'
import type { PropCategory } from '../crm/categories'
import { DEFAULT_KIND, KINDS, closestKind, hasRooms, isKind, kindTitle, oneKind } from '../config/propertyTypes'
import { DESC_MAX, cleanDesc, descProblem } from '../config/propDesc'
import { streetName } from '../community/place'
import { Toggle } from '../components/Toggle'
import { CityFind } from '../components/CityFind'
import CommunityCard from '../components/CommunityCard'
import { topicById } from '../config/topics'
import { PlacePicker } from '../components/PlacePicker'
import { CoopField, PriceField } from './PriceCoop'
import '../styles/green-actions.css'
import '../styles/post-form.css'
import '../styles/crm-15.css'

/**
 * The pop-ups of the actions that work in the browser in the green version: a new CRM card, sharing a post with
 * the community, and "מוואטסאפ למערכת". Everything stays in this browser; nothing is sent anywhere.
 */
type Draft = {
  kind: 'property' | 'request'
  city: string
  rooms: string
  price: string
  extras: string[]
  /** step 1: "מגורים" or "מסחרי" ('' until it is picked); step 2: the kind, one of that group's list */
  category: PropCategory | ''
  ptype: string
  sqm: string
  /** the address: the city, the neighbourhood and the street are shown in the community; the building's number only
      when `showHouseNo` is on; the flat's number stays on the broker's own card */
  hood: string
  street: string
  houseNo: string
  aptNo: string
  /** the names that were added by hand, not picked from the city's lists */
  placeManual: string[]
  showHouseNo: boolean
  /** "להעלות גם כסטורי" */
  asStory: boolean
  /** "עמלת שת"פ" in percent (0 to 1); null until it is chosen, and a property cannot be saved without it */
  coopPct: number | null
  /** parking spaces: null = not chosen yet, 3 = three or more */
  parking: number | null
  renewal: boolean
  /** "מצב הנכס": one of CONDITIONS, or '' until it is picked */
  condition: string
  /** what an ad pasted from Yad2 says and the card has no field for (floor, size, entry, the description): the card's note */
  notes: string
  /** "תיאור הנכס": free words that go up with the property (never a phone, never a client's name) */
  desc: string
}
const emptyDraft: Draft = { kind: 'property', city: 'פתח תקווה', rooms: '4', price: '', extras: [], category: '', ptype: '', sqm: '', hood: '', street: '', houseNo: '', aptNo: '', placeManual: [], showHouseNo: false, asStory: false, coopPct: null, parking: null, renewal: false, condition: '', notes: '', desc: '' }
/** no rooms, a size in square metres: a commercial property, or a plot of land */
const bySize = (d: Draft) => d.kind === 'property' && !!d.category && !hasRooms(d.category, d.ptype || DEFAULT_KIND[d.category])
const toDraft = (p: Parsed): Draft => ({ ...emptyDraft, kind: p.kind, city: p.city || 'פתח תקווה', rooms: p.rooms ? String(p.rooms) : '', price: p.price ? String(p.price) : '', extras: p.extras })
const num = (s: string) => Number(s.replace(/[^\d.]/g, '')) || 0
/** an ad pasted from Yad2, as the new property card. What the ad does not say keeps the card's empty value. */
const fromAd = (ad: Yad2Ad, text: string): Draft => {
  const business = ad.business
  const extras = business ? ad.extras.filter((x) => commercialExtras.includes(x)) : ad.extras
  return {
    ...emptyDraft,
    kind: 'property',
    category: business ? 'business' : 'home',
    // the kind the ad's own words name (a penthouse, a garden flat, a shop...), for the broker to check
    ptype: closestKind(business ? 'business' : 'home', text),
    city: ad.city || emptyDraft.city,
    hood: ad.hood,
    street: ad.street,
    houseNo: ad.houseNo,
    rooms: business ? '' : ad.rooms ? String(Math.min(ad.rooms, 6)) : '',
    sqm: business && ad.sqm ? String(ad.sqm) : '',
    price: ad.price ? String(ad.price) : '',
    parking: ad.parking === null ? null : Math.min(ad.parking, 3),
    renewal: ad.renewal,
    extras,
    notes: adNotes(ad),
  }
}
/** a message pasted into the CRM card: "חניה" becomes one parking space, since the card asks for a number */
const toCard = (p: Parsed, text: string): Draft => {
  // a message from a WhatsApp group is about a home; its kind is read from its words, for the broker to check
  const d: Draft = { ...toDraft(p), ...(p.kind === 'property' ? { category: 'home' as const, ptype: closestKind('home', text) } : {}) }
  return d.extras.includes('חניה') ? { ...d, parking: 1, extras: d.extras.filter((x) => x !== 'חניה') } : d
}

/** The new card is kept as a draft in this browser while it is filled, so nothing is lost if the window closes. */
const DRAFT_KEY = 'nadlanup-crm-draft-v1'
type Saved = { card: Draft; client: string; photos: string[]; at: number }
const readDraft = (): Saved | null => {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as Saved | null
    // a property has one kind: a draft that somehow kept several continues with the first
    return d && d.card ? { ...d, client: d.client ?? '', card: { ...emptyDraft, ...d.card, ptype: oneKind(d.card.ptype) ?? '' }, photos: d.photos ?? [] } : null
  } catch {
    return null
  }
}
const writeDraft = (d: Saved) => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
    return true
  } catch {
    // photos can be too big for the browser's storage: keep the words at least
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, photos: [] }))
      return true
    } catch {
      return false
    }
  }
}
export const clearCrmDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* nothing to clear */
  }
}
const isEmpty = (d: Draft, client: string, photos: string[]) => !client.trim() && !photos.length && JSON.stringify(d) === JSON.stringify(emptyDraft)

/** rooms as big buttons: the usual sizes, and "6+" for six and more */
const ROOMS = ['1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5.5', '6+']
const PARKING: [number, string][] = [
  [0, 'אין'],
  [1, '1'],
  [2, '2'],
  [3, '3+'],
]
/** "מצב הנכס" (Itzik 25.11.2026): five tags, one is picked */
export const CONDITIONS = ['חדש מקבלן', 'חדש עד 5 שנים', 'משופץ', 'שמור', 'דרוש שיפוץ']
/** the cities shown first, before "עוד ערים" */
const FIRST_CITIES = ['תל אביב', 'רמת גן', 'פתח תקווה', 'חיפה', 'ירושלים', 'באר שבע', 'נתניה', 'ראשון לציון']

function CityPick({ city, onPick }: { city: string; onPick: (c: string) => void }) {
  const { myCities } = useStore()
  const [all, setAll] = useState(false)
  // a city found by the search (26.11.2026) is not one of the shortcuts, and still shows as the one picked
  const first = [...new Set([city, ...myCities, ...FIRST_CITIES])].filter((c) => c && (c === city || knownCities.includes(c))).slice(0, 9)
  const shown = all ? [...knownCities].sort((a, b) => a.localeCompare(b, 'he')) : first
  return (
    <div className="field" data-f="city">
      <span className="field-label">עיר</span>
      <div className="ga-picks" role="group" aria-label="עיר">
        {shown.map((c) => (
          <button key={c} type="button" className="ga-pick" aria-pressed={city === c} onClick={() => onPick(c)} data-city={c}>
            {c}
          </button>
        ))}
        <button type="button" className="ga-pick is-more" aria-expanded={all} onClick={() => setAll(!all)} data-act="more-cities">
          {all ? 'פחות ערים' : 'עוד ערים'}
        </button>
      </div>
      <CityFind id="property" picked={city ? [city] : []} onPick={onPick} />
    </div>
  )
}

/** The fields a property or a request is made of; shared by the CRM card and the WhatsApp confirmation. */
/**
 * The fields of a card. `kinds` are the two words of the "מה זה?" choice; without them the choice is not shown at
 * all and the card is a property (Itzik 23.11.2026: a card in the CRM is a property. A client who is looking is
 * added in "לקוחות", where the form asks everything a search needs).
 */
function Fields({ draft, set, kinds, categories = false, full = false, missing = false, missingCoop = false }: { draft: Draft; set: (d: Partial<Draft>) => void; kinds?: [string, string]; categories?: boolean; full?: boolean; missing?: boolean; missingCoop?: boolean }) {
  const property = draft.kind === 'property'
  // a commercial property (and a plot of land) is measured in square metres; a commercial one has its own extras
  const commercial = categories && bySize(draft)
  const business = categories && property && draft.category === 'business'
  // the CRM card asks for parking as a number, so "חניה" leaves the list of extras there
  const extras = (business ? commercialExtras : allExtras).filter((x) => !(full && property && x === 'חניה'))
  // what every broker in the community will see of the address, as it is being typed
  const seen = [draft.hood.trim() ? `${draft.city} - ${draft.hood.trim()}` : draft.city, draft.street.trim() ? `${streetName(draft.street)}${draft.showHouseNo && draft.houseNo.trim() ? ` ${draft.houseNo.trim()}` : ''}` : ''].filter(Boolean).join(', ')
  const roomsOn = (r: string) => (r === '6+' ? num(draft.rooms) >= 6 : draft.rooms === r)
  return (
    <div className="ga-fields">
      {kinds && (
        <div className="field">
          <span className="field-label">מה זה?</span>
          <div className="ga-picks is-two" role="group" aria-label="מה זה">
            <button type="button" className="ga-pick is-big" aria-pressed={property} onClick={() => set({ kind: 'property' })}>
              <Home /> {kinds[0]}
            </button>
            <button type="button" className="ga-pick is-big" aria-pressed={!property} onClick={() => set({ kind: 'request' })}>
              <Search /> {kinds[1]}
            </button>
          </div>
        </div>
      )}
      {categories && property && (
        <div className="field pf-step" data-f="category">
          <span className="field-label">סוג הנכס</span>
          {/* step 1: two big buttons */}
          <div className="pf-groups" role="group" aria-label="מגורים או מסחרי">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className="pf-group"
                aria-pressed={draft.category === c.id}
                data-cat={c.id}
                onClick={() => {
                  if (draft.category === c.id) return
                  // the two lists of extras are different: keep only what the new group also has; a kind that is in
                  // both lists (a plot of land) stays picked, any other one is picked again from the new list
                  const list = c.id === 'home' ? allExtras : commercialExtras
                  set({ category: c.id, ptype: isKind(c.id, draft.ptype) ? draft.ptype : '', extras: draft.extras.filter((x) => list.includes(x)) })
                }}
              >
                <c.icon aria-hidden /> {c.label}
              </button>
            ))}
          </div>
          {/* step 2: the kinds of the group that was picked */}
          <AnimatePresence initial={false} mode="wait">
            {draft.category && (
              <motion.div key={draft.category} className="pf-kinds" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
                <div className="pf-kinds-in" data-f="kinds" data-group={draft.category}>
                  <span id="pf-kinds-label">{draft.category === 'business' ? 'איזה נכס מסחרי?' : 'איזה נכס למגורים?'}</span>
                  <div className="pf-kinds-list" role="group" aria-labelledby="pf-kinds-label">
                    {KINDS[draft.category].map((k) => (
                      <button key={k} type="button" className="pf-kind" aria-pressed={draft.ptype === k} onClick={() => set({ ptype: k })} data-kind={k}>
                        {draft.ptype === k && <Check aria-hidden />}
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {missing && (!draft.category || !draft.ptype) && (
            <em className="pf-err" role="alert" data-err="kind">
              {draft.category ? 'בוחרים איזה נכס זה מהרשימה.' : 'בוחרים קודם: מגורים או מסחרי.'}
            </em>
          )}
        </div>
      )}

      <CityPick city={draft.city} onPick={(city) => set(city === draft.city ? { city } : { city, street: '', hood: '', placeManual: [] })} />

      {full && property && (
        <fieldset className="ga-address" data-f="address">
          <legend className="field-label">הכתובת</legend>
          {/* the street and the neighbourhood from the lists of the city (or the map), one of each (22.11.2026) */}
          <PlacePicker
            id="property"
            cities={[draft.city]}
            value={{ streets: draft.street ? [draft.street] : [], hoods: draft.hood ? [draft.hood] : [], manual: draft.placeManual }}
            onChange={(p) => set({ street: p.streets[0] ?? '', hood: p.hoods[0] ?? '', placeManual: p.manual })}
          />
          <div className="ga-address-row is-two">
            <label className="field is-no">
              <span className="field-sub">מספר בניין</span>
              <input className="input num" inputMode="numeric" value={draft.houseNo} onChange={(e) => set({ houseNo: e.target.value })} placeholder="12" autoComplete="off" enterKeyHint="next" data-f="house" />
            </label>
            <label className="field is-no">
              <span className="field-sub">דירה</span>
              <input className="input num" inputMode="numeric" value={draft.aptNo} onChange={(e) => set({ aptNo: e.target.value })} placeholder="7" autoComplete="off" enterKeyHint="next" data-f="apt" />
            </label>
          </div>
          <Toggle id="house-no" on={draft.showHouseNo} onChange={(showHouseNo) => set({ showHouseNo })} label="להציג מספר בניין" hint={draft.showHouseNo ? 'המתווכים בקהילה יראו גם את מספר הבניין.' : 'כבוי: המתווכים בקהילה רואים את הרחוב, בלי המספר.'} />
          <p className="pf-seen" data-seen aria-live="polite">
            <span>
              <Eye /> כך יראו המתווכים בקהילה
            </span>
            <b>{seen}</b>
          </p>
          <p className="ga-private">
            <Lock /> מספר הדירה והכתובת המלאה נשמרים רק אצלכם, בכרטיס שלכם. שם וטלפון של בעל הנכס לא מתפרסמים אף פעם.
          </p>
        </fieldset>
      )}

      {commercial ? (
        <label className="field">
          <span className="field-label">שטח, במ"ר</span>
          <input className="input" inputMode="numeric" value={draft.sqm} onChange={(e) => set({ sqm: e.target.value })} placeholder="120" data-f="sqm" />
        </label>
      ) : (
        <div className="field" data-f="rooms">
          <span className="field-label">חדרים</span>
          <div className="ga-picks is-rooms" role="group" aria-label="חדרים">
            {ROOMS.map((r) => (
              <button key={r} type="button" className="ga-pick num" aria-pressed={roomsOn(r)} onClick={() => set({ rooms: r === '6+' ? '6' : r })} data-rooms={r}>
                <bdi dir="ltr">{r}</bdi>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* a property: the price on a slider, and "עמלת שת"פ" (a must) right under it; a buyer's budget stays a box */}
      {property ? (
        <>
          <PriceField price={num(draft.price)} onPrice={(n) => set({ price: String(n) })} />
          <CoopField pct={draft.coopPct} price={num(draft.price)} onPct={(coopPct) => set({ coopPct })} missing={missingCoop} />
        </>
      ) : (
        <label className="field">
          <span className="field-label">תקציב, בשקלים</span>
          <input className="input num" inputMode="numeric" value={draft.price} onChange={(e) => set({ price: e.target.value })} placeholder="2650000" data-f="price" />
          {num(draft.price) > 0 && <small className="ga-price-say">{formatPriceShort(num(draft.price))}</small>}
        </label>
      )}

      {full && property && (
        <div className="field" data-f="parking">
          <span className="field-label">חניה</span>
          <div className="ga-seg" role="radiogroup" aria-label="מספר חניות">
            {PARKING.map(([n, label]) => (
              <button key={n} type="button" role="radio" aria-checked={draft.parking === n} className="ga-seg-btn num" onClick={() => set({ parking: n })} data-parking={n}>
                <bdi dir="ltr">{label}</bdi>
              </button>
            ))}
          </div>
        </div>
      )}

      {full && property && (
        <div className="field" data-f="condition">
          <span className="field-label">מצב הנכס</span>
          <div className="ga-picks" role="group" aria-label="מצב הנכס">
            {CONDITIONS.map((c) => (
              <button key={c} type="button" className="ga-pick" aria-pressed={draft.condition === c} onClick={() => set({ condition: draft.condition === c ? '' : c })} data-condition={c}>
                {draft.condition === c && <Check aria-hidden />}
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {full && property && (
        <button type="button" role="switch" aria-checked={draft.renewal} className="ga-renew" onClick={() => set({ renewal: !draft.renewal })} data-f="renewal">
          <span className="ga-renew-box" aria-hidden>
            {draft.renewal && <Check />}
          </span>
          <span className="ga-renew-text">
            <b>מיועד להתחדשות עירונית</b>
            <small>תמ"א 38 או פינוי בינוי. יופיע כתגית בכרטיס ובדף הנכס.</small>
          </span>
        </button>
      )}

      <div className="field">
        <span className="field-label">תוספות</span>
        <div className="ga-picks" role="group" aria-label="תוספות">
          {extras.map((x) => (
            <button
              key={x}
              type="button"
              className="ga-pick"
              aria-pressed={draft.extras.includes(x)}
              onClick={() => set({ extras: draft.extras.includes(x) ? draft.extras.filter((e) => e !== x) : [...draft.extras, x] })}
            >
              {x}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * "תיאור הנכס" (Itzik 27.11.2026): a few free lines, not a must. They show on the property's page and on its post, so
 * the note under the box says what does not belong there, and a phone number or the owner's name is said at the box.
 */
function DescField({ desc, owner, onChange, showProblem }: { desc: string; owner: string; onChange: (v: string) => void; showProblem: boolean }) {
  const problem = descProblem(desc, owner)
  // a phone number is said the moment it is typed; the owner's name only once saving was tried, so typing is not nagged
  const say = problem === 'phone' || (problem === 'name' && showProblem) ? problem : ''
  return (
    <div className="field ga-desc" data-f="desc">
      <label className="field-label" htmlFor="ga-desc">
        תיאור הנכס <small>(לא חובה)</small>
      </label>
      <textarea
        id="ga-desc"
        className="textarea"
        rows={4}
        maxLength={DESC_MAX}
        value={desc}
        onChange={(e) => onChange(e.target.value)}
        placeholder="לדוגמה: דירה מוארת עם שלושה כיווני אוויר, משופצת מהיסוד, קרובה לפארק ולבתי הספר."
        aria-describedby="ga-desc-note"
        aria-invalid={say ? true : undefined}
        data-f="desc-text"
      />
      <div className="ga-desc-foot">
        <p className="ga-desc-note" id="ga-desc-note" data-note="desc">
          <Lock aria-hidden /> התיאור מופיע בדף הנכס ובפוסט בקהילה. בלי טלפון ובלי שם של לקוח.
        </p>
        <span className="ga-desc-count num" aria-hidden data-count>
          {desc.length}/{DESC_MAX}
        </span>
      </div>
      {say && (
        <em className="pf-err" role="alert" data-err="desc">
          {say === 'phone' ? 'יש מספר טלפון בתיאור. מוחקים אותו, והתיאור יישמר.' : 'שם בעל הנכס מופיע בתיאור. מוחקים אותו, והתיאור יישמר.'}
        </em>
      )}
    </div>
  )
}

export default function GreenActions() {
  const { addCrm, addItem, toast } = useStore()
  const navigate = useNavigate()
  const me = brokerById(CURRENT_BROKER_ID)
  const [ask, setAsk] = useState<GreenAsk | null>(null)
  useEffect(() => greenUi.bind(setAsk), [])
  // one stable function: the pop-up puts the focus back on itself whenever this changes, which would pull the
  // cursor out of a text box on every keystroke
  const close = useCallback(() => setAsk(null), [])

  // ---- a new CRM card
  const [card, setCard] = useState<Draft>(emptyDraft)
  const [client, setClient] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [paste, setPaste] = useState('')
  const [pasting, setPasting] = useState(false)
  // what stops the card from being saved, shown at its field: no kind of property, or a story with no photo
  const [cardMiss, setCardMiss] = useState<{ kind?: boolean; coop?: boolean; story?: boolean; desc?: boolean }>({})
  // the WhatsApp confirmation of a property needs its "עמלת שת"פ" too
  const [waMiss, setWaMiss] = useState(false)
  // ---- an ad pasted from Yad2: the text, and what was filled from it
  const [adText, setAdText] = useState('')
  const [adOpen, setAdOpen] = useState(false)
  const [adDone, setAdDone] = useState<(ReturnType<typeof adReport> & { rent: boolean; hadPhone: boolean; hadLink: boolean }) | null>(null)
  // ---- a message from WhatsApp
  const [wa, setWa] = useState('')
  const [waDraft, setWaDraft] = useState<Draft | null>(null)
  const [waPhone, setWaPhone] = useState(false)
  // ---- sharing a post
  const [words, setWords] = useState('')

  // the draft of the new card: restored when the card opens, saved a moment after every change
  const [restored, setRestored] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  useEffect(() => {
    if (!ask) return
    const d = ask.kind === 'card' ? readDraft() : null
    // a draft kept from before the choice was taken out could say "request": a card is a property (23.11.2026)
    setCard(d?.card ? { ...d.card, kind: 'property' } : emptyDraft)
    setClient(d?.client ?? '')
    setPhotos(d?.photos ?? [])
    setRestored(!!d)
    setSavedAt(d?.at ?? null)
    setCardMiss({})
    setPaste('')
    setPasting(false)
    setAdText('')
    setAdOpen(false)
    setAdDone(null)
    setWa('')
    setWaDraft(null)
    setWaPhone(false)
    setWaMiss(false)
    setWords('')
  }, [ask])

  useEffect(() => {
    if (ask?.kind !== 'card') return
    const t = window.setTimeout(() => {
      if (isEmpty(card, client, photos)) return
      const at = Date.now()
      if (writeDraft({ card, client, photos, at })) setSavedAt(at)
    }, 450)
    return () => window.clearTimeout(t)
  }, [ask, card, client, photos])
  const freshCard = () => {
    clearCrmDraft()
    setCard(emptyDraft)
    setClient('')
    setPhotos([])
    setRestored(false)
    setSavedAt(null)
    setAdDone(null)
    setCardMiss({})
  }
  const fillFromAd = () => {
    const ad = parseYad2(adText)
    setCard(fromAd(ad, adText))
    setAdDone({ ...adReport(ad), rent: ad.deal === 'rent', hadPhone: ad.hadPhone, hadLink: ad.hadLink })
    setAdOpen(false)
    setAdText('')
  }

  const saveCard = () => {
    const rooms = num(card.rooms)
    const property = card.kind === 'property'
    // a property needs its kind, and a story needs a picture: said at the field itself, and brought into view
    // the description is read by every broker: one with a phone number or the owner's name in it does not go up
    const miss = { kind: property && (!card.category || !card.ptype), coop: property && card.coopPct === null, desc: property && !!descProblem(card.desc, client), story: property && card.asStory && photos.length === 0 }
    if (miss.kind || miss.coop || miss.desc || miss.story) {
      setCardMiss(miss)
      const first = miss.kind ? '.ga [data-f="category"]' : miss.coop ? '.ga [data-f="coop"]' : miss.desc ? '.ga [data-f="desc"]' : '.ga [data-toggle="as-story"]'
      window.setTimeout(() => document.querySelector(first)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60)
      return
    }
    const group = card.category || 'home'
    const commercial = bySize(card)
    const item: CrmItem = {
      id: `n${Date.now()}`,
      kind: property ? 'property' : 'client',
      title: property ? kindTitle(group, card.ptype, { rooms: rooms || null, sqm: num(card.sqm) || null, city: card.city }) : titleOf(card.kind, rooms || null, card.city),
      // the area is the city and the neighbourhood: this is what the community sees
      area: card.kind === 'property' && card.hood.trim() ? `${card.city} - ${card.hood.trim()}` : card.city,
      city: card.city,
      ...(card.kind === 'property'
        ? {
            neighborhood: card.hood.trim() || undefined,
            street: card.street.trim() || undefined,
            houseNo: card.houseNo.trim() || undefined,
            aptNo: card.aptNo.trim() || undefined,
            placeManual: card.placeManual.length ? card.placeManual : undefined,
            // always a yes or a no: a card that carries this was saved under the rule that the street is shown
            showHouseNo: card.showHouseNo,
            parking: card.parking ?? undefined,
            renewal: card.renewal || undefined,
            condition: card.condition || undefined,
            desc: cleanDesc(card.desc) || undefined,
            extras: card.extras.length ? card.extras : undefined,
            asStory: card.asStory || undefined,
            coopPct: card.coopPct ?? undefined,
          }
        : {}),
      rooms: commercial ? '-' : card.rooms || '-',
      sqm: commercial ? num(card.sqm) || undefined : undefined,
      category: property ? group : undefined,
      ptype: property ? card.ptype : undefined,
      price: num(card.price),
      status: 'new',
      client: client.trim() || (card.kind === 'property' ? 'בעל הנכס' : 'לקוח חדש'),
      // the extras, and what a pasted ad said that has no field of its own (only on the broker's own card)
      note: [card.extras.join(', '), card.kind === 'property' ? card.notes.trim() : ''].filter(Boolean).join('\n'),
      updated: 'נוסף עכשיו',
      // photos belong to a property only; the first one is the card's and the post's picture
      image: card.kind === 'property' ? photos[0] : undefined,
      images: card.kind === 'property' && photos.length ? photos : undefined,
      search: card.kind === 'request' ? { cities: [card.city], roomsMin: Math.floor(rooms) || 1, roomsMax: Math.ceil(rooms) || 6, budget: num(card.price), wants: card.extras } : undefined,
    }
    addCrm(item)
    clearCrmDraft()
    // a client who is looking also joins the clients table (the board holds properties only)
    if (item.kind === 'client') clientActions.add({ name: item.client, type: 'buyer', phone: '', about: item.title, cities: [item.city], rooms: Math.round(rooms) || 0, sum: item.price, crmId: item.id })
    close()
    toast(item.kind === 'client' ? 'הלקוח נוסף לטבלת הלקוחות' : `הכרטיס נוסף ל-CRM, והנכס פורסם בקהילה באזור ${item.city}`)
  }

  const publishWa = () => {
    if (!waDraft) return
    if (waDraft.kind === 'property' && waDraft.coopPct === null) {
      setWaMiss(true)
      window.setTimeout(() => document.querySelector('.ga [data-f="coop"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60)
      return
    }
    const rooms = num(waDraft.rooms)
    const price = num(waDraft.price)
    const id = `w${Date.now()}`
    // a post in the feed, not a story (it has no picture)
    const base = { id, authorId: me.id, city: waDraft.city, time: 'עכשיו', likes: 0, comments: [], fresh: true, show: 'feed' as const }
    // the kind of home the message's own words name, or a flat
    const waKind = closestKind('home', wa)
    const item: CommunityItem =
      waDraft.kind === 'property'
        ? {
            ...base,
            topicId: 'coop',
            title: titleOf('property', rooms || null, waDraft.city),
            body: waDraft.extras.length ? `${waDraft.extras.join(', ')}.` : 'פרטים נוספים אצלי.',
            property: { area: waDraft.city, rooms: waDraft.rooms || '-', price, coopPct: waDraft.coopPct ?? undefined, showPrice: price > 0, kind: waKind, group: 'home', extra: waDraft.extras.length ? waDraft.extras : undefined },
          }
        : {
            ...base,
            topicId: 'seeking',
            title: titleOf('request', rooms || null, waDraft.city),
            body: waDraft.extras.length ? `חשוב לקונה: ${waDraft.extras.join(', ')}.` : 'פרטים נוספים אצלי.',
            search: { cities: [waDraft.city], roomsMin: Math.floor(rooms) || 1, roomsMax: Math.ceil(rooms) || 6, budget: price, wants: waDraft.extras },
          }
    // what goes up to the community is kept in the broker's CRM too: a property on the board, a buyer in the table
    if (waDraft.kind === 'property') {
      const card: CrmItem = {
        id: `c-${id}`,
        kind: 'property',
        title: item.title ?? titleOf('property', rooms || null, waDraft.city),
        area: waDraft.city,
        city: waDraft.city,
        rooms: waDraft.rooms || '-',
        category: 'home',
        ptype: waKind,
        extras: waDraft.extras.length ? waDraft.extras : undefined,
        coopPct: waDraft.coopPct ?? undefined,
        price,
        status: 'new',
        client: 'בעל הנכס',
        note: waDraft.extras.join(', '),
        updated: 'נוסף עכשיו',
      }
      addCrm(card)
      addItem(item, card.id)
    } else {
      const kid = clientActions.add({ name: 'לקוח מוואטסאפ', type: 'buyer', phone: '', about: item.title ?? '', cities: [waDraft.city], rooms: Math.round(rooms) || 0, sum: price, roomsMin: Math.floor(rooms) || 1, roomsMax: Math.ceil(rooms) || 6, must: waDraft.extras })
      addItem(item, clientKey(kid))
    }
    close()
    greenUi.published()
    toast(waDraft.kind === 'property' ? 'הנכס פורסם בקהילה ונשמר ב-CRM' : 'הבקשה פורסמה בקהילה ונשמרה ב-CRM')
    navigate(`/app/community?topic=${item.topicId}&item=${id}`)
  }

  /** the post a share puts in the feed: the window shows this very post before it goes up */
  const sharedPost = (src: CommunityItem, id: string): CommunityItem => ({
    ...src,
    id,
    authorId: me.id,
    time: 'עכשיו',
    likes: 0,
    comments: [],
    fresh: true,
    sourceId: undefined,
    show: 'feed',
    body: `${words.trim() ? `${words.trim()} ` : ''}(שיתוף של פוסט מאת ${brokerById(src.authorId).name}) ${src.body}`,
  })
  const share = () => {
    if (ask?.kind !== 'share') return
    const id = `s${Date.now()}`
    addItem(sharedPost(ask.item, id))
    close()
    toast('השיתוף פורסם בקהילה')
    window.setTimeout(() => document.getElementById(`ci-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 350)
  }

  const shared = ask?.kind === 'share' ? ask.item : null
  // where the shared post goes, in the words of the feed's own tabs (26.11.2026)
  const sharedTo = !shared ? '' : shared.topicId === 'seeking' ? 'בלשונית קונים' : shared.topicId === 'coop' ? 'בלשונית נכסים' : `ב"${topicById(shared.topicId).name}"`
  return (
    <>
      {/* ------------------------------------------------------------ a new CRM card */}
      <Modal open={ask?.kind === 'card'} onClose={close} title="כרטיס חדש ב-CRM" subtitle="הכרטיס נשמר בלוח שלך.">
        <div className="modal-body ga">
          <div className="ga-draft" data-draft={savedAt ? 'saved' : 'idle'} aria-live="polite">
            <Save />
            <span>{restored ? 'המשכנו מהטיוטה ששמרתם' : savedAt ? 'הטיוטה נשמרה אוטומטית' : 'הטיוטה נשמרת אוטומטית בזמן שממלאים'}</span>
            {(restored || savedAt) && (
              <button type="button" onClick={freshCard} data-act="fresh-card">
                <RotateCcw /> להתחיל מחדש
              </button>
            )}
          </div>
          {adOpen ? (
            <div className="ga-paste ga-ad" data-panel="yad2">
              <ol className="ga-ad-steps">
                <li>פותחים את המודעה שלכם ביד2, מסמנים את כל הטקסט ומעתיקים</li>
                <li>מדביקים כאן, ואנחנו ממלאים את הטופס</li>
                <li>בודקים, מוסיפים את התמונות שלכם ושומרים</li>
              </ol>
              <label className="field">
                <span className="field-label">הטקסט של המודעה</span>
                <textarea className="textarea" rows={6} value={adText} onChange={(e) => setAdText(e.target.value)} placeholder="מדביקים כאן את הטקסט שהעתקתם מהמודעה" data-f="ad-text" />
              </label>
              <p className="ga-ad-safe">
                <ShieldCheck /> אנחנו לא נכנסים לאתר יד2 ולא לוקחים ממנו כלום. קוראים רק את הטקסט שהדבקתם. קישורים ומספרי טלפון שבטקסט לא נשמרים.
              </p>
              <div className="ga-paste-row">
                <button type="button" className="tl-alt" onClick={() => setAdText(sampleAd)} data-act="ad-sample">
                  <Sparkles /> מודעה לדוגמה
                </button>
                <span className="ga-paste-acts">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdOpen(false)} data-act="ad-cancel">
                    ביטול
                  </button>
                  <button type="button" className="btn btn-gold btn-sm" disabled={!adText.trim()} onClick={fillFromAd} data-act="ad-fill">
                    למלא את הטופס
                  </button>
                </span>
              </div>
            </div>
          ) : pasting ? (
            <div className="ga-paste">
              <label className="field">
                <span className="field-label">הודעה שהועתקה מוואטסאפ</span>
                <textarea className="textarea" rows={4} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="מדביקים כאן את ההודעה" />
              </label>
              <div className="ga-paste-row">
                <button type="button" className="tl-alt" onClick={() => setPaste(sampleMessage)}>
                  <Sparkles /> הודעה לדוגמה
                </button>
                <button
                  type="button"
                  className="btn btn-gold btn-sm"
                  disabled={!paste.trim()}
                  onClick={() => {
                    // a card in the CRM is a property, whatever the message turns out to be (23.11.2026)
                    setCard({ ...toCard(parseWhatsapp(paste), paste), kind: 'property' })
                    setPasting(false)
                    toast('הפרטים מולאו מההודעה. בדקו ושמרו')
                  }}
                >
                  למלא מההודעה
                </button>
              </div>
            </div>
          ) : (
            <div className="ga-fill-from">
              <button type="button" className="ga-from-wa" onClick={() => setAdOpen(true)} data-act="from-yad2">
                <FileText /> למלא ממודעה שפרסמתי ביד2
              </button>
              <button type="button" className="ga-from-wa" onClick={() => setPasting(true)}>
                <ClipboardPaste /> למלא מהודעת וואטסאפ
              </button>
            </div>
          )}
          {adDone && (
            <div className={`ga-ad-done${adDone.found.length ? '' : ' is-empty'}`} role="status" data-ad-done>
              {adDone.found.length ? (
                <>
                  <b>
                    <Check /> מילאנו מהמודעה: {adDone.found.join(', ')}
                  </b>
                  {adDone.missing.length > 0 && <span>לא מצאנו: {adDone.missing.join(', ')}. אפשר להשלים למטה.</span>}
                  <span>בדקו את הפרטים, במיוחד את התוספות: ביד2 מופיעים לפעמים גם דברים שאין בנכס.</span>
                  {adDone.rent && <span>זו מודעת השכרה: המחיר הוא לחודש.</span>}
                  {(adDone.hadPhone || adDone.hadLink) && <span>{adDone.hadPhone && adDone.hadLink ? 'מספרי הטלפון והקישור' : adDone.hadPhone ? 'מספרי הטלפון' : 'הקישור'} שבטקסט לא נשמרו.</span>}
                </>
              ) : (
                <b>
                  <Info /> לא מצאנו בטקסט פרטים של נכס. נסו להעתיק שוב את כל הטקסט של המודעה, או מלאו בעצמכם.
                </b>
              )}
            </div>
          )}
          <Fields draft={card} set={(d) => setCard((c) => ({ ...c, ...d }))} categories full missing={!!cardMiss.kind} missingCoop={!!cardMiss.coop} />
          {card.kind === 'property' && <DescField desc={card.desc} owner={client} onChange={(desc) => {
                setCard((c) => ({ ...c, desc }))
                // the message about the owner's name belongs to the try that was stopped: writing again starts clean
                if (cardMiss.desc) setCardMiss((m) => ({ ...m, desc: false }))
              }}
              showProblem={!!cardMiss.desc}
            />}
          {card.kind === 'property' && (adDone || card.notes) && (
            <label className="field">
              <span className="field-label">עוד מהמודעה (נשאר אצלכם בכרטיס)</span>
              <textarea className="textarea" rows={4} value={card.notes} onChange={(e) => setCard((c) => ({ ...c, notes: e.target.value }))} placeholder="קומה, גודל, כניסה ותיאור" data-f="ad-notes" />
            </label>
          )}
          {card.kind === 'property' && adDone && (
            <p className="ga-ad-photos" data-note="own-photos">
              <ImagePlus /> מוסיפים כאן את התמונות שלכם. את התמונות מהמודעה ביד2 אנחנו לא לוקחים.
            </p>
          )}
          {card.kind === 'property' && <PhotoPicker photos={photos} onChange={setPhotos} />}
          {/* a property goes up as a post in the feed; in the row of stories too only when the broker asks for it */}
          {card.kind === 'property' && (
            <Toggle
              id="as-story"
              on={card.asStory}
              onChange={(asStory) => setCard((c) => ({ ...c, asStory }))}
              label="להעלות גם כסטורי"
              hint={card.asStory ? 'הנכס יופיע בפיד, וגם בשורת הסטורי עם התמונה הראשונה.' : 'כבוי: הנכס מופיע בפיד בלבד.'}
              warn={cardMiss.story && card.asStory && photos.length === 0 ? 'סטורי הוא תמונה. מוסיפים תמונה אחת לפחות, או מכבים את המתג.' : undefined}
            />
          )}
          <label className="field">
            <span className="field-label">{card.kind === 'property' ? 'שם בעל הנכס' : 'שם הלקוח'} (נשאר אצלכם, לא מתפרסם)</span>
            <input className="input" value={client} onChange={(e) => setClient(e.target.value)} placeholder="לדוגמה: משפחת כהן" />
          </label>
          <button type="button" className="btn btn-gold btn-lg ga-go" onClick={saveCard}>
            הוספה ל-CRM <ArrowLeft />
          </button>
        </div>
      </Modal>

      {/* ------------------------------------------------------------ from WhatsApp to the system */}
      <Modal open={ask?.kind === 'whatsapp'} onClose={close} title="מוואטסאפ למערכת" subtitle={waDraft ? 'בודקים, מתקנים ומאשרים לפני הפרסום.' : 'מדביקים הודעה מקבוצה, ומקבלים נכס או בקשה מסודרים.'}>
        <div className="modal-body ga">
          {!waDraft ? (
            <>
              <label className="field">
                <span className="field-label">ההודעה</span>
                <textarea className="textarea" rows={5} value={wa} onChange={(e) => setWa(e.target.value)} placeholder="מעתיקים הודעה מקבוצת וואטסאפ ומדביקים כאן" autoFocus />
              </label>
              <div className="ga-samples">
                <span>אין הודעה בהישג יד?</span>
                <button type="button" className="tl-alt" onClick={() => setWa(sampleMessage)}>
                  <Home /> נכס לדוגמה
                </button>
                <button type="button" className="tl-alt" onClick={() => setWa(sampleRequest)}>
                  <Search /> בקשה לדוגמה
                </button>
              </div>
              <button
                type="button"
                className="btn btn-gold btn-lg ga-go"
                disabled={!wa.trim()}
                onClick={() => {
                  const p = parseWhatsapp(wa)
                  setWaPhone(p.hadPhone)
                  setWaDraft(toDraft(p))
                }}
              >
                <MessageSquareText /> לסדר את ההודעה
              </button>
              <p className="ga-note">
                <Info /> הדבקה ידנית בלבד. אין חיבור לוואטסאפ, ושום דבר לא נשלח.
              </p>
            </>
          ) : (
            <>
              <div className="ga-found">
                <Sparkles />
                <div>
                  <b>{waDraft.kind === 'property' ? 'זיהינו נכס' : 'זיהינו בקשת חיפוש'}</b>
                  <small>
                    {titleOf(waDraft.kind, num(waDraft.rooms) || null, waDraft.city)}
                    {num(waDraft.price) > 0 && `, ${waDraft.kind === 'property' ? '' : 'עד '}${formatPriceShort(num(waDraft.price))}`}
                  </small>
                </div>
              </div>
              <Fields draft={waDraft} set={(d) => setWaDraft((c) => (c ? { ...c, ...d } : c))} kinds={['נכס לשיתוף פעולה', 'מחפש לקונה']} missingCoop={waMiss} />
              <p className="ga-privacy">
                <ShieldCheck /> {waPhone ? 'מצאנו מספר טלפון בהודעה, והוא לא יתפרסם. ' : ''}שמות ומספרי טלפון של לקוחות לא מתפרסמים בקהילה.
              </p>
              <div className="ga-actions">
                <button type="button" className="btn btn-ghost btn-lg" onClick={() => setWaDraft(null)}>
                  חזרה להודעה
                </button>
                <button type="button" className="btn btn-gold btn-lg" onClick={publishWa}>
                  <Send /> אישור ופרסום בקהילה
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ------------------------------------------------------------ sharing a post */}
      <Modal open={!!shared} onClose={close} title="שיתוף עם הקהילה" subtitle="הפוסט יופיע בפיד בשמכם.">
        {shared && (
          <div className="modal-body ga" data-share={shared.topicId}>
            {/* what goes up, and where (Ofek and Ariel, 26.11.2026: the window did not say) */}
            <p className="ga-where" data-where>
              <ShieldCheck aria-hidden />
              <span>
                הפוסט יתפרסם בקהילה, {sharedTo}. {shared.topicId === 'seeking' ? 'שם הלקוח והטלפון שלו לא יוצגו.' : 'שמות וטלפונים של לקוחות לא יוצגו.'}
              </span>
            </p>
            <label className="field">
              <span className="field-label">טקסט שיופיע בפוסט (לא חובה)</span>
              <textarea className="textarea" rows={2} value={words} onChange={(e) => setWords(e.target.value)} placeholder="לדוגמה: שווה לראות, מתאים למשפחה" data-f="share-words" />
              <small className="ga-words-hint">מה שכותבים כאן מופיע בתחילת הפוסט, וכל המתווכים בקהילה רואים אותו.</small>
            </label>
            <div className="ga-preview" data-preview>
              <span className="field-label">
                <Eye aria-hidden /> כך הפוסט ייראה בפיד
              </span>
              <div className="ga-preview-card">
                <CommunityCard item={sharedPost(shared, 'share-preview')} preview />
              </div>
            </div>
            <button type="button" className="btn btn-gold btn-lg ga-go" onClick={share}>
              <Send /> שיתוף בקהילה
            </button>
          </div>
        )}
      </Modal>
    </>
  )
}

/** In the lab, the free WhatsApp tool has a real button: it opens the paste pop-up. */
export function LabAction({ id }: { id: string }) {
  if (id !== 'whatsapp') return null
  return (
    <button type="button" className="ga-lab" onClick={() => greenUi.open({ kind: 'whatsapp' })}>
      <ClipboardPaste /> לנסות עכשיו: להדביק הודעה
    </button>
  )
}
