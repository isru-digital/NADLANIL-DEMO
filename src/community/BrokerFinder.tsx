import { useEffect, useMemo, useState } from 'react'
import { BellRing, Check, MapPin, Search, Send, Star, X } from 'lucide-react'
import { CURRENT_BROKER_ID } from '../config'
import { REFERRAL_TERMS } from '../config/topics'
import { brokers } from '../data/demo'
import type { Broker } from '../data/demo'
import { knownCities } from '../green/whatsapp'
import { findCities } from '../config/cities'
import { useStore } from '../store'
import { Avatar, Modal } from '../components/ui'
import { nameSlots } from '../config/navExtras'
import { clientActions } from '../crm/clients'
import '../styles/broker-finder.css'

/**
 * "מציאת מתווך בעיר אחרת" (Itzik 17.11.2026): search a city, see the brokers who work there (photo, specialty, years,
 * deals in the community), and with one button "יש לי לקוח בעיר שלך" send that broker a short referral: seller or
 * buyer, what the client has, and the referral fee offered. A city with no broker yet says so, and the broker is told
 * when one joins. The referral goes to that broker only: nothing is published, and the client's name and phone stay
 * in the CRM of the broker who refers.
 */

const SENT_KEY = 'nadlanup-referrals-sent-v1'
const WATCH_KEY = 'nadlanup-city-watch-v1'
const FEES = ['20%', '25%', '30%', 'לפי סיכום']
const read = <T,>(k: string, fallback: T): T => {
  try {
    return (JSON.parse(localStorage.getItem(k) ?? 'null') as T) ?? fallback
  } catch {
    return fallback
  }
}
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* storage unavailable */
  }
}

/** the brokers who work in a city: the city is part of the area they wrote ("תל אביב ורמת גן" works in both) */
export const brokersIn = (city: string) => brokers.filter((b) => b.id !== CURRENT_BROKER_ID && b.area.includes(city))
/** the cities that have at least one broker, to suggest first */
const citiesWithBrokers = () => knownCities.filter((c) => brokersIn(c).length > 0).sort((a, b) => a.localeCompare(b, 'he'))

type Sent = { brokerId: string; city: string; at: number }

