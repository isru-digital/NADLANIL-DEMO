import { useCallback, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BedDouble, Building2, CalendarClock, Check, Download, Forward, Lock, MapPin, Phone, Plus, Search, Send, Share2, Sparkles, Star, UserRound, Wallet, X } from 'lucide-react'
import { brokerById, formatPriceShort } from '../data/demo'
import type { CrmItem } from '../data/demo'
import { asset } from '../config'
import { OFFICE_ONLY, OFFICE_PAGE, UPGRADE_LABEL } from '../config/community'
import { useMember } from '../config/member'
import { nameSlots } from '../config/navExtras'
import { useStore } from '../store'
import { Avatar, Modal } from '../components/ui'
import { TYPES, clientActions, dateText, dateValue, daysFrom, lastText, matchLabel, matchesFor, sideOf, typeOf, useClients, yad2Demo } from './clients'
import type { Client, ClientType, Match } from './clients'
import ReferralInbox from './ReferralInbox'
import ReferClient from './ReferClient'
import SendToBuyer from './SendToBuyer'
import { fromMatch } from './sendProperty'
import type { SendProp } from './sendProperty'
import { WhatsAppIcon } from '../templates/LandingTemplate'
import NewClient from './NewClient'
import { AskPhone } from './AskPhone'
import { found, hasQuery } from './searchText'
import { groupLabel } from '../config/propertyTypes'
import '../styles/green-actions.css'
import '../styles/clients.css'

/**
 * The clients of the CRM as one simple table (green version): search, filter by type, sort, a match button that
 * changes with the type, a details window for quick marks, and a simulated pull from Yad2. An office member also has
 * a rating, a follow-up date, the date the client was created and four more types; a community member sees those locked.
 */
type Sort = 'recent' | 'name' | 'follow' | 'rating'
const money = (cl: { sum: number; type?: ClientType }, rent?: boolean) => (rent ? `${cl.sum.toLocaleString('he-IL')} ₪ לחודש` : formatPriceShort(cl.sum))

