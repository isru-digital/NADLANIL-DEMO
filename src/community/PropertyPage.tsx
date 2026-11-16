import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BedDouble, Building, Car, Check, ChevronLeft, ChevronRight, Handshake, Layers, Lock, MapPin, MessageCircle, Ruler, Tag, UserRoundSearch } from 'lucide-react'
import { CURRENT_BROKER_ID, asset } from '../config'
import { brokerById, formatPrice } from '../data/demo'
import type { CommunityItem } from '../data/demo'
import { useStore } from '../store'
import { nameSlots } from '../config/navExtras'
import { Avatar, EASE } from '../components/ui'
import '../styles/property.css'

/** The price as it is said: an asking price, or a monthly rent. */
export const priceText = (p: NonNullable<CommunityItem['property']>) => (p.deal === 'rent' ? `${formatPrice(p.price)} לחודש` : formatPrice(p.price))

/**
 * A property shared in the community, on a page of its own: its photos, its details, the broker who shares it, and
 * the two things another broker does with it: offer to work together, or say he has a buyer for it.
 */
export default function PropertyPage() {
  const { id } = useParams()
  const { items, crm, interested, toggleInterested, toast } = useStore()
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
  const coop = !!interested[item.id]
  const buyer = !!interested[`buyer:${item.id}`]
  const rent = p.deal === 'rent'
  // the exact address lives in the CRM of the broker who put the property in, and only that broker sees it here
  const own = mine && item.sourceId ? crm.find((c) => c.id === item.sourceId) : undefined
  const exact = own?.street ? `${own.street}${own.houseNo ? ` ${own.houseNo}` : ''}${own.neighborhood ? `, ${own.neighborhood}` : ''}, ${own.city}` : null
  const facts = [
    { icon: BedDouble, label: 'חדרים', value: p.rooms },
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
            <MapPin /> {p.area}
          </span>
          <h1>{item.title}</h1>
          <div className="pp-price">
            <strong className="num">{priceText(p)}</strong>
            {p.kind && <span className="tag">{p.kind}</span>}
            {p.renewal && (
              <span className="tag pp-renew" data-renewal>
                התחדשות עירונית
              </span>
            )}
          </div>
          {exact && (
            <p className="pp-exact" data-exact>
              <Lock /> <span>הכתובת המדויקת: <b>{exact}</b></span>
              <small>רק אתם רואים אותה. בקהילה מופיעות רק העיר והשכונה.</small>
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
          <p className="pp-split">
            <Handshake /> {p.split}
          </p>

          {/* the broker who shares it */}
          <div className="pp-broker">
            <Avatar src={broker.avatar} name={broker.name} size={52} />
            <div>
              <strong>
                {broker.name}
                {nameSlots.Badge && <nameSlots.Badge brokerId={broker.id} />}
              </strong>
              <span>
                {broker.title} · {broker.area}
              </span>
              <small>
                {broker.years} שנות ניסיון · פורסם {item.time}
              </small>
            </div>
          </div>

          {mine ? (
            <p className="pp-mine">
              <Check /> זה נכס שלך. מתווכים שירצו לשתף פעולה יפנו אלייך מכאן.
            </p>
          ) : (
            <div className="pp-actions">
              <button
                type="button"
                className={`btn btn-lg ${coop ? 'btn-ghost is-sent' : 'btn-gold'}`}
                aria-pressed={coop}
                data-act="coop"
                onClick={() => {
                  toggleInterested(item.id)
                  if (!coop) toast(`הצעת שיתוף פעולה נשלחה אל ${broker.name}`)
                }}
              >
                {coop ? <Check /> : <Handshake />}
                {coop ? 'הבקשה לשיתוף פעולה נשלחה' : 'אני רוצה לשתף פעולה'}
              </button>
              <button
                type="button"
                className={`btn btn-lg ${buyer ? 'btn-ghost is-sent' : 'btn-ghost'}`}
                aria-pressed={buyer}
                data-act="buyer"
                onClick={() => {
                  toggleInterested(`buyer:${item.id}`)
                  if (!buyer) toast(`${broker.name} קיבל הודעה שיש לך קונה לנכס`)
                }}
              >
                {buyer ? <Check /> : <UserRoundSearch />}
                {buyer ? 'עדכנת שיש לך קונה' : 'יש לי קונה'}
              </button>
              <button type="button" className="pp-chat" onClick={() => toast(`הצ'אט עם ${broker.name} ייפתח בקרוב`)}>
                <MessageCircle /> שאלה למתווך
              </button>
            </div>
          )}
        </section>
      </div>
    </article>
  )
}
