import { Link } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Check, Copy, ExternalLink, FileCheck, Globe, Lock, Pencil, RotateCcw, Search, Sparkles, WandSparkles } from 'lucide-react'
import { useStore } from '../store'
import { PLATFORM_NAME } from '../config'
import { OFFICE_MIN_MONTHS, OFFICE_NAME, OFFICE_PRICE, shekel } from '../config/office'
import { areaLabel, firstName, sampleProfile, slugOf } from './agentData'
import { useAgent } from './useAgent'
import AgentWizard from './AgentWizard'
import ProfilePreview from './ProfilePreview'
import '../styles/agent.css'

/** The "הסוכן שלנו" area: closed until the broker pays, then a questionnaire, then the dashboard of the finished page. */
export default function AgentArea() {
  const { stage } = useAgent()
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
  return (
    <section className="ag-gate">
      <div className="ag-gate-copy">
        <span className="ag-tag">
          <BadgeCheck /> לחברי {OFFICE_NAME}
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
          <Link to="/join/office" className="btn btn-gold btn-lg">
            להצטרפות למשרד, {OFFICE_PRICE} ₪ לחודש <ArrowLeft />
          </Link>
          <Link to="/agent/demo" className="btn btn-ghost btn-lg">
            לראות דף לדוגמה
          </Link>
        </div>
        <p className="ag-note">
          <Lock /> האזור נפתח רק אחרי ההצטרפות למשרד: {OFFICE_PRICE} ₪ לחודש, מינימום {OFFICE_MIN_MONTHS} חודשים. בדמו אין תשלום אמיתי.
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
  )
}

/* ---------------------------------------------------------------- the finished page */

function Dashboard() {
  const { profile: p, patch, reset, paidAt } = useAgent()
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
            <h2>המנוי שלכם</h2>
            <dl className="ag-member">
              <div>
                <dt>מסלול</dt>
                <dd>{OFFICE_NAME}</dd>
              </div>
              <div>
                <dt>מחיר</dt>
                <dd className="num">{OFFICE_PRICE} ₪ לחודש</dd>
              </div>
              <div>
                <dt>הצטרפות</dt>
                <dd>{paidAt ? new Date(paidAt).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' }) : 'בדמו'}</dd>
              </div>
              <div>
                <dt>התחייבות מינימלית עד</dt>
                <dd>
                  {paidAt
                    ? (() => {
                        const d = new Date(paidAt)
                        d.setMonth(d.getMonth() + OFFICE_MIN_MONTHS)
                        return d.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })
                      })()
                    : `${OFFICE_MIN_MONTHS} חודשים`}
                </dd>
              </div>
            </dl>
            <p className="ag-note">{shekel(OFFICE_PRICE * OFFICE_MIN_MONTHS)} התחייבות מינימלית. בדמו אין חיוב אמיתי.</p>
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
