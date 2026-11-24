import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BedDouble, Check, Handshake, Lock, MapPin, Send, Wallet } from 'lucide-react'
import { brokerById } from '../data/demo'
import { nameSlots } from '../config/navExtras'
import { useMember } from '../config/member'
import { useStore } from '../store'
import { Avatar, EASE, Modal } from '../components/ui'
import ClientPicker from './ClientPicker'
import NewClient from './NewClient'
import { clientActions, useClients } from './clients'
import type { Client } from './clients'
import { PCTS, REFERRAL_NOTE, brokersIn, budgetText, offerOf, referralActions, referralCities, roomsText, sideText, useReferrals, watchOffer } from './referral'
import type { Pct } from './referral'
import '../styles/referral.css'

/**
 * "העבר למתווך בקהילה" (24.11.2026): the client, a city, a broker who works there, and the referral fee. What the other
 * broker sees is shown before it is sent: buyer or renter, budget, rooms and neighbourhoods. No name, no phone.
 */
export default function ReferClient({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const { isOffice } = useMember()
  const { toast } = useStore()
  const all = useClients()
  const refs = useReferrals()
  const [pick, setPick] = useState<string | null>(client?.id ?? null)
  const [city, setCity] = useState('')
  const [to, setTo] = useState<string | null>(null)
  const [pct, setPct] = useState<Pct>(25)
  const [sentId, setSentId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [allCities, setAllCities] = useState(false)
  const closeAdd = useCallback(() => setAdding(false), [])
  const Badge = nameSlots.Badge

  const people = useMemo(() => all.filter((c) => c.type === 'buyer' || c.type === 'renter'), [all])
  const cl = people.find((c) => c.id === pick) ?? null
  const cities = useMemo(() => referralCities(cl?.cities), [cl])
  const list = useMemo(() => (city ? brokersIn(city, cl?.neighborhoods) : []), [city, cl])
  const offer = cl && city ? offerOf(cl, city) : null
  const sent = refs.find((r) => r.id === sentId) ?? null
  // a few cities at first: the client's own, then the others behind "עוד ערים"
  const shownCities = allCities ? cities : cities.slice(0, Math.max(6, (cl?.cities.length ?? 0) + 1))
  if (city && !shownCities.includes(city)) shownCities.push(city)
  // while this window shows the offer, its answer appears here and not as a word on top
  useEffect(() => {
    watchOffer(client ? sentId : null)
    return () => watchOffer(null)
  }, [client, sentId])

  // a new window starts at the client it was opened for, in the first city of the client that has brokers
  useEffect(() => {
    if (!client) return
    setPick(client.id)
    setTo(null)
    setPct(25)
    setSentId(null)
    setAllCities(false)
    setCity(referralCities(client.cities).find((c) => client.cities.includes(c)) ?? '')
  }, [client])

  const send = () => {
    if (!offer || !to) return
    const id = referralActions.send(offer, to, pct)
    setSentId(id)
  }

  const other = to ? brokerById(to) : null
  return (
    <>
      <Modal open={!!client && !adding} onClose={onClose} title={sent ? (sent.status === 'accepted' ? 'ההפניה אושרה' : 'ההצעה נשלחה') : 'העברה למתווך בקהילה'} subtitle={sent ? undefined : 'יש לך לקוח בעיר שאתם לא עובדים בה? מעבירים אותו למתווך מקומי, על עמלת הפניה.'}>
        {sent && other ? (
          <div className="modal-body sh rf-sent" data-sheet="refer-sent" data-status={sent.status}>
            <motion.span className="rf-sent-ico" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 18 }}>
              {sent.status === 'accepted' ? <Check /> : <Send />}
            </motion.span>
            <div className="rf-sent-faces">
              <Avatar src={other.avatar} name={other.name} size={56} ring />
            </div>
            {sent.status === 'accepted' ? (
              <>
                <h3 data-sent-title>סוכם עם {other.name}</h3>
                <Summary pct={sent.pct} otherName={other.name} dir="out" />
              </>
            ) : (
              <>
                <h3 data-sent-title>ההצעה אצל {other.name}</h3>
                <p className="rf-wait">
                  <i aria-hidden />
                  <i aria-hidden />
                  <i aria-hidden />
                  ממתינים לאישור. הפרטים של הלקוח יעברו רק אחרי אישור.
                </p>
              </>
            )}
            <p className="rf-note" data-note="referral">
              {REFERRAL_NOTE}
            </p>
          </div>
        ) : (
          <div className="modal-body sh" data-sheet="refer">
            <ClientPicker clients={people} value={pick} onChange={setPick} onNew={() => setAdding(true)} label="הלקוח" />

            <div className="sh-step">
              <span className="cp-label">באיזו עיר</span>
              <div className="rf-cities" role="radiogroup" aria-label="באיזו עיר">
                {shownCities.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={city === c}
                    className={`rf-city${city === c ? ' is-on' : ''}${cl?.cities.includes(c) ? ' is-client' : ''}`}
                    data-city={c}
                    onClick={() => {
                      setCity(c)
                      setTo(null)
                    }}
                  >
                    {city === c && <Check aria-hidden />}
                    {c}
                  </button>
                ))}
                {cities.length > shownCities.length && (
                  <button type="button" className="rf-city is-more" onClick={() => setAllCities(true)} data-act="more-cities">
                    עוד ערים
                  </button>
                )}
              </div>
            </div>

            {city && (
              <div className="sh-step">
                <span className="cp-label">
                  מתווכים שעובדים ב{city} <b className="num">{list.length}</b>
                </span>
                <div className="rf-brokers" role="radiogroup" aria-label={`מתווכים שעובדים ב${city}`}>
                  {list.map((b, i) => {
                    const br = brokerById(b.id)
                    const on = to === b.id
                    return (
                      <motion.button
                        key={b.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        className={`rf-broker${on ? ' is-on' : ''}`}
                        data-broker={b.id}
                        onClick={() => setTo(b.id)}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.24, ease: EASE }}
                      >
                        <Avatar src={br.avatar} name={br.name} size={44} />
                        <span className="cp-text">
                          <b>
                            {br.name} {Badge && <Badge brokerId={br.id} />}
                          </b>
                          <small>
                            <MapPin aria-hidden /> שכונות עבודה: {b.hoods.join(', ')}
                          </small>
                        </span>
                        {b.near.length > 0 && <em className="cp-fit">בשכונות של הלקוח</em>}
                        <i className="rf-tick" aria-hidden>
                          {on && <Check />}
                        </i>
                      </motion.button>
                    )
                  })}
                  {list.length === 0 && <p className="cp-empty">אין עדיין מתווכים בקהילה שעובדים ב{city}.</p>}
                </div>
              </div>
            )}

            {to && (
              <div className="sh-step">
                <span className="cp-label" id="rf-pct">
                  עמלת הפניה
                </span>
                <div className="rf-pct" role="radiogroup" aria-labelledby="rf-pct">
                  {PCTS.map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={pct === n} className={pct === n ? 'is-on' : ''} onClick={() => setPct(n)} data-pct={n}>
                      <b className="num">{n}%</b>
                      <small>מהעמלה של {other?.name.split(' ')[0]}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {offer && to && other && (
              <div className="sh-step">
                <span className="cp-label">כך ההצעה תיראה אצל {other.name}</span>
                <OfferCard r={{ ...offer, pct }} from="הפניה ממך" preview />
                <p className="sh-safe">
                  <Lock aria-hidden />
                  השם והטלפון של הלקוח לא נשלחים. הם עוברים רק אחרי אישור.
                </p>
              </div>
            )}

            <p className="rf-note" data-note="referral">
              {REFERRAL_NOTE}
            </p>
          </div>
        )}
        <div className="modal-foot sh-foot">
          {sent ? (
            <button type="button" className="btn btn-gold" onClick={onClose} data-act="refer-done">
              סגירה
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-gold" onClick={send} disabled={!offer || !to} data-act="send-referral">
                <Send />
                {to ? 'שליחת ההצעה' : 'בוחרים מתווך'}
              </button>
              <button type="button" className="btn btn-quiet" onClick={onClose}>
                ביטול
              </button>
            </>
          )}
        </div>
      </Modal>
      <NewClient
        open={adding}
        onClose={closeAdd}
        isOffice={isOffice}
        searchOnly
        onAdd={(input) => {
          const id = clientActions.add(input)
          setAdding(false)
          setPick(id)
          toast(`${input.name} נוסף לרשימת הלקוחות`)
        }}
      />
    </>
  )
}

