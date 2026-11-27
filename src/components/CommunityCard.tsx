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
  Wallet, Building2, ArrowUp, Home, Repeat2 } from 'lucide-react'
import { CURRENT_BROKER_ID } from '../config'
import { reactionById, reactions, topicReactions } from '../config/reactions'
import type { ReactionId } from '../config/reactions'
import { REFERRAL_DISCLAIMER, topicById } from '../config/topics'
import { brokerById, bumpReadyAt, canBump, formatPrice, postedWords, roomsLabel, waitWords } from '../data/demo'
import { priceText } from '../community/PropertyPage'
import type { Comment, CommunityItem } from '../data/demo'
import { useStore } from '../store'
import { actionSlots, nameSlots } from '../config/navExtras'
import { Avatar, EASE, Photo } from './ui'
import '../styles/community.css'
import '../styles/feed.css'
import '../styles/topics.css'
import '../styles/property.css'
import '../styles/post-form.css'
import { propertyKind } from '../community/match'
import { searchGroup } from '../config/propertyTypes'
import { streetOf } from '../community/place'
import { CoopBadge } from './CoopBadge'
import OfferProperty from '../community/OfferProperty'
import type { PropCard } from '../community/OfferProperty'
import ChatWindow from '../community/ChatWindow'

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
  const { liked, react, interested, toggleInterested, toast, addComment, bumpItem } = useStore()
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
  // "הצעת נכס" on a buyer's post (27.11.2026): the window of my properties, then the chat with the property's card
  const [offering, setOffering] = useState(false)
  const [offered, setOffered] = useState<PropCard | null>(null)
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

  /**
   * "הקפצה למעלה" (Itzik 22.11.2026): my own property goes back to the top of the feed, as if it were published now,
   * once in two days. Before the two days are up the button is quiet and grey and says how long is left, so nobody
   * presses it for nothing. Only the broker who shared the property sees it: `mine`.
   */
  // "הקפצה" (27.11.2026): on every post of mine that has this line (a property, a buyer, a referral), once in 24 hours.
  // The button can always be pressed: before the 24 hours are up it says when it will be possible again.
  const ready = canBump(item)
  const bump = mine && !preview && (
    <button
      type="button"
      className={`ci-bump${ready ? '' : ' is-waiting'}`}
      onClick={() => {
        if (!ready) return toast(`אפשר להקפיץ שוב ${waitWords(bumpReadyAt(item) - Date.now())}`)
        bumpItem(item.id)
        toast('הפוסט עלה לראש הפיד')
      }}
      aria-disabled={!ready}
      title={ready ? 'הפוסט יחזור לראש הפיד' : 'אפשר להקפיץ פעם ב-24 שעות'}
      data-act="bump"
      data-ready={ready ? '1' : '0'}
    >
      <ArrowUp aria-hidden />
      הקפצה
    </button>
  )

  const cta = topic.cta && !preview && (
    <div className={`fb-embed-cta${!mine && item.search ? ' has-offer' : ''}`}>
      {!mine && item.search && (
        <button type="button" className="btn btn-sm btn-gold ci-offer" onClick={() => setOffering(true)} data-act="offer-property">
          <Home aria-hidden />
          הצעת נכס
        </button>
      )}
      {mine ? (
        <>
          <span className="tag tag-green">
            <Check />
            הפרסום שלך באוויר
          </span>
          {bump}
        </>
      ) : item.search ? null : (
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
            {/* in the line under the name (19.11.2026): hanging from the top of the post it covered the topic's name
                on a phone. The older look still places it at the top of the post, through its own style. */}
            {item.fresh && !preview && <span className="fb-new">חדש</span>}
            {/* the date stays the day it was published, also after "הקפצה למעלה": a post that was lifted says so, so
                that nobody reads it as brand new (22.11.2026) */}
            <span data-posted>{preview ? item.time : postedWords(item)}</span>
            {!!item.bumpedAt && !preview && (
              <>
                <i aria-hidden>·</i>
                <span className="fb-bumped" data-bumped>
                  <ArrowUp aria-hidden />
                  הוקפץ
                </span>
              </>
            )}
            <i aria-hidden>·</i>
            {/* a post by one of the staff, who work in no city, has none */}
            {item.city && (
              <>
                <span className="fb-city">
                  <MapPin />
                  {item.city}
                </span>
                <i aria-hidden>·</i>
              </>
            )}
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
                      [Flag, 'דיווח למנהלי הקהילה', 'הדיווח התקבל, תודה'],
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
          {(() => {
            // a property shared in the community has a page of its own: its photos and every detail
            // the photo, with the red "עמלת שת"פ" tag in its corner (a property from before has no fee, and no tag)
            const inner = item.image ? (
              <div className="fb-media-wrap">
                <Photo src={item.image} alt={item.title ?? ''} ratio="16 / 9" className="fb-media" eager={preview} />
                <CoopBadge pct={item.property.coopPct} sample={item.property.sample} />
              </div>
            ) : null
            return preview ? inner : (
              <Link to={`/app/property/${item.id}`} className="fb-prop-link" aria-label={`לדף הנכס: ${item.title}`} data-open-property={item.id}>
                {inner}
              </Link>
            )
          })()}
          <div className="fb-embed-body">
            <div className="fb-embed-main">
              <span className="fb-embed-kicker">
                <MapPin />
                {/* the city and the neighbourhood, then the street, for every broker in the community; the building's
                    number only when the broker chose to show it (one run of words, so the comma sits where it should) */}
                <span className="pf-place">
                  {item.property.area}
                  {streetOf(item.property) && <span data-street>, {streetOf(item.property)}</span>}
                </span>
                {item.property.deal === 'rent' && <em className="fb-deal">להשכרה</em>}
                {item.property.renewal && (
                  <em className="fb-renew" data-renewal>
                    התחדשות עירונית
                  </em>
                )}
              </span>
              {preview ? (
                <h3>{item.title}</h3>
              ) : (
                <Link to={`/app/property/${item.id}`} className="fb-prop-link">
                  <h3>{item.title}</h3>
                </Link>
              )}
              <div className="fb-facts">
                <span className="fb-kind" data-kind={propertyKind(item.property, item.title).kind}>
                  {propertyKind(item.property, item.title).kind}
                </span>
                {item.property.rooms && (
                  <span>
                    <BedDouble />
                    <span className="num">{item.property.rooms}</span> חדרים
                  </span>
                )}
                {item.property.sqm && (
                  <span>
                    <span className="num">{item.property.sqm}</span> מ"ר
                  </span>
                )}
                {item.property.showPrice !== false && <strong className="num">{priceText(item.property)}</strong>}
                {/* no photo to carry the tag: it stands in the line of facts */}
                {!item.image && <CoopBadge pct={item.property.coopPct} at="line" sample={item.property.sample} />}
              </div>
              {/* what the property has: a safe room, a lift... (the first few; the property's page has them all) */}
              {(item.property.extra?.length ?? 0) > 0 && (
                <ul className="fb-extras" data-extras aria-label="מה יש בנכס">
                  {item.property.extra!.slice(0, 4).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                  {item.property.extra!.length > 4 && <li className="is-more num">+{item.property.extra!.length - 4}</li>}
                </ul>
              )}
              {!preview && (item.property.images?.length ?? 0) > 0 && (
                <Link to={`/app/property/${item.id}`} className="fb-more">
                  לכל הפרטים ו-{item.property.images!.length} תמונות <ChevronLeft />
                </Link>
              )}
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
              {item.otherCity && (
                <em className="ci-othercity" data-other-city>
                  <Repeat2 aria-hidden />
                  הפניה מעיר אחרת
                </em>
              )}
              {item.search.sample && (
                <em className="sample-tag" data-sample>
                  דוגמה
                </em>
              )}
            </span>
            <h3>{item.title}</h3>
            <ul className="ci-params">
              <li>
                <MapPin />
                {item.search.cities.join(', ')}
              </li>
              <li data-search-what>
                {searchGroup(item.search) === 'business' ? <Building2 /> : <BedDouble />}
                {roomsLabel(item.search)}
              </li>
              <li>
                <Wallet />
                עד <span className="num">{formatPrice(item.search.budget)}</span>
                {item.search.deal === 'rent' && ' לחודש'}
              </li>
              {item.search.deal === 'rent' && (
                <li>
                  <em className="fb-deal">שכירות</em>
                </li>
              )}
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
            <button className="fb-action" data-act="share" onClick={() => (actionSlots.share ? actionSlots.share(item) : toast('הקישור הועתק'))}>
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
      {!preview && !mine && item.search && (
        <>
          <OfferProperty
            buyer={item}
            open={offering}
            onClose={() => setOffering(false)}
            onSend={(card) => {
              setOffering(false)
              setOffered(card)
            }}
          />
          {offered && <ChatWindow key={`${item.id}-${offered.id}`} item={item} open offer={offered} onClose={() => setOffered(null)} />}
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
