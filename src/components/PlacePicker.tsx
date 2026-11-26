import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Lock, MapPin, Map as MapIcon, PenLine, Search, X } from 'lucide-react'
import { clearMatch, findNames, hasMap, loadPlaces, samePlace } from '../config/places'
import type { CityPlaces } from '../config/places'
import { HoodMap } from './HoodMap'
import '../styles/places.css'

/**
 * A street and a neighbourhood from a list, or from the map (Itzik 22.11.2026; the way of Scouty Pro's "הוספת נכס
 * שלי"): the city is a blue chip on top; under it "רחוב" and "שכונה"; one letter or more opens a list to scroll, a
 * box to tick by each name; every choice is a blue chip with an X. A property has one street and one
 * neighbourhood; a buyer's search may have several of each. A name that is not in the list is added by hand, and
 * kept marked as such ("ידני"). A name that was typed freely before the lists existed stays as it was; when it is
 * clearly one of the list, the list's name is offered.
 *
 * The order is always city, then neighbourhood, then street (Ofek and Ariel, 26.11.2026): "שכונה" is the first of
 * the two and the one that is open. Until a city is picked the field is locked, and a tap on it says "קודם בוחרים
 * עיר". With several cities, the names in the list are grouped under their city.
 */
export type Picked = { streets: string[]; hoods: string[]; manual: string[] }
type Kind = 'street' | 'hood'

