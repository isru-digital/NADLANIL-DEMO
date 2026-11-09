import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Camera, Check, FileCheck, ImagePlus, ShieldCheck, Sparkles, Upload, WandSparkles, X } from 'lucide-react'
import { EASE } from '../components/ui'
import { areaOptions, clientOptions, firstLineIdeas, firstName, languageOptions, offHoursIdeas, sampleProfile, specialtyOptions, styleOptions } from './agentData'
import type { AgentProfile } from './agentData'
import { readImage, useAgent } from './useAgent'
import ProfilePreview from './ProfilePreview'
import '../styles/agent.css'

const TOTAL = 15

type Step = {
  kicker: string
  title: string
  hint?: string
  optional?: boolean
  valid: (p: AgentProfile) => boolean
}

const steps: Step[] = [
  { kicker: 'נתחיל בהיכרות', title: 'איך קוראים לך?', hint: 'ככה השם יופיע בדף, וגם בגוגל.', valid: (p) => p.name.trim().length >= 2 },
  { kicker: 'עכשיו הפנים', title: 'תמונה שלך', hint: 'לקוח רוצה לדעת עם מי הוא מדבר. פנים ברורות ורקע פשוט עובדים הכי טוב.', optional: true, valid: () => true },
  { kicker: 'הצעד היחיד שלא כיף', title: 'רישיון מתווך', hint: 'מעלים צילום או קובץ, והצוות בודק. זה מה שגורם ללקוחות לסמוך על הדף.', optional: true, valid: () => true },
  { kicker: 'כמה זמן אתם בזה?', title: 'שנות ניסיון', valid: () => true },
  { kicker: 'המפה נדלקת', title: 'איפה אתם עובדים?', hint: 'אפשר לבחור כמה אזורים. תראו אותם נדלקים במפה.', valid: (p) => p.areas.length > 0 },
  { kicker: 'מה אתם הכי טובים בו', title: 'ההתמחויות שלכם', hint: 'עד ארבע, כדי שהדף יהיה חד.', valid: (p) => p.specialties.length > 0 },
  { kicker: 'מי מגיע אליכם', title: 'עם איזה לקוחות אתם עובדים?', valid: () => true },
  { kicker: 'בשפה שלהם', title: 'באילו שפות אפשר לדבר איתכם?', valid: (p) => p.languages.length > 0 },
  { kicker: 'האופי שלכם', title: 'איך אתם עובדים?', hint: 'בוחרים את מה שהכי דומה. אין תשובה לא נכונה.', valid: (p) => !!p.style },
  { kicker: 'קצת משחק', title: 'לקוחות אומרים שאתם...', hint: 'שלוש מילים, בלי להתאמץ.', optional: true, valid: () => true },
  { kicker: 'הסיפור שלכם', title: 'העסקה שאתם הכי גאים בה', hint: 'שתיים או שלוש שורות. אפשר לדלג ולחזור אחר כך.', optional: true, valid: () => true },
  { kicker: 'פגישה ראשונה', title: 'המשפט הראשון שלכם ללקוח חדש', hint: 'הוא יופיע בדף כציטוט גדול.', optional: true, valid: () => true },
  { kicker: 'הצד האנושי', title: 'מה עושים כשלא עובדים?', hint: 'לקוחות אוהבים לדעת עם מי הם מדברים.', optional: true, valid: () => true },
  { kicker: 'כמעט שם', title: 'תמונות נוספות', hint: 'אפשר עד שלוש. אם אין עכשיו, מדלגים.', optional: true, valid: () => true },
  { kicker: 'השאלה האחרונה', title: 'איך מגיעים אליכם?', hint: 'לקוחות יוכלו ללחוץ ולדבר איתכם ישר מהדף.', valid: (p) => p.phone.replace(/\D/g, '').length >= 9 },
]

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`ag-chip${on ? ' is-on' : ''}`} aria-pressed={on} onClick={onClick}>
      {on && <Check />}
      {children}
    </button>
  )
}

const toggle = (list: string[], v: string, max = 99) => (list.includes(v) ? list.filter((x) => x !== v) : list.length >= max ? list : [...list, v])

