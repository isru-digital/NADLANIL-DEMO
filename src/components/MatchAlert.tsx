import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { brokerById } from '../data/demo'
import { useStore } from '../store'
import { nameSlots } from '../config/navExtras'
import { Avatar, EASE } from './ui'
import '../styles/topics.css'

/** The "נמצאה התאמה" / "זה יכול להתאים לך" pop-up. Lives in the app shell so it shows on any screen. */
export default function MatchAlert() {
  const { matchAlert, showMatch } = useStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!matchAlert) return
    const t = window.setTimeout(() => showMatch(null), 16000)
    return () => window.clearTimeout(t)
  }, [matchAlert, showMatch])

  return (
    <AnimatePresence>
      {matchAlert && (
        <motion.div
          key={matchAlert.id}
          className="match-alert"
          role="alert"
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <div className="match-head">
            <motion.span
              className="match-spark"
              initial={{ rotate: -40, scale: 0.4 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <Sparkles />
            </motion.span>
            <strong>{matchAlert.title}</strong>
            <button className="icon-btn" onClick={() => showMatch(null)} aria-label="סגירת ההתראה">
              <X />
            </button>
          </div>
          <div className="match-body">
            <Avatar src={brokerById(matchAlert.brokerId).avatar} name="" size={42} ring />
            <p>{matchAlert.text}</p>
          </div>
          {nameSlots.MatchNote && <nameSlots.MatchNote />}
          <div className="match-foot">
            <small>{matchAlert.kind === 'incoming' ? 'הדמיה בדמו של פרסום ממתווך אחר' : 'נתוני דמו'}</small>
            <button
              className="btn btn-gold btn-sm"
              onClick={() => {
                navigate(`/app/community?topic=${matchAlert.topicId}&item=${matchAlert.itemId}`)
                showMatch(null)
              }}
            >
              לצפייה בהתאמה
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
