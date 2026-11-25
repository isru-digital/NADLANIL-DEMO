import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCheck, Handshake, Lock, Phone, Send, ShieldCheck, UserRoundCheck, X } from 'lucide-react'
import { brokerById, brokerPhone } from '../data/demo'
import { useStore } from '../store'
import { Avatar, EASE } from '../components/ui'
import { WhatsAppIcon } from '../templates/LandingTemplate'
import { useClients } from './clients'
import { StatusPill, Summary } from './ReferClient'
import { agreed, budgetText, giverOf, openerOf, openChat, referralActions, roomsText, sideText, useOpenChat, useReferrals, whatsappTo } from './referral'
import type { Referral } from './referral'
import '../styles/chat.css'
import '../styles/referral-chat.css'

/**
 * The chat of a referral (25.11.2026), in the shape of a messenger: docked at the bottom corner on a computer, the
 * whole screen on a phone. It opens from "מעוניין, בוא נדבר" with the ready message in the box, and only the referring
 * broker can send the client's name and phone, after a "לשלוח?" question. One chat is open at a time.
 */
export default function ReferralChat() {
  const id = useOpenChat()
  const refs = useReferrals()
  const r = refs.find((x) => x.id === id)
  if (!r) return null
  return <Chat key={r.id} r={r} />
}

