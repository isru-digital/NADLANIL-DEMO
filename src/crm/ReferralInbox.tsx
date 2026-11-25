import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Lock, MessageCircle, X } from 'lucide-react'
import { brokerById } from '../data/demo'
import { useStore } from '../store'
import { Avatar, EASE } from '../components/ui'
import { useClients } from './clients'
import ReferralChat from './ReferralChat'
import { OfferCard, StatusPill, Summary } from './ReferClient'
import { REFERRAL_NOTE, agoText, agreed, budgetText, openChat, referralActions, roomsText, sideText, useReferrals, whenAnswered } from './referral'
import type { Referral } from './referral'
import '../styles/referral.css'
import '../styles/referral-chat.css'

/**
 * "שיתופי פעולה" at the top of the clients' table (24.11.2026, the flow changed 25.11.2026): the referrals between me
 * and other brokers, each with where it stands, the same word on both sides (נשלחה, ממתינה לתגובה, בשיחה, פרטים נשלחו,
 * נסגרה, לא רלוונטית). An offer to me waits for "מעוניין, בוא נדבר" or "לא מתאים לי"; the talk itself is in the chat.
 * The client's name and phone are never on these cards: they are sent, if at all, inside the chat.
 */
export default function ReferralInbox() {
  const refs = useReferrals()
  const clients = useClients()
  const { toast } = useStore()
  const [more, setMore] = useState(false)

  // the other broker of the demo does something: say so, wherever the broker is in the CRM
  useEffect(() => {
    whenAnswered((r, what) =>
      toast(what === 'talk' ? `${brokerById(r.otherId).name} רוצה לדבר על ההפניה. השיחה מחכה בשיתופי הפעולה.` : `פרטי הלקוח הגיעו מ${brokerById(r.otherId).name}. הם בשיחה ביניכם.`),
    )
    return () => whenAnswered(null)
  }, [toast])

  // the newest first, the ones that went nowhere last
  const all = [...refs].sort((a, b) => Number(a.status === 'declined') - Number(b.status === 'declined') || b.at - a.at)
  const waiting = refs.filter((r) => r.dir === 'in' && r.status === 'pending').length
  const shown = more ? all : all.slice(0, 2)

  return (
    <>
      {all.length > 0 && (
        <section className="rfi" aria-label="שיתופי פעולה" data-inbox>
          <header className="rfi-head">
            <h2>
              שיתופי פעולה <small>הפניות בין מתווכים</small>
            </h2>
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
                  {r.dir === 'in' && r.status === 'pending' ? <Offer r={r} /> : <Row r={r} clientName={r.dir === 'out' ? clients.find((c) => c.id === r.clientId)?.name : undefined} />}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {all.length > 2 && (
            <button type="button" className="rfi-more" onClick={() => setMore(!more)} aria-expanded={more}>
              <ChevronDown aria-hidden className={more ? 'is-up' : ''} />
              {more ? 'פחות' : `כל ההפניות (${all.length})`}
            </button>
          )}
        </section>
      )}
      <ReferralChat />
    </>
  )
}

/** An offer to me, not answered yet: what the client looks for, and the two answers. No name and no phone. */
function Offer({ r }: { r: Referral }) {
  const { toast } = useStore()
  const b = brokerById(r.otherId)
  return (
    <article className="rfi-item is-in" data-ref={r.id} data-dir="in" data-status={r.status}>
      <div className="rfi-who">
        <Avatar src={b.avatar} name={b.name} size={40} />
        <span className="rfi-who-text">
          <b>{b.name}</b>
          <small>{agoText(r.at)}</small>
        </span>
        <StatusPill status={r.status} />
      </div>
      <OfferCard r={r} from={`הפניה מ${b.name}`} />
      <p className="rfi-locked">
        <Lock aria-hidden /> השם והטלפון של הלקוח לא מוצגים. אם זה מתאים לך, פותחים שיחה עם {b.name.split(' ')[0]}.
      </p>
      <div className="rfi-acts">
        <button type="button" className="btn btn-gold" onClick={() => referralActions.interested(r.id)} data-act="interested">
          <MessageCircle /> מעוניין, בוא נדבר
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            referralActions.decline(r.id)
            toast('סומן כלא מתאים.')
          }}
          data-act="not-for-me"
        >
          <X /> לא מתאים לי
        </button>
      </div>
      <p className="rf-note">{REFERRAL_NOTE}</p>
    </article>
  )
}

/** A referral on its way: who, where it stands, and the chat. The client's details are never on this card. */
function Row({ r, clientName }: { r: Referral; clientName?: string }) {
  const b = brokerById(r.otherId)
  const chat = r.status !== 'sent' && r.status !== 'pending' && (r.msgs?.length || r.status === 'talking' || r.status === 'shared')
  // the last line of the chat, as a messenger shows it; the client's details are named, never shown
  const lm = r.msgs?.[r.msgs.length - 1]
  const last = lm ? `${lm.from === 'me' ? 'אני: ' : ''}${lm.kind === 'contact' ? 'פרטי הלקוח נשלחו' : lm.text}` : ''
  return (
    <article className={`rfi-item is-${r.dir}${r.status === 'declined' ? ' is-off' : ''}`} data-ref={r.id} data-dir={r.dir} data-status={r.status}>
      <div className="rfi-who">
        <Avatar src={b.avatar} name={b.name} size={40} />
        <span className="rfi-who-text">
          <b>{r.dir === 'out' ? `${clientName ?? 'הלקוח שלך'} אל ${b.name}` : `הפניה מ${b.name}`}</b>
          <small>
            {sideText(r)} · {roomsText(r)} · <span className="num">{budgetText(r)}</span>
          </small>
          <small>
            {r.city} · עמלת הפניה <span className="num">{r.pct}%</span> · {agoText(r.at)}
          </small>
        </span>
        <StatusPill status={r.status} />
      </div>
      {chat ? (
        <button type="button" className="rfi-chat" onClick={() => openChat(r.id)} data-act="open-ref-chat">
          <MessageCircle aria-hidden />
          <span>שיחה עם {b.name.split(' ')[0]}</span>
          {last && <small className="rfi-chat-last">{last}</small>}
        </button>
      ) : (
        r.status !== 'declined' && (
          <p className="rfi-locked">
            <Lock aria-hidden /> ממתינים ל{b.name.split(' ')[0]}. פרטי הלקוח לא עוברים עד שתשלחו אותם מהשיחה.
          </p>
        )
      )}
      {agreed(r) && <Summary r={r} />}
      {r.dir === 'in' && r.status === 'shared' && <small className="rfi-added">הלקוח נוסף לרשימת הלקוחות שלך. הפרטים נמצאים בשיחה.</small>}
    </article>
  )
}
