import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, ClipboardPaste, Home, Info, Lock, MessageSquareText, RotateCcw, Save, Search, Send, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { CURRENT_BROKER_ID } from '../config'
import { brokerById, formatPriceShort } from '../data/demo'
import type { CommunityItem, CrmItem } from '../data/demo'
import { useStore } from '../store'
import { Modal } from '../components/ui'
import { greenUi } from './ui'
import type { GreenAsk } from './ui'
import { allExtras, knownCities, parseWhatsapp, sampleMessage, sampleRequest, titleOf } from './whatsapp'
import type { Parsed } from './whatsapp'
import { clientActions } from '../crm/clients'
import PhotoPicker from './PhotoPicker'
import { CATEGORIES, commercialExtras, commercialTitle } from '../crm/categories'
import type { PropCategory } from '../crm/categories'
import '../styles/green-actions.css'

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
  category: PropCategory
  sqm: string
  /** the exact address: the neighbourhood is published with the city, the street and number stay in the CRM */
  hood: string
  street: string
  houseNo: string
  /** parking spaces: null = not chosen yet, 3 = three or more */
  parking: number | null
  renewal: boolean
}
const emptyDraft: Draft = { kind: 'property', city: 'פתח תקווה', rooms: '4', price: '', extras: [], category: 'home', sqm: '', hood: '', street: '', houseNo: '', parking: null, renewal: false }
const toDraft = (p: Parsed): Draft => ({ ...emptyDraft, kind: p.kind, city: p.city || 'פתח תקווה', rooms: p.rooms ? String(p.rooms) : '', price: p.price ? String(p.price) : '', extras: p.extras })
const num = (s: string) => Number(s.replace(/[^\d.]/g, '')) || 0
/** a message pasted into the CRM card: "חניה" becomes one parking space, since the card asks for a number */
const toCard = (p: Parsed): Draft => {
  const d = toDraft(p)
  return d.extras.includes('חניה') ? { ...d, parking: 1, extras: d.extras.filter((x) => x !== 'חניה') } : d
}

/** The new card is kept as a draft in this browser while it is filled, so nothing is lost if the window closes. */
const DRAFT_KEY = 'nadlanup-crm-draft-v1'
type Saved = { card: Draft; client: string; photos: string[]; at: number }
const readDraft = (): Saved | null => {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as Saved | null
    return d && d.card ? { ...d, client: d.client ?? '', card: { ...emptyDraft, ...d.card }, photos: d.photos ?? [] } : null
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
/** the cities shown first, before "עוד ערים" */
const FIRST_CITIES = ['תל אביב', 'רמת גן', 'פתח תקווה', 'חיפה', 'ירושלים', 'באר שבע', 'נתניה', 'ראשון לציון']

function CityPick({ city, onPick }: { city: string; onPick: (c: string) => void }) {
  const { myCities } = useStore()
  const [all, setAll] = useState(false)
  const first = [...new Set([city, ...myCities, ...FIRST_CITIES])].filter((c) => knownCities.includes(c)).slice(0, 9)
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
    </div>
  )
}