const timeOf = (at: number) => new Date(at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' })

function Chat({ r }: { r: Referral }) {
  const { toast } = useStore()
  const clients = useClients()
  const other = brokerById(r.otherId)
  const giver = brokerById(giverOf(r))
  const first = other.name.split(' ')[0]
  const msgs = r.msgs ?? []
  const mineSent = msgs.some((m) => m.from === 'me' && m.kind === 'text')
  // the one who would get the client starts with the ready message, to change or to send as it is
  const [text, setText] = useState(() => (r.dir === 'in' && !mineSent ? openerOf(r) : ''))
  const [asking, setAsking] = useState(false)
  const [waShown, setWaShown] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const close = () => openChat(null)

  // the client's details: mine (my CRM) on an offer of mine, the referring broker's on an offer to me
  const mineClient = r.dir === 'out' ? clients.find((c) => c.id === r.clientId) : undefined
  const contact = r.dir === 'out' ? (mineClient ? { name: mineClient.name, phone: mineClient.phone } : null) : r.sharedAt ? (r.contact ?? null) : null
  const typing = r.dir === 'in' && r.status === 'talking' && !!r.takerAgreedAt && !r.sharedAt

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
  }, [msgs.length, typing, r.status])
  useEffect(() => {
    document.body.classList.add('has-chat')
    const t = window.setTimeout(() => input.current?.focus(), 140)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (asking) setAsking(false)
      else close()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('has-chat')
    }
  }, [asking])

  const send = (body: string) => {
    if (!body.trim()) return
    referralActions.say(r.id, body)
    setText('')
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    send(text)
  }
  // "המשך בוואטסאפ": the referring broker's own WhatsApp with the same message; the broker sends it
  const wa = () => {
    const url = whatsappTo(r.otherId, text.trim() || openerOf(r))
    if (!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
    setWaShown(true)
    toast(`נפתח וואטסאפ עם ${other.name}. שולחים בעצמכם.`)
  }
  const share = () => {
    referralActions.shareDetails(r.id)
    setAsking(false)
    toast(`פרטי הלקוח נשלחו ל${other.name}.`)
  }

  const lastMine = [...msgs].reverse().find((m) => m.from === 'me')
  const canShare = r.dir === 'out' && !r.sharedAt && r.status !== 'declined' && r.status !== 'closed'
  const done = r.status === 'closed' || r.status === 'declined'

  return createPortal(
    <section className="cw rfc" role="dialog" aria-label={`שיחה עם ${other.name} על ההפניה`} data-chat-ref={r.id} data-status={r.status}>
      <header className="cw-head">
        <Avatar src={other.avatar} name={other.name} size={40} />
        <div className="cw-who">
          <b>{other.name}</b>
          <StatusPill status={r.status} />
        </div>
        <button type="button" className="cw-close" onClick={close} aria-label="סגירת השיחה" data-act="close-ref-chat">
          <X />
        </button>
      </header>

      <div className="rfc-offer" data-chat-offer>
        <span className="rfc-offer-ico" aria-hidden>
          <Handshake />
        </span>
        <span className="rfc-offer-text">
          <b>{r.dir === 'out' ? `הלקוח שלך, אל ${other.name}` : `הפניה מ${other.name}`}</b>
          <small>
            {sideText(r)} · {roomsText(r)} · <span className="num">{budgetText(r)}</span>
          </small>
          <small>
            {r.city}
            {r.hoods.length ? `, ${r.hoods.join(', ')}` : ''}
          </small>
        </span>
        <span className="rfc-offer-pct">
          <b className="num">{r.pct}%</b>
          <small>עמלת הפניה</small>
        </span>
      </div>

      <div className="cw-list rfc-list" ref={list} aria-live="polite">
        <p className="cw-note">בדמו התשובות של המתווך נשלחות אוטומטית</p>
        {!r.sharedAt && (
          <p className="rfc-lock" data-locked>
            <Lock aria-hidden />
            {r.dir === 'out' ? (
              <>פרטי הלקוח אצלך. הם עוברים רק כשתלחצו על "שלח את פרטי הלקוח".</>
            ) : (
              <>פרטי הלקוח לא נחשפים. השליחה שלהם היא החלטה של {giver.name}, מתוך השיחה.</>
            )}
          </p>
        )}
        {msgs.length === 0 && r.dir === 'in' && (
          <div className="cw-start rfc-start">
            <Avatar src={other.avatar} name={other.name} size={64} />
            <b>{other.name}</b>
            <small>ההודעה מוכנה למטה. אפשר לשנות אותה לפני השליחה.</small>
          </div>
        )}
        {msgs.map((m, i) => {
          const next = msgs[i + 1]
          const tail = !next || next.from !== m.from
          if (m.kind === 'contact') {
            return (
              <motion.div
                key={m.id}
                className={`cw-row is-${m.from} is-tail rfc-contact-row`}
                data-msg={m.from}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.26, ease: EASE }}
              >
                {m.from === 'them' && (
                  <span className="cw-face">
                    <Avatar src={other.avatar} name={other.name} size={28} />
                  </span>
                )}
                <div className="rfc-contact" data-contact>
                  <span className="rfc-contact-head">
                    <UserRoundCheck aria-hidden /> פרטי הלקוח
                  </span>
                  {contact ? (
                    <>
                      <b data-contact-name>{contact.name}</b>
                      <a href={`tel:${contact.phone.replace(/-/g, '')}`} className="rfc-contact-phone num" dir="ltr" data-contact-phone>
                        <Phone aria-hidden /> {contact.phone}
                      </a>
                    </>
                  ) : (
                    <b>הלקוח</b>
                  )}
                  <small>{m.from === 'me' ? `נשלח ל${other.name}` : 'הלקוח נוסף לרשימת הלקוחות שלך'}</small>
                </div>
                <time className="rfc-time num">{timeOf(m.at)}</time>
              </motion.div>
            )
          }
          return (
            <div key={m.id} className={`cw-row is-${m.from}${tail ? ' is-tail' : ''}`} data-msg={m.from}>
              {m.from === 'them' && <span className="cw-face">{tail && <Avatar src={other.avatar} name={other.name} size={28} />}</span>}
              <div className="cw-bubble">
                <span>{m.text}</span>
                <time className="num">{timeOf(m.at)}</time>
              </div>
              {m === lastMine && m.kind === 'text' && (
                <small className="cw-read" data-read="yes">
                  <CheckCheck aria-hidden /> נשלח
                </small>
              )}
            </div>
          )
        })}
        {typing && (
          <div className="cw-row is-them is-tail" data-typing>
            <span className="cw-face">
              <Avatar src={other.avatar} name={other.name} size={28} />
            </span>
            <div className="cw-bubble cw-typing" aria-label="כותבים תשובה">
              <i />
              <i />
              <i />
            </div>
          </div>
        )}
        {agreed(r) && (
          <motion.div className="rfc-sum" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE, delay: 0.15 }}>
            <Summary r={r} />
            {!done && (
              <div className="rfc-marks">
                <button type="button" className="rfc-mark" onClick={() => referralActions.mark(r.id, 'closed')} data-act="mark-closed">
                  העסקה נסגרה
                </button>
                <button type="button" className="rfc-mark is-quiet" onClick={() => referralActions.mark(r.id, 'declined')} data-act="mark-irrelevant">
                  לא רלוונטית
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <div className="rfc-foot">
        {canShare && (
          <button type="button" className="rfc-share" onClick={() => setAsking(true)} data-act="share-details">
            <UserRoundCheck aria-hidden /> שלח את פרטי הלקוח
          </button>
        )}
        {r.dir === 'in' && !done && (
          <div className="rfc-wa-row">
            <button type="button" className="rfc-wa" onClick={wa} data-act="continue-whatsapp">
              <WhatsAppIcon /> המשך בוואטסאפ
            </button>
            {waShown ? (
              <small className="rfc-wa-note" data-broker-phone>
                הטלפון של {first}: <span className="num" dir="ltr">{brokerPhone(other)}</span>
              </small>
            ) : (
              <small className="rfc-wa-note">אותה הודעה, אל הוואטסאפ של {first}. שולחים בעצמכם.</small>
            )}
          </div>
        )}
        <form className="cw-compose" onSubmit={submit}>
          <textarea
            ref={input}
            className="cw-input"
            rows={Math.min(6, Math.max(1, Math.ceil(text.length / 34)))}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                send(text)
              }
            }}
            placeholder={`הודעה ל${first}`}
            aria-label="הודעה"
            enterKeyHint="send"
            data-f="ref-chat-input"
          />
          <button type="submit" className="cw-send" disabled={!text.trim()} aria-label="שליחה" data-act="send-ref-chat">
            <Send />
          </button>
        </form>
      </div>

      <AnimatePresence>
        {asking && (
          <motion.div className="rfc-ask" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={() => setAsking(false)}>
            <motion.div
              className="rfc-ask-card"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="rfc-ask-title"
              data-confirm="share"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            >
              <span className="rfc-ask-ico" aria-hidden>
                <ShieldCheck />
              </span>
              <h3 id="rfc-ask-title">
                לשלוח את שם הלקוח והטלפון ל{other.name}?
              </h3>
              {contact && (
                <p className="rfc-ask-what">
                  <b>{contact.name}</b> · <span className="num" dir="ltr">{contact.phone}</span>
                </p>
              )}
              <p className="rfc-ask-sub">הם יופיעו רק בשיחה הזאת, אצל {other.name}.</p>
              <div className="rfc-ask-acts">
                <button type="button" className="btn btn-gold" onClick={share} data-act="confirm-share" autoFocus>
                  כן, לשלוח
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setAsking(false)} data-act="cancel-share">
                  עוד לא
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>,
    document.body,
  )
}
