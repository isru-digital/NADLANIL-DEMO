import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Handshake, MapPin, MessageCircle, Search, SlidersHorizontal, X } from 'lucide-react'
import { CURRENT_BROKER_ID, asset } from '../config'
import { brokers, regions, specialties } from '../data/demo'
import type { Broker } from '../data/demo'
import { useStore } from '../store'
import { nameSlots } from '../config/navExtras'
import { EASE, Modal, PageHead } from '../components/ui'
import '../styles/brokers.css'
import '../styles/community.css'

export default function Brokers() {
  const { toast } = useStore()
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState<string | null>(null)
  const [specialty, setSpecialty] = useState<string | null>(null)
  const [profile, setProfile] = useState<Broker | null>(null)

  const visible = useMemo(() => {
    const q = query.trim()
    return brokers.filter(
      (b) =>
        (!region || b.region === region) &&
        (!specialty || b.specialties.includes(specialty)) &&
        (!q || [b.name, b.area, b.title, ...b.specialties].some((v) => v.includes(q))),
    )
  }, [query, region, specialty])

  const hasFilter = !!(query || region || specialty)
  const clear = () => {
    setQuery('')
    setRegion(null)
    setSpecialty(null)
  }

  return (
    <>
      <PageHead
        eyebrow="אינדקס מתווכים"
        title="מי עובד איפה"
        subtitle="מתווכים עצמאיים מכל הארץ, לפי אזור ולפי התמחות. מוצאים שותף לעסקה בכמה שניות."
      >
        <label className="search">
          <Search />
          <span className="sr-only">חיפוש מתווך</span>
          <input
            type="search"
            placeholder="חיפוש לפי שם, עיר או התמחות"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </PageHead>

      <div className="card filters">
        <div className="filter-group">
          <span className="filter-label">
            <MapPin />
            אזור
          </span>
          <div className="chip-row">
            <button className="chip" aria-pressed={!region} onClick={() => setRegion(null)}>
              כל הארץ
            </button>
            {regions.map((r) => (
              <button key={r} className="chip" aria-pressed={region === r} onClick={() => setRegion(region === r ? null : r)}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <span className="filter-label">
            <SlidersHorizontal />
            התמחות
          </span>
          <div className="chip-row">
            <button className="chip" aria-pressed={!specialty} onClick={() => setSpecialty(null)}>
              הכול
            </button>
            {specialties.map((s) => (
              <button
                key={s}
                className="chip"
                aria-pressed={specialty === s}
                onClick={() => setSpecialty(specialty === s ? null : s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="results-bar" aria-live="polite">
        <span>
          נמצאו <b className="num">{visible.length}</b> מתווכים
        </span>
        {hasFilter && (
          <button className="btn btn-quiet btn-sm" onClick={clear}>
            <X />
            ניקוי סינון
          </button>
        )}
      </div>

      <div className="broker-grid">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((b, i) => (
            <motion.article
              key={b.id}
              layout
              className="broker-card"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.45, delay: Math.min(i, 8) * 0.035, ease: EASE }}
            >
              <button className="broker-face" onClick={() => setProfile(b)} aria-label={`פרופיל של ${b.name}`}>
                <img src={asset(b.avatar)} alt={b.name} loading="lazy" decoding="async" />
                <span className="broker-years num">{b.years} שנות ניסיון</span>
                <span className="broker-over">
                  <strong>{b.name}</strong>
                  <span>{b.title}</span>
                  {nameSlots.Badge && <nameSlots.Badge brokerId={b.id} />}
                </span>
              </button>
              <div className="broker-info">
                <span className="broker-area">
                  <MapPin />
                  {b.area}
                </span>
                <div className="broker-tags">
                  {b.specialties.map((s) => (
                    <span key={s} className={`tag${specialty === s ? ' tag-gold' : ''}`}>
                      {s}
                    </span>
                  ))}
                </div>
                <button className="btn btn-ghost btn-sm btn-block" onClick={() => setProfile(b)}>
                  {b.id === CURRENT_BROKER_ID ? 'הפרופיל שלי' : 'לפרופיל'}
                </button>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      {visible.length === 0 && (
        <div className="empty card">
          <Search />
          <strong>לא נמצאו מתווכים שמתאימים לסינון</strong>
          <span>אפשר לנסות אזור אחר או להסיר את אחת ההתמחויות.</span>
          <button className="btn btn-ghost btn-sm" onClick={clear}>
            ניקוי סינון
          </button>
        </div>
      )}

      <Modal open={!!profile} onClose={() => setProfile(null)} title={profile?.name} subtitle={profile?.title}>
        {profile && (
          <div className="modal-body profile">
            <div className="profile-top">
              <img src={asset(profile.avatar)} alt={profile.name} />
              <ul>
                <li>
                  <span>אזור פעילות</span>
                  <strong>{profile.area}</strong>
                </li>
                <li>
                  <span>ניסיון</span>
                  <strong>
                    <span className="num">{profile.years}</span> שנים
                  </strong>
                </li>
                <li>
                  <span>התמחויות</span>
                  <strong>{profile.specialties.join(', ')}</strong>
                </li>
              </ul>
            </div>
            <p className="profile-bio">{profile.bio}</p>
            {profile.id === CURRENT_BROKER_ID ? (
              <Link to="/b/demo" className="btn btn-gold btn-block">
                לדף הנחיתה שלי
                <ArrowLeft />
              </Link>
            ) : (
              <div className="profile-actions">
                <button
                  className="btn btn-gold"
                  onClick={() => {
                    toast(`הצעת שיתוף פעולה נשלחה אל ${profile.name}`)
                    setProfile(null)
                  }}
                >
                  <Handshake />
                  הצעת שיתוף פעולה
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    toast('בדמו ההודעות אינן נשלחות באמת')
                    setProfile(null)
                  }}
                >
                  <MessageCircle />
                  הודעה
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
