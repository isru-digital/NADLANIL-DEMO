import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, Check, Coins, Minus, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PLATFORM_NAME } from '../config'
import { OFFICE_FEE, OFFICE_NAME, PRICE_TBD } from '../config/office'
import { useMember } from '../config/member'
import { PAID_IDS } from '../config/tiers'
import { BackButton, DemoTag, EASE, Logo, Reveal } from '../components/ui'
import { labItems } from '../components/BetaLab'
import '../styles/join-green.css'
import '../styles/upgrade.css'

/**
 * "שדרוג למשרד": the three layers side by side (green version). The locks, the credits wallet and the join pages
 * all lead here. The office's fee is the one decided price; a credit has no price yet.
 */
type Cell = boolean | string
type Row = { what: string; note?: string; cells: [Cell, Cell, Cell] }

const advanced = labItems.filter((x) => PAID_IDS.includes(x.id) && x.id !== 'urgent')

const groups: { title: string; sub: string; rows: Row[] }[] = [
  {
    title: 'הבסיס',
    sub: 'חינם לכולם, תמיד',
    rows: [
      { what: 'פיד הקהילה לפי נושאים ואינדקס מתווכים', cells: [true, true, true] },
      { what: 'CRM ופרסום נכס לקהילה', cells: [true, true, true] },
      { what: 'בונה דף נחיתה ופולדר ללקוח', cells: [true, true, true] },
      { what: 'מוואטסאפ למערכת', note: 'מדביקים הודעה, מקבלים נכס או בקשה מסודרים', cells: [true, true, true] },
      { what: 'מדד אמינות והתאמות', cells: [true, true, true] },
      { what: 'בקשה בוערת', cells: ['1 בחודש', 'בקרדיטים', 'במכסה'] },
    ],
  },
  {
    title: 'כלים מתקדמים',
    sub: 'לפי שימוש בקרדיטים, או כלולים במשרד',
    rows: advanced.map((x) => ({ what: x.title, note: x.tagline, cells: [false, 'בקרדיטים', 'כלול'] as [Cell, Cell, Cell] })),
  },
  {
    title: 'בלעדי למשרד',
    sub: 'מה שרק משרד יכול לתת',
    rows: [
      { what: '0% עמלה למשרד, 100% למתווך', cells: [false, false, true] },
      { what: 'הסוכן שלנו', note: 'דף אישי ממותג שמופיע בגוגל', cells: [false, false, true] },
      { what: 'מכונת הלידים של המשרד', note: 'קמפיינים ארציים, והלידים מחולקים לפי אזור', cells: [false, false, true] },
      { what: 'דוח שבועי אוטומטי למוכר', cells: [false, false, true] },
      { what: 'מצגת גיוס בלעדיות ב-AI', cells: [false, false, true] },
      { what: 'תוכנית צמיחה ומנטור', cells: [false, false, true] },
      { what: 'מנהלת עסקה, עד החתימה', cells: [false, false, true] },
      { what: 'עוזר AI בדף הנחיתה', cells: [false, false, true] },
      { what: 'הטבות חברים', cells: [false, false, 'בהקמה'] },
      { what: 'תג מאומת "חבר משרד"', note: 'עדיפות בהתאמות ובבקשות בוערות', cells: [false, false, true] },
    ],
  },
]

const tiers: { key: 'community' | 'credits' | 'office'; icon: LucideIcon; name: string; price: string; unit: string }[] = [
  { key: 'community', icon: Users, name: 'הקהילה', price: 'חינם', unit: 'תמיד' },
  { key: 'credits', icon: Coins, name: 'קרדיטים', price: 'לפי שימוש', unit: `מחיר קרדיט: ${PRICE_TBD}` },
  { key: 'office', icon: BadgeCheck, name: 'המשרד', price: OFFICE_FEE, unit: '0% עמלה למשרד' },
]