export default function ClientsTable({ onPublish }: { onPublish: (item: CrmItem) => void }) {
  const { isOffice } = useMember()
  const { crm, toast, addCrm, publishedIds } = useStore()
  const all = useClients()
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<ClientType[]>([])
  const [sort, setSort] = useState<Sort>('recent')
  const [openId, setOpenId] = useState<string | null>(null)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [pulling, setPulling] = useState(false)
  // "העבר למתווך בקהילה" and "שלח ללקוח בוואטסאפ" (24.11.2026)
  const [referId, setReferId] = useState<string | null>(null)
  const [sending, setSending] = useState<{ prop: SendProp; clientId: string } | null>(null)

  // a community member has only the four basic types; the office's types are shown locked
  const mine = useMemo(() => all.filter((x) => isOffice || !typeOf(x.type).office), [all, isOffice])
  const counts = useMemo(() => Object.fromEntries(TYPES.map((t) => [t.id, mine.filter((x) => x.type === t.id).length])) as Record<ClientType, number>, [mine])
  const shown = useMemo(() => {
    // by name, phone, city and neighbourhood, as the broker types, together with the types picked (26.11.2026)
    const rows = mine.filter((x) => (picked.length === 0 || picked.includes(x.type)) && found(q, [x.name, ...x.cities, ...(x.neighborhoods ?? [])], x.phone))
    const by: Record<Sort, (a: Client, b: Client) => number> = {
      recent: (a, b) => a.lastDays - b.lastDays || (b.touched ?? 0) - (a.touched ?? 0),
      name: (a, b) => a.name.localeCompare(b.name, 'he'),
      follow: (a, b) => (a.followUpDays ?? 9999) - (b.followUpDays ?? 9999),
      rating: (a, b) => b.rating - a.rating,
    }
    return [...rows].sort(by[isOffice ? sort : sort === 'name' ? 'name' : 'recent'])
  }, [mine, picked, q, sort, isOffice])

  const toggle = (id: ClientType) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const open = all.find((x) => x.id === openId) ?? null
  const matching = all.find((x) => x.id === matchId) ?? null
  // stable closers: the shared Modal refocuses when its onClose changes, and these windows have text fields
  const closeOpen = useCallback(() => setOpenId(null), [])
  const closeMatch = useCallback(() => setMatchId(null), [])
  const closeAdd = useCallback(() => setAdding(false), [])
  const closePull = useCallback(() => setPulling(false), [])
  const closeRefer = useCallback(() => setReferId(null), [])
  const closeSend = useCallback(() => setSending(null), [])
  const referring = all.find((x) => x.id === referId) ?? null

  const basic = TYPES.filter((t) => !t.office)
  const office = TYPES.filter((t) => t.office)

  return (
    <section className="ct" aria-label="לקוחות">
      <div className="ct-bar">
        <button className="btn btn-gold" data-act="new-client" onClick={() => setAdding(true)}>
          <Plus />
          לקוח חדש
        </button>
        <label className="ct-search">
          <Search aria-hidden />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש: שם, טלפון, עיר או שכונה" aria-label="חיפוש לפי שם, טלפון, עיר או שכונה" enterKeyHint="search" autoComplete="off" data-f="client-search" />
        </label>
        <label className="ct-sort">
          <span>מיון</span>
          <select value={isOffice ? sort : sort === 'name' ? 'name' : 'recent'} onChange={(e) => setSort(e.target.value as Sort)} aria-label="מיון">
            <option value="recent">פעילים לאחרונה</option>
            <option value="name">לפי שם</option>
            {isOffice && <option value="follow">פולואפ קרוב</option>}
            {isOffice && <option value="rating">דירוג גבוה</option>}
          </select>
        </label>
        <button className="btn btn-ghost ct-pull" data-act="yad2" onClick={() => setPulling(true)}>
          <Download />
          משוך נכסים מיד 2
        </button>
      </div>

      <div className="ct-types" role="group" aria-label="סינון לפי סוג, אפשר לבחור כמה">
        <span className="ct-types-label">סוג</span>
        {basic.map((t) => (
          <button key={t.id} className={`ct-chip${picked.includes(t.id) ? ' is-on' : ''}`} aria-pressed={picked.includes(t.id)} data-type={t.id} onClick={() => toggle(t.id)}>
            {picked.includes(t.id) && <Check />}
            {t.many}
            <b className="num">{counts[t.id]}</b>
          </button>
        ))}
        {isOffice ? (
          office.map((t) => (
            <button key={t.id} className={`ct-chip${picked.includes(t.id) ? ' is-on' : ''}`} aria-pressed={picked.includes(t.id)} data-type={t.id} onClick={() => toggle(t.id)}>
              {picked.includes(t.id) && <Check />}
              {t.many}
              <b className="num">{counts[t.id]}</b>
            </button>
          ))
        ) : (
          <span className="ct-locked-types">
            {office.map((t) => (
              <span key={t.id} className="ct-chip is-locked" data-type={t.id} aria-disabled="true">
                <Lock />
                {t.many}
              </span>
            ))}
          </span>
        )}
        {picked.length > 0 && (
          <button className="ct-clear" onClick={() => setPicked([])}>
            ניקוי הסינון
          </button>
        )}
      </div>

      {!isOffice && (
        <Link to={OFFICE_PAGE} className="ct-office" data-act="office-only">
          <Lock />
          <span>
            <b>{OFFICE_ONLY}:</b> דירוג, פולואפ עם תאריך, תאריך יצירה, והסוגים ניהול נכסים, מסחרי, מגרש ואנשי מקצוע.
          </span>
          <em>
            {UPGRADE_LABEL} <ArrowLeft />
          </em>
        </Link>
      )}

      <ReferralInbox />

      <div className="ct-wrap">
        <table className={`ct-table${isOffice ? ' is-office' : ''}`}>
          <thead>
            <tr>
              <th>שם הלקוח</th>
              <th>סוג</th>
              <th>טלפון</th>
              <th className="ct-hide-phone">עדכון אחרון</th>
              {isOffice && <th className="ct-hide-phone">דירוג</th>}
              {isOffice && <th className="ct-hide-phone">פולואפ</th>}
              {isOffice && <th className="ct-hide-phone">נוצר</th>}
              <th>
                <span className="sr-only">התאמות</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((cl) => {
              const label = matchLabel(cl.type)
              return (
                <tr key={cl.id} data-id={cl.id} data-type={cl.type} onClick={() => setOpenId(cl.id)}>
                  <td className="ct-name">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenId(cl.id)
                      }}
                      aria-label={`פרטי הלקוח ${cl.name}`}
                    >
                      <i aria-hidden>
                        <UserRound />
                      </i>
                      <span>
                        <b>{cl.name}</b>
                        {cl.about && <small>{cl.about}</small>}
                      </span>
                    </button>
                  </td>
                  {/* on a phone only: what a buyer or a renter looks for, in short lines (25.11.2026) */}
                  {sideOf(cl.type) === 'wants' && (
                    <td className="ct-facts-cell">
                      <Facts cl={cl} />
                    </td>
                  )}
                  <td className="ct-type-cell">
                    <span className={`ct-type is-${cl.type}`}>{typeOf(cl.type).one}</span>
                  </td>
                  <td className="ct-phone">
                    {cl.phone ? (
                      <a href={`tel:${cl.phone.replace(/-/g, '')}`} onClick={(e) => e.stopPropagation()}>
                        <Phone aria-hidden />
                        <bdi dir="ltr" className="num">
                          {cl.phone}
                        </bdi>
                      </a>
                    ) : (
                      <span className="ct-none">לא הוזן טלפון</span>
                    )}
                  </td>
                  <td className="ct-hide-phone ct-last">{lastText(cl.lastDays)}</td>
                  {isOffice && (
                    <td className="ct-hide-phone">
                      <Stars value={cl.rating} />
                    </td>
                  )}
                  {isOffice && <td className="ct-hide-phone num ct-date">{cl.followUpDays === null ? <span className="ct-none">אין</span> : dateText(cl.followUpDays)}</td>}
                  {isOffice && <td className="ct-hide-phone num ct-date">{dateText(-cl.createdDays)}</td>}
                  <td className="ct-act">
                    {label ? (
                      <button
                        className="btn btn-sm ct-match"
                        data-act="match"
                        onClick={(e) => {
                          e.stopPropagation()
                          setMatchId(cl.id)
                        }}
                      >
                        <Sparkles />
                        {label}
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenId(cl.id)
                        }}
                      >
                        פרטים
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {shown.length === 0 && (
          <div className="ct-empty" role="status" data-empty="clients">
            <span className="ct-empty-ico" aria-hidden>
              <Search />
            </span>
            <b>לא נמצאו לקוחות</b>
            <p>{hasQuery(q) ? `אין לקוח שמתאים ל"${q.trim()}"${picked.length ? ' בסוגים שנבחרו' : ''}. אפשר לנסות שם, טלפון, עיר או שכונה.` : 'אין לקוחות בסוגים שנבחרו.'}</p>
            <span className="ct-empty-acts">
              {hasQuery(q) && (
                <button type="button" className="btn btn-ghost" onClick={() => setQ('')} data-act="clear-search">
                  <X />
                  ניקוי חיפוש
                </button>
              )}
              {picked.length > 0 && (
                <button type="button" className="btn btn-ghost" onClick={() => setPicked([])} data-act="clear-types">
                  ניקוי הסינון
                </button>
              )}
            </span>
          </div>
        )}
      </div>
      <p className="ct-demo">
        <b className="num">{shown.length}</b> לקוחות מוצגים.
      </p>

      <Details
        client={open}
        onClose={closeOpen}
        isOffice={isOffice}
        onMatch={(id) => {
          setOpenId(null)
          setMatchId(id)
        }}
        onRefer={(id) => {
          setOpenId(null)
          setReferId(id)
        }}
        published={open?.crmId ? publishedIds[open.crmId] : undefined}
        onPublish={
          open?.crmId && crm.some((x) => x.id === open.crmId)
            ? () => {
                const item = crm.find((x) => x.id === open.crmId)!
                setOpenId(null)
                onPublish(item)
              }
            : undefined
        }
      />
      <Matches
        client={matching}
        onClose={closeMatch}
        onAsk={() => toast('הפנייה נשלחה למתווך')}
        onSend={(m, clientId) => {
          setMatchId(null)
          setSending({ prop: fromMatch(m), clientId })
        }}
      />
      <ReferClient client={referring} onClose={closeRefer} />
      <SendToBuyer prop={sending?.prop ?? null} preset={sending?.clientId} onClose={closeSend} />
      <NewClient
        open={adding}
        onClose={closeAdd}
        isOffice={isOffice}
        onAdd={(p) => {
          clientActions.add(p)
          setAdding(false)
          toast(`${p.name} נוסף לרשימת הלקוחות`)
        }}
      />
      <Yad2
        open={pulling}
        onClose={closePull}
        onTake={(ids) => {
          yad2Demo
            .filter((y) => ids.includes(y.id))
            .forEach((y, i) =>
              addCrm({
                id: `c-${y.id}-${Date.now()}-${i}`,
                kind: 'property',
                title: y.title,
                area: y.area,
                city: y.city,
                rooms: y.rooms,
                sqm: y.sqm,
                price: y.price,
                status: 'new',
                client: 'בעל הנכס',
                note: 'נמשך מיד 2 בסימולציה של הדמו.',
                updated: 'נוסף עכשיו',
                image: y.image,
              }),
            )
          setPulling(false)
          toast(ids.length === 1 ? 'נכס אחד נכנס ל-CRM ופורסם בקהילה, באזור שלו' : `${ids.length} נכסים נכנסו ל-CRM ופורסמו בקהילה, כל אחד באזור שלו`)
        }}
      />
    </section>
  )
}

function Stars({ value, onPick }: { value: number; onPick?: (n: number) => void }) {
  return (
    <span className={`ct-stars${onPick ? ' is-edit' : ''}`} role={onPick ? 'group' : 'img'} aria-label={`דירוג ${value} מתוך 5`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onPick ? (
          <button key={n} type="button" className={n <= value ? 'is-on' : ''} onClick={() => onPick(n)} aria-label={`דירוג ${n}`} aria-pressed={n === value}>
            <Star />
          </button>
        ) : (
          <Star key={n} className={n <= value ? 'is-on' : ''} aria-hidden />
        ),
      )}
    </span>
  )
}

