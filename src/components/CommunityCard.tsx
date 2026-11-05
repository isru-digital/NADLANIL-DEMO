import { useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  BedDouble,
  Check,
  CornerDownLeft,
  Handshake,
  Heart,
  Info,
  MapPin,
  MessageCircle,
  Radar,
  Send,
  Sparkles,
  Trophy,
  Wallet,
} from 'lucide-react'
import { CURRENT_BROKER_ID } from '../config'
import { REFERRAL_DISCLAIMER, topicById } from '../config/topics'
import { brokerById, formatPrice, roomsLabel } from '../data/demo'
import type { Comment, CommunityItem } from '../data/demo'
import { useStore } from '../store'
import { Avatar, EASE, Photo } from './ui'
import '../styles/community.css'
import '../styles/topics.css'

/**
 * One community message. The same component renders the feed and the
 * "this is exactly what will be published" preview in the CRM (preview = true).
 */
export default function CommunityCard({
  item,
  preview = false,
  match,
}: {
  item: CommunityItem
  preview?: boolean
  /** shown when this message fits something of mine (a saved search or a property) */
  match?: string
}) {
  const { liked, toggleLike, interested, toggleInterested, toast, addComment } = useStore()
  const topic = topicById(item.topicId)
  const author = brokerById(item.authorId)
  const me = brokerById(CURRENT_BROKER_ID)
  const mine = item.authorId === me.id
  const isLiked = !!liked[item.id]
  const sent = !!interested[item.id]
  const [open, setOpen] = useState(false)
  const [reply, setReply] = useState('')
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const commentCount = item.comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0)

  const send = (e: FormEvent) => {
    e.preventDefault()
    const body = reply.trim()
    if (!body) return
    addComment(item.id, { authorId: me.id, body, time: 'עכשיו' }, replyTo ?? undefined)
    setReply('')
    setReplyTo(null)
  }

  return (
    <article
      id={preview ? undefined : `ci-${item.id}`}
      className={`card ci ci-${topic.kind} tone-${topic.tone}${item.fresh ? ' is-fresh' : ''}${match ? ' is-match' : ''}`}
    >
      {item.fresh && !preview && <span className="fresh-flag">חדש בקהילה</span>}

      <header className="post-head">
        <Avatar src={author.avatar} name={author.name} size={44} />
        <div className="post-author">
          <strong>
            {author.name}
            {mine && !preview && <em className="ci-mine">הפרסום שלך</em>}
          </strong>
          <span>
            {author.area} · {item.time}
          </span>
        </div>
        <div className="ci-chips">
          <span className={`tag ci-topic tone-${topic.tone}`}>
            <topic.icon />
            {topic.short}
          </span>
          <span className="tag">
            <MapPin />
            {item.city}
          </span>
        </div>
      </header>

      {match && (
        <div className="ci-match" role="status">
          <Sparkles />
          <span>{match}</span>
        </div>
      )}

      {/* ------------------------------------------------ property (שת"פ) */}
      {item.property && (
        <div className={`ci-prop${item.image ? '' : ' no-image'}`}>
          {item.image && <Photo src={item.image} alt={item.title ?? ''} ratio="4 / 3" className="ci-prop-photo" eager={preview} />}
          <div className="ci-prop-body">
            <h3>{item.title}</h3>
            <div className="board-meta">
              <span>
                <MapPin />
                {item.property.area}
              </span>
              {item.property.rooms && (
                <span>
                  <BedDouble />
                  <span className="num">{item.property.rooms}</span> חדרים
                </span>
              )}
            </div>
            {item.property.showPrice !== false && (
              <div className="board-price">
                <span>מחיר מבוקש</span>
                <strong className="num">{formatPrice(item.property.price)}</strong>
              </div>
            )}
            {item.body && <p className="board-note">{item.body}</p>}
            <span className="board-split">
              <Handshake />
              {item.property.split}
            </span>
          </div>
        </div>
      )}

      {/* ------------------------------------------- saved search (מחפש לקונה) */}
      {item.search && (
        <div className="ci-search">
          <h3>{item.title}</h3>
          <ul className="ci-params">
            <li>
              <MapPin />
              {item.search.cities.join(', ')}
            </li>
            <li>
              <BedDouble />
              {roomsLabel(item.search)}
            </li>
            <li>
              <Wallet />
              עד <span className="num">{formatPrice(item.search.budget)}</span>
            </li>
          </ul>
          {item.search.wants.length > 0 && (
            <div className="ci-wants">
              {item.search.wants.map((w) => (
                <span key={w}>
                  <Check />
                  {w}
                </span>
              ))}
            </div>
          )}
          {item.body && <p className="board-note">{item.body}</p>}
          <span className="ci-saved">
            <i aria-hidden>
              <Radar />
            </i>
            הבקשה נשמרה ולא נבלעת. כשיתפרסם נכס מתאים, תישלח התראה.
          </span>
        </div>
      )}

      {/* ---------------------------------------------------- referral (הפניה) */}
      {item.referral && (
        <div className="ci-ref">
          <div className="ci-route" aria-label={`הפניה מ${item.city} אל ${item.referral.toCity}`}>
            <span>
              <small>מהעיר</small>
              <strong>{item.city}</strong>
            </span>
            <i aria-hidden>
              <ArrowLeft />
            </i>
            <span>
              <small>דרוש מתווך ב</small>
              <strong>{item.referral.toCity}</strong>
            </span>
            <em>{item.referral.side === 'buyer' ? 'הפניית קונה' : 'הפניית מוכר'}</em>
          </div>
          <h3>{item.title}</h3>
          {item.body && <p className="board-note">{item.body}</p>}
          <div className="ci-terms">
            <strong>{item.referral.terms}</strong>
            <span>
              <Info />
              {REFERRAL_DISCLAIMER}
            </span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------- plain post */}
      {topic.kind === 'post' && (
        <>
          {item.topicId === 'wins' && (
            <span className="ci-win">
              <Trophy />
              עסקה נסגרה
            </span>
          )}
          <p className="post-body">{item.body}</p>
          {item.image && <Photo src={item.image} alt="" ratio="16 / 8" className="ci-post-photo" />}
        </>
      )}

      {!preview && (
        <footer className="post-actions">
          <button
            className={`post-action like${isLiked ? ' is-liked' : ''}`}
            onClick={() => toggleLike(item.id)}
            aria-pressed={isLiked}
            aria-label={isLiked ? 'ביטול לייק' : 'לייק'}
          >
            <span className="like-icon">
              <motion.span
                key={String(isLiked)}
                initial={{ scale: isLiked ? 0.4 : 1 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 14 }}
              >
                <Heart />
              </motion.span>
              <AnimatePresence>
                {isLiked && (
                  <motion.i
                    className="like-burst"
                    initial={{ scale: 0.4, opacity: 0.9 }}
                    animate={{ scale: 2.4, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: EASE }}
                  />
                )}
              </AnimatePresence>
            </span>
            <span className="num">{item.likes + (isLiked ? 1 : 0)}</span>
          </button>
          <button className="post-action" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            <MessageCircle />
            <span>
              <span className="num">{commentCount}</span> תגובות
            </span>
          </button>

          {topic.cta &&
            (mine ? (
              <span className="tag tag-green ci-live">
                <Check />
                באוויר
              </span>
            ) : (
              <button
                className={`btn btn-sm ci-cta ${sent ? 'btn-ghost is-sent' : 'btn-gold'}`}
                aria-pressed={sent}
                onClick={() => {
                  toggleInterested(item.id)
                  if (!sent) toast(`הפנייה נשלחה אל ${author.name}`)
                }}
              >
                {sent ? (
                  <>
                    <Check />
                    הפנייה נשלחה
                  </>
                ) : (
                  topic.cta
                )}
              </button>
            ))}
        </footer>
      )}

      <AnimatePresence initial={false}>
        {open && !preview && (
          <motion.div
            className="comments"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
          >
            <div className="comments-in">
              {item.comments.length === 0 && <p className="comments-empty">עדיין אין תגובות. אפשר להיות הראשונים.</p>}
              {item.comments.map((c, i) => (
                <div className="thread" key={i}>
                  <CommentRow c={c} onReply={() => setReplyTo(replyTo === i ? null : i)} active={replyTo === i} />
                  {c.replies && c.replies.length > 0 && (
                    <div className="thread-replies">
                      {c.replies.map((r, j) => (
                        <CommentRow key={j} c={r} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <form className="comment-form" onSubmit={send}>
                <Avatar src={me.avatar} name={me.name} size={34} />
                <label className="sr-only" htmlFor={`reply-${item.id}`}>
                  כתיבת תגובה
                </label>
                <input
                  id={`reply-${item.id}`}
                  className="input"
                  placeholder={
                    replyTo != null
                      ? `תגובה אל ${brokerById(item.comments[replyTo].authorId).name}...`
                      : 'כתיבת תגובה...'
                  }
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <button className="icon-btn" aria-label="שליחת תגובה" disabled={!reply.trim()}>
                  <Send />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  )
}

function CommentRow({ c, onReply, active }: { c: Comment; onReply?: () => void; active?: boolean }) {
  const a = brokerById(c.authorId)
  return (
    <div className="comment">
      <Avatar src={a.avatar} name={a.name} size={34} />
      <div className="comment-main">
        <div className="comment-bubble">
          <div>
            <strong>{a.name}</strong>
            <time>{c.time}</time>
          </div>
          <p>{c.body}</p>
        </div>
        {onReply && (
          <button className={`comment-reply${active ? ' is-active' : ''}`} onClick={onReply}>
            <CornerDownLeft />
            {active ? 'ביטול' : 'הגב'}
          </button>
        )}
      </div>
    </div>
  )
}
