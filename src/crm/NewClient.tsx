import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent, KeyboardEvent } from 'react'
import { ArrowUpDown, Car, Home, KeyRound, Lock, Minus, Plus, Shield, ShieldCheck, Sun, X } from 'lucide-react'
import { Modal } from '../components/ui'
import { formatPriceShort } from '../data/demo'
import { knownCities } from '../green/whatsapp'
import { useStore } from '../store'
import { TYPES } from './clients'
import type { Client, ClientType } from './clients'
import { GROUPS, KINDS } from '../config/propertyTypes'
import type { PropGroup } from '../config/propertyTypes'
import '../styles/new-client.css'
import { PlacePicker } from '../components/PlacePicker'
import '../styles/post-form.css'

/**
 * A new client. For a buyer or a renter it is a full search, like the property card: buy or rent, a budget from and
 * to, cities and neighbourhoods, the kind of home, rooms from and to, the must-haves and a free line. Big buttons, and
 * everything has a sensible default, so a broker on the phone is done in under a minute. Sellers and the office's
 * types keep the short form (name, phone, type).
 */
export type NewClientInput = Pick<Client, 'name' | 'phone' | 'type'> & Partial<Pick<Client, 'about' | 'cities' | 'rooms' | 'sum' | 'budgetMin' | 'neighborhoods' | 'streets' | 'kinds' | 'group' | 'roomsMin' | 'roomsMax' | 'must' | 'wants'>>

const SALE = [500000, 750000, 1000000, 1250000, 1500000, 1750000, 2000000, 2250000, 2500000, 2750000, 3000000, 3500000, 4000000, 4500000, 5000000, 6000000, 7000000, 8000000, 10000000, 12000000, 15000000]
const RENT = [1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 8000, 9000, 10000, 12000, 15000, 20000]
const DEFAULTS = { sale: [4, 10], rent: [5, 11] } as const
// the kinds of property are the one list of config/propertyTypes.ts (22.11.2026), in two steps like the property form
const MUST: { id: string; icon: typeof Car }[] = [
  { id: 'חניה', icon: Car },
  { id: 'מעלית', icon: ArrowUpDown },
  { id: 'ממ"ד', icon: ShieldCheck },
  { id: 'ממ"ק', icon: Shield },
  { id: 'מרפסת', icon: Sun },
]
const FIRST_CITIES = ['תל אביב', 'רמת גן', 'גבעתיים', 'פתח תקווה', 'חיפה', 'ירושלים', 'באר שבע', 'נתניה', 'ראשון לציון']

const money = (n: number, rent: boolean, last: boolean) => (rent ? `${n.toLocaleString('he-IL')} ₪${last ? '+' : ''}` : `${formatPriceShort(n)}${last ? '+' : ''}`)
const roomsText = (a: number, b: number) => (a === b ? `${a} חדרים` : `${a} עד ${b} חדרים`)

/** One line for the table: what this client is looking for, in plain words. */
export function aboutOf(p: { rent: boolean; cities: string[]; hoods: string[]; roomsMin: number; roomsMax: number; lo: number; hi: number; hiIsTop: boolean; business?: boolean; kinds?: string[] }) {
  const where = p.hoods.length ? p.hoods.join(', ') + (p.cities.length ? ` (${p.cities.join(', ')})` : '') : p.cities.join(' או ')
  const budget = `${money(p.lo, p.rent, false)} עד ${money(p.hi, p.rent, p.hiIsTop)}${p.rent ? ' לחודש' : ''}`
  // a commercial property has no rooms: the line says which kinds
  const what = p.business ? (p.kinds?.length ? p.kinds.join(', ') : 'נכס מסחרי') : roomsText(p.roomsMin, p.roomsMax)
  return `${p.rent ? 'מחפש לשכור' : 'מחפש לקנות'} ${what}${where ? ` ב${where}` : ''}, ${budget}`
}