/** The details window: what the client looks for, the note and, for a buyer or a renter, urban renewal. Every change is saved at once. */
function Details({
  client,
  onClose,
  isOffice,
  onMatch,
  onRefer,
  onPublish,
  published,
}: {
  client: Client | null
  onClose: () => void
  isOffice: boolean
  onMatch: (id: string) => void
  onRefer: (id: string) => void
  onPublish?: () => void
  published?: string
}) {
  // keep the last client mounted while the window animates out
  const [last, setLast] = useState<Client | null>(client)
  // an action that needs a phone, waiting for one to be written (23.11.2026: the phone is not a must any more)
  const [ask, setAsk] = useState<null | 'send' | 'call' | 'add'>(null)
  if (client && client !== last) setLast(client)
  const cl = client ?? last
  if (!cl) return null
  const set = (p: Partial<Client>) => clientActions.patch(cl.id, p)
  const digits = (p: string) => p.replace(/\D/g, '').replace(/^0/, '972')
  const run = (which: 'send' | 'call' | 'add', phone: string) => {
    // "הוסף טלפון" only keeps the number on the card
    if (which === 'add') return
    if (which === 'send') window.open(`https://wa.me/${digits(phone)}`, '_blank', 'noopener')
    else window.location.href = `tel:${phone.replace(/-/g, '')}`
  }
  /** with a phone it happens at once; without one, the window asks for it and then it happens */
  const need = (which: 'send' | 'call') => (cl.phone ? run(which, cl.phone) : setAsk(which))
  const label = matchLabel(cl.type)
  return (
    <Modal open={!!client} onClose={onClose} title={cl.name} subtitle={cl.about || typeOf(cl.type).one}>
      <div className="modal-body ct-det" data-id={cl.id}>
        <div className="ct-det-top">
          <span className={`ct-type is-${cl.type}`}>{typeOf(cl.type).one}</span>
          {cl.phone ? (
            <a href={`tel:${cl.phone.replace(/-/g, '')}`} className="ct-det-phone">
              <Phone aria-hidden />
              <bdi dir="ltr" className="num">
                {cl.phone}
              </bdi>
            </a>
          ) : (
            <button type="button" className="ct-det-add" onClick={() => need('call')} data-act="add-phone">
              <Phone aria-hidden />
              הוספת טלפון
            </button>
          )}
          <span className="ct-det-last">עדכון אחרון: {lastText(cl.lastDays)}</span>
        </div>
        {/* a client with no phone (26.11.2026): the line is grey and cannot be pressed, it says "חסר טלפון", and a small
            "הוסף טלפון" beside it asks for the number and keeps it on this card */}
        {cl.phone ? (
          <button type="button" className="ct-send" onClick={() => need('send')} data-act="send-client">
            <Send aria-hidden />
            שליחה ללקוח
            <small>נכס, סיור או הודעה קצרה בוואטסאפ</small>
          </button>
        ) : (
          <div className="ct-send is-off" aria-disabled="true" data-act="send-client" data-no-phone>
            <Send aria-hidden />
            <span className="ct-send-word">שליחה ללקוח</span>
            <em className="cp-tag" data-tag="no-phone">
              חסר טלפון
            </em>
            <button type="button" className="cp-add-phone" onClick={() => setAsk('add')} data-act="send-add-phone">
              הוסף טלפון
            </button>
          </div>
        )}
        {sideOf(cl.type) === 'wants' && (
          <button type="button" className="ct-send ct-refer" onClick={() => onRefer(cl.id)} data-act="refer-client">
            <Forward aria-hidden />
            העבר למתווך בקהילה
            <small>יש לך לקוח בעיר שאתם לא עובדים בה? על עמלת הפניה של 25% או 50%</small>
          </button>
        )}

        {cl.roomsMin != null && <SearchSummary cl={cl} />}

        {/* "התחדשות עירונית" for a buyer or a renter (25.11.2026): the same mark as on the property form. The stage and
            the quick marks left this window the same day; what was saved in them stays in the client's data. */}
        {sideOf(cl.type) === 'wants' && (
          <button type="button" role="switch" aria-checked={!!cl.renewal} className="ga-renew" onClick={() => set({ renewal: !cl.renewal })} data-f="client-renewal">
            <span className="ga-renew-box" aria-hidden>
              {cl.renewal && <Check />}
            </span>
            <span className="ga-renew-text">
              <b>מחפש נכס בהתחדשות עירונית</b>
              <small>תמ"א 38 או פינוי בינוי. יופיע כתגית בכרטיס הלקוח.</small>
            </span>
          </button>
        )}

        <label className="ct-field">
          <span className="ct-label">הערה קצרה</span>
          <input className="input" value={cl.note} maxLength={120} onChange={(e) => set({ note: e.target.value })} placeholder="למשל: לחזור אליו אחרי החג" />
        </label>

        {isOffice ? (
          <div className="ct-office-fields">
            <div className="ct-field">
              <span className="ct-label">דירוג</span>
              <Stars value={cl.rating} onPick={(n) => set({ rating: n })} />
            </div>
            <label className="ct-field">
              <span className="ct-label">
                <CalendarClock /> פולואפ
              </span>
              <input
                className="input num"
                type="date"
                value={cl.followUpDays === null ? '' : dateValue(cl.followUpDays)}
                onChange={(e) => set({ followUpDays: e.target.value ? daysFrom(e.target.value) : null })}
              />
            </label>
            <div className="ct-field">
              <span className="ct-label">תאריך יצירה</span>
              <span className="ct-created num">{dateText(-cl.createdDays)}</span>
            </div>
          </div>
        ) : (
          <Link to={OFFICE_PAGE} className="ct-office is-inline" data-act="office-only">
            <Lock />
            <span>
              <b>{OFFICE_ONLY}:</b> דירוג, פולואפ עם תאריך ותאריך יצירה.
            </span>
            <em>
              {UPGRADE_LABEL} <ArrowLeft />
            </em>
          </Link>
        )}
      </div>
      <div className="modal-foot ct-det-foot">
        {label && (
          <button className="btn btn-gold" data-act="match" onClick={() => onMatch(cl.id)}>
            <Sparkles />
            {label}
          </button>
        )}
        {onPublish &&
          (published ? (
            <span className="tag tag-green">
              <Check /> הבקשה פורסמה בקהילה
            </span>
          ) : (
            <button className="btn btn-ghost" data-act="publish" onClick={onPublish}>
              <Share2 />
              פרסום הבקשה בקהילה
            </button>
          ))}
        <button className="btn btn-quiet" onClick={onClose}>
          סגירה
        </button>
      </div>
      <AskPhone open={!!ask} client={cl} what={ask === 'call' ? 'להתקשר ללקוח' : 'לשלוח ללקוח'} onClose={() => setAsk(null)} onReady={(p) => run(ask ?? 'send', p)} />
    </Modal>
  )
}

