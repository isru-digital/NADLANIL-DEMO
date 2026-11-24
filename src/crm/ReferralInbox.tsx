import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Phone, X } from 'lucide-react'
import { brokerById } from '../data/demo'
import { useStore } from '../store'
import { Avatar, EASE } from '../components/ui'
import { WhatsAppIcon } from '../templates/LandingTemplate'
import { useClients } from './clients'
import { OfferCard, Summary } from './ReferClient'
import { REFERRAL_NOTE, agoText, referralActions, useReferrals, whenAnswered } from './referral'
import type { Referral } from './referral'
import '../styles/referral.css'

/**
 * The referrals at the top of the clients' table (24.11.2026): an offer from another broker waits for a yes or a no;
 * after a yes the client's name and phone show, the client is in my CRM, and the summary is there. My own offers show
 * where they stand. The newest first; older ones fold away.
 */
export default function ReferralInbox() {
  const refs = useReferrals()
  const clients = useClients()
  const { toast } = useStore()
  const [more, setMore] = useState(false)

  // the other broker of the demo answers an offer: say so, wherever the broker is in the CRM
  useEffect(() => {
    whenAnswered((r) => toast(`ההפניה אושרה על ידי ${brokerById(r.otherId).name}. הסיכום מחכה בהפניות.`))
    return () => whenAnswered(null)
  }, [toast])

  const live = refs.filter((r) => r.status !== 'declined')
  if (live.length === 0) return null
  const waiting = live.filter((r) => r.dir === 'in' && r.status === 'pending').length
  const shown = more ? live : live.slice(0, 2)

  return (
    <section className="rfi" aria-label="הפניות" data-inbox>
      <header className="rfi-head">
        <h2>הפניות</h2>
        {waiting > 0 && (
          <span className="rfi-new" data-waiting={waiting}>
            <b className="num">{waiting}</b> {waiting === 1 ? 'הצעה חדשה' : 'הצעות חדשות'}
          </span>
        )}
      </header>
      <div className="rfi-list">
        <AnimatePresence initial={false}>
          {shown.map((r) => (
            <motion.div key={r.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.24, ease: EASE }}>
              {r.dir === 'in' ? <Incoming r={r} /> : <Outgoing r={r} clientName={clients.find((c) => c.id === r.clientId)?.name} />}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {live.length > 2 && (
        <button type="button" className="rfi-more" onClick={() => setMore(!more)} aria-expanded={more}>
          <ChevronDown aria-hidden className={more ? 'is-up' : ''} />
          {more ? 'פחות' : `כל ההפניות (${live.length})`}
        </button>
      )}
    </section>
  )
}

function Incoming({ r }: { r: Referral }) {
  const { toast } = useStore()
  const b = brokerById(r.otherId)
  const accepted = r.status === 'accepted'
  return (
    <article className={`rfi-item is-in${accepted ? ' is-done' : ''}`} data-ref={r.id} data-dir="in" data-status={r.status}>
      <div className="rfi-who">
        <Avatar src={b.avatar} name={b.name} size={40} />
        <span className="rfi-who-text">
          <b>{b.name}</b>
          <small>{agoText(r.at)}</small>
        </span>
      </div>
      <OfferCard r={r} from={`הפניה מ${b.name}`} />
      {accepted && r.contact ? (
        <div className="rfi-open" data-contact>
          <span className="rfi-contact">
            <b data-contact-name>{r.contact.name}</b>
            <a href={`tel:${r.contact.phone.replace(/-/g, '')}`} className="num" dir="ltr">
              <Phone aria-hidden /> {r.contact.phone}
            </a>
            <a className="rfi-wa" href={`https://wa.me/${r.contact.phone.replace(/\D/g, '').replace(/^0/, '972')}`} target="_blank" rel="noopener noreferrer" aria-label={`וואטסאפ ל${r.contact.name}`}>
              <WhatsAppIcon />
            </a>
          </span>
          <Summary pct={r.pct} otherName={b.name} dir="in" />
          <small className="rfi-added">הלקוח נוסף לרשימת הלקוחות שלך.</small>
        </div>
      ) : (
        <>
          <p className="rfi-locked">השם והטלפון של הלקוח יוצגו אחרי שתאשרו.</p>
          <div className="rfi-acts">
            <button
              type="button"
              className="btn btn-gold"
              onClick={() => {
                referralActions.accept(r.id)
                toast('אישרת את ההפניה. פרטי הלקוח פתוחים והוא נוסף ל-CRM.')
              }}
              data-act="accept-referral"
            >
              <Check /> אישור
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                referralActions.decline(r.id)
                toast('ההצעה נדחתה.')
              }}
              data-act="decline-referral"
            >
              <X /> דחייה
            </button>
          </div>
        </>
      )}
      <p className="rf-note">{REFERRAL_NOTE}</p>
    </article>
  )
}

function Outgoing({ r, clientName }: { r: Referral; clientName?: string }) {
  const b = brokerById(r.otherId)
  const accepted = r.status === 'accepted'
  return (
    <article className={`rfi-item is-out${accepted ? ' is-done' : ''}`} data-ref={r.id} data-dir="out" data-status={r.status}>
      <div className="rfi-who">
        <Avatar src={b.avatar} name={b.name} size={40} />
        <span className="rfi-who-text">
          <b>
            {clientName ?? 'הלקוח שלך'} אל {b.name}
          </b>
          <small>
            {r.city} · עמלת הפניה <span className="num">{r.pct}%</span> · {agoText(r.at)}
          </small>
        </span>
        <span className={`rfi-state is-${r.status}`} data-state>
          {accepted ? (
            <>
              <Check aria-hidden /> אושרה
            </>
          ) : (
            'ממתינה לאישור'
          )}
        </span>
      </div>
      {accepted && <Summary pct={r.pct} otherName={b.name} dir="out" />}
    </article>
  )
}