/** The fields a property or a request is made of; shared by the CRM card and the WhatsApp confirmation. */
function Fields({ draft, set, kinds, categories = false, full = false }: { draft: Draft; set: (d: Partial<Draft>) => void; kinds: [string, string]; categories?: boolean; full?: boolean }) {
  // an office or a business property is measured in square metres and has its own list of extras
  const commercial = categories && draft.kind === 'property' && draft.category !== 'home'
  const property = draft.kind === 'property'
  // the CRM card asks for parking as a number, so "חניה" leaves the list of extras there
  const extras = (commercial ? commercialExtras : allExtras).filter((x) => !(full && property && x === 'חניה'))
  const roomsOn = (r: string) => (r === '6+' ? num(draft.rooms) >= 6 : draft.rooms === r)
  return (
    <div className="ga-fields">
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
      {categories && property && (
        <div className="field" data-f="category">
          <span className="field-label">קטגוריה</span>
          <div className="ga-picks" role="group" aria-label="קטגוריה">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className="ga-pick"
                aria-pressed={draft.category === c.id}
                data-cat={c.id}
                onClick={() => {
                  // the two lists of extras are different: keep only what the new category also has
                  const list = c.id === 'home' ? allExtras : commercialExtras
                  set({ category: c.id, extras: draft.extras.filter((x) => list.includes(x)) })
                }}
              >
                <c.icon /> {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <CityPick city={draft.city} onPick={(city) => set({ city })} />

      {full && property && (
        <fieldset className="ga-address" data-f="address">
          <legend className="field-label">הכתובת</legend>
          <div className="ga-address-row">
            <label className="field is-hood">
              <span className="field-sub">שכונה</span>
              <input className="input" value={draft.hood} onChange={(e) => set({ hood: e.target.value })} placeholder="לדוגמה: נווה שאנן" autoComplete="off" enterKeyHint="next" data-f="hood" />
            </label>
            <label className="field is-street">
              <span className="field-sub">רחוב</span>
              <input className="input" value={draft.street} onChange={(e) => set({ street: e.target.value })} placeholder="לדוגמה: הרצל" autoComplete="off" enterKeyHint="next" data-f="street" />
            </label>
            <label className="field is-no">
              <span className="field-sub">מספר</span>
              <input className="input num" inputMode="numeric" value={draft.houseNo} onChange={(e) => set({ houseNo: e.target.value })} placeholder="12" autoComplete="off" enterKeyHint="next" data-f="house" />
            </label>
          </div>
          <p className="ga-private">
            <Lock /> הרחוב ומספר הבית נשארים אצלכם. בקהילה, בכרטיס ובדף הנכס מופיעות רק העיר והשכונה.
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

      <label className="field">
        <span className="field-label">{property ? 'מחיר, בשקלים' : 'תקציב, בשקלים'}</span>
        <input className="input num" inputMode="numeric" value={draft.price} onChange={(e) => set({ price: e.target.value })} placeholder="2650000" data-f="price" />
        {num(draft.price) > 0 && <small className="ga-price-say">{formatPriceShort(num(draft.price))}</small>}
      </label>

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
    setCard(d?.card ?? emptyDraft)
    setClient(d?.client ?? '')
    setPhotos(d?.photos ?? [])
    setRestored(!!d)
    setSavedAt(d?.at ?? null)
    setPaste('')
    setPasting(false)
    setWa('')
    setWaDraft(null)
    setWaPhone(false)
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
  }

  const saveCard = () => {
    const rooms = num(card.rooms)
    const commercial = card.kind === 'property' && card.category !== 'home'
    const item: CrmItem = {
      id: `n${Date.now()}`,
      kind: card.kind === 'property' ? 'property' : 'client',
      title: commercial ? commercialTitle(num(card.sqm), card.city) : titleOf(card.kind, rooms || null, card.city),
      // the area is the city and the neighbourhood: this is what the community sees
      area: card.kind === 'property' && card.hood.trim() ? `${card.city} - ${card.hood.trim()}` : card.city,
      city: card.city,
      ...(card.kind === 'property'
        ? {
            neighborhood: card.hood.trim() || undefined,
            street: card.street.trim() || undefined,
            houseNo: card.houseNo.trim() || undefined,
            parking: card.parking ?? undefined,
            renewal: card.renewal || undefined,
          }
        : {}),
      rooms: commercial ? '-' : card.rooms || '-',
      sqm: commercial ? num(card.sqm) || undefined : undefined,
      category: card.kind === 'property' ? card.category : undefined,
      price: num(card.price),
      status: 'new',
      client: client.trim() || (card.kind === 'property' ? 'בעל הנכס' : 'לקוח חדש'),
      note: card.extras.join(', '),
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
    const rooms = num(waDraft.rooms)
    const price = num(waDraft.price)
    const id = `w${Date.now()}`
    const base = { id, authorId: me.id, city: waDraft.city, time: 'עכשיו', likes: 0, comments: [], fresh: true }
    const item: CommunityItem =
      waDraft.kind === 'property'
        ? {
            ...base,
            topicId: 'coop',
            title: titleOf('property', rooms || null, waDraft.city),
            body: waDraft.extras.length ? `${waDraft.extras.join(', ')}.` : 'פרטים נוספים אצלי.',
            property: { area: waDraft.city, rooms: waDraft.rooms || '-', price, split: 'חלוקת עמלה שווה', showPrice: price > 0 },
          }
        : {
            ...base,
            topicId: 'seeking',
            title: titleOf('request', rooms || null, waDraft.city),
            body: waDraft.extras.length ? `חשוב לקונה: ${waDraft.extras.join(', ')}.` : 'פרטים נוספים אצלי.',
            search: { cities: [waDraft.city], roomsMin: Math.floor(rooms) || 1, roomsMax: Math.ceil(rooms) || 6, budget: price, wants: waDraft.extras },
          }
    addItem(item)
    close()
    greenUi.published()
    toast(waDraft.kind === 'property' ? 'הנכס פורסם בקהילה' : 'הבקשה פורסמה בקהילה')
    navigate(`/app/community?topic=${item.topicId}&item=${id}`)
  }

  const share = () => {
    if (ask?.kind !== 'share') return
    const src = ask.item
    const from = brokerById(src.authorId).name
    const id = `s${Date.now()}`
    addItem({ ...src, id, authorId: me.id, time: 'עכשיו', likes: 0, comments: [], fresh: true, sourceId: undefined, body: `${words.trim() ? `${words.trim()} ` : ''}(שיתוף של פוסט מאת ${from}) ${src.body}` })
    close()
    toast('השיתוף פורסם בקהילה')
    window.setTimeout(() => document.getElementById(`ci-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 350)
  }

  const shared = ask?.kind === 'share' ? ask.item : null
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
          {pasting ? (
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
                    setCard(toCard(parseWhatsapp(paste)))
                    setPasting(false)
                    toast('הפרטים מולאו מההודעה. בדקו ושמרו')
                  }}
                >
                  למלא מההודעה
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="ga-from-wa" onClick={() => setPasting(true)}>
              <ClipboardPaste /> למלא מהודעת וואטסאפ
            </button>
          )}
          <Fields draft={card} set={(d) => setCard((c) => ({ ...c, ...d }))} kinds={['נכס', 'לקוח שמחפש']} categories full />
          {card.kind === 'property' && <PhotoPicker photos={photos} onChange={setPhotos} />}
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
              <Fields draft={waDraft} set={(d) => setWaDraft((c) => (c ? { ...c, ...d } : c))} kinds={['נכס לשיתוף פעולה', 'מחפש לקונה']} />
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
          <div className="modal-body ga">
            <label className="field">
              <span className="field-label">רוצים להוסיף משהו? (לא חובה)</span>
              <textarea className="textarea" rows={3} value={words} onChange={(e) => setWords(e.target.value)} placeholder="כמה מילים משלכם" autoFocus />
            </label>
            <div className="ga-quote">
              <span>
                <UserRound />
              </span>
              <div>
                <b>{brokerById(shared.authorId).name}</b>
                <p>{shared.title ?? shared.body}</p>
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
