import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  BedDouble,
  Bookmark,
  Check,
  ChevronLeft,
  Flag,
  Globe2,
  Handshake,
  Info,
  Link2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Radar,
  Send,
  Share2,
  Sparkles,
  ThumbsUp,
  Trophy,
  Wallet,
} from 'lucide-react'
import { CURRENT_BROKER_ID } from '../config'
import { reactionById, reactions, topicReactions } from '../config/reactions'
import type { ReactionId } from '../config/reactions'
import { REFERRAL_DISCLAIMER, topicById } from '../config/topics'
import { brokerById, formatPrice, roomsLabel } from '../data/demo'
import type { Comment, CommunityItem } from '../data/demo'
import { useStore } from '../store'
import { nameSlots } from '../config/navExtras'
import { Avatar, EASE, Photo } from './ui'
import '../styles/community.css'
import '../styles/feed.css'
import '../styles/topics.css'

/**
 * One community post, Facebook-style. The same component renders the feed and the
 * "this is exactly what will be published" preview in the CRM (preview = true).
 */
export default function CommunityCard({
  item,
  preview = false,
  match,
}: {
  item: CommunityItem
  preview?: boolean
  /** shown when this post fits something of mine (a saved search or a property) */
  match?: string
}) {
  const { liked, react, interested, toggleInterested, toast, addComment } = useStore()
  const topic = topicById(item.topicId)
  const author = brokerById(item.authorId)
  const me = brokerById(CURRENT_BROKER_ID)
  const mine = item.authorId === me.id
  const myReaction = liked[item.id] as ReactionId | undefined
  const sent = !!interested[item.id]

  const [open, setOpen] = useState(false)
  const [reply, setReply] = useState('')
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [picker, setPicker] = useState(false)
  const [menu, setMenu] = useState(false)
  const pickerTimer = useRef<number>()
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const commentCount = item.comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0)
  const total = item.likes + (myReaction ? 1 : 0)
  // summary icons: what this kind of post usually collects, with my own reaction first
  const seed = item.likes > 0 ? topicReactions[item.topicId] : []
  const summary = [...new Set([...(myReaction ? [myReaction] : []), ...seed])].slice(0, 3)

  useEffect(() => {
    if (!menu) return
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menu])
  useEffect(() => () => window.clearTimeout(pickerTimer.current), [])

  const showPicker = (delay: number) => {
    window.clearTimeout(pickerTimer.current)
    pickerTimer.current = window.setTimeout(() => setPicker(true), delay)
  }
  const hidePicker = (delay = 250) => {
    window.clearTimeout(pickerTimer.current)
    pickerTimer.current = window.setTimeout(() => setPicker(false), delay)
  }
  const choose = (id: ReactionId | null) => {
    react(item.id, id)
    hidePicker(0)
  }

  const openComments = () => {
    setOpen(true)
    window.setTimeout(() => inputRef.current?.focus(), 250)
  }

  const send = (e: FormEvent) => {
    e.preventDefault()
    const body = reply.trim()
    if (!body) return
    addComment(item.id, { authorId: me.id, body, time: 'עכשיו' }, replyTo ?? undefined)
    setReply('')
    setReplyTo(null)
  }

  const mineReaction = myReaction ? reactionById(myReaction) : null
  const LikeIcon = mineReaction?.icon ?? ThumbsUp

  const cta = topic.cta && !preview && (
    <div className="fb-embed-cta">
      {mine ? (
        <span className="tag tag-green">
          <Check />
          הפרסום שלך באוויר
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
      )}
    </div>
  )

  return (
    <article
      id={preview ? undefined : `ci-${item.id}`}
      className={`fb ci ci-${topic.kind} tone-${topic.tone}${item.fresh ? ' is-fresh' : ''}${match ? ' is-match' : ''}`}
    >
      {item.fresh && !preview && <span className="fb-new">חדש</span>}

      {/* ------------------------------------------------------------ header */}
      <header className="fb-head">
        <Avatar src={author.avatar} name={author.name} size={42} />
        <div className="fb-who">
          <div className="fb-name">
            <strong>{author.name}</strong>
            {nameSlots.Badge && <nameSlots.Badge brokerId={author.id} />}
            <ChevronLeft aria-hidden />
            {preview ? (
              <span className="fb-topic">
                <topic.icon />
                {topic.name}
              </span>
            ) : (
              <Link to={`/app/community?topic=${topic.id}`} className="fb-topic">
                <topic.icon />
                {topic.name}
              </Link>
            )}
          </div>
          <div className="fb-meta">
            <span>{item.time}</span>
            <i aria-hidden>·</i>
            <span className="fb-city">
              <MapPin />
              {item.city}
            </span>
            <i aria-hidden>·</i>
            <Globe2 aria-label="גלוי לחברי הקהילה" />
            {mine && !preview && <em className="ci-mine">הפרסום שלך</em>}
          </div>
        </div>
        {!preview && (
          <div className="fb-menu" ref={menuRef}>
            <button className="icon-btn" aria-label="אפשרויות נוספות" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              <MoreHorizontal />
            </button>
            <AnimatePresence>
              {menu && (
                <motion.div
                  className="fb-pop"
                  role="menu"
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: EASE }}
                >
                  {(
                    [
                      [Bookmark, 'שמירת הפוסט', 'הפוסט נשמר אצלך'],
                      [Link2, 'העתקת קישור', 'הקישור הועתק'],
                      [Flag, 'דיווח למנהלי הקהילה', 'בדמו הדיווח אינו נשלח'],
                    ] as const
                  ).map(([Icon, label, message]) => (
                    <button
                      key={label}
                      role="menuitem"
                      onClick={() => {
                        toast(message)
                        setMenu(false)
                      }}
                    >
                      <Icon />
                      {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </header>

      {match && (
        <div className="ci-match" role="status">
          <Sparkles />
          <span>{match}</span>
        </div>
      )}

      {/* -------------------------------------------------------------- text */}
      {topic.kind === 'post' && item.topicId === 'wins' && (
        <span className="ci-win">
          <Trophy />
          עסקה נסגרה
        </span>
      )}
      {item.body && <p className={`fb-text${item.body.length < 90 && topic.kind === 'post' && !item.image ? ' is-big' : ''}`}>{item.body}</p>}

      {/* ------------------------------------------------ property (שת"פ) */}
      {item.property && (
        <div className="fb-embed fb-prop">
          {item.image && <Photo src={item.image} alt={item.title ?? ''} ratio="16 / 9" className="fb-media" eager={preview} />}
          <div className="fb-embed-body">
            <div className="fb-embed-main">
              <span className="fb-embed-kicker">
                <MapPin />
                {item.property.area}
              </span>
              <h3>{item.title}</h3>
              <div className="fb-facts">
                {item.property.rooms && (
                  <span>
                    <BedDouble />
                    <span className="num">{item.property.rooms}</span> חדרים
                  </span>
                )}
                {item.property.showPrice !== false && <strong className="num">{formatPrice(item.property.price)}</strong>}
                <span className="fb-split">
                  <Handshake />
                  {item.property.split}
                </span>
              </div>
            </div>
            {cta}
          </div>
        </div>
      )}

      {/* ------------------------------------------- saved search (מחפש לקונה) */}
      {item.search && (
        <div className="fb-embed fb-search">
          <div className="fb-embed-body is-stack">
            <span className="fb-embed-kicker">
              <i className="radar" aria-hidden>
                <Radar />
              </i>
              בקשת חיפוש שמורה
            </span>
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
            <div className="fb-embed-foot">
              <span className="ci-saved">הבקשה נשמרה ולא נבלעת. כשיתפרסם נכס מתאים, תישלח התראה.</span>
              {cta}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- referral (הפניה) */}
      {item.referral && (
        <div className="fb-embed fb-ref">
          <div className="fb-embed-body is-stack">
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
            <div className="ci-terms">
              <strong>{item.referral.terms}</strong>
              <span>
                <Info />
                {REFERRAL_DISCLAIMER}
              </span>
            </div>
            <div className="fb-embed-foot">{cta}</div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- post photo */}
      {topic.kind === 'post' && item.image && <Photo src={item.image} alt="" ratio="16 / 9" className="fb-media" />}

      {!preview && (
        <>
          {/* --------------------------------------------------- stats row */}
          <div className="fb-stats">
            <button className="fb-reacts" onClick={() => choose(myReaction ? null : 'like')} aria-label={`${total} תגובות רגש`}>
              {summary.length > 0 && (
                <span className="fb-react-icons">
                  {summary.map((id) => {
                    const r = reactionById(id)
                    return (
                      <i key={id} style={{ background: r.color }}>
                        <r.icon />
                      </i>
                    )
                  })}
                </span>
              )}
              <span className="num">{total > 0 ? total : 'עוד אין תגובות רגש'}</span>
            </button>
            <button className="fb-counts" onClick={() => (open ? setOpen(false) : openComments())}>
              <span className="num">{commentCount}</span> תגובות
            </button>
          </div>

          {/* ---------------------------------------------------- action bar */}
          <div className="fb-actions">
            <div className="fb-like-wrap" onMouseEnter={() => showPicker(420)} onMouseLeave={() => hidePicker()}>
              <AnimatePresence>
                {picker && (
                  <motion.div
                    className="fb-picker"
                    role="menu"
                    aria-label="בחירת תגובת רגש"
                    initial={{ opacity: 0, y: 12, scale: 0.86 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 460, damping: 30 }}
                  >
                    {reactions.map((r, i) => (
                      <motion.button
                        key={r.id}
                        role="menuitem"
                        aria-label={r.label}
                        className={myReaction === r.id ? 'is-on' : ''}
                        style={{ background: r.color }}
                        initial={{ opacity: 0, y: 14, scale: 0.5 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 520, damping: 22, delay: i * 0.035 }}
                        whileHover={{ scale: 1.28, y: -6 }}
                        onClick={() => choose(r.id)}
                      >
                        <r.icon />
                        <span>{r.label}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                className={`fb-action like${myReaction ? ' is-liked' : ''}`}
                style={mineReaction ? { color: mineReaction.color } : undefined}
                aria-pressed={!!myReaction}
                onClick={() => choose(myReaction ? null : 'like')}
                onTouchStart={() => showPicker(450)}
                onTouchEnd={() => window.clearTimeout(pickerTimer.current)}
              >
                <motion.span
                  key={myReaction ?? 'none'}
                  className="fb-action-icon"
                  initial={{ scale: myReaction ? 0.3 : 1, rotate: myReaction ? -30 : 0 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 13 }}
                >
                  <LikeIcon />
                </motion.span>
                {mineReaction?.label ?? 'אהבתי'}
              </button>
            </div>
            <button className="fb-action" onClick={openComments}>
              <MessageCircle />
              תגובה
            </button>
            <button className="fb-action" onClick={() => toast('בדמו השיתוף אינו פעיל')}>
              <Share2 />
              שיתוף
            </button>
          </div>

          {/* ------------------------------------------------------ comments */}
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                className="comments"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.32, ease: EASE }}
              >
                <div className="fb-comments">
                  {item.comments.map((c, i) => (
                    <div className="thread" key={i}>
                      <CommentRow c={c} onReply={() => setReplyTo(replyTo === i ? null : i)} active={replyTo === i} />
                      {c.replies && c.replies.length > 0 && (
                        <div className="thread-replies">
                          {c.replies.map((r, j) => (
                            <CommentRow key={j} c={r} small />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <form className="fb-reply" onSubmit={send}>
                    <Avatar src={me.avatar} name={me.name} size={34} />
                    <label className="sr-only" htmlFor={`reply-${item.id}`}>
                      כתיבת תגובה
                    </label>
                    <div className="fb-reply-box">
                      <input
                        ref={inputRef}
                        id={`reply-${item.id}`}
                        placeholder={
                          replyTo != null
                            ? `תגובה אל ${brokerById(item.comments[replyTo].authorId).name}...`
                            : item.comments.length === 0
                              ? 'היו הראשונים להגיב...'
                              : 'כתיבת תגובה...'
                        }
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                      />
                      <button aria-label="שליחת תגובה" disabled={!reply.trim()}>
                        <Send />
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </article>
  )
}

function CommentRow({ c, onReply, active, small }: { c: Comment; onReply?: () => void; active?: boolean; small?: boolean }) {
  const a = brokerById(c.authorId)
  const [liked, setLiked] = useState(false)
  return (
    <div className="fb-comment">
      <Avatar src={a.avatar} name={a.name} size={small ? 28 : 34} />
      <div className="fb-comment-main">
        <div className="fb-bubble">
          <strong>
            {a.name}
            {nameSlots.Badge && <nameSlots.Badge brokerId={a.id} />}
          </strong>
          <p>{c.body}</p>
          {liked && (
            <span className="fb-bubble-like">
              <i>
                <ThumbsUp />
              </i>
              1
            </span>
          )}
        </div>
        <div className="fb-comment-actions">
          <button className={liked ? 'is-on' : ''} aria-pressed={liked} onClick={() => setLiked((l) => !l)}>
            אהבתי
          </button>
          {onReply && (
            <button className={active ? 'is-on' : ''} onClick={onReply}>
              {active ? 'ביטול' : 'הגב'}
            </button>
          )}
          <time>{c.time}</time>
        </div>
      </div>
    </div>
  )
}