function PhotoField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const take = async (file?: File | null) => {
    if (!file) return
    try {
      onChange(await readImage(file))
    } catch {
      /* not an image */
    }
  }
  return (
    <div className="ag-photo-field">
      <div
        className={`ag-drop${over ? ' is-over' : ''}${value ? ' has-photo' : ''}`}
        onDragOver={(e: DragEvent) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={(e: DragEvent) => {
          e.preventDefault()
          setOver(false)
          take(e.dataTransfer.files?.[0])
        }}
      >
        {value ? (
          <img src={value} alt="" />
        ) : (
          <span className="ag-drop-empty">
            <Camera />
            <b>גוררים תמונה לכאן</b>
            <small>או לוחצים לבחירה</small>
          </span>
        )}
        <button type="button" className="ag-drop-hit" onClick={() => input.current?.click()} aria-label="בחירת תמונה" />
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e: ChangeEvent<HTMLInputElement>) => take(e.target.files?.[0])} />
      <div className="ag-photo-actions">
        <button type="button" className="btn btn-gold btn-sm" onClick={() => input.current?.click()}>
          <Upload /> {value ? 'להחליף תמונה' : 'להעלות תמונה'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(sampleProfile.photo)}>
          תמונת דוגמה
        </button>
        {value && (
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => onChange('')}>
            <X /> הסרה
          </button>
        )}
      </div>
    </div>
  )
}

function GalleryField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const take = async (files: FileList | null) => {
    if (!files) return
    const room = 3 - value.length
    const next: string[] = []
    for (const f of Array.from(files).slice(0, room)) {
      try {
        next.push(await readImage(f, 800))
      } catch {
        /* skip */
      }
    }
    onChange([...value, ...next])
  }
  return (
    <div className="ag-gallery">
      {value.map((src, i) => (
        <div key={i} className="ag-gal-item">
          <img src={src} alt="" />
          <button type="button" aria-label="הסרה" onClick={() => onChange(value.filter((_, j) => j !== i))}>
            <X />
          </button>
        </div>
      ))}
      {value.length < 3 && (
        <button type="button" className="ag-gal-add" onClick={() => input.current?.click()}>
          <ImagePlus />
          <span>הוספת תמונה</span>
        </button>
      )}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => take(e.target.files)} />
    </div>
  )
}

