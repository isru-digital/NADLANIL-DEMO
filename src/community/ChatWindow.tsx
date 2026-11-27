import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { CheckCheck, Home, Search, Send, X } from 'lucide-react'
import { asset } from '../config'
import { brokerById, formatPriceShort, roomsLabel } from '../data/demo'
import type { CommunityItem } from '../data/demo'
import { Avatar } from '../components/ui'
import { priceText } from './PropertyPage'
import type { PropCard } from './OfferProperty'
import '../styles/offer.css'
import '../styles/chat.css'

/**
 * A chat with the broker of a property, in the shape of a messenger (Itzik 17.11.2026): a small window docked at the
 * bottom corner on a computer, the whole screen on a phone. Bubbles, the time, "נקרא" under my last message, and the
 * property's small photo at the top. There is no server yet: the talk is kept in this browser, and the other broker's
 * answer in the demo is automatic (said so once, quietly, at the top of the talk).
 */
type Msg = { id: string; from: 'me' | 'them'; text: string; at: number; read?: boolean; /** a property of mine, offered to the other broker's buyer (27.11.2026) */ card?: PropCard }
const KEY = 'nadlanup-chats-v1'
const load = (): Record<string, Msg[]> => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Msg[]>
  } catch {
    return {}
  }
}
const save = (all: Record<string, Msg[]>) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* storage unavailable */
  }
}
const timeOf = (at: number) => new Date(at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' })
const QUICK = ['הנכס עדיין זמין?', 'יש לי קונה רציני לנכס', 'אפשר לתאם סיור השבוע?']
const REPLIES = [
  'היי! כן, הנכס עדיין זמין. מה הקונה שלך מחפש?',
  'נשמע טוב. מתי נוח לדבר בטלפון כמה דקות?',
  'אפשר לתאם סיור כבר השבוע. אילו ימים נוחים לך?',
]
// a talk about the other broker's buyer, not a property
const QUICK_BUYER = ['הקונה עדיין מחפש?', 'יש לי נכס שמתאים לו', 'אפשר לדבר היום?']
const REPLIES_BUYER = [
  'היי! כן, הקונה עדיין מחפש. אפשר לראות תמונות של הנכס?',
  'נראה מתאים. מתי אפשר לתאם סיור?',
  'מעולה. נדבר בטלפון ונסגור את חלוקת העמלה.',
]

// a property of mine was sent as a card: the other broker's first answer is about it
const REPLY_CARD = 'תודה, קיבלתי את הנכס. נראה שמתאים לקונה שלי. מתי אפשר לתאם סיור?'
// my own buyer, sent to a broker of the city the buyer looks in (27.11.2026)
const QUICK_REFER = ['יש לי קונה שמחפש בעיר שלך', 'מתאים לך לקבל אותו בהפניה?', 'אפשר לדבר היום?']
const REPLIES_REFER = ['היי! בשמחה. מה הקונה מחפש ומה התקציב?', 'מתאים לי. נסכם דמי הפניה ונתקדם.', 'מעולה. נדבר בטלפון עוד היום.']

export default function ChatWindow({
  item,
  open,
  onClose,
  opener,
  offer,
  refer = false,
}: {
  item: CommunityItem
  open: boolean
  onClose: () => void
  opener?: string
  /** "הצעת נכס": the property that opens the talk, as a small card */
  offer?: PropCard
  /** the talk is about my own buyer, referred to this broker */
  refer?: boolean
}) {
  const broker = brokerById(item.authorId)
  const first = broker.name.split(' ')[0]
  const [msgs, setMsgs] = useState<Msg[]>(() => load()[item.id] ?? [])
  // a ready first line (a match opens the chat with one), left in the box to send or change
  const [text, setText] = useState(() => (opener && !(load()[item.id] ?? []).length ? opener : ''))
  const [typing, setTyping] = useState(false)
  const buyer = !item.property && !!item.search
  const replies = refer ? REPLIES_REFER : buyer ? REPLIES_BUYER : REPLIES
  const list = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), [])
  useEffect(() => {
    const all = load()
    all[item.id] = msgs
    save(all)
  }, [item.id, msgs])
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, typing, open])
  useEffect(() => {
    if (!open) return
    // the corner switch of light and dark steps aside while the chat is open
    document.body.classList.add('has-chat')
    const t = window.setTimeout(() => input.current?.focus(), 120)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('has-chat')
    }
  }, [open, onClose])

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))
  const send = (body: string, card?: PropCard) => {
    const t = body.trim()
    if (!t && !card) return
    const id = `m${Date.now()}`
    // the same property is not sent twice to the same buyer
    setMsgs((m) => (card && m.some((x) => x.card?.id === card.id) ? m : [...m, { id, from: 'me', text: t, at: Date.now(), card }]))
    if (!card) setText('')
    // read a moment later, then a short answer (the demo's answers are automatic)
    later(() => setMsgs((m) => m.map((x) => (x.from === 'me' ? { ...x, read: true } : x))), 1200)
    later(() => setTyping(true), 1800)
    later(() => {
      setTyping(false)
      setMsgs((m) => [...m, { id: `r${Date.now()}`, from: 'them', text: card ? REPLY_CARD : replies[m.filter((x) => x.from === 'them').length % replies.length], at: Date.now() }])
    }, 3600)
  }
  // "הצעת נכס": the chat opens with the property already sent
  useEffect(() => {
    if (!open || !offer) return
    if ((load()[item.id] ?? []).some((x) => x.card?.id === offer.id)) return
    send('', offer)
  }, [open, offer?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const submit = (e: FormEvent) => {
    e.preventDefault()
    send(text)
  }
  if (!open) return null
  const lastMine = [...msgs].reverse().find((m) => m.from === 'me')
  const p = item.property

  return createPortal(
    <section className="cw" role="dialog" aria-label={`צ'אט עם ${broker.name}`} data-chat={item.id}>
      <header className="cw-head">
        <Avatar src={broker.avatar} name={broker.name} size={40} />
        <div className="cw-who">
          <b>{broker.name}</b>
          <small>{broker.title}</small>
        </div>
        <button type="button" className="cw-close" onClick={onClose} aria-label="סגירת הצ'אט" data-act="close-chat">
          <X />
        </button>
      </header>
      {p && (
        <div className="cw-prop" data-chat-property>
          {item.image ? <img src={asset(item.image)} alt="" /> : <span className="cw-prop-ph" aria-hidden />}
          <span>
            <b>{item.title}</b>
            <small>{p.area}</small>
            <small className="cw-prop-price num">{priceText(p)}</small>
          </span>
        </div>
      )}
      {!p && item.search && (
        <div className="cw-prop" data-chat-property>
          <span className="cw-prop-ph is-buyer" aria-hidden>
            <Search />
          </span>
          <span>
            <b>{item.title}</b>
            <small>
              {roomsLabel(item.search)} · {item.search.cities.join(', ')}
            </small>
            <small className="cw-prop-price num">עד {formatPriceShort(item.search.budget)}</small>
          </span>
        </div>
      )}
      <div className="cw-list" ref={list} aria-live="polite">
        <p className="cw-note">בדמו התשובות של המתווך נשלחות אוטומטית</p>
        {msgs.length === 0 && (
          <div className="cw-start">
            <Avatar src={broker.avatar} name={broker.name} size={64} />
            <b>{broker.name}</b>
            <small>כותבים ל{first} על {buyer ? 'הקונה' : 'הנכס'}, או בוחרים משפט מוכן:</small>
            <div className="cw-quick">
              {(refer ? QUICK_REFER : buyer ? QUICK_BUYER : QUICK).map((q) => (
                <button key={q} type="button" onClick={() => send(q)} data-quick={q}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => {
          const next = msgs[i + 1]
          const tail = !next || next.from !== m.from
          return (
            <div key={m.id} className={`cw-row is-${m.from}${tail ? ' is-tail' : ''}`} data-msg={m.from}>
              {m.from === 'them' && <span className="cw-face">{tail && <Avatar src={broker.avatar} name={broker.name} size={28} />}</span>}
              <div className={`cw-bubble${m.card ? ' has-card' : ''}`}>
                {m.card && (
                  <>
                    <span className="cw-card-label">נכס שלי שמתאים לקונה שלך</span>
                    <span className="cw-card" data-chat-card={m.card.id}>
                      {m.card.image ? (
                        <img src={asset(m.card.image)} alt="" />
                      ) : (
                        <span className="cw-card-ph" aria-hidden>
                          <Home />
                        </span>
                      )}
                      <span>
                        <b>{m.card.title}</b>
                        <small>
                          {m.card.area}
                          {m.card.rooms ? ` · ${m.card.rooms} חדרים` : ''}
                        </small>
                        <strong className="num">{m.card.price}</strong>
                      </span>
                    </span>
                  </>
                )}
                {m.text && <span>{m.text}</span>}
                <time className="num">{timeOf(m.at)}</time>
              </div>
              {m === lastMine && (
                <small className="cw-read" data-read={m.read ? 'yes' : 'no'}>
                  {m.read ? (
                    <>
                      <CheckCheck aria-hidden /> נקרא
                    </>
                  ) : (
                    'נשלח'
                  )}
                </small>
              )}
            </div>
          )
        })}
        {typing && (
          <div className="cw-row is-them is-tail" data-typing>
            <span className="cw-face">
              <Avatar src={broker.avatar} name={broker.name} size={28} />
            </span>
            <div className="cw-bubble cw-typing" aria-label="כותבים תשובה">
              <i />
              <i />
              <i />
            </div>
          </div>
        )}
      </div>
      <form className="cw-compose" onSubmit={submit}>
        {/* grows with a longer line (a match's ready first line), Enter sends, Shift+Enter is a new line */}
        <textarea
          ref={input}
          className="cw-input"
          rows={Math.min(4, Math.max(1, Math.ceil(text.length / 34)))}
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
          data-f="chat-input"
        />
        <button type="submit" className="cw-send" disabled={!text.trim()} aria-label="שליחה" data-act="send-chat">
          <Send />
        </button>
      </form>
    </section>,
    document.body,
  )
}