/** A buyer's or a renter's search in short lines with small icons, for the card on a phone. Two neighbourhoods at most,
 * then "+N עוד": the whole list is in the details window. Nothing here is cut: every line wraps. */
function Facts({ cl }: { cl: Client }) {
  const rent = cl.type === 'renter'
  const sum = (n: number) => (rent ? `${n.toLocaleString('he-IL')} ₪` : formatPriceShort(n))
  const hoods = cl.neighborhoods ?? []
  const lo = cl.roomsMin ?? null
  const hi = cl.roomsMax ?? null
  const rooms = lo != null && hi != null ? (lo === hi ? `${lo} חדרים` : `${lo} עד ${hi} חדרים`) : cl.rooms > 0 ? `${cl.rooms} חדרים` : ''
  const kind = cl.kinds?.length ? cl.kinds.join(', ') : cl.group ? `כל סוגי ה${groupLabel(cl.group)}` : ''
  const budget = cl.sum > 0 ? `${cl.budgetMin ? `${sum(cl.budgetMin)} עד ` : 'עד '}${sum(cl.sum)}${rent ? ' לחודש' : ''}` : ''
  return (
    <ul className="ct-facts" data-facts>
      {cl.cities.length > 0 && (
        <li data-fact="where">
          <MapPin aria-hidden />
          <span>
            <b>{cl.cities.join(', ')}</b>
            {hoods.length > 0 && <> · {hoods.slice(0, 2).join(', ')}</>}
            {hoods.length > 2 && (
              <em className="ct-facts-more" data-more={hoods.length - 2}>
                +<span className="num">{hoods.length - 2}</span> עוד
              </em>
            )}
          </span>
        </li>
      )}
      {(rooms || kind) && (
        <li data-fact="what">
          {rooms ? <BedDouble aria-hidden /> : <Building2 aria-hidden />}
          <span>
            {rooms && <span className="num">{rooms}</span>}
            {rooms && kind && ' · '}
            {kind}
          </span>
        </li>
      )}
      {budget && (
        <li data-fact="budget">
          <Wallet aria-hidden />
          <span className="num">{budget}</span>
        </li>
      )}
      {cl.renewal && (
        <li data-fact="renewal">
          <span className="kan-renew">התחדשות עירונית</span>
        </li>
      )}
    </ul>
  )
}

