import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Monitor,
  Rocket,
  Smartphone,
  Sparkles,
  Square,
} from 'lucide-react'
import { asset } from '../config'
import { aiBioText, formatPriceShort, templates, testimonials } from '../data/demo'
import type { TemplateId } from '../data/demo'
import { useStore } from '../store'
import { EASE, Modal, PageHead } from '../components/ui'
import LandingTemplate from '../templates/LandingTemplate'
import '../styles/builder.css'

const steps = [
  { id: 'details', label: 'פרטים', anchor: 'lp-hero' },
  { id: 'bio', label: 'ביו', anchor: 'lp-about' },
  { id: 'quotes', label: 'המלצות', anchor: 'lp-quotes' },
  { id: 'props', label: 'נכסים', anchor: 'lp-props' },
  { id: 'contact', label: 'יצירת קשר', anchor: 'lp-contact' },
  { id: 'template', label: 'תבנית', anchor: 'lp-hero' },
] as const

const tones = ['אישי וחם', 'יוקרתי ומדויק', 'ישיר וקליל']

export default function Builder() {
  const { builder, setBuilder, crm, toast, setPagePublished, pagePublished } = useStore()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [device, setDevice] = useState<'desktop' | 'mobile'>(() =>
    window.matchMedia('(max-width: 700px)').matches ? 'mobile' : 'desktop',
  )
  const [tone, setTone] = useState(0)
  const [typing, setTyping] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const typer = useRef<number>()
  const bioRef = useRef<HTMLTextAreaElement>(null)

  const frameRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(0.6)
  const pageWidth = device === 'desktop' ? 1280 : 390

  // fit the full-size page into the preview frame
  useLayoutEffect(() => {
    const el = frameRef.current
    if (!el) return
    const fit = () => setZoom(Math.min(1, el.clientWidth / pageWidth))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [pageWidth])

  // follow the wizard: bring the section being edited into view in the preview
  const scrollPreview = useCallback((anchor: string) => {
    const frame = frameRef.current
    const target = frame?.querySelector<HTMLElement>(`#${anchor}`)
    if (!frame || !target) return
    const top = target.getBoundingClientRect().top - frame.getBoundingClientRect().top + frame.scrollTop
    frame.scrollTo({ top: Math.max(0, top - 8), behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => scrollPreview(steps[step].anchor), 120)
    return () => window.clearTimeout(t)
  }, [step, scrollPreview])

  useEffect(() => () => window.clearInterval(typer.current), [])

  const go = (i: number) => {
    setDir(i > step ? 1 : -1)
    setStep(i)
  }

  // "AI writes my bio": types a prepared Hebrew text. No real AI call in the demo.
  const writeBio = (toneIndex = tone) => {
    window.clearInterval(typer.current)
    const text = aiBioText[toneIndex % aiBioText.length]
    let i = 0
    setTyping(true)
    setBuilder({ bio: '' })
    scrollPreview('lp-about')
    typer.current = window.setInterval(() => {
      i = Math.min(text.length, i + 2)
      setBuilder({ bio: text.slice(0, i) })
      const ta = bioRef.current
      if (ta) ta.scrollTop = ta.scrollHeight
      if (i >= text.length) {
        window.clearInterval(typer.current)
        setTyping(false)
      }
    }, 22)
  }
  const stopTyping = () => {
    window.clearInterval(typer.current)
    setTyping(false)
  }

  const toggleIn = (key: 'testimonialIds' | 'propertyIds', id: string) => {
    const list = builder[key]
    setBuilder({ [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] })
  }

  const publicUrl = `${window.location.origin}${import.meta.env.BASE_URL}b/demo`
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      toast('הקישור הועתק')
    } catch {
      toast('לא ניתן להעתיק בדפדפן הזה')
    }
  }

  const properties = crm.filter((c) => c.kind === 'property')
  const current = steps[step]

  return (
    <>
      <PageHead
        eyebrow="בונה דף נחיתה"
        title="הדף האישי שלך"
        subtitle="ממלאים כמה פרטים, בוחרים תבנית, ורואים את הדף מתעדכן בזמן אמת."
      >
        <button className="btn btn-ghost" onClick={() => navigate('/b/demo')}>
          <ExternalLink />
          פתיחת הדף המפורסם
        </button>
        <button
          className="btn btn-gold"
          onClick={() => {
            setPagePublished(true)
            setPublishOpen(true)
          }}
        >
          <Rocket />
          {pagePublished ? 'פרסום עדכון' : 'פרסום הדף'}
        </button>
      </PageHead>

      <div className="builder">
        {/* ------------------------------------------------------- wizard */}
        <section className="card wizard" aria-label="אשף בניית הדף">
          <ol className="stepper">
            {steps.map((s, i) => (
              <li key={s.id}>
                <button
                  className={`step-dot${i === step ? ' is-current' : ''}${i < step ? ' is-done' : ''}`}
                  onClick={() => go(i)}
                  aria-current={i === step ? 'step' : undefined}
                >
                  <span className="num">{i < step ? <Check /> : i + 1}</span>
                  <em>{s.label}</em>
                </button>
              </li>
            ))}
            <span className="stepper-track" aria-hidden>
              <motion.i animate={{ scaleX: step / (steps.length - 1) }} transition={{ duration: 0.5, ease: EASE }} />
            </span>
          </ol>

          <div className="wizard-body">
            <AnimatePresence mode="wait" initial={false} custom={dir}>
              <motion.div
                key={current.id}
                custom={dir}
                initial={{ opacity: 0, x: dir * -26 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * 26 }}
                transition={{ duration: 0.26, ease: EASE }}
                className="wizard-step"
              >
                {current.id === 'details' && (
                  <>
                    <StepTitle title="הפרטים שלך" text="כך יכירו אותך הלקוחות בראש הדף." />
                    <label className="field">
                      <span>שם מלא</span>
                      <input className="input" value={builder.name} onChange={(e) => setBuilder({ name: e.target.value })} />
                    </label>
                    <label className="field">
                      <span>תואר מקצועי</span>
                      <input className="input" value={builder.title} onChange={(e) => setBuilder({ title: e.target.value })} />
                    </label>
                    <div className="field-row">
                      <label className="field">
                        <span>אזור פעילות</span>
                        <input className="input" value={builder.area} onChange={(e) => setBuilder({ area: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>שנות ניסיון</span>
                        <input
                          className="input num"
                          type="number"
                          min={0}
                          max={60}
                          value={builder.years}
                          onChange={(e) => setBuilder({ years: Number(e.target.value) || 0 })}
                        />
                      </label>
                    </div>
                    <label className="field">
                      <span>משפט פתיחה</span>
                      <input className="input" value={builder.tagline} onChange={(e) => setBuilder({ tagline: e.target.value })} />
                    </label>
                  </>
                )}

                {current.id === 'bio' && (
                  <>
                    <StepTitle title="כמה מילים עליך" text="אפשר לכתוב לבד, או לתת ל-AI לכתוב טיוטה ולערוך אותה." />
                    <div className="ai-box">
                      <div className="ai-tones" role="group" aria-label="סגנון כתיבה">
                        {tones.map((t, i) => (
                          <button
                            key={t}
                            className="chip"
                            aria-pressed={tone === i}
                            onClick={() => {
                              setTone(i)
                              writeBio(i)
                            }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      {typing ? (
                        <button className="btn btn-ghost ai-btn" onClick={stopTyping}>
                          <Square />
                          עצירה
                        </button>
                      ) : (
                        <button className="btn ai-btn ai-btn-go" onClick={() => writeBio()}>
                          <Sparkles />
                          AI כותב לי ביו
                        </button>
                      )}
                    </div>
                    <label className="field">
                      <span>ביו</span>
                      <div className={`bio-wrap${typing ? ' is-typing' : ''}`}>
                        <textarea
                          ref={bioRef}
                          className="textarea"
                          rows={8}
                          value={builder.bio}
                          readOnly={typing}
                          onChange={(e) => setBuilder({ bio: e.target.value })}
                          placeholder="ספרו על עצמכם, על הניסיון ועל הדרך שבה אתם עובדים."
                        />
                        {typing && (
                          <span className="bio-status" role="status">
                            <Sparkles />
                            ה-AI כותב...
                          </span>
                        )}
                      </div>
                    </label>
                    <span className="field-hint num">{builder.bio.length} תווים</span>
                  </>
                )}

                {current.id === 'quotes' && (
                  <>
                    <StepTitle title="המלצות מלקוחות" text="בוחרים אילו המלצות יופיעו בדף." />
                    <div className="pick-list">
                      {testimonials.map((q) => {
                        const on = builder.testimonialIds.includes(q.id)
                        return (
                          <button
                            key={q.id}
                            className={`pick${on ? ' is-on' : ''}`}
                            role="checkbox"
                            aria-checked={on}
                            onClick={() => toggleIn('testimonialIds', q.id)}
                          >
                            <span className="pick-check">{on && <Check />}</span>
                            <span className="pick-main">
                              <strong>{q.name}</strong>
                              <em>{q.role}</em>
                              <span>{q.body}</span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

                {current.id === 'props' && (
                  <>
                    <StepTitle title="נכסים נבחרים" text="הנכסים מגיעים ישירות מה-CRM שלך. מומלץ לבחור עד שלושה." />
                    <div className="pick-list">
                      {properties.map((p) => {
                        const on = builder.propertyIds.includes(p.id)
                        return (
                          <button
                            key={p.id}
                            className={`pick pick-prop${on ? ' is-on' : ''}`}
                            role="checkbox"
                            aria-checked={on}
                            onClick={() => toggleIn('propertyIds', p.id)}
                          >
                            <span className="pick-check">{on && <Check />}</span>
                            {p.image && <img src={asset(p.image)} alt="" loading="lazy" />}
                            <span className="pick-main">
                              <strong>{p.title}</strong>
                              <em>{p.area}</em>
                            </span>
                            <b className="num">{formatPriceShort(p.price)}</b>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

                {current.id === 'contact' && (
                  <>
                    <StepTitle title="איך יוצרים איתך קשר" text="בוחרים אילו דרכי פנייה יופיעו בתחתית הדף." />
                    <div className="toggle-list">
                      <Toggle
                        label="טופס השארת פרטים"
                        hint="פניות נכנסות כלידים חדשים ב-CRM"
                        on={builder.showForm}
                        onToggle={() => setBuilder({ showForm: !builder.showForm })}
                      />
                      <Toggle
                        label="כפתור וואטסאפ"
                        hint="פותח שיחה ישירה איתך"
                        on={builder.showWhatsapp}
                        onToggle={() => setBuilder({ showWhatsapp: !builder.showWhatsapp })}
                      />
                      <Toggle
                        label="הצגת מספר טלפון"
                        hint="המספר יופיע ככפתור חיוג"
                        on={builder.showPhone}
                        onToggle={() => setBuilder({ showPhone: !builder.showPhone })}
                      />
                    </div>
                    <p className="demo-note">בדמו לא נשלחות הודעות ולא מוצג מספר טלפון אמיתי.</p>
                  </>
                )}

                {current.id === 'template' && (
                  <>
                    <StepTitle title="בחירת תבנית" text="כל התוכן נשמר. רק המראה מתחלף, ומיד." />
                    <div className="tpl-list">
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          className={`tpl${builder.template === t.id ? ' is-on' : ''}`}
                          aria-pressed={builder.template === t.id}
                          onClick={() => setBuilder({ template: t.id })}
                        >
                          <span className={`tpl-thumb tpl-${t.id}`} aria-hidden>
                            <i />
                            <b>{builder.name.split(' ')[0]}</b>
                            <u />
                          </span>
                          <span className="tpl-main">
                            <strong>{t.name}</strong>
                            <em>{t.mood}</em>
                            <span>{t.description}</span>
                          </span>
                          <span className="pick-check">{builder.template === t.id && <Check />}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <footer className="wizard-foot">
            <button className="btn btn-quiet" onClick={() => go(step - 1)} disabled={step === 0}>
              <ArrowRight />
              הקודם
            </button>
            <span className="faint num">
              {step + 1} / {steps.length}
            </span>
            {step < steps.length - 1 ? (
              <button className="btn btn-gold" onClick={() => go(step + 1)}>
                הבא
                <ArrowLeft />
              </button>
            ) : (
              <button
                className="btn btn-gold"
                onClick={() => {
                  setPagePublished(true)
                  setPublishOpen(true)
                }}
              >
                <Rocket />
                פרסום הדף
              </button>
            )}
          </footer>
        </section>

        {/* ------------------------------------------------------ preview */}
        <section className="preview" aria-label="תצוגה חיה">
          <div className="preview-bar">
            <div className="seg" role="group" aria-label="תבנית">
              {templates.map((t) => (
                <button
                  key={t.id}
                  className={`seg-btn${builder.template === t.id ? ' is-active' : ''}`}
                  aria-pressed={builder.template === t.id}
                  onClick={() => setBuilder({ template: t.id as TemplateId })}
                >
                  {builder.template === t.id && (
                    <motion.span
                      layoutId="tpl-seg"
                      className="seg-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                    />
                  )}
                  <span className="seg-label">{t.name}</span>
                </button>
              ))}
            </div>
            <span className="live">
              <i aria-hidden />
              תצוגה חיה
            </span>
            <div className="device-toggle" role="group" aria-label="גודל תצוגה">
              <button
                className={`icon-btn${device === 'desktop' ? ' is-on' : ''}`}
                aria-pressed={device === 'desktop'}
                aria-label="תצוגת מחשב"
                onClick={() => setDevice('desktop')}
              >
                <Monitor />
              </button>
              <button
                className={`icon-btn${device === 'mobile' ? ' is-on' : ''}`}
                aria-pressed={device === 'mobile'}
                aria-label="תצוגת נייד"
                onClick={() => setDevice('mobile')}
              >
                <Smartphone />
              </button>
            </div>
          </div>

          <div className={`browser browser-${device}`}>
            <div className="browser-top" aria-hidden>
              <span className="browser-dots">
                <i />
                <i />
                <i />
              </span>
              <span className="browser-url ltr">/b/demo</span>
            </div>
            <div className="browser-view" ref={frameRef}>
              <motion.div
                key={builder.template}
                className="browser-page"
                style={{ width: pageWidth, zoom }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <LandingTemplate data={builder} properties={crm} onAction={toast} />
              </motion.div>
            </div>
          </div>
        </section>
      </div>

      <Modal open={publishOpen} onClose={() => setPublishOpen(false)}>
        <div className="publish-state">
          <div className="success">
            <motion.span
              className="success-ring"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16 }}
            >
              <svg viewBox="0 0 52 52" aria-hidden>
                <motion.path
                  d="M14 27l8 8 16-17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
                />
              </svg>
            </motion.span>
          </div>
          <h2>הדף שלך באוויר</h2>
          <p>אפשר לשתף את הקישור עם לקוחות, ולעדכן את הדף בכל רגע.</p>
          <button className="link-box" onClick={copyLink}>
            <span className="ltr">{publicUrl.replace(/^https?:\/\//, '')}</span>
            <Copy />
          </button>
          <div className="publish-done-actions">
            <button className="btn btn-gold" onClick={() => navigate('/b/demo')}>
              פתיחת הדף
              <ArrowLeft />
            </button>
            <button className="btn btn-ghost" onClick={() => setPublishOpen(false)}>
              המשך עריכה
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function StepTitle({ title, text }: { title: string; text: string }) {
  return (
    <div className="step-title">
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  )
}

function Toggle({ label, hint, on, onToggle }: { label: string; hint: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={`switch-row${on ? ' is-on' : ''}`} role="switch" aria-checked={on} onClick={onToggle}>
      <div>
        <strong>{label}</strong>
        <span>{hint}</span>
      </div>
      <span className="switch" aria-hidden>
        <i />
      </span>
    </button>
  )
}