export default function AgentWizard() {
  const { step, profile, patch, setProfile: set } = useAgent()
  const p = profile
  const [dir, setDir] = useState(1)
  const [making, setMaking] = useState(false)
  const licenseInput = useRef<HTMLInputElement>(null)
  const s = steps[step]
  const ok = s.valid(profile)

  const go = (n: number) => {
    setDir(n > step ? 1 : -1)
    patch({ step: Math.max(0, Math.min(TOTAL - 1, n)) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const finish = () => {
    setMaking(true)
    window.setTimeout(() => patch({ stage: 'ready', step: 0 }), 3600)
  }
  const fillSample = () => {
    set({ ...sampleProfile, photo: profile.photo || sampleProfile.photo })
    setDir(1)
    patch({ step: TOTAL - 1 })
  }

  const body = (): ReactNode => {
    switch (step) {
      case 0:
        return (
          <div className="ag-fields">
            <label className="ag-field">
              <span>שם מלא</span>
              <input value={p.name} onChange={(e) => set({ name: e.target.value })} placeholder="למשל: מאיה לנדאו" autoFocus />
            </label>
            <div className="ag-field">
              <span>איך פונים אליכם?</span>
              <div className="ag-chips">
                <Chip on={p.gender === 'm'} onClick={() => set({ gender: 'm' })}>
                  מתווך
                </Chip>
                <Chip on={p.gender === 'f'} onClick={() => set({ gender: 'f' })}>
                  מתווכת
                </Chip>
              </div>
            </div>
            <label className="ag-field">
              <span>משרד או סוכנות (לא חובה)</span>
              <input value={p.office} onChange={(e) => set({ office: e.target.value })} placeholder="למשל: מתווכת עצמאית" />
            </label>
          </div>
        )
      case 1:
        return <PhotoField value={p.photo} onChange={(v) => set({ photo: v })} />
      case 2:
        return (
          <div className="ag-fields">
            <div className="ag-license">
              <input ref={licenseInput} type="file" accept="image/*,application/pdf" hidden onChange={(e) => set({ licenseFile: e.target.files?.[0]?.name ?? '' })} />
              <button type="button" className={`ag-license-btn${p.licenseFile ? ' is-done' : ''}`} onClick={() => licenseInput.current?.click()}>
                <span>{p.licenseFile ? <FileCheck /> : <Upload />}</span>
                <b>{p.licenseFile ? p.licenseFile : 'העלאת צילום או קובץ של הרישיון'}</b>
                <small>{p.licenseFile ? 'הועלה. אפשר להחליף' : 'תמונה או PDF'}</small>
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ licenseFile: sampleProfile.licenseFile, licenseNo: p.licenseNo || sampleProfile.licenseNo })}>
                קובץ דוגמה
              </button>
            </div>
            <label className="ag-field">
              <span>מספר רישיון</span>
              <input value={p.licenseNo} onChange={(e) => set({ licenseNo: e.target.value })} inputMode="numeric" placeholder="למשל: 123456" />
            </label>
            <p className="ag-note">
              <ShieldCheck /> הקובץ נשמר רק בדפדפן שלכם, ובדמו אין בדיקה אמיתית. במוצר האמיתי השלב הזה חובה והצוות מאשר כל רישיון.
            </p>
          </div>
        )
      case 3:
        return (
          <div className="ag-years">
            <div className="ag-years-n">
              <b className="num">{p.years}</b>
              <span>{p.years === 1 ? 'שנה' : 'שנים'}</span>
            </div>
            <input type="range" min={0} max={40} value={p.years} onChange={(e) => set({ years: Number(e.target.value) })} aria-label="שנות ניסיון" />
            <small>{p.years < 2 ? 'בתחילת הדרך, עם הרבה אנרגיה' : p.years < 8 ? 'כבר מכירים את השוק מבפנים' : p.years < 16 ? 'ניסיון שרואים בכל עסקה' : 'ותיקי התחום'}</small>
          </div>
        )
      case 4:
        return (
          <div className="ag-chips ag-chips-lg">
            {areaOptions.map((a) => (
              <Chip key={a.id} on={p.areas.includes(a.id)} onClick={() => set({ areas: toggle(p.areas, a.id) })}>
                {a.label}
              </Chip>
            ))}
          </div>
        )
      case 5:
        return (
          <div className="ag-chips ag-chips-lg">
            {specialtyOptions.map((o) => (
              <Chip key={o.id} on={p.specialties.includes(o.id)} onClick={() => set({ specialties: toggle(p.specialties, o.id, 4) })}>
                {o.id}
              </Chip>
            ))}
          </div>
        )
      case 6:
        return (
          <div className="ag-chips ag-chips-lg">
            {clientOptions.map((o) => (
              <Chip key={o} on={p.clients.includes(o)} onClick={() => set({ clients: toggle(p.clients, o) })}>
                {o}
              </Chip>
            ))}
          </div>
        )
      case 7:
        return (
          <div className="ag-chips ag-chips-lg">
            {languageOptions.map((o) => (
              <Chip key={o} on={p.languages.includes(o)} onClick={() => set({ languages: toggle(p.languages, o) })}>
                {o}
              </Chip>
            ))}
          </div>
        )
      case 8:
        return (
          <div className="ag-styles">
            {styleOptions.map((o) => (
              <button key={o.id} type="button" className={`ag-style${p.style === o.id ? ' is-on' : ''}`} aria-pressed={p.style === o.id} onClick={() => set({ style: o.id })}>
                <b>{o.title}</b>
                <small>{o.line}</small>
                {p.style === o.id && (
                  <i>
                    <Check />
                  </i>
                )}
              </button>
            ))}
          </div>
        )
      case 9:
        return (
          <div className="ag-words">
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                value={p.threeWords[i]}
                onChange={(e) => {
                  const w = [...p.threeWords] as AgentProfile['threeWords']
                  w[i] = e.target.value
                  set({ threeWords: w })
                }}
                placeholder={['סבלנית', 'מדויקת', 'כנה'][i]}
                maxLength={14}
                aria-label={`מילה ${i + 1}`}
              />
            ))}
          </div>
        )
      case 10:
        return (
          <label className="ag-field">
            <textarea value={p.proudDeal} onChange={(e) => set({ proudDeal: e.target.value })} rows={5} maxLength={320} placeholder="למשל: משפחה שחיפשה שנתיים, ומצאה בית בשלושה שבועות." />
            <small className="ag-count">{p.proudDeal.length}/320</small>
          </label>
        )
      case 11:
        return (
          <div className="ag-fields">
            <label className="ag-field">
              <textarea value={p.firstLine} onChange={(e) => set({ firstLine: e.target.value })} rows={3} maxLength={140} placeholder="למשל: קודם נבין מה באמת חשוב לכם בבית." />
              <small className="ag-count">{p.firstLine.length}/140</small>
            </label>
            <div className="ag-ideas">
              <span>רעיונות:</span>
              {firstLineIdeas.map((t) => (
                <button key={t} type="button" onClick={() => set({ firstLine: t })}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        )
      case 12:
        return (
          <div className="ag-fields">
            <label className="ag-field">
              <input value={p.offHours} onChange={(e) => set({ offHours: e.target.value })} maxLength={90} placeholder="למשל: ריצה בבוקר, בישול ביום שישי" />
            </label>
            <div className="ag-chips">
              {offHoursIdeas.map((t) => (
                <Chip key={t} on={p.offHours.includes(t)} onClick={() => set({ offHours: p.offHours.includes(t) ? p.offHours.replace(new RegExp(`(, )?${t}`), '').replace(/^, /, '') : p.offHours ? `${p.offHours}, ${t}` : t })}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>
        )
      case 13:
        return <GalleryField value={p.gallery} onChange={(v) => set({ gallery: v })} />
      default:
        return (
          <div className="ag-fields">
            <label className="ag-field">
              <span>טלפון</span>
              <input value={p.phone} onChange={(e) => set({ phone: e.target.value, whatsapp: p.whatsapp && p.whatsapp !== p.phone ? p.whatsapp : e.target.value })} inputMode="tel" placeholder="050-0000000" autoFocus />
            </label>
            <label className="ag-field">
              <span>וואטסאפ</span>
              <input value={p.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} inputMode="tel" placeholder="אותו מספר, אם זה אותו מספר" />
            </label>
            <label className="ag-field">
              <span>אימייל (לא חובה)</span>
              <input value={p.email} onChange={(e) => set({ email: e.target.value })} type="email" placeholder="name@example.com" />
            </label>
          </div>
        )
    }
  }

  const last = step === TOTAL - 1

  return (
    <div className="ag-wiz">
      <div className="ag-wiz-main">
        <div className="ag-prog" aria-label={`שאלה ${step + 1} מתוך ${TOTAL}`}>
          <div className="ag-prog-bar" aria-hidden>
            {steps.map((_, i) => (
              <i key={i} className={i < step ? 'is-done' : i === step ? 'is-now' : ''} />
            ))}
          </div>
          <span className="ag-prog-label">
            שאלה {step + 1} מתוך {TOTAL}
          </span>
        </div>

        <div className="ag-card">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="ag-step"
            >
              <span className="ag-kicker">{s.kicker}</span>
              <h2>{s.title}</h2>
              {s.hint && <p className="ag-hint">{s.hint}</p>}
              <div className="ag-body">{body()}</div>
            </motion.div>
          </AnimatePresence>

          <div className="ag-nav">
            <button type="button" className="btn btn-ghost" onClick={() => go(step - 1)} disabled={step === 0}>
              <ArrowRight /> הקודם
            </button>
            <span className="ag-nav-mid">
              {s.optional && step !== TOTAL - 1 && (
                <button type="button" className="btn btn-quiet" onClick={() => go(step + 1)}>
                  לדלג
                </button>
              )}
            </span>
            {last ? (
              <button type="button" className="btn btn-gold btn-lg" disabled={!ok} onClick={finish}>
                <Sparkles /> לבנות את הדף
              </button>
            ) : (
              <button type="button" className="btn btn-gold btn-lg" disabled={!ok} onClick={() => go(step + 1)}>
                הבא <ArrowLeft />
              </button>
            )}
          </div>
        </div>

        <button type="button" className="ag-fill" onClick={fillSample}>
          <WandSparkles /> דמו מהיר: למלא את הכול בדוגמה
        </button>
      </div>

      <aside className="ag-wiz-side" aria-label="תצוגה מקדימה של הדף">
        <span className="ag-side-title">הדף שלכם, בזמן אמת</span>
        <ProfilePreview profile={profile} />
      </aside>

      <AnimatePresence>
        {making && (
          <motion.div className="ag-making" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="ag-making-in">
              <div className="ag-orb" aria-hidden>
                <i />
                <i />
                <Sparkles />
              </div>
              <h3>בונים את הדף של {firstName(profile.name) || 'הסוכן'}</h3>
              <ul>
                {['כותבים את הקצת עליי', 'מדליקים את המפה', 'מכינים את הדף לגוגל'].map((t, i) => (
                  <li key={t} style={{ animationDelay: `${0.5 + i * 0.9}s` }}>
                    <Check /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