/** Matches from the community for one client. Demo data. */
function Matches({ client, onClose, onAsk, onSend }: { client: Client | null; onClose: () => void; onAsk: () => void; onSend: (m: Match, clientId: string) => void }) {
  const [last, setLast] = useState<Client | null>(client)
  if (client && client !== last) setLast(client)
  const cl = client ?? last
  if (!cl) return null
  const list = matchesFor(cl)
  const Badge = nameSlots.Badge
  const wants = sideOf(cl.type) === 'wants'
  return (
    <Modal open={!!client} onClose={onClose} title={`${matchLabel(cl.type) ?? 'התאמות'} ל${cl.name}`} subtitle={wants ? 'נכסים שמתווכים פרסמו בקהילה, לפי עיר, חדרים ותקציב.' : 'בקשות שמתווכים פרסמו בקהילה, לפי עיר, חדרים ותקציב.'}>
      <div className="modal-body ct-matches" data-id={cl.id}>
        {list.length === 0 && <p className="ct-empty">אין כרגע התאמות בקהילה ללקוח הזה.</p>}
        {list.map((m) => {
          const b = brokerById(m.brokerId)
          return (
            <article key={m.id} className="ct-m">
              <div className="ct-m-main">
                <strong>{m.title}</strong>
                <span>
                  {m.city} · <span className="num">{m.rooms}</span> חדרים · {wants ? '' : 'עד '}
                  <b className="num">{money({ sum: m.sum }, m.rent)}</b>
                </span>
                <small>{m.line}</small>
              </div>
              <div className="ct-m-by">
                <Avatar src={b.avatar} name={b.name} size={34} />
                <span>
                  <b>
                    {b.name} {Badge && <Badge brokerId={b.id} />}
                  </b>
                  <small>{b.area}</small>
                </span>
                <button className="btn btn-sm btn-ghost" onClick={onAsk}>
                  פנייה למתווך
                </button>
              </div>
              {wants && (
                <button type="button" className="sh-card-btn ct-m-send" onClick={() => onSend(m, cl.id)} data-act="send-to-buyer">
                  <WhatsAppIcon />
                  שלח ללקוח בוואטסאפ
                </button>
              )}
            </article>
          )
        })}
        <p className="ct-demo">התאמות מהקהילה. פרטי הלקוח שלך לא נחשפים למתווך השני.</p>
      </div>
    </Modal>
  )
}

