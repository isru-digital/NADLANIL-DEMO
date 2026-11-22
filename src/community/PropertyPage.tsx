import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BedDouble, Building, Car, Check, ChevronLeft, ChevronRight, Handshake, Layers, Lock, MapPin, MessageCircle, Phone, Ruler, Tag, UserRoundSearch } from 'lucide-react'
import { CURRENT_BROKER_ID, asset } from '../config'
import { brokerById, brokerPhone, formatPrice } from '../data/demo'
import type { CommunityItem } from '../data/demo'
import { useStore } from '../store'
import { nameSlots } from '../config/navExtras'
import { Avatar, EASE, Modal } from '../components/ui'
import ChatWindow from './ChatWindow'
import { IconHome } from './KhIcons'
import { propertyKind } from './match'
import { fullAddress, streetOf } from './place'
import { CoopBadge } from '../components/CoopBadge'
import { coopAmount, coopText, hasCoop, shekels } from '../config/coop'
import '../styles/property.css'
import '../styles/post-form.css'

/** The price as it is said: an asking price, or a monthly rent. */
export const priceText = (p: NonNullable<CommunityItem['property']>) => (p.deal === 'rent' ? `${formatPrice(p.price)} לחודש` : formatPrice(p.price))

/**
 * A property shared in the community, on a page of its own: its photos, its details, the broker who shares it, and
 * the two things another broker does with it: offer to work together, or say he has a buyer for it.
 */