function CellView({ value, office }: { value: Cell; office?: boolean }) {
  if (value === true)
    return (
      <i className={`up-yes${office ? ' is-office' : ''}`}>
        <Check aria-label="כלול" />
      </i>
    )
  if (value === false)
    return (
      <i className="up-no">
        <Minus aria-label="לא כלול" />
      </i>
    )
  return <em className={office ? 'is-office' : ''}>{value}</em>
}

export default function Upgrade() {
  const { isOffice } = useMember()
  return (
    <div className="jo up">
      <header className="jc-top">
        <div className="jc-top-start">
          <BackButton fallback="/join" className="is-icon" />
          <Link to="/" aria-label="דף הבית">
            <Logo size={30} withName />
          </Link>
        </div>
        <div className="jc-top-end">
          <DemoTag />
        </div>
      </header>

      <main className="up-main">
        <motion.div className="up-head" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
          <span className="jc-kicker">שדרוג למשרד</span>
          <h1>
            קהילה, קרדיטים או <span>משרד</span>
          </h1>
          <p>מתחילים בחינם בקהילה. כלים מתקדמים פותחים לפי שימוש, ובמשרד הכול כלול.</p>
        </motion.div>

        <motion.div className="up-table" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: EASE }}>
          <div className="up-cols" role="row">
            <span className="up-corner">מה מקבלים</span>
            {tiers.map((t) => (
              <div key={t.key} className={`up-col is-${t.key}`} role="columnheader">
                {(t.key === 'office') === isOffice && t.key !== 'credits' && <u>התצוגה שלכם עכשיו</u>}
                <span className="up-ico">
                  <t.icon />
                </span>
                <b>{t.name}</b>
                <strong className="num">{t.price}</strong>
                <small>{t.unit}</small>
              </div>
            ))}
          </div>

          {groups.map((g) => (
            <section key={g.title} className="up-group">
              <h2>
                {g.title} <small>{g.sub}</small>
              </h2>
              {g.rows.map((r) => (
                <div key={r.what} className="up-row" role="row">
                  <span className="up-what">
                    {r.what}
                    {r.note && <small>{r.note}</small>}
                  </span>
                  <span className="up-cell" data-t="הקהילה">
                    <CellView value={r.cells[0]} />
                  </span>
                  <span className="up-cell" data-t="קרדיטים">
                    <CellView value={r.cells[1]} />
                  </span>
                  <span className="up-cell is-office" data-t="המשרד">
                    <CellView value={r.cells[2]} office />
                  </span>
                </div>
              ))}
            </section>
          ))}

          <div className="up-cta" role="row">
            <span className="up-corner" />
            <div>
              <Link to="/join/community" className="btn btn-ghost">
                להצטרף בחינם
              </Link>
            </div>
            <div>
              <Link to="/app" className="btn btn-ghost">
                לארנק הקרדיטים
              </Link>
            </div>
            <div className="is-office">
              <Link to={isOffice ? '/app' : '/join/office'} className="btn btn-gold">
                {isOffice ? 'לאזור החבר' : 'להצטרפות למשרד'} <ArrowLeft />
              </Link>
            </div>
          </div>
        </motion.div>

        <Reveal className="up-notes">
          <p>
            <b>קרדיטים:</b> ארנק לחברי קהילה שלא במשרד. כל שימוש בכלי מתקדם מוריד קרדיטים מהיתרה. מחיר קרדיט: {PRICE_TBD}.
          </p>
          <p>
            <b>{OFFICE_NAME}:</b> {OFFICE_FEE}, ו-0% עמלה למשרד. כל הכלים המתקדמים כלולים בתוך מכסה חודשית שמתחדשת בכל חודש.
          </p>
          <p className="up-demo">דמו של {PLATFORM_NAME}: אין חיוב אמיתי, והיתרות והמכסות הן נתוני דמו.</p>
        </Reveal>
      </main>
    </div>
  )
}