/** What a buyer or a renter is looking for, as it was entered in the new client form. */
function SearchSummary({ cl }: { cl: Client }) {
  const rent = cl.type === 'renter'
  const money = (n: number) => (rent ? `${n.toLocaleString('he-IL')} ₪` : formatPriceShort(n))
  const where = [...cl.cities, ...(cl.neighborhoods ?? [])]
  const rows: [string, string][] = [
    ['עסקה', rent ? 'השכרה' : 'קנייה'],
    [rent ? 'שכירות לחודש' : 'תקציב', `${money(cl.budgetMin ?? 0)} עד ${money(cl.sum)}`],
    ['איפה', where.length ? where.join(', ') : 'לא צוין'],
    ['סוג נכס', cl.kinds?.length ? cl.kinds.join(', ') : cl.group ? `כל סוגי ה${groupLabel(cl.group)}` : 'לא צוין'],
    ['חדרים', cl.roomsMin === cl.roomsMax ? `${cl.roomsMin}` : `${cl.roomsMin} עד ${cl.roomsMax}`],
    ['חייב שיהיה', cl.must?.length ? cl.must.join(', ') : 'לא צוין'],
  ]
  return (
    <div className="ct-search" data-summary>
      <span className="ct-label">
        <Search /> מה הוא מחפש
      </span>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {cl.wants && <p className="ct-search-words">{cl.wants}</p>}
    </div>
  )
}

