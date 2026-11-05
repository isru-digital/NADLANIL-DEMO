import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BedDouble,
  Check,
  Handshake,
  Heart,
  MapPin,
  MessageCircle,
  Search,
  Send,
  Share2,
  UserSearch,
} from 'lucide-react'
import { CURRENT_BROKER_ID } from '../config'
import { brokerById, brokers, formatPrice, topics } from '../data/demo'
import type { BoardCard, Comment, Post } from '../data/demo'
import { useStore } from '../store'
import { Avatar, EASE, PageHead, Photo } from '../components/ui'
import '../styles/community.css'

type Tab = 'feed' | 'board'

export default function Community() {
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'board' ? 'board' : 'feed'
  const { board } = useStore()
  const hasFresh = board.some((c) => c.fresh)

  const setTab = (t: Tab) => setParams(t === 'board' ? { tab: 'board' } : {}, { replace: true })

  return (
    <>
      <PageHead
        eyebrow="קהילה"
        title={tab === 'feed' ? 'הפיד של הקהילה' : 'לוח שיתוף'}
        subtitle={
          tab === 'feed'
            ? 'שאלות, טיפים והתייעצויות בין מתווכים עצמאיים.'
            : 'נכסים לשיתוף פעולה ולקוחות שמחפשים. מוצאים שותף וסוגרים עסקה יחד.'
        }
      >
        <div className="seg" role="tablist" aria-label="תצוגת קהילה">
          {(['feed', 'board'] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={`seg-btn${tab === t ? ' is-active' : ''}`}
              onClick={() => setTab(t)}
            >
              {tab === t && (
                <motion.span
                  layoutId="community-seg"
                  className="seg-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                />
              )}
              <span className="seg-label">
                {t === 'feed' ? 'פיד' : 'לוח שיתוף'}
                {t === 'board' && <b className={`seg-count num${hasFresh ? ' is-fresh' : ''}`}>{board.length}</b>}
              </span>
            </button>
          ))}
        </div>
      </PageHead>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.26, ease: EASE }}
        >
          {tab === 'feed' ? <Feed onOpenBoard={() => setTab('board')} /> : <Board />}
        </motion.div>
      </AnimatePresence>
    </>
  )
}

/* ==================================================================== feed */

function Feed({ onOpenBoard }: { onOpenBoard: () => void }) {
  const { posts, addPost, board, toast } = useStore()
  const me = brokerById(CURRENT_BROKER_ID)
  const [topic, setTopic] = useState('הכול')
  const [draft, setDraft] = useState('')
  const [draftTopic, setDraftTopic] = useState(topics[0])

  const visible = useMemo(() => (topic === 'הכול' ? posts : posts.filter((p) => p.topic === topic)), [posts, topic])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body) return
    addPost({
      id: `u${Date.now()}`,
      authorId: me.id,
      topic: draftTopic,
      body,
      likes: 0,
      time: 'עכשיו',
      comments: [],
    })
    setDraft('')
    setTopic('הכול')
    toast('הפוסט פורסם בקהילה')
  }

  return (
    <div className="feed-layout">
      <div className="feed-main">
        <form className="card composer" onSubmit={submit}>
          <div className="composer-top">
            <Avatar src={me.avatar} name={me.name} size={44} ring />
            <label className="sr-only" htmlFor="composer">
              כתיבת פוסט
            </label>
            <textarea
              id="composer"
              className="composer-input"
              rows={2}
              placeholder="מה חדש אצלך? שאלה, טיפ או בקשה לשיתוף פעולה"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </div>
          <div className="composer-bottom">
            <div className="composer-topics" role="group" aria-label="נושא הפוסט">
              {topics.slice(0, 4).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`tag${draftTopic === t ? ' tag-gold' : ''}`}
                  aria-pressed={draftTopic === t}
                  onClick={() => setDraftTopic(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <button className="btn btn-gold btn-sm" disabled={!draft.trim()}>
              <Send />
              פרסום
            </button>
          </div>
        </form>

        <div className="chip-row feed-filter" role="group" aria-label="סינון לפי נושא">
          {['הכול', ...topics].map((t) => (
            <button key={t} className="chip" aria-pressed={topic === t} onClick={() => setTopic(t)}>
              {t}
            </button>
          ))}
        </div>

        <div className="post-list">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                <PostCard post={p} />
              </motion.div>
            ))}
          </AnimatePresence>
          {visible.length === 0 && (
            <div className="empty card">
              <Search />
              <strong>עדיין אין פוסטים בנושא הזה</strong>
              <span>אפשר להיות הראשונים לכתוב.</span>
            </div>
          )}
        </div>
      </div>

      <aside className="feed-side">
        <section className="card card-pad">
          <div className="block-head">
            <h2>חדש בלוח השיתוף</h2>
          </div>
          <ul className="side-board">
            {board.slice(0, 3).map((c) => (
              <li key={c.id}>
                <span className={`tag ${c.kind === 'property' ? 'tag-gold' : 'tag-blue'}`}>
                  {c.kind === 'property' ? 'נכס לשיתוף פעולה' : 'לקוח מחפש'}
                </span>
                <strong>{c.title}</strong>
                <span>{c.area}</span>
              </li>
            ))}
          </ul>
          <button className="btn btn-ghost btn-sm btn-block" onClick={onOpenBoard}>
            <Handshake />
            לכל הלוח
          </button>
        </section>

        <section className="card card-pad">
          <div className="block-head">
            <h2>מחוברים עכשיו</h2>
            <span className="faint num">{brokers.length - 4}</span>
          </div>
          <ul className="online">
            {brokers.slice(1, 7).map((b) => (
              <li key={b.id}>
                <span className="online-face">
                  <Avatar src={b.avatar} name={b.name} size={38} />
                  <i aria-hidden />
                </span>
                <div>
                  <strong>{b.name}</strong>
                  <span>{b.area}</span>
                </div>
              </li>
            ))}
          </ul>
          <Link to="/app/brokers" className="link-more">
            לאינדקס המתווכים
          </Link>
        </section>
      </aside>
    </div>
  )
}