export default function BrokerFinder({ onOpenReferral }: { onOpenReferral: (city?: string) => void }) {
  const { items } = useStore()
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [to, setTo] = useState<Broker | null>(null)
  const [sent, setSent] = useState<Sent[]>(() => read<Sent[]>(SENT_KEY, []))
  const [watch, setWatch] = useState<string[]>(() => read<string[]>(WATCH_KEY, []))
  const withBrokers = useMemo(citiesWithBrokers, [])
  const q = query.trim()
  // suggestions while typing: every known city that holds the letters, the ones with brokers first
  const suggest = q && q !== city ? [...new Set([...knownCities.filter((c) => c.includes(q)), ...findCities(q, 12)])].sort((a, b) => brokersIn(b).length - brokersIn(a).length || a.localeCompare(b, 'he')).slice(0, 6) : []
  const found = city ? brokersIn(city) : []
  // a deal in the community is a "עסקאות שנסגרו" post the broker shared; posts are everything else they shared
  const deals = (id: string) => items.filter((it) => it.authorId === id && it.topicId === 'wins').length
  const posts = (id: string) => items.filter((it) => it.authorId === id).length

  const pick = (c: string) => {
    setCity(c)
    setQuery(c)
  }
  // a city with no broker yet: kept in the list of cities to hear about
  useEffect(() => {
    if (!city || found.length || watch.includes(city)) return
    const next = [...watch, city]
    setWatch(next)
    write(WATCH_KEY, next)
  }, [city, found.length, watch])

  return (
    <section className="bf" aria-labelledby="bf-title" data-finder>
      <header className="bf-head">
        <h2 id="bf-title">מציאת מתווך בעיר אחרת</h2>
        <p>יש לך לקוח בעיר שאתה לא עובד בה? מוצאים מתווך מקומי, שולחים לו הפניה, ומקבלים דמי הפניה.</p>
      </header>

      <div className="bf-search" role="search">
        <label className="bf-box">
          <Search aria-hidden />
          <input
            className="bf-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (e.target.value.trim() !== city) setCity('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && suggest[0]) {
                e.preventDefault()
                pick(suggest[0])
              }
            }}
            placeholder="באיזו עיר צריך מתווך?"
            aria-label="חיפוש לפי עיר"
            autoComplete="off"
            enterKeyHint="search"
            data-f="city-search"
          />
          {query && (
            <button
              type="button"
              className="bf-clear"
              onClick={() => {
                setQuery('')
                setCity('')
              }}
              aria-label="ניקוי החיפוש"
            >
              <X />
            </button>
          )}
        </label>
        {suggest.length > 0 && (
          <ul className="bf-suggest" role="listbox" aria-label="ערים">
            {suggest.map((c) => (
              <li key={c}>
                <button type="button" role="option" aria-selected={false} onClick={() => pick(c)} data-suggest={c}>
                  <MapPin aria-hidden /> {c}
                  <small>{brokersIn(c).length ? `${brokersIn(c).length === 1 ? 'מתווך אחד' : `${brokersIn(c).length} מתווכים`}` : 'עוד אין מתווך'}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!city && !suggest.length && (
          <div className="bf-chips" aria-label="ערים עם מתווכים בקהילה">
            {withBrokers.map((c) => (
              <button key={c} type="button" className="bf-chip" onClick={() => pick(c)} data-city={c}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {city && found.length > 0 && (
        <div className="bf-results" data-results={city}>
          <h3 className="bf-count">
            {found.length === 1 ? 'מתווך אחד' : `${found.length} מתווכים`} עובדים ב{city}
          </h3>
          <ul className="bf-list">
            {found.map((b) => {
              const was = sent.find((s) => s.brokerId === b.id && s.city === city)
              return (
                <li key={b.id} className="bf-row" data-broker={b.id}>
                  <Avatar src={b.avatar} name={b.name} size={56} />
                  <div className="bf-who">
                    <b>
                      {b.name}
                      {nameSlots.Badge && <nameSlots.Badge brokerId={b.id} />}
                    </b>
                    <span className="bf-title">{b.title}</span>
                    <span className="bf-specs">{b.specialties.slice(0, 3).join(' · ')}</span>
                    <span className="bf-facts">
                      <span data-years>
                        <Star aria-hidden /> <b className="num">{b.years}</b> שנות ניסיון
                      </span>
                      <span data-deals>
                        <Check aria-hidden /> <b className="num">{deals(b.id)}</b> עסקאות בקהילה
                      </span>
                      <span className="bf-posts">
                        <b className="num">{posts(b.id)}</b> פרסומים
                      </span>
                    </span>
                  </div>
                  {was ? (
                    <span className="bf-sent" data-sent>
                      <Check /> נשלחה הפניה
                    </span>
                  ) : (
                    <button type="button" className="btn btn-gold bf-go" onClick={() => setTo(b)} data-act="refer-to">
                      <Send /> יש לי לקוח בעיר שלך
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {city && found.length === 0 && (
        <div className="bf-empty" role="status" data-empty={city}>
          <span className="bf-empty-ico" aria-hidden>
            <BellRing />
          </span>
          <b>עוד אין מתווך בעיר הזו. נודיע לך כשיצטרף</b>
          <small>שמרנו את {city} ברשימת הערים שלך.</small>
          <button type="button" className="btn btn-ghost" onClick={() => onOpenReferral(city)} data-act="open-referral">
            בינתיים, הפניה פתוחה לכל הקהילה
          </button>
        </div>
      )}

      <ReferToBroker
        broker={to}
        city={city}
        onClose={() => setTo(null)}
        onSent={(s) => {
          const next = [...sent, s]
          setSent(next)
          write(SENT_KEY, next)
        }}
      />
    </section>
  )
}

/* ============================================================ the short form: a referral to one broker */

function ReferToBroker({ broker, city, onClose, onSent }: { broker: Broker | null; city: string; onClose: () => void; onSent: (s: Sent) => void }) {
  const { toast } = useStore()
  const [side, setSide] = useState<'seller' | 'buyer'>('seller')
  const [what, setWhat] = useState('')
  const [fee, setFee] = useState('25%')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => {
    if (!broker) return
    setSide('seller')
    setWhat('')
    setFee('25%')
    setName('')
    setPhone('')
    setErr('')
  }, [broker])
  if (!broker) return null
  const first = broker.name.split(' ')[0]
  const send = () => {
    if (what.trim().length < 3) return setErr(side === 'seller' ? 'כמה מילים על הנכס, שיהיה ברור במה מדובר.' : 'כמה מילים על מה שהקונה מחפש.')
    const seller = side === 'seller'
    clientActions.add({
      name: name.trim() || (seller ? `מוכר ב${city}` : `קונה ב${city}`),
      type: seller ? 'seller' : 'buyer',
      phone: phone.trim(),
      about: `הופנה ל${broker.name} ב${city}, דמי הפניה ${fee}: ${what.trim()}`,
      cities: [city],
    })
    onSent({ brokerId: broker.id, city, at: Date.now() })
    onClose()
    toast(`ההפניה נשלחה ל${broker.name}. הלקוח נשמר ב-CRM שלך.`)
  }
  return (
    <Modal open={!!broker} onClose={onClose} title={`הפניה ל${broker.name}`} subtitle={`${broker.title} · ${city}. הפרטים עוברים רק ל${first}, ושם הלקוח והטלפון נשארים אצלך.`}>
      <div className="modal-body bf-form" data-refer={broker.id}>
        <div className="rf-seg" role="radiogroup" aria-label="מי הלקוח">
          <button type="button" role="radio" aria-checked={side === 'seller'} onClick={() => setSide('seller')} data-side="seller">
            מוכר
          </button>
          <button type="button" role="radio" aria-checked={side === 'buyer'} onClick={() => setSide('buyer')} data-side="buyer">
            קונה
          </button>
        </div>
        <label className="rf-field">
          <span className="rf-label">{side === 'seller' ? 'מה יש לו?' : 'מה הוא מחפש?'}</span>
          <textarea className="textarea" rows={3} value={what} onChange={(e) => setWhat(e.target.value)} placeholder={side === 'seller' ? 'לדוגמה: 4 חדרים עם מרפסת, רוצה למכור בחודשים הקרובים' : 'לדוגמה: 3 חדרים עד 1.8 מיליון, קרוב לבתי ספר'} data-f="what" />
        </label>
        <div className="rf-field">
          <span className="rf-label">דמי הפניה מוצעים</span>
          <div className="rf-picks" role="radiogroup" aria-label="דמי הפניה">
            {FEES.map((f) => (
              <button key={f} type="button" role="radio" aria-checked={fee === f} className="rf-pick" aria-pressed={fee === f} onClick={() => setFee(f)} data-fee={f}>
                <bdi>{f}</bdi>
              </button>
            ))}
          </div>
          <small className="bf-fee-note">{REFERRAL_TERMS}. מסכמים סופית ישירות עם {first}.</small>
        </div>
        <div className="rf-row">
          <label className="rf-field">
            <span className="rf-label">שם הלקוח (נשאר אצלך)</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" data-f="name" />
          </label>
          <label className="rf-field">
            <span className="rf-label">טלפון (נשאר אצלך)</span>
            <input className="input ltr num" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" data-f="phone" />
          </label>
        </div>
        {err && (
          <em className="ct-err" role="alert">
            {err}
          </em>
        )}
        <button type="button" className="btn btn-gold btn-lg rf-go" onClick={send} data-act="send-refer">
          <Send /> שליחת ההפניה ל{first}
        </button>
      </div>
    </Modal>
  )
}
