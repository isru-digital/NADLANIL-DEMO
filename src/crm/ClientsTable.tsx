import { useCallback, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CalendarClock, Check, Download, Lock, Phone, Plus, Search, Share2, Sparkles, Star, UserRound } from 'lucide-react'
import { brokerById, crmStages, formatPriceShort } from '../data/demo'
import type { CrmItem } from '../data/demo'
import { asset } from '../config'
import { OFFICE_ONLY, OFFICE_PAGE, UPGRADE_LABEL } from '../config/community'
import { useMember } from '../config/member'
import { nameSlots } from '../config/navExtras'
import { useStore } from '../store'
import { Avatar, Modal } from '../components/ui'
import { TYPES, clientActions, dateText, dateValue, daysFrom, lastText, matchLabel, matchesFor, sideOf, typeOf, useClients, yad2Demo } from './clients'
import type { Client, ClientType } from './clients'
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

  // a community member has only the four basic types; the office's types are shown locked
  const mine = useMemo(() => all.filter((x) => isOffice || !typeOf(x.type).office), [all, isOffice])
  const counts = useMemo(() => Object.fromEntries(TYPES.map((t) => [t.id, mine.filter((x) => x.type === t.id).length])) as Record<ClientType, number>, [mine])
  const shown = useMemo(() => {
    const term = q.trim()
    const digits = term.replace(/\D/g, '')
    const rows = mine.filter(
      (x) => (picked.length === 0 || picked.includes(x.type)) && (!term || x.name.includes(term) || (digits.length > 1 && x.phone.replace(/\D/g, '').includes(digits))),
    )
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
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם או טלפון" aria-label="חיפוש לפי שם או טלפון" />
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
                  <td>
                    <span className={`ct-type is-${cl.type}`}>{typeOf(cl.type).one}</span>
                  </td>
                  <td className="ct-phone">
                    <a href={`tel:${cl.phone.replace(/-/g, '')}`} onClick={(e) => e.stopPropagation()}>
                      <Phone aria-hidden />
                      <bdi dir="ltr" className="num">
                        {cl.phone}
                      </bdi>
                    </a>
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
        {shown.length === 0 && <p className="ct-empty">אין לקוחות שמתאימים לחיפוש או לסינון.</p>}
      </div>
      <p className="ct-demo">
        <b className="num">{shown.length}</b> לקוחות מוצגים. נתוני דמו: השמות, הטלפונים והסכומים מומצאים.
      </p>

      <Details
        client={open}
        onClose={closeOpen}
        isOffice={isOffice}
        onMatch={(id) => {
          setOpenId(null)
          setMatchId(id)
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
      <Matches client={matching} onClose={closeMatch} onAsk={() => toast('בדמו ההודעה לא נשלחת. במערכת האמיתית נפתחת שיחה עם המתווך.')} />
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
          toast(ids.length === 1 ? 'נכס אחד נכנס ל-CRM, בלשונית "נכסים"' : `${ids.length} נכסים נכנסו ל-CRM, בלשונית "נכסים"`)
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

/** The details window: the stage and the quick marks. Every change is saved at once. */
function Details({
  client,
  onClose,
  isOffice,
  onMatch,
  onPublish,
  published,
}: {
  client: Client | null
  onClose: () => void
  isOffice: boolean
  onMatch: (id: string) => void
  onPublish?: () => void
  published?: string
}) {
  // keep the last client mounted while the window animates out
  const [last, setLast] = useState<Client | null>(client)
  if (client && client !== last) setLast(client)
  const cl = client ?? last
  if (!cl) return null
  const set = (p: Partial<Client>) => clientActions.patch(cl.id, p)
  const label = matchLabel(cl.type)
  const marks: { key: 'backToOwner' | 'tourSet' | 'exclusive'; text: string }[] = [
    { key: 'backToOwner', text: 'חזרתי לבעלים' },
    { key: 'tourSet', text: 'תואם סיור' },
    { key: 'exclusive', text: 'בלעדיות' },
  ]
  return (
    <Modal open={!!client} onClose={onClose} title={cl.name} subtitle={cl.about || typeOf(cl.type).one}>
      <div className="modal-body ct-det" data-id={cl.id}>
        <div className="ct-det-top">
          <span className={`ct-type is-${cl.type}`}>{typeOf(cl.type).one}</span>
          <a href={`tel:${cl.phone.replace(/-/g, '')}`} className="ct-det-phone">
            <Phone aria-hidden />
            <bdi dir="ltr" className="num">
              {cl.phone}
            </bdi>
          </a>
          <span className="ct-det-last">עדכון אחרון: {lastText(cl.lastDays)}</span>
        </div>

        <div className="ct-field">
          <span className="ct-label">שלב</span>
          <div className="ct-stage" role="radiogroup" aria-label="שלב">
            {crmStages.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={cl.stage === s.id} className={cl.stage === s.id ? 'is-on' : ''} onClick={() => set({ stage: s.id })}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ct-field">
          <span className="ct-label">סימון מהיר</span>
          <div className="ct-marks">
            {marks.map((m) => (
              <button key={m.key} type="button" role="switch" aria-checked={cl[m.key]} className={`ct-mark${cl[m.key] ? ' is-on' : ''}`} data-mark={m.key} onClick={() => set({ [m.key]: !cl[m.key] })}>
                <i aria-hidden>{cl[m.key] && <Check />}</i>
                {m.text}
              </button>
            ))}
          </div>
        </div>

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
    </Modal>
  )
}

/** Matches from the community for one client. Demo data. */
function Matches({ client, onClose, onAsk }: { client: Client | null; onClose: () => void; onAsk: () => void }) {
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
            </article>
          )
        })}
        <p className="ct-demo">התאמות מהקהילה, נתוני דמו. פרטי הלקוח שלך לא נחשפים למתווך השני.</p>
      </div>
    </Modal>
  )
}