function PostCard({ post }: { post: Post }) {
  const { liked, toggleLike, toast } = useStore()
  const author = brokerById(post.authorId)
  const me = brokerById(CURRENT_BROKER_ID)
  const isLiked = !!liked[post.id]
  const [open, setOpen] = useState(false)
  const [extra, setExtra] = useState<Comment[]>([])
  const [reply, setReply] = useState('')
  const comments = [...post.comments, ...extra]

  const send = (e: FormEvent) => {
    e.preventDefault()
    if (!reply.trim()) return
    setExtra((c) => [...c, { authorId: me.id, body: reply.trim(), time: 'עכשיו' }])
    setReply('')
  }

  return (
    <article className="card post">
      <header className="post-head">
        <Avatar src={author.avatar} name={author.name} size={46} />
        <div className="post-author">
          <strong>{author.name}</strong>
          <span>
            {author.area} · {post.time}
          </span>
        </div>
        <span className="tag tag-gold">{post.topic}</span>
      </header>

      <p className="post-body">{post.body}</p>

      <footer className="post-actions">
        <button
          className={`post-action like${isLiked ? ' is-liked' : ''}`}
          onClick={() => toggleLike(post.id)}
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
          <span className="num">{post.likes + (isLiked ? 1 : 0)}</span>
        </button>
        <button className="post-action" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <MessageCircle />
          <span>
            <span className="num">{comments.length}</span> תגובות
          </span>
        </button>
        <button className="post-action post-share" onClick={() => toast('בדמו השיתוף אינו פעיל')}>
          <Share2 />
          <span>שיתוף</span>
        </button>
      </footer>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="comments"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
          >
            <div className="comments-in">
              {comments.map((c, i) => {
                const a = brokerById(c.authorId)
                return (
                  <div className="comment" key={i}>
                    <Avatar src={a.avatar} name={a.name} size={34} />
                    <div className="comment-bubble">
                      <div>
                        <strong>{a.name}</strong>
                        <time>{c.time}</time>
                      </div>
                      <p>{c.body}</p>
                    </div>
                  </div>
                )
              })}
              <form className="comment-form" onSubmit={send}>
                <Avatar src={me.avatar} name={me.name} size={34} />
                <label className="sr-only" htmlFor={`reply-${post.id}`}>
                  כתיבת תגובה
                </label>
                <input
                  id={`reply-${post.id}`}
                  className="input"
                  placeholder="כתיבת תגובה..."
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

/* =================================================================== board */

type BoardFilter = 'all' | 'property' | 'client'

function Board() {
  const { board, clearFresh } = useStore()
  const [filter, setFilter] = useState<BoardFilter>('all')
  const visible = filter === 'all' ? board : board.filter((c) => c.kind === filter)

  // keep the "new" highlight long enough to be noticed, then settle
  useEffect(() => {
    if (!board.some((c) => c.fresh)) return
    const t = window.setTimeout(clearFresh, 9000)
    return () => window.clearTimeout(t)
  }, [board, clearFresh])

  return (
    <>
      <div className="board-bar">
        <div className="chip-row" role="group" aria-label="סינון הלוח">
          {(
            [
              ['all', 'הכול'],
              ['property', 'נכסים לשיתוף פעולה'],
              ['client', 'לקוחות מחפשים'],
            ] as [BoardFilter, string][]
          ).map(([id, label]) => (
            <button key={id} className="chip" aria-pressed={filter === id} onClick={() => setFilter(id)}>
              {label}
              <b className="num chip-count">
                {id === 'all' ? board.length : board.filter((c) => c.kind === id).length}
              </b>
            </button>
          ))}
        </div>
        <Link to="/app/crm" className="btn btn-ghost btn-sm">
          <Share2 />
          פרסום מתוך ה-CRM
        </Link>
      </div>

      <div className="board-grid">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((c) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, y: 30, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.55, ease: EASE }}
            >
              <BoardItem card={c} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {visible.length === 0 && (
        <div className="empty card">
          <Handshake />
          <strong>אין כרגע כרטיסים מהסוג הזה</strong>
          <span>פרסום ראשון מתוך ה-CRM יופיע כאן מיד.</span>
        </div>
      )}
    </>
  )
}

function BoardItem({ card }: { card: BoardCard }) {
  const { interested, toggleInterested, toast } = useStore()
  const broker = brokerById(card.brokerId)
  const mine = card.brokerId === CURRENT_BROKER_ID
  const sent = !!interested[card.id]
  const isProperty = card.kind === 'property'

  return (
    <article className={`card board-card${card.fresh ? ' is-fresh' : ''}`}>
      {card.image ? (
        <Photo src={card.image} alt={card.title} ratio="16 / 9" className="board-photo">
          <span className="tag tag-gold board-kind">
            <Handshake />
            נכס לשיתוף פעולה
          </span>
        </Photo>
      ) : (
        <div className={`board-band ${isProperty ? 'band-gold' : 'band-blue'}`}>
          <span className={`tag ${isProperty ? 'tag-gold' : 'tag-blue'}`}>
            {isProperty ? <Handshake /> : <UserSearch />}
            {isProperty ? 'נכס לשיתוף פעולה' : 'לקוח מחפש'}
          </span>
        </div>
      )}
      {card.fresh && <span className="fresh-flag">חדש בלוח</span>}

      <div className="board-body">
        <h3>{card.title}</h3>
        <div className="board-meta">
          <span>
            <MapPin />
            {card.area}
          </span>
          {card.rooms && (
            <span>
              <BedDouble />
              <span className="num">{card.rooms}</span> חדרים
            </span>
          )}
        </div>
        {card.price != null && (
          <div className="board-price">
            <span>{isProperty ? 'מחיר מבוקש' : 'תקציב עד'}</span>
            <strong className="num">{formatPrice(card.price)}</strong>
          </div>
        )}
        {card.note && <p className="board-note">{card.note}</p>}
        <span className="board-split">
          <Handshake />
          {card.split}
        </span>
      </div>

      <footer className="board-foot">
        <div className="board-broker">
          <Avatar src={broker.avatar} name={broker.name} size={36} />
          <div>
            <strong>{mine ? 'פורסם על ידך' : broker.name}</strong>
            <span>{card.time}</span>
          </div>
        </div>
        {mine ? (
          <span className="tag tag-green">
            <Check />
            באוויר
          </span>
        ) : (
          <button
            className={`btn btn-sm ${sent ? 'btn-ghost is-sent' : 'btn-gold'}`}
            onClick={() => {
              toggleInterested(card.id)
              if (!sent) toast(`הפנייה נשלחה אל ${broker.name}`)
            }}
            aria-pressed={sent}
          >
            {sent ? (
              <>
                <Check />
                הפנייה נשלחה
              </>
            ) : (
              'יש לי התאמה'
            )}
          </button>
        )}
      </footer>
    </article>
  )
}