/** The pull from Yad2 is a simulation: a few demo properties appear, and the broker marks which ones to take in. */
function Yad2({ open, onClose, onTake }: { open: boolean; onClose: () => void; onTake: (ids: string[]) => void }) {
  const [ids, setIds] = useState<string[]>([])
  const flip = (id: string) => setIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  return (
    <Modal open={open} onClose={onClose} title="משיכת נכסים מיד 2" subtitle="מסמנים אילו נכסים להכניס ל-CRM.">
      <div className="modal-body ct-y2">
        <p className="ct-y2-note" data-note="yad2">
          דמו - החיבור האמיתי ייבדק בהמשך
        </p>
        <ul>
          {yad2Demo.map((y) => {
            const on = ids.includes(y.id)
            return (
              <li key={y.id}>
                <button type="button" role="checkbox" aria-checked={on} className={`ct-y2-item${on ? ' is-on' : ''}`} data-id={y.id} onClick={() => flip(y.id)}>
                  <i className="ct-y2-check" aria-hidden>
                    {on && <Check />}
                  </i>
                  <img src={asset(y.image)} alt="" loading="lazy" />
                  <span>
                    <strong>{y.title}</strong>
                    <small>
                      {y.area} · <span className="num">{y.rooms}</span> חדרים · <span className="num">{y.sqm}</span> מ"ר
                    </small>
                    <b className="num">{formatPriceShort(y.price)}</b>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="modal-foot">
        <button
          className="btn btn-gold"
          disabled={ids.length === 0}
          data-act="take"
          onClick={() => {
            onTake(ids)
            setIds([])
          }}
        >
          <Download />
          {ids.length === 0 ? 'סמנו נכסים להכנסה' : ids.length === 1 ? 'הכנסת נכס אחד ל-CRM' : `הכנסת ${ids.length} נכסים ל-CRM`}
        </button>
        <button className="btn btn-quiet" onClick={onClose}>
          ביטול
        </button>
      </div>
    </Modal>
  )
}
