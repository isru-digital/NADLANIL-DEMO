import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, Check, Copy, ExternalLink, FileCheck, Globe, LoaderCircle, Lock, Pencil, RotateCcw, Search, Sparkles, WandSparkles } from 'lucide-react'
import { Modal, EASE } from '../components/ui'
import { useStore } from '../store'
import { PLATFORM_NAME } from '../config'
import { areaLabel, firstName, sampleProfile, slugOf } from './agentData'
import { useAgent } from './useAgent'
import AgentWizard from './AgentWizard'
import ProfilePreview from './ProfilePreview'
import '../styles/agent.css'

/** The "הסוכן שלנו" area: closed until the broker pays, then a questionnaire, then the dashboard of the finished page. */
export default function AgentArea() {
  const { stage, patch } = useAgent()
  // "?start=1" (from the home page) goes straight to the questionnaire; in the demo that skips the simulated payment
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    if (!params.has('start')) return
    if (stage === 'locked') patch({ stage: 'onboarding', step: 0 })
    setParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="ag">
      {stage === 'locked' && <Gate />}
      {stage === 'onboarding' && <AgentWizard />}
      {stage === 'ready' && <Dashboard />}
    </div>
  )
}

/* ---------------------------------------------------------------- before paying */

function Gate() {
  const { patch } = useAgent()
  const [pay, setPay] = useState<'closed' | 'open' | 'busy' | 'done'>('closed')

  useEffect(() => {
    if (pay !== 'busy') return
    const t = window.setTimeout(() => setPay('done'), 1500)
    return () => window.clearTimeout(t)
  }, [pay])

  const start = () => {
    patch({ stage: 'onboarding', step: 0, paidAt: new Date().toISOString() })
    setPay('closed')
  }

  return (
    <>
      <section className="ag-gate">
        <div className="ag-gate-copy">
          <span className="ag-tag">
            <BadgeCheck /> אזור חדש
          </span>
          <h1>הסוכן שלנו</h1>
          <p className="ag-lead">דף אישי ויפה בשמך, שנבנה כדי שיחפשו אותך בגוגל ויגיעו אליך.</p>
          <ul className="ag-points">
            <li>
              <span>
                <Sparkles />
              </span>
              <div>
                <b>דף מרשים, לא תבנית</b>
                <small>תמונה, סיפור, מפה ופרטי קשר, בעיצוב שמרגיש כמו משרד גדול.</small>
              </div>
            </li>
            <li>
              <span>
                <WandSparkles />
              </span>
              <div>
                <b>15 שאלות קלילות</b>
                <small>עונים בכיף, ואנחנו כותבים את הדף. בלי למלא טפסים ארוכים.</small>
              </div>
            </li>
            <li>
              <span>
                <Search />
              </span>
              <div>
                <b>נבנה להימצא בגוגל</b>
                <small>כותרת, תיאור ונתונים מובנים לפי השם שלך, כדי שמי שמחפש אותך ימצא אותך.</small>
              </div>
            </li>
          </ul>
          <div className="ag-gate-cta">
            <button className="btn btn-gold btn-lg" onClick={() => setPay('open')}>
              להצטרפות לסוכן שלנו <ArrowLeft />
            </button>
            <Link to="/agent/demo" className="btn btn-ghost btn-lg">
              לראות דף לדוגמה
            </Link>
          </div>
          <p className="ag-note">
            <Lock /> האזור נפתח אחרי תשלום. בדמו אין תשלום אמיתי.
          </p>
        </div>

        <div className="ag-gate-visual" aria-hidden>
          <div className="ag-float">
            <ProfilePreview profile={sampleProfile} />
          </div>
          <div className="ag-serp is-float">
            <small>{PLATFORM_NAME} › agent › maya-landau</small>
            <b>מאיה לנדאו, מתווכת נדל"ן בתל אביב והמרכז</b>
            <span>מלווה לקוחות בתל אביב והמרכז כבר 11 שנים. יוקרה, דירות מגורים ותושבי חוץ.</span>
          </div>
        </div>
      </section>

      <Modal open={pay !== 'closed'} onClose={() => pay !== 'busy' && setPay('closed')} title="הצטרפות לסוכן שלנו" subtitle="דמו: אין תשלום אמיתי ולא מבקשים פרטי אשראי.">
        <div className="modal-body ag-pay">
          <AnimatePresence mode="wait" initial={false}>
            {pay === 'done' ? (
              <motion.div key="done" className="ag-pay-done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, ease: EASE }}>
                <span className="ag-pay-check">
                  <Check />
                </span>
                <h3>התשלום התקבל</h3>
                <p>האזור נפתח. עכשיו עונים על כמה שאלות, ואנחנו בונים את הדף.</p>
                <button className="btn btn-gold btn-lg" onClick={start}>
                  מתחילים <ArrowLeft />
                </button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ul className="ag-pay-list">
                  <li>
                    <Check /> דף אישי בשם שלך
                  </li>
                  <li>
                    <Check /> שאלון של 15 שאלות קלילות
                  </li>
                  <li>
                    <Check /> הכנה לחיפוש בגוגל
                  </li>
                </ul>
                <button className="btn btn-gold btn-lg ag-pay-go" disabled={pay === 'busy'} onClick={() => setPay('busy')}>
                  {pay === 'busy' ? (
                    <>
                      <LoaderCircle className="ag-spin" /> מעבדים את התשלום
                    </>
                  ) : (
                    'סימולציית תשלום'
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Modal>
    </>
  )
}

/* ---------------------------------------------------------------- the finished page */

function Dashboard() {
  const { profile: p, patch, reset } = useAgent()
  const { toast } = useStore()
  const slug = slugOf(p.name)
  const base = typeof window !== 'undefined' ? `${window.location.origin}${import.meta.env.BASE_URL}` : ''
  const link = `${base}agent/${slug}`
  const role = p.gender === 'f' ? 'מתווכת נדל"ן' : 'מתווך נדל"ן'
  const where = p.areas.length ? ` ב${areaLabel(p.areas[0])}` : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      toast('הקישור הועתק')
    } catch {
      toast('אפשר להעתיק את הקישור ידנית')
    }
  }

  const checks = [
    { ok: !!p.photo, label: 'תמונה', note: p.photo ? 'הועלתה' : 'אפשר להוסיף בעריכה' },
    { ok: !!p.licenseFile, label: 'רישיון מתווך', note: p.licenseFile ? 'הועלה, בדמו אושר אוטומטית' : 'עוד לא הועלה' },
    { ok: p.areas.length > 0, label: 'מפת אזורים', note: `${p.areas.length} אזורים` },
    { ok: true, label: 'כותרת, תיאור ונתונים מובנים לגוגל', note: 'נוצרו מהתשובות' },
  ]

  return (
    <div className="ag-dash">
      <header className="ag-dash-head">
        <div>
          <span className="ag-tag is-ok">
            <Check /> הדף פעיל, בדמו
          </span>
          <h1>הדף של {firstName(p.name)} מוכן</h1>
          <p className="ag-lead">ככה לקוחות יראו אתכם, וככה גוגל יציג אתכם כשיחפשו את השם שלכם.</p>
        </div>
        <div className="ag-dash-cta">
          <Link to={`/agent/${slug}`} className="btn btn-gold btn-lg">
            לפתיחת הדף <ExternalLink />
          </Link>
          <button className="btn btn-ghost btn-lg" onClick={() => patch({ stage: 'onboarding', step: 0 })}>
            <Pencil /> עריכת התשובות
          </button>
        </div>
      </header>

      <div className="ag-dash-grid">
        <section className="ag-panel">
          <h2>הדף שלכם</h2>
          <div className="ag-frame">
            <div className="ag-frame-bar">
              <i />
              <i />
              <i />
              <span className="ag-url">
                <Globe /> ‎/agent/{slug}
              </span>
            </div>
            <div className="ag-frame-body">
              <ProfilePreview profile={p} />
            </div>
          </div>
          <div className="ag-linkrow">
            <code>{link}</code>
            <button className="btn btn-ghost btn-sm" onClick={copy}>
              <Copy /> העתקה
            </button>
          </div>
        </section>

        <div className="ag-dash-col">
          <section className="ag-panel">
            <h2>ככה תופיעו בגוגל</h2>
            <div className="ag-serp">
              <small>{`${PLATFORM_NAME} › agent › ${slug}`}</small>
              <b>
                {p.name}, {role}
                {where}
              </b>
              <span>{`${firstName(p.name)} מלווה לקוחות${where}${p.years ? ` כבר ${p.years} שנים` : ''}. ${p.specialties.slice(0, 3).join(', ')}.`}</span>
            </div>
            <p className="ag-note">תצוגה לדוגמה. בגוגל האמיתי מופיע מה שהמנוע בוחר, והדף נבנה כדי לעזור לו.</p>
          </section>

          <section className="ag-panel">
            <h2>מה כבר מוכן</h2>
            <ul className="ag-checks">
              {checks.map((c) => (
                <li key={c.label} className={c.ok ? 'is-ok' : ''}>
                  <span>{c.ok ? <Check /> : <FileCheck />}</span>
                  <div>
                    <b>{c.label}</b>
                    <small>{c.note}</small>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <button
            className="ag-reset"
            onClick={() => {
              reset()
              toast('אזור הסוכן אופס')
            }}
          >
            <RotateCcw /> איפוס אזור הסוכן
          </button>
        </div>
      </div>
    </div>
  )
}
