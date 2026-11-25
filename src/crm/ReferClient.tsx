import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { BedDouble, Check, Clock, Handshake, Lock, MapPin, MessageCircle, Send, UserRoundCheck, Wallet, X } from 'lucide-react'
import { brokerById } from '../data/demo'
import { nameSlots } from '../config/navExtras'
import { useMember } from '../config/member'
import { useStore } from '../store'
import { Avatar, EASE, Modal } from '../components/ui'
import ClientPicker from './ClientPicker'
import NewClient from './NewClient'
import { clientActions, useClients } from './clients'
import type { Client } from './clients'
import { PCTS, REFERRAL_NOTE, STATUS_WORDS, brokersIn, budgetText, giverOf, offerOf, openChat, referralActions, referralCities, roomsText, sideText, takerOf, useReferrals, watchOffer } from './referral'
import type { Pct, RefStatus, Referral } from './referral'
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
  // the other broker said "מעוניין": the chat waits (it is opened from here or from the referrals)
  const talking = !!sent && sent.status !== 'sent' && sent.status !== 'pending'
  // a few cities at first: the client's own, then the others behind "עוד ערים"
  const shownCities = allCities ? cities : cities.slice(0, Math.max(6, (cl?.cities.length ?? 0) + 1))
  if (city && !shownCities.includes(city)) shownCities.push(city)
  // while this window shows the offer, its answer appears here and not as a word on top
  useEffect(() => {
    if (!client || !sentId) return
    watchOffer(sentId, true)
    return () => watchOffer(sentId, false)
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
      <Modal open={!!client && !adding} onClose={onClose} title={sent ? (talking ? 'יש תגובה להפניה' : 'ההצעה נשלחה') : 'העברה למתווך בקהילה'} subtitle={sent ? undefined : 'יש לך לקוח בעיר שאתם לא עובדים בה? מעבירים אותו למתווך מקומי, על עמלת הפניה.'}>
        {sent && other ? (
          <div className="modal-body sh rf-sent" data-sheet="refer-sent" data-status={sent.status}>
            <motion.span key={String(talking)} className="rf-sent-ico" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 18 }}>
              {talking ? <MessageCircle /> : <Send />}
            </motion.span>
            <div className="rf-sent-faces">
              <Avatar src={other.avatar} name={other.name} size={56} ring />
            </div>
            <StatusPill status={sent.status} />
            {talking ? (
              <>
                <h3 data-sent-title>{other.name} רוצה לדבר על ההפניה</h3>
                <p className="rf-wait is-done">נפתחה ביניכם שיחה. פרטי הלקוח עוברים רק כשתחליטו לשלוח אותם, מתוך השיחה.</p>
                <button
                  type="button"
                  className="btn btn-gold rf-to-chat"
                  onClick={() => {
                    onClose()
                    openChat(sent.id)
                  }}
                  data-act="open-ref-chat"
                >
                  <MessageCircle /> לשיחה עם {other.name.split(' ')[0]}
                </button>
              </>
            ) : (
              <>
                <h3 data-sent-title>ההצעה אצל {other.name}</h3>
                <p className="rf-wait">
                  <i aria-hidden />
                  <i aria-hidden />
                  <i aria-hidden />
                  ממתינים לתגובה. אם זה מתאים, תיפתח ביניכם שיחה. פרטי הלקוח לא עוברים עד שתשלחו אותם.
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
                  השם והטלפון של הלקוח לא נשלחים. הם עוברים רק אם תשלחו אותם בעצמכם, מתוך השיחה.
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

/**
 * What was agreed, the same words on both sides: who referred, to whom, and the fee. It shows only once both agreed in
 * the chat (25.11.2026).
 */
export function Summary({ r }: { r: Referral }) {
  const giver = brokerById(giverOf(r)).name
  const taker = brokerById(takerOf(r)).name
  return (
    <div className="rf-sum" data-summary="referral">
      <span className="rf-sum-head">
        <Check aria-hidden /> סיכום ההפניה
      </span>
      <dl className="rf-sum-rows">
        <div>
          <dt>הפניה מ</dt>
          <dd data-sum="from">{giver}</dd>
        </div>
        <div>
          <dt>אל</dt>
          <dd data-sum="to">{taker}</dd>
        </div>
        <div>
          <dt>עמלת הפניה</dt>
          <dd data-sum="pct">
            <b className="num">{r.pct}%</b> מהעמלה של {taker} בעסקה עם הלקוח
          </dd>
        </div>
      </dl>
      <small className="rf-sum-note" data-note="referral">
        {REFERRAL_NOTE}
      </small>
    </div>
  )
}

const STATUS_ICON: Record<RefStatus, ReactNode> = {
  sent: <Send />,
  pending: <Clock />,
  talking: <MessageCircle />,
  shared: <UserRoundCheck />,
  closed: <Handshake />,
  declined: <X />,
}
/** Where a referral stands, in words and an icon (never by colour alone). */
export function StatusPill({ status }: { status: RefStatus }) {
  return (
    <span className={`rf-status is-${status}`} data-ref-status={status}>
      {STATUS_ICON[status]}
      {STATUS_WORDS[status]}
    </span>
  )
}