export default function NewClient({ open, onClose, isOffice, onAdd, searchOnly = false }: { open: boolean; onClose: () => void; isOffice: boolean; onAdd: (p: NewClientInput) => void; searchOnly?: boolean }) {
  const { myCities } = useStore()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [type, setType] = useState<ClientType>('buyer')
  const [err, setErr] = useState('')
  // the search
  const [range, setRange] = useState<[number, number]>([...DEFAULTS.sale])
  const [cities, setCities] = useState<string[]>([])
  const [allCities, setAllCities] = useState(false)
  const [hoods, setHoods] = useState<string[]>([])
  // streets and neighbourhoods are picked from the cities' lists, or from the map (22.11.2026); several of each
  const [streetList, setStreetList] = useState<string[]>([])
  const [manual, setManual] = useState<string[]>([])
  const [group, setGroup] = useState<PropGroup>('home')
  const [kinds, setKinds] = useState<string[]>(['דירה'])
  const [roomsMin, setRoomsMin] = useState(3)
  const [roomsMax, setRoomsMax] = useState(4)
  const [must, setMust] = useState<string[]>([])
  const [wants, setWants] = useState('')

  const searching = type === 'buyer' || type === 'renter'
  const rent = type === 'renter'
  const steps = rent ? RENT : SALE
  const [lo, hi] = range

  const reset = () => {
    setName('')
    setPhone('')
    setType('buyer')
    setErr('')
    setRange([...DEFAULTS.sale])
    setCities([])
    setAllCities(false)
    setHoods([])
    setStreetList([])
    setManual([])
    setGroup('home')
    setKinds(['דירה'])
    setRoomsMin(3)
    setRoomsMax(4)
    setMust([])
    setWants('')
  }
  useEffect(() => {
    if (!open) return
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // buying and renting are two scales: switching sets the budget back to a sensible range of the other
  const pickType = (t: ClientType) => {
    if ((t === 'renter') !== rent) setRange(t === 'renter' ? [...DEFAULTS.rent] : [...DEFAULTS.sale])
    setType(t)
  }
  const flip = (list: string[], v: string, set: (l: string[]) => void) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return setErr('צריך שם, לפחות שתי אותיות.')
    // the phone is not a must since 23.11.2026 (Itzik). Written but too short, it is still said, so a half number
    // is not kept by mistake; left empty it is asked for later, when something really needs it.
    if (phone.trim() && phone.replace(/\D/g, '').length < 9) return setErr('מספר הטלפון קצר מדי. למשל: 050-555-0199')
    if (!searching) {
      onAdd({ name: name.trim(), phone: phone.trim(), type })
      return
    }
    const allHoods = hoods
    const min = steps[lo]
    const max = steps[hi]
    onAdd({
      name: name.trim(),
      phone: phone.trim(),
      type,
      cities,
      neighborhoods: allHoods,
      streets: streetList,
      kinds,
      group,
      roomsMin,
      roomsMax,
      rooms: Math.round((roomsMin + roomsMax) / 2),
      budgetMin: min,
      sum: max,
      must,
      wants: wants.trim(),
      about: aboutOf({ rent, cities, hoods: allHoods, roomsMin, roomsMax, lo: min, hi: max, hiIsTop: hi === steps.length - 1, business: group === 'business', kinds }),
    })
  }

  const cityList = allCities ? [...knownCities].sort((a, b) => a.localeCompare(b, 'he')) : [...new Set([...cities, ...myCities, ...FIRST_CITIES])].filter((c) => knownCities.includes(c)).slice(0, Math.max(9, cities.length))
  const pct = (i: number) => (i / (steps.length - 1)) * 100
  const fill = { '--lo': `${pct(lo)}%`, '--hi': `${100 - pct(hi)}%` } as CSSProperties

  return (
    <Modal open={open} onClose={onClose} title="לקוח חדש" subtitle={searching ? 'מה הוא מחפש, בכמה לחיצות. רק שם חובה.' : 'שם וסוג, והשאר מסמנים אחר כך בחלון הפרטים. רק שם חובה.'}>
      <form onSubmit={submit} noValidate>
        <div className="modal-body ct-new nc">
          <div className="nc-row">
            <label className="ct-field">
              <span className="ct-label">שם הלקוח</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" enterKeyHint="next" data-f="name" />
            </label>
            <label className="ct-field">
              <span className="ct-label">טלפון (לא חובה)</span>
              <input className="input ltr num" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" enterKeyHint="next" data-f="phone" />
              {/* right under the field it belongs to, and only under it: it is about the number, not about the form */}
              <small className="nc-safe" data-f="phone-note">
                <Lock aria-hidden />
                המספר נשמר רק אצלך. מתווכים אחרים לא רואים אותו.
              </small>
            </label>
          </div>
          <div className="ct-field">
            <span className="ct-label">סוג</span>
            <div className="ct-stage" role="radiogroup" aria-label="סוג">
              {TYPES.filter((t) => (isOffice || !t.office) && (!searchOnly || t.id === 'buyer' || t.id === 'renter')).map((t) => (
                <button key={t.id} type="button" role="radio" aria-checked={type === t.id} className={type === t.id ? 'is-on' : ''} onClick={() => pickType(t.id)} data-type={t.id}>
                  {t.one}
                </button>
              ))}
            </div>
          </div>

          {searching && (
            <section className="nc-search" aria-label="מה הלקוח מחפש" data-search>
              <h3 className="nc-title">מה הוא מחפש</h3>

              {/* buy or rent */}
              <div className="nc-seg" role="radiogroup" aria-label="קנייה או השכרה">
                <button type="button" role="radio" aria-checked={!rent} onClick={() => pickType('buyer')} data-deal="sale">
                  <Home /> קנייה
                </button>
                <button type="button" role="radio" aria-checked={rent} onClick={() => pickType('renter')} data-deal="rent">
                  <KeyRound /> השכרה
                </button>
              </div>

              {/* the budget, from and to */}
              <div className="ct-field" data-f="budget">
                <span className="ct-label">{rent ? 'שכירות לחודש' : 'תקציב'}</span>
                <div className="nc-amounts" aria-live="polite">
                  <span>
                    <small>מ-</small>
                    <b className="num" data-budget="min">
                      {money(steps[lo], rent, false)}
                    </b>
                  </span>
                  <i aria-hidden />
                  <span>
                    <small>עד</small>
                    <b className="num" data-budget="max">
                      {money(steps[hi], rent, hi === steps.length - 1)}
                    </b>
                  </span>
                  {rent && <em>לחודש</em>}
                </div>
                <div className="nc-range" style={fill}>
                  <span className="nc-track" aria-hidden>
                    <span className="nc-fill" />
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={steps.length - 1}
                    step={1}
                    value={lo}
                    onChange={(e) => setRange([Math.min(Number(e.target.value), hi - 1), hi])}
                    aria-label={rent ? 'שכירות מינימלית' : 'תקציב מינימלי'}
                    aria-valuetext={money(steps[lo], rent, false)}
                    data-range="min"
                  />
                  <input
                    type="range"
                    min={0}
                    max={steps.length - 1}
                    step={1}
                    value={hi}
                    onChange={(e) => setRange([lo, Math.max(Number(e.target.value), lo + 1)])}
                    aria-label={rent ? 'שכירות מקסימלית' : 'תקציב מקסימלי'}
                    aria-valuetext={money(steps[hi], rent, hi === steps.length - 1)}
                    data-range="max"
                  />
                </div>
              </div>

              {/* cities, several */}
              <div className="ct-field" data-f="cities">
                <span className="ct-label">ערים {cities.length > 0 && <b className="nc-count num">{cities.length}</b>}</span>
                <div className="nc-picks">
                  {cityList.map((c) => (
                    <button key={c} type="button" className="nc-pick" aria-pressed={cities.includes(c)} onClick={() => flip(cities, c, setCities)} data-city={c}>
                      {c}
                    </button>
                  ))}
                  <button type="button" className="nc-pick is-more" aria-expanded={allCities} onClick={() => setAllCities(!allCities)}>
                    {allCities ? 'פחות ערים' : 'עוד ערים'}
                  </button>
                </div>
              </div>

              {/* streets and neighbourhoods, several, from the cities' lists or the map */}
              <div className="ct-field" data-f="hoods">
                <span className="ct-label">שכונות ורחובות</span>
                <PlacePicker
                  id="buyer"
                  many
                  cities={cities}
                  value={{ streets: streetList, hoods, manual }}
                  onChange={(p) => {
                    setStreetList(p.streets)
                    setHoods(p.hoods)
                    setManual(p.manual)
                  }}
                />
              </div>

              {/* the kind of property, in two steps: the group, then the kinds of that group (as many as fit the buyer) */}
              <div className="ct-field pf-step" data-f="kinds">
                <span className="ct-label">סוג נכס</span>
                <div className="pf-groups is-small" role="group" aria-label="מגורים או מסחרי">
                  {GROUPS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      className="pf-group"
                      aria-pressed={group === g.id}
                      data-group={g.id}
                      onClick={() => {
                        if (group === g.id) return
                        setGroup(g.id)
                        // the kinds of the other group mean nothing here: a home starts from a flat, a commercial search from every kind
                        setKinds(g.id === 'home' ? ['דירה'] : [])
                      }}
                    >
                      <g.icon aria-hidden /> {g.label}
                    </button>
                  ))}
                </div>
                <div className="nc-picks" data-kinds={group}>
                  {KINDS[group].map((k) => (
                    <button key={k} type="button" className="nc-pick" aria-pressed={kinds.includes(k)} onClick={() => flip(kinds, k, setKinds)} data-kind={k}>
                      {k}
                    </button>
                  ))}
                </div>
                <small className="nc-kinds-note">{kinds.length === 0 ? `בלי סימון: כל סוגי ה${group === 'business' ? 'מסחרי' : 'מגורים'}.` : 'אפשר לסמן כמה סוגים.'}</small>
              </div>

              {/* rooms, from and to (a commercial property is not counted in rooms) */}
              {group === 'home' && (
                <div className="ct-field" data-f="rooms">
                  <span className="ct-label">חדרים</span>
                  <div className="nc-rooms">
                    <Stepper label="מ-" value={roomsMin} min={1} max={roomsMax} onChange={setRoomsMin} id="min" />
                    <Stepper label="עד" value={roomsMax} min={roomsMin} max={8} onChange={setRoomsMax} id="max" />
                  </div>
                </div>
              )}

              {/* the must-haves */}
              <div className="ct-field" data-f="must">
                <span className="ct-label">חייב שיהיה</span>
                <div className="nc-must">
                  {MUST.map((m) => (
                    <button key={m.id} type="button" className="nc-pick is-must" aria-pressed={must.includes(m.id)} onClick={() => flip(must, m.id, setMust)} data-must={m.id}>
                      <m.icon /> {m.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* free words */}
              <label className="ct-field">
                <span className="ct-label">מה הוא מחפש, במילים שלו</span>
                <textarea className="textarea" rows={3} value={wants} onChange={(e) => setWants(e.target.value)} placeholder="לדוגמה: קומה גבוהה, קרוב לבית ספר, כניסה עד הקיץ" data-f="wants" />
              </label>
            </section>
          )}

          {err && (
            <em className="ct-err" role="alert">
              {err}
            </em>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-gold" type="submit" data-act="add-client">
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

/** rooms by halves: minus and plus, big enough for a thumb */
function Stepper({ label, value, min, max, onChange, id }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; id: string }) {
  return (
    <div className="nc-step" role="group" aria-label={`חדרים ${label}`} data-step={id}>
      <span className="nc-step-label">{label}</span>
      <button type="button" onClick={() => onChange(Math.max(min, value - 0.5))} disabled={value <= min} aria-label={`פחות חדרים (${label})`} data-dir="down">
        <Minus />
      </button>
      <b className="num" aria-live="polite">
        {value}
        {id === 'max' && value >= 8 ? '+' : ''}
      </b>
      <button type="button" onClick={() => onChange(Math.min(max, value + 0.5))} disabled={value >= max} aria-label={`יותר חדרים (${label})`} data-dir="up">
        <Plus />
      </button>
    </div>
  )
}
