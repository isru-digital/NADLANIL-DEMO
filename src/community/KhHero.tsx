import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { asset } from '../config'
import { EASE } from '../components/ui'
import { IconBuyer, IconDeal, IconHome, IconPin } from './KhIcons'

/**
 * The community page's header pieces: soft gold and mint shapes behind it, a cluster of small floating cards that
 * show people and deals, and a line of "what is happening now". Everything in the cards and in the line is an
 * EXAMPLE and says so: no real broker, property or deal is shown, and no number is claimed.
 */

/** soft circles in gold and mint; they drift a little as the page scrolls */
export function KhBackdrop() {
  const still = useReducedMotion()
  const { scrollY } = useScroll()
  const slow = useTransform(scrollY, [0, 900], [0, still ? 0 : 90])
  const fast = useTransform(scrollY, [0, 900], [0, still ? 0 : -140])
  return (
    <div className="khv-shapes" aria-hidden="true">
      <motion.i className="khv-blob is-mint is-a" style={{ y: slow }} />
      <motion.i className="khv-blob is-gold is-b" style={{ y: fast }} />
      <motion.i className="khv-ring is-c" style={{ y: slow }} />
      <motion.i className="khv-ring is-gold is-d" style={{ y: fast }} />
      <motion.i className="khv-dot is-e" style={{ y: fast }} />
      <motion.i className="khv-dot is-gold is-f" style={{ y: slow }} />
    </div>
  )
}

const Sample = () => <em className="khv-sample">דוגמה</em>

/** four small cards around a shared property: a broker, a new property, a buyer who searches, a joint deal */
export function KhCollage() {
  const still = useReducedMotion()
  const { scrollY } = useScroll()
  // on a wide screen the cluster rises a little as the page scrolls; on a phone it sits under the text and stays put
  const [wide] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 981px)').matches)
  const lift = useTransform(scrollY, [0, 700], [0, still || !wide ? 0 : -46])
  const card = (i: number) => ({
    initial: still ? false : { opacity: 0, y: 26, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.8, delay: 0.25 + i * 0.12, ease: EASE },
  })
  return (
    <motion.div className="khv-collage" style={{ y: lift }} role="img" aria-label="דוגמה לפעילות בקהילה: מתווך מרמת גן, נכס ששותף בחיפה, קונה שמחפש 4 חדרים במודיעין ושיתוף פעולה בין שני מתווכים">
      <div aria-hidden="true" className="khv-collage-in">
        <i className="khv-orbit" />
        <motion.figure className="khv-photo" {...card(0)}>
          <img src={asset('img/prop-04.webp')} alt="" width="360" height="270" loading="eager" />
          <figcaption>
            <IconPin className="is-xs" /> נכס ששותף · חיפה
          </figcaption>
        </motion.figure>

        <motion.div className="khv-card is-broker" {...card(1)}>
          <span className="khv-float is-1">
            <span className="khv-person">
              <img src={asset('img/broker-02.webp')} alt="" width="48" height="48" />
              <b className="khv-online" />
            </span>
            <span className="khv-card-txt">
              <strong>אורי אברהם</strong>
              <small>
                <IconPin className="is-xs" /> מתווך · רמת גן
              </small>
            </span>
            <Sample />
          </span>
        </motion.div>

        <motion.div className="khv-card is-new" {...card(2)}>
          <span className="khv-float is-2">
            <span className="khv-badge">
              <IconHome />
            </span>
            <span className="khv-card-txt">
              <strong>נכס חדש שותף</strong>
              <small>4 חדרים · נווה שאנן, חיפה</small>
            </span>
            <Sample />
          </span>
        </motion.div>

        <motion.div className="khv-card is-buyer" {...card(3)}>
          <span className="khv-float is-3">
            <span className="khv-person">
              <img src={asset('img/broker-05.webp')} alt="" width="48" height="48" />
              <span className="khv-mini">
                <IconBuyer />
              </span>
            </span>
            <span className="khv-card-txt">
              <strong>קונה מחפש 4 חדרים</strong>
              <small>אזור מודיעין · עם מרפסת</small>
            </span>
            <Sample />
          </span>
        </motion.div>

        <motion.div className="khv-card is-deal" {...card(4)}>
          <span className="khv-float is-4">
            <span className="khv-pair">
              <img src={asset('img/broker-07.webp')} alt="" width="40" height="40" />
              <img src={asset('img/broker-03.webp')} alt="" width="40" height="40" />
            </span>
            <span className="khv-card-txt">
              <strong>שיתוף פעולה</strong>
              <small>שני מתווכים, עסקה אחת</small>
            </span>
            <span className="khv-badge is-gold">
              <IconDeal />
            </span>
            <Sample />
          </span>
        </motion.div>
      </div>
    </motion.div>
  )
}

const NOW = ['נכס חדש שותף בחיפה', 'נמצא קונה בתל אביב', 'מתווכת מרמת גן הצטרפה לקהילה', 'שיתוף פעולה חדש בנתניה', 'קונה מחפש 3 חדרים בירושלים', 'נכס מסחרי שותף בבאר שבע']

/** "עכשיו בקהילה": one example line at a time, changing gently */
export function KhNow() {
  const still = useReducedMotion()
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setI((n) => (n + 1) % NOW.length), still ? 6000 : 3400)
    return () => window.clearInterval(t)
  }, [still])
  return (
    <div className="khv-now" data-now>
      <span className="khv-now-live">
        <i aria-hidden="true" /> עכשיו בקהילה
      </span>
      <span className="khv-now-line" aria-hidden="true">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={i}
            initial={still ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={still ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={{ duration: still ? 0.2 : 0.42, ease: EASE }}
            data-now-text
          >
            {NOW[i]}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="sr-only">דוגמאות לעדכונים בקהילה, למשל: {NOW.slice(0, 2).join(', ')}.</span>
      <em className="khv-sample">דוגמה</em>
    </div>
  )
}