function NewClient({ open, onClose, isOffice, onAdd }: { open: boolean; onClose: () => void; isOffice: boolean; onAdd: (p: { name: string; phone: string; type: ClientType }) => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [type, setType] = useState<ClientType>('buyer')
  const [err, setErr] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return setErr('צריך שם, לפחות שתי אותיות.')
    if (phone.replace(/\D/g, '').length < 9) return setErr('מספר הטלפון קצר מדי. למשל: 050-555-0199')
    onAdd({ name: name.trim(), phone: phone.trim(), type })
    setName('')
    setPhone('')
    setType('buyer')
    setErr('')
  }
  return (
    <Modal open={open} onClose={onClose} title="לקוח חדש" subtitle="שם, טלפון וסוג. את השאר מסמנים אחר כך בחלון הפרטים.">
      <form onSubmit={submit} noValidate>
        <div className="modal-body ct-new">
          <label className="ct-field">
            <span className="ct-label">שם הלקוח</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" data-f="name" />
          </label>
          <label className="ct-field">
            <span className="ct-label">טלפון</span>
            <input className="input ltr num" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" data-f="phone" />
          </label>
          <div className="ct-field">
            <span className="ct-label">סוג</span>
            <div className="ct-stage" role="radiogroup" aria-label="סוג">
              {TYPES.filter((t) => isOffice || !t.office).map((t) => (
                <button key={t.id} type="button" role="radio" aria-checked={type === t.id} className={type === t.id ? 'is-on' : ''} onClick={() => setType(t.id)}>
                  {t.one}
                </button>
              ))}
            </div>
          </div>
          {err && (
            <em className="ct-err" role="alert">
              {err}
            </em>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-gold" type="submit">
            <Plus />
            הוספת הלקוח
          </button>
          <button className="btn btn-quiet" type="button" onClick={onClose}>
            ביטול
          </button>
        </div>
      </form>
    </Modal>
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