export function PlacePicker({
  id,
  cities: given,
  value,
  onChange,
  many = false,
  streets = true,
  what = 'property',
}: {
  id: string
  cities: string[]
  value: Picked
  onChange: (next: Picked) => void
  /** a buyer's search: several of each */
  many?: boolean
  /** a field that asks for neighbourhoods only */
  streets?: boolean
  /** what the place is being picked for, so the map says the right thing (23.11.2026) */
  what?: 'property' | 'client'
}) {
  const cities = useMemo(() => given.filter(Boolean), [given.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps
  const [kind, setKind] = useState<Kind>('hood')
  const [typed, setTyped] = useState('')
  const [data, setData] = useState<CityPlaces[]>([])
  // which cities the lists were asked for and have answered: a city with no list says so, and is added by hand
  const [loadedFor, setLoadedFor] = useState('')
  // the locked field was tapped before a city was picked
  const [lockSaid, setLockSaid] = useState(false)
  const [mapOf, setMapOf] = useState<CityPlaces | null>(null)
  const box = useRef<HTMLInputElement>(null)
  const key = cities.join('|')
  useEffect(() => {
    let live = true
    Promise.all(cities.map(loadPlaces)).then((all) => {
      if (!live) return
      setData(all.filter(Boolean) as CityPlaces[])
      setLoadedFor(key)
    })
    if (cities.length) setLockSaid(false)
    return () => {
      live = false
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setTyped(''), [kind])

  const several = data.length > 1
  // every name of the cities picked, said with its city when there are several
  const names = useMemo(() => {
    const out: { name: string; city: string }[] = []
    for (const d of data) for (const n of kind === 'street' ? d.streets : d.hoods) out.push({ name: n, city: d.city })
    return out
  }, [data, kind])
  const shown = useMemo(() => {
    if (!typed.trim()) return []
    // in the order findNames gives them (23.11.2026): the names that start with what was typed come first, then
    // those whose second or third word does, and only then those that have it somewhere inside. One name that two
    // cities both have stays two rows, each with its own city.
    const rows = new Map<string, { name: string; city: string }[]>()
    for (const x of names) rows.set(x.name, [...(rows.get(x.name) ?? []), x])
    const out: { name: string; city: string }[] = []
    const seen = new Set<string>()
    for (const n of findNames(
      names.map((x) => x.name),
      typed,
      80,
    )) {
      if (seen.has(n)) continue
      seen.add(n)
      out.push(...(rows.get(n) ?? []))
    }
    const top = out.slice(0, 80)
    // several cities: each city's names together, under its name, in the order the cities were picked
    return data.length > 1 ? cities.flatMap((c) => top.filter((x) => x.city === c)) : top
  }, [names, typed, data.length, cities])

  const list = kind === 'street' ? value.streets : value.hoods
  const set = (k: Kind, next: string[], manualAdd?: string) => {
    const other = k === 'street' ? value.hoods : value.streets
    const keep = value.manual.filter((m) => next.includes(m) || other.includes(m))
    onChange({ streets: k === 'street' ? next : value.streets, hoods: k === 'hood' ? next : value.hoods, manual: manualAdd ? [...keep, manualAdd] : keep })
  }
  const toggle = (n: string) => {
    const on = list.includes(n)
    if (on) set(kind, list.filter((x) => x !== n))
    else set(kind, many ? [...list, n] : [n])
    if (!many && !on) setTyped('')
    box.current?.focus({ preventScroll: true })
  }
  const addByHand = () => {
    const n = typed.replace(/\s+/g, ' ').trim()
    if (!n || list.some((x) => samePlace(x, n))) return
    set(kind, many ? [...list, n] : [n], n)
    setTyped('')
  }
  const remove = (k: Kind, n: string) => set(k, (k === 'street' ? value.streets : value.hoods).filter((x) => x !== n))

  // a name kept from before the lists, not in them: the list's name when it is clearly that one
  const all = useMemo(() => ({ street: data.flatMap((d) => d.streets), hood: data.flatMap((d) => d.hoods) }), [data])
  const offer = (k: Kind, n: string) => {
    const pool = all[k]
    if (!pool.length || pool.includes(n) || value.manual.includes(n)) return null
    const m = clearMatch(pool, n)
    return m && m !== n ? m : null
  }
  const free = (k: Kind, n: string) => !!all[k].length && !all[k].includes(n) && !value.manual.includes(n)
  const swap = (k: Kind, from: string, to: string) => set(k, (k === 'street' ? value.streets : value.hoods).map((x) => (x === from ? to : x)))

  const mapCity = data.find((d) => d.map)
  const chips = (k: Kind) =>
    (k === 'street' ? value.streets : value.hoods).map((n) => {
      const better = offer(k, n)
      const isManual = value.manual.includes(n)
      return (
        <span key={`${k}:${n}`} className="pl-chip-wrap">
          <span className={`pl-chip${isManual || free(k, n) ? ' is-manual' : ''}`} data-chip={k} data-name={n}>
            {k === 'street' ? <MapPin aria-hidden /> : null}
            {n}
            {isManual && <em>ידני</em>}
            {!isManual && free(k, n) && <em>מלפני</em>}
            <button type="button" onClick={() => remove(k, n)} aria-label={`הסרת ${n}`} data-act="remove-chip">
              <X aria-hidden />
            </button>
          </span>
          {better && (
            <button type="button" className="pl-offer" onClick={() => swap(k, n, better)} data-offer={better}>
              להחליף לשם האחיד: <b>{better}</b>
            </button>
          )}
        </span>
      )
    })

  return (
    <div className="pl" data-places={id} data-street-value={value.streets.join('|')} data-hood-value={value.hoods.join('|')}>
      {/* the city (or the cities), as blue chips */}
      <div className="pl-cities" aria-label="עיר">
        {cities.length ? cities.map((c) => <span key={c} className="pl-city">{c}</span>) : <span className="pl-hint">בוחרים קודם עיר</span>}
      </div>
      {(value.streets.length > 0 || value.hoods.length > 0) && (
        <div className="pl-chips" aria-live="polite">
          {chips('hood')}
          {chips('street')}
        </div>
      )}
      {cities.length === 0 && (
        <>
          {/* no city yet: the field is there, locked, and a tap on it says what comes first */}
          <button type="button" className="pl-lock" aria-disabled="true" aria-describedby={lockSaid ? `${id}-lock-msg` : undefined} onClick={() => setLockSaid(true)} data-lock="hood">
            <Lock aria-hidden />
            <span>{streets ? 'שכונה ורחוב' : 'שכונה'}</span>
          </button>
          {lockSaid && (
            <p className="pl-lock-msg" id={`${id}-lock-msg`} role="status" data-msg="city-first">
              קודם בוחרים עיר
            </p>
          )}
        </>
      )}
      {cities.length > 0 && (
        <>
          {/* with nothing to choose between (a field of neighbourhoods alone) one tab on its own says nothing */}
          {streets && (
            <div className="pl-kinds" role="radiogroup" aria-label="מה בוחרים">
              <button type="button" role="radio" aria-checked={kind === 'hood'} onClick={() => setKind('hood')} data-kind="hood">
                שכונה{value.hoods.length > 0 && <b className="num">{value.hoods.length}</b>}
              </button>
              <button type="button" role="radio" aria-checked={kind === 'street'} onClick={() => setKind('street')} data-kind="street">
                רחוב{value.streets.length > 0 && <b className="num">{value.streets.length}</b>}
              </button>
            </div>
          )}
          <label className="pl-search">
            <Search aria-hidden />
            <input
              ref={box}
              className="input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              // inside a form (the sign-up page) Enter must not send the form
              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
              placeholder={kind === 'street' ? 'מקלידים שם של רחוב' : 'מקלידים שם של שכונה'}
              aria-label={kind === 'street' ? 'חיפוש רחוב' : 'חיפוש שכונה'}
              autoComplete="off"
              enterKeyHint="search"
              data-f={`${kind}-search`}
            />
          </label>
          {typed.trim() && (
            <div className="pl-list" role="listbox" aria-multiselectable={many} data-list={kind}>
              {shown.length ? (
                shown.map((x, i) => {
                  const on = list.includes(x.name)
                  return (
                    <Fragment key={`${x.city}:${x.name}`}>
                      {several && shown[i - 1]?.city !== x.city && (
                        <span className="pl-group" role="presentation" data-group={x.city}>
                          {x.city}
                        </span>
                      )}
                      <button type="button" role="option" aria-selected={on} className="pl-row" onClick={() => toggle(x.name)} data-pick={x.name} data-of={several ? x.city : undefined} aria-label={several ? `${x.name}, ${x.city}` : undefined}>
                        <span className="pl-box" aria-hidden>
                          {on && <Check />}
                        </span>
                        <span className="pl-row-name">{x.name}</span>
                      </button>
                    </Fragment>
                  )
                })
              ) : (
                <p className="pl-none">{data.length ? 'לא נמצא ברשימה.' : loadedFor === key ? 'אין לנו עדיין רשימה לעיר הזאת. אפשר להוסיף ידנית.' : 'טוענים את הרשימה'}</p>
              )}
              <button type="button" className="pl-manual" onClick={addByHand} data-act="manual">
                <PenLine aria-hidden /> לא מצאתי, להוסיף ידנית: <b>{typed.trim()}</b>
              </button>
            </div>
          )}
          {kind === 'hood' && cities.some(hasMap) && (
            <button type="button" className="pl-map-btn" onClick={() => mapCity && setMapOf(mapCity)} disabled={!mapCity} data-act="open-map">
              <MapIcon aria-hidden /> בחירה מהמפה
              <b>{many ? 'אפשר כמה שכונות' : 'השכונה על המפה'}</b>
            </button>
          )}
        </>
      )}
      {mapOf?.map && (
        <HoodMap
          open
          what={what}
          places={mapOf}
          picked={value.hoods.filter((h) => mapOf.map!.hoods.some((m) => m.n === h))}
          many={many}
          onClose={() => setMapOf(null)}
          onDone={(onMap) => {
            // what was picked on the map replaces what was picked of this city's map; the rest stays
            const offMap = value.hoods.filter((h) => !mapOf.map!.hoods.some((m) => m.n === h))
            set('hood', many ? [...offMap, ...onMap] : onMap.slice(0, 1).length ? onMap.slice(0, 1) : offMap)
            setMapOf(null)
          }}
        />
      )}
    </div>
  )
}
