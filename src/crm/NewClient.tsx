import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent, KeyboardEvent } from 'react'
import { ArrowUpDown, Car, Check, Home, KeyRound, Lock, Minus, Plus, Shield, ShieldCheck, Sun, X } from 'lucide-react'
import { Modal } from '../components/ui'
import { formatPriceShort } from '../data/demo'
import { knownCities } from '../green/whatsapp'
import { useStore } from '../store'
import { TYPES } from './clients'
import type { Client, ClientType } from './clients'
import { GROUPS, KINDS, searchGroup } from '../config/propertyTypes'
import type { PropGroup } from '../config/propertyTypes'
import '../styles/new-client.css'
import { PlacePicker } from '../components/PlacePicker'
import { CityFind } from '../components/CityFind'
import '../styles/post-form.css'

/**
 * A new client. For a buyer or a renter it is a full search, like the property card: buy or rent, a budget from and
 * to, cities and neighbourhoods, the kind of home, rooms from and to, the must-haves and a free line. Big buttons, and
 * everything has a sensible default, so a broker on the phone is done in under a minute. Sellers and the office's
 * types keep the short form (name, phone, type).
 */
export type NewClientInput = Pick<Client, 'name' | 'phone' | 'type'> & Partial<Pick<Client, 'about' | 'cities' | 'rooms' | 'sum' | 'budgetMin' | 'neighborhoods' | 'streets' | 'kinds' | 'group' | 'roomsMin' | 'roomsMax' | 'must' | 'wants' | 'note'>>

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

/** the step of the budget's scale that is closest to a sum */
const near = (steps: number[], n: number) => steps.reduce((best, s, i) => (Math.abs(s - n) < Math.abs(steps[best] - n) ? i : best), 0)

/**
 * `edit` (Itzik 27.11.2026): the same form opens filled with a client's details, and saving changes that client.
 * Everything can be changed there, the phone too; a client of a short kind (a seller, a landlord, the office's kinds)
 * also gets the line about them, their cities, the rooms and the sum.
 */