/** The offer as the other broker sees it: what the client looks for, never who they are. */
export function OfferCard({ r, from, preview = false }: { r: Parameters<typeof budgetText>[0] & Parameters<typeof roomsText>[0] & { city: string; hoods: string[]; pct: Pct }; from: string; preview?: boolean }) {
  return (
    <div className={`rf-card${preview ? ' is-preview' : ''}`} data-offer>
      <span className="rf-card-eyebrow">
        <Handshake aria-hidden /> {from}
      </span>
      <strong className="rf-card-title">יש לי לקוח בעיר שלך</strong>
      <ul className="rf-facts">
        <li data-fact="side">
          <i aria-hidden>
            <BedDouble />
          </i>
          <span>{sideText(r)}</span>
          <b>{roomsText(r)}</b>
        </li>
        <li data-fact="budget">
          <i aria-hidden>
            <Wallet />
          </i>
          <span>{r.side === 'renter' ? 'שכירות' : 'תקציב'}</span>
          <b className="num">{budgetText(r)}</b>
        </li>
        <li data-fact="where">
          <i aria-hidden>
            <MapPin />
          </i>
          <span>{r.city}</span>
          <b>{r.hoods.length ? r.hoods.join(', ') : 'כל העיר'}</b>
        </li>
      </ul>
      <span className="rf-card-pct">
        עמלת הפניה <b className="num">{r.pct}%</b>
      </span>
    </div>
  )
}

/** What was agreed, the same words on both sides. */
export function Summary({ pct, otherName, dir }: { pct: Pct; otherName: string; dir: 'in' | 'out' }) {
  return (
    <div className="rf-sum" data-summary="referral">
      <span className="rf-sum-head">
        <Check aria-hidden /> סיכום ההפניה
      </span>
      <p>
        {dir === 'out' ? (
          <>
            אם תיסגר עסקה עם הלקוח, <b className="num">{pct}%</b> מהעמלה של {otherName} בעסקה הזאת יעברו אליך.
          </>
        ) : (
          <>
            אם תיסגר עסקה עם הלקוח, <b className="num">{pct}%</b> מהעמלה שלך בעסקה הזאת יעברו ל{otherName}.
          </>
        )}
      </p>
      <small>הסיכום נשלח לשני המתווכים.</small>
    </div>
  )
}