export default function PropertyPage() {
  const { id } = useParams()
  const { items, crm, interested, toggleInterested, notices } = useStore()
  // "יש לי קונה לנכס": the window that says it was sent, with the broker's phone; and the chat
  const [sentOpen, setSentOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const item = items.find((it) => it.id === id && it.property)
  const [shown, setShown] = useState(0)
  const photos = item ? (item.property!.images?.length ? item.property!.images : item.image ? [item.image] : []) : []

  useEffect(() => {
    setShown(0)
    window.scrollTo({ top: 0 })
  }, [id])
  useEffect(() => {
    if (photos.length < 2) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setShown((n) => (n + 1) % photos.length)
      if (e.key === 'ArrowRight') setShown((n) => (n - 1 + photos.length) % photos.length)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [photos.length])

  if (!item) {
    return (
      <div className="pp pp-missing">
        <h1>הנכס הזה כבר לא בקהילה</h1>
        <p>ייתכן שהוא נמכר או שהמתווך הוריד אותו.</p>
        <Link to="/app/community?topic=coop" className="btn btn-gold">
          לכל הנכסים בקהילה
        </Link>
      </div>
    )
  }

  const p = item.property!
  const broker = brokerById(item.authorId)
  const mine = item.authorId === CURRENT_BROKER_ID
  const buyer = !!interested[`buyer:${item.id}`]
  const rent = p.deal === 'rent'
  // the full address (with the flat's number) lives in the CRM of the broker who put the property in, and only that
  // broker sees it here. Everyone else sees the street, and the building's number when the broker chose to show it
  const own = mine && item.sourceId ? crm.find((c) => c.id === item.sourceId) : undefined
  const exact = own ? fullAddress(own) : null
  const street = streetOf(p)
  const kind = propertyKind(p, item.title)
  const facts = [
    ...(p.rooms ? [{ icon: BedDouble, label: 'חדרים', value: p.rooms }] : []),
    { icon: Ruler, label: 'שטח', value: p.sqm ? `${p.sqm} מ"ר` : 'לא צוין' },
    { icon: Layers, label: 'קומה', value: p.floor ?? 'לא צוין' },
    { icon: Car, label: 'חניה', value: p.parking == null ? 'לא צוין' : p.parking === 0 ? 'אין' : p.parking === 1 ? 'חניה אחת' : p.parking >= 3 ? '3 חניות ומעלה' : `${p.parking} חניות` },
    { icon: Building, label: 'מעלית', value: p.elevator == null ? 'לא צוין' : p.elevator ? 'יש' : 'אין' },
    { icon: Tag, label: 'עסקה', value: rent ? 'השכרה' : 'מכירה' },
  ]
  const go = (d: number) => setShown((n) => (n + d + photos.length) % photos.length)

  return (
    <article className="pp" data-property={item.id}>
      <div className="pp-grid">
        {/* ---------------------------------------------------------- the photos */}
        <section className="pp-gallery" aria-label={`תמונות של ${item.title}`}>
          <div className="pp-main">
            {/* no photos yet: a picture of its own, in the community's colours, with a house and the city */}
            {photos.length === 0 && (
              <div className="pp-nophoto" data-nophoto role="img" aria-label={`עדיין אין תמונות לנכס ב${item.city}`}>
                <span className="pp-nophoto-ring" aria-hidden>
                  <IconHome />
                </span>
                <strong>{item.city}</strong>
                <small>עדיין אין תמונות לנכס הזה</small>
              </div>
            )}
            <AnimatePresence initial={false} mode="popLayout">
              {photos[shown] && (
                <motion.img
                  key={photos[shown]}
                  src={asset(photos[shown])}
                  alt={`${item.title}, תמונה ${shown + 1} מתוך ${photos.length}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  data-photo={shown}
                />
              )}
            </AnimatePresence>
            {photos.length > 1 && (
              <>
                <button type="button" className="pp-nav is-prev" onClick={() => go(-1)} aria-label="התמונה הקודמת">
                  <ChevronRight />
                </button>
                <button type="button" className="pp-nav is-next" onClick={() => go(1)} aria-label="התמונה הבאה" data-act="next-photo">
                  <ChevronLeft />
                </button>
                <span className="pp-count num" aria-hidden>
                  {shown + 1}/{photos.length}
                </span>
              </>
            )}
            <span className={`pp-deal${rent ? ' is-rent' : ''}`}>{rent ? 'להשכרה' : 'למכירה'}</span>
            <CoopBadge pct={p.coopPct} />
          </div>
          {photos.length > 1 && (
            <div className="pp-thumbs" role="group" aria-label="בחירת תמונה">
              {photos.map((ph, i) => (
                <button key={ph + i} type="button" className={i === shown ? 'is-on' : ''} aria-pressed={i === shown} aria-label={`תמונה ${i + 1}`} onClick={() => setShown(i)}>
                  <img src={asset(ph)} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ----------------------------------------------------------- the details */}
        <section className="pp-info">
          <span className="pp-area">
            <MapPin />{' '}
            <span className="pf-place">
              {p.area}
              {street && <span data-street>, {street}</span>}
            </span>
          </span>
          <h1>{item.title}</h1>
          <div className="pp-price">
            <strong className="num">{priceText(p)}</strong>
            <span className="tag" data-kind={kind.kind} data-group={kind.group}>
              {kind.kind}
            </span>
            {p.renewal && (
              <span className="tag pp-renew" data-renewal>
                התחדשות עירונית
              </span>
            )}
          </div>
          {exact && (
            <p className="pp-exact" data-exact>
              <Lock /> <span>הכתובת המלאה: <b>{exact}</b></span>
              <small>
                {street
                  ? `רק אתם רואים אותה. בקהילה מופיעים העיר, השכונה והרחוב${p.houseNo ? ' עם מספר הבניין' : ', בלי מספר הבניין'}.`
                  : 'רק אתם רואים אותה. בקהילה מופיעות רק העיר והשכונה.'}
              </small>
            </p>
          )}

          <dl className="pp-facts">
            {facts.map((f) => (
              <div key={f.label} data-fact={f.label}>
                <dt>
                  <f.icon /> {f.label}
                </dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>

          {p.extra && p.extra.length > 0 && (
            <ul className="pp-extra">
              {p.extra.map((x) => (
                <li key={x}>
                  <Check /> {x}
                </li>
              ))}
            </ul>
          )}

          <p className="pp-body">{item.body}</p>
          {/* "עמלת שת"פ" took the place of the old "חלוקת עמלה": what working together earns, in shekels too */}
          {hasCoop(p.coopPct) && (
            <p className="pp-split" data-coop-line>
              <Handshake />
              {/* one run of words, so the comma sits right after the percent */}
              <span>
                עמלת שת"פ{' '}
                <b>
                  <bdi dir="ltr" className="num">
                    {coopText(p.coopPct)}
                  </bdi>
                </b>
                {p.price > 0 && <span className="num">, בערך {shekels(coopAmount(p.price, p.coopPct))}</span>}
              </span>
            </p>
          )}

          {/* the broker who shares it */}
          <div className="pp-broker">
            <Avatar src={broker.avatar} name={broker.name} size={52} />
            <div>
              <strong>
                {broker.name}
                {nameSlots.Badge && <nameSlots.Badge brokerId={broker.id} />}
              </strong>
              <span>{[broker.title, broker.area].filter(Boolean).join(' · ')}</span>
              <small>
                {/* a real person's card has no invented years */}
                {broker.years > 0 ? `${broker.years} שנות ניסיון · ` : ''}פורסם {item.time}
              </small>
            </div>
          </div>

          {mine ? (
            <div className="pp-mine-wrap">
              <p className="pp-mine">
                <Check /> זה נכס שלך. מתווך שיש לו קונה ילחץ "יש לי קונה לנכס", ותקבל התראה בפעמון.
              </p>
              {notices.some((n) => n.kind === 'interest' && n.itemId === item.id) && (
                <ul className="pp-interest" data-interest>
                  {notices
                    .filter((n) => n.kind === 'interest' && n.itemId === item.id)
                    .map((n) => (
                      <li key={n.id}>
                        <UserRoundSearch /> יש קונה: <b>{n.text.split(' · ')[0]}</b>
                        {n.demo && <em className="notice-demo">דוגמה</em>}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="pp-actions">
              {/* one big action: the broker hears at once that there is a buyer (17.11.2026) */}
              <button
                type="button"
                className={`btn btn-lg pp-buyer ${buyer ? 'btn-ghost is-sent' : 'btn-gold'}`}
                aria-pressed={buyer}
                data-act="buyer"
                onClick={() => {
                  if (!buyer) toggleInterested(`buyer:${item.id}`)
                  setSentOpen(true)
                }}
              >
                {buyer ? <Check /> : <UserRoundSearch />}
                {buyer ? 'עדכנת שיש לך קונה לנכס' : 'יש לי קונה לנכס'}
              </button>
              <button type="button" className="pp-chat" onClick={() => setChatOpen(true)} data-act="open-chat">
                <MessageCircle /> התחלת צ'אט
              </button>
            </div>
          )}
        </section>
      </div>

      {!mine && (
        <Modal open={sentOpen} onClose={() => setSentOpen(false)} title="ההודעה נשלחה!">
          <div className="modal-body pp-sent" data-sent-window>
            <span className="pp-sent-ico" aria-hidden>
              <Check />
            </span>
            <p>המתווך יודע שיש לך קונה לנכס שלו. אפשר גם ליצור איתו קשר ישירות:</p>
            <div className="pp-sent-card">
              <Avatar src={broker.avatar} name={broker.name} size={48} />
              <span>
                <b>{broker.name}</b>
                <bdi dir="ltr" className="num" data-phone>
                  {brokerPhone(broker)}
                </bdi>
              </span>
              <a className="btn btn-gold pp-call" href={`tel:${brokerPhone(broker).replace(/-/g, '')}`} data-act="call">
                <Phone /> חיוג
              </a>
            </div>
            <button
              type="button"
              className="btn btn-ghost pp-sent-chat"
              onClick={() => {
                setSentOpen(false)
                setChatOpen(true)
              }}
            >
              <MessageCircle /> או צ'אט עם {broker.name.split(' ')[0]}
            </button>
          </div>
        </Modal>
      )}
      {!mine && <ChatWindow item={item} open={chatOpen} onClose={() => setChatOpen(false)} />}
    </article>
  )
}