export default function NewClient({ open, onClose, isOffice, onAdd, searchOnly = false, edit = null }: { open: boolean; onClose: () => void; isOffice: boolean; onAdd: (p: NewClientInput) => void; searchOnly?: boolean; edit?: Client | null }) {
  const { myCities } = useStore()
  // what the short kinds of client keep, and the note: asked only when a client is edited
  const [about, setAbout] = useState('')
  const [sumText, setSumText] = useState('')
  const [roomsText1, setRoomsText1] = useState('')
  const [note, setNote] = useState('')
  // the sums as they were saved: the scale has fixed steps, so a budget that is not touched keeps its own number
  const [orig, setOrig] = useState<{ lo: number; hi: number; min?: number; max: number; rent: boolean } | null>(null)
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
    setAbout('')
    setSumText('')
    setRoomsText1('')
    setNote('')
    setOrig(null)
  }
  /** the form as this client was saved */
  const load = (cl: Client) => {
    const isRent = cl.type === 'renter'
    const scale = isRent ? RENT : SALE
    const def = isRent ? DEFAULTS.rent : DEFAULTS.sale
    const top = cl.sum > 0 ? near(scale, cl.sum) : def[1]
    const low = cl.budgetMin ? near(scale, cl.budgetMin) : cl.sum > 0 ? 0 : def[0]
    const hiIdx = Math.max(top, 1)
    setName(cl.name)
    setPhone(cl.phone)
    setType(cl.type)
    setErr('')
    setRange([Math.min(low, hiIdx - 1), hiIdx])
    setOrig(cl.sum > 0 ? { lo: Math.min(low, hiIdx - 1), hi: hiIdx, min: cl.budgetMin, max: cl.sum, rent: isRent } : null)
    setCities(cl.cities)
    setAllCities(false)
    setHoods(cl.neighborhoods ?? [])
    setStreetList(cl.streets ?? [])
    setManual([])
    setGroup(searchGroup({ group: cl.group, kinds: cl.kinds }))
    setKinds(cl.kinds ?? [])
    setRoomsMin(cl.roomsMin ?? (cl.rooms > 0 ? cl.rooms : 3))
    setRoomsMax(cl.roomsMax ?? (cl.rooms > 0 ? cl.rooms : 4))
    setMust(cl.must ?? [])
    setWants(cl.wants ?? '')
    setAbout(cl.about)
    setSumText(cl.sum > 0 ? String(cl.sum) : '')
    setRoomsText1(cl.rooms > 0 ? String(cl.rooms) : '')
    setNote(cl.note)
  }
  useEffect(() => {
    if (!open) return
    if (edit) load(edit)
    else reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // buying and renting are two scales: switching sets the budget back to a sensible range of the other
  const pickType = (t: ClientType) => {
    if ((t === 'renter') !== rent) setRange(t === 'renter' ? [...DEFAULTS.rent] : [...DEFAULTS.sale])
    setType(t)
  }
  // a handle that was not moved since the client was opened for editing stands for the sum that was saved
  const keepMin = !!orig && orig.rent === rent && orig.lo === lo
  const keepMax = !!orig && orig.rent === rent && orig.hi === hi
  const sumLo = (keepMin ? orig?.min : undefined) ?? steps[lo]
  const sumHi = keepMax && orig ? orig.max : steps[hi]
  const flip = (list: string[], v: string, set: (l: string[]) => void) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return setErr('צריך שם, לפחות שתי אותיות.')
    // the phone is not a must since 23.11.2026 (Itzik). Written but too short, it is still said, so a half number
    // is not kept by mistake; left empty it is asked for later, when something really needs it.
    if (phone.trim() && phone.replace(/\D/g, '').length < 9) return setErr('מספר הטלפון קצר מדי. למשל: 050-555-0199')
    const digitsOf = (s: string) => Number(s.replace(/[^\d.]/g, '')) || 0
    if (!searching) {
      // a new client of a short kind is a name, a phone and a kind; an edited one keeps everything the card shows
      onAdd(edit ? { name: name.trim(), phone: phone.trim(), type, about: about.trim(), cities, rooms: digitsOf(roomsText1), sum: digitsOf(sumText), note: note.trim() } : { name: name.trim(), phone: phone.trim(), type })
      return
    }
    const allHoods = hoods
    const min = keepMin ? orig?.min : steps[lo]
    const max = sumHi
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
      ...(edit ? { note: note.trim() } : {}),
      about: aboutOf({ rent, cities, hoods: allHoods, roomsMin, roomsMax, lo: sumLo, hi: max, hiIsTop: !keepMax && hi === steps.length - 1, business: group === 'business', kinds }),
    })
  }

  const cityList = allCities ? [...new Set([...knownCities, ...cities])].sort((a, b) => a.localeCompare(b, 'he')) : [...new Set([...cities, ...myCities, ...FIRST_CITIES])].filter((c) => cities.includes(c) || knownCities.includes(c)).slice(0, Math.max(9, cities.length))
  const pct = (i: number) => (i / (steps.length - 1)) * 100
  const fill = { '--lo': `${pct(lo)}%`, '--hi': `${100 - pct(hi)}%` } as CSSProperties

  return (
    <Modal open={open} onClose={onClose} title={edit ? 'עריכת לקוח' : 'לקוח חדש'} subtitle={edit ? 'כל הפרטים של הלקוח במקום אחד, כולל הטלפון. רק שם חובה.' : searching ? 'מה הוא מחפש, בכמה לחיצות. רק שם חובה.' : 'שם וסוג, והשאר מסמנים אחר כך בחלון הפרטים. רק שם חובה.'}>
      <form onSubmit={submit} noValidate>
        <div className="modal-body ct-new nc" data-form={edit ? 'edit-client' : 'new-client'}>
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
                      {money(sumLo, rent, false)}
                    </b>
                  </span>
                  <i aria-hidden />
                  <span>
                    <small>עד</small>
                    <b className="num" data-budget="max">
                      {money(sumHi, rent, !keepMax && hi === steps.length - 1)}
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
                <CityFind id="buyer" many picked={cities} onPick={(c) => flip(cities, c, setCities)} />
              </div>

              {/* streets and neighbourhoods, several, from the cities' lists or the map */}
              <div className="ct-field" data-f="hoods">
                <span className="ct-label">שכונות ורחובות</span>
                <PlacePicker
                  id="buyer"
                  many
                  what="client"
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

          {/* editing a seller, a landlord or one of the office's kinds: the lines their card shows */}
          {edit && !searching && (
            <section className="nc-edit-more" aria-label="פרטי הלקוח" data-edit-more>
              <label className="ct-field">
                <span className="ct-label">תיאור קצר</span>
                <input className="input" value={about} maxLength={90} onChange={(e) => setAbout(e.target.value)} placeholder="לדוגמה: דירת 4 חדרים בגבעתיים, למכירה" autoComplete="off" data-f="about" />
              </label>
              <div className="ct-field" data-f="cities">
                <span className="ct-label">ערים {cities.length > 0 && <b className="nc-count num">{cities.length}</b>}</span>
                {cities.length > 0 && (
                  <div className="nc-picks">
                    {cities.map((c) => (
                      <button key={c} type="button" className="nc-pick" aria-pressed="true" onClick={() => flip(cities, c, setCities)} data-city={c}>
                        {c}
                      </button>
                    ))}
                  </div>
                )}
                <CityFind id="client-edit" many picked={cities} onPick={(c) => flip(cities, c, setCities)} />
              </div>
              <div className="nc-edit-two">
                <label className="ct-field">
                  <span className="ct-label">חדרים</span>
                  <input className="input num" inputMode="decimal" value={roomsText1} onChange={(e) => setRoomsText1(e.target.value)} placeholder="4" autoComplete="off" data-f="rooms-one" />
                </label>
                <label className="ct-field">
                  <span className="ct-label">{type === 'landlord' ? 'שכירות לחודש, בשקלים' : 'מחיר, בשקלים'}</span>
                  <input className="input num" inputMode="numeric" value={sumText} onChange={(e) => setSumText(e.target.value)} placeholder={type === 'landlord' ? '5200' : '2650000'} autoComplete="off" data-f="sum" />
                </label>
              </div>
            </section>
          )}
          {edit && (
            <label className="ct-field">
              <span className="ct-label">הערה קצרה</span>
              <input className="input" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder="למשל: לחזור אחרי החג" autoComplete="off" data-f="note" />
            </label>
          )}

          {err && (
            <em className="ct-err" role="alert">
              {err}
            </em>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-gold" type="submit" data-act={edit ? 'save-client' : 'add-client'}>
            {edit ? <Check /> : <Plus />}
            {edit ? 'שמירת השינויים' : 'הוספת הלקוח'}
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
