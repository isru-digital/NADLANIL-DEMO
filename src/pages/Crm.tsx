import { useEffect, useState } from 'react'
import type { DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import {
  ArrowLeft,
  BedDouble,
  Check,
  ChevronLeft,
  EyeOff,
  Handshake,
  Home,
  Lock,
  MapPin,
  Plus,
  Share2,
  UserSearch,
} from 'lucide-react'
import { CURRENT_BROKER_ID } from '../config'
import { brokerById, crmStages, formatPrice, formatPriceShort } from '../data/demo'
import type { BoardCard, CrmItem, CrmStatus } from '../data/demo'
import { useStore } from '../store'
import { Avatar, EASE, Modal, PageHead, Photo } from '../components/ui'
import '../styles/crm.css'

type Kind = 'all' | 'property' | 'client'

export default function Crm() {
  const { crm, moveCrm, publishedIds, toast } = useStore()
  const [kind, setKind] = useState<Kind>('all')
  const [stage, setStage] = useState<CrmStatus>('new')
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<CrmStatus | null>(null)
  const [publishing, setPublishing] = useState<CrmItem | null>(null)

  const items = kind === 'all' ? crm : crm.filter((c) => c.kind === kind)

  const onDrop = (status: CrmStatus) => (e: DragEvent) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || dragId
    if (id) moveCrm(id, status)
    setDragId(null)
    setOverStage(null)
  }

  const nextStage = (s: CrmStatus) => {
    const i = crmStages.findIndex((x) => x.id === s)
    return crmStages[i + 1]
  }

  return (
    <>
      <PageHead
        eyebrow="CRM"
        title="לקוחות ונכסים"
        subtitle="כל העבודה שלך על לוח אחד, מהפנייה הראשונה ועד הסגירה. הלוח הזה פרטי ורק אתה רואה אותו."
      >
        <div className="seg" role="group" aria-label="סוג כרטיס">
          {(
            [
              ['all', 'הכול'],
              ['property', 'נכסים'],
              ['client', 'לקוחות'],
            ] as [Kind, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              className={`seg-btn${kind === id ? ' is-active' : ''}`}
              aria-pressed={kind === id}
              onClick={() => setKind(id)}
            >
              {kind === id && (
                <motion.span
                  layoutId="crm-seg"
                  className="seg-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                />
              )}
              <span className="seg-label">{label}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-ghost" onClick={() => toast('בדמו לא ניתן להוסיף כרטיסים חדשים')}>
          <Plus />
          כרטיס חדש
        </button>
      </PageHead>

      {/* phone: one stage at a time */}
      <div className="stage-tabs chip-row" role="tablist" aria-label="שלב">
        {crmStages.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={stage === s.id}
            className={`chip${stage === s.id ? ' is-active' : ''}`}
            onClick={() => setStage(s.id)}
          >
            {s.label}
            <b className="num chip-count">{items.filter((i) => i.status === s.id).length}</b>
          </button>
        ))}
      </div>

      <LayoutGroup>
        <div className="kanban" data-stage={stage}>
          {crmStages.map((s) => {
            const col = items.filter((i) => i.status === s.id)
            return (
              <section
                key={s.id}
                className={`kan-col${overStage === s.id ? ' is-over' : ''}${stage === s.id ? ' is-current' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (overStage !== s.id) setOverStage(s.id)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverStage(null)
                }}
                onDrop={onDrop(s.id)}
                aria-label={s.label}
              >
                <header className="kan-head">
                  <i className={`kan-dot dot-${s.id}`} aria-hidden />
                  <h2>{s.label}</h2>
                  <span className="num">{col.length}</span>
                </header>
                <div className="kan-list">
                  {col.map((it) => {
                    const next = nextStage(it.status)
                    const published = !!publishedIds[it.id]
                    return (
                      <motion.div
                        key={it.id}
                        layoutId={`crm-${it.id}`}
                        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                      >
                        <article
                          className={`kan-card${dragId === it.id ? ' is-dragging' : ''}`}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', it.id)
                            e.dataTransfer.effectAllowed = 'move'
                            setDragId(it.id)
                          }}
                          onDragEnd={() => {
                            setDragId(null)
                            setOverStage(null)
                          }}
                        >
                          {it.image && <Photo src={it.image} alt={it.title} ratio="16 / 8" className="kan-photo" />}
                          <div className="kan-body">
                            <div className="kan-top">
                              <span className={`tag ${it.kind === 'property' ? 'tag-gold' : 'tag-blue'}`}>
                                {it.kind === 'property' ? <Home /> : <UserSearch />}
                                {it.kind === 'property' ? 'נכס' : 'לקוח'}
                              </span>
                              <span className="kan-updated">{it.updated}</span>
                            </div>
                            <h3>{it.title}</h3>
                            <div className="kan-meta">
                              <span>
                                <MapPin />
                                {it.area}
                              </span>
                              <span>
                                <BedDouble />
                                <span className="num">{it.rooms}</span> חד'
                              </span>
                            </div>
                            <div className="kan-price">
                              <span>{it.kind === 'property' ? 'מחיר' : 'תקציב עד'}</span>
                              <strong className="num">{formatPriceShort(it.price)}</strong>
                            </div>
                            <div className="kan-client">
                              <Lock />
                              <span>{it.client}</span>
                            </div>
                            <p className="kan-note">{it.note}</p>
                            <div className="kan-actions">
                              {published ? (
                                <span className="tag tag-green kan-published">
                                  <Check />
                                  פורסם בקהילה
                                </span>
                              ) : (
                                <button className="btn btn-sm kan-publish" onClick={() => setPublishing(it)}>
                                  <Share2 />
                                  פרסם לקהילה
                                </button>
                              )}
                              {next && (
                                <button
                                  className="icon-btn kan-next"
                                  onClick={() => moveCrm(it.id, next.id)}
                                  aria-label={`העברה לשלב ${next.label}`}
                                  title={`העברה לשלב ${next.label}`}
                                >
                                  <ChevronLeft />
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      </motion.div>
                    )
                  })}
                  {col.length === 0 && <div className="kan-empty">אין כרטיסים בשלב הזה. אפשר לגרור לכאן.</div>}
                </div>
              </section>
            )
          })}
        </div>
      </LayoutGroup>
      <p className="kan-hint">טיפ: אפשר לגרור כרטיס בין השלבים, או ללחוץ על החץ כדי לקדם אותו.</p>

      <PublishModal item={publishing} onClose={() => setPublishing(null)} />
    </>
  )
}

/* ============================================================ publish flow */

type Step = 'form' | 'sending' | 'done'

function PublishModal({ item: current, onClose }: { item: CrmItem | null; onClose: () => void }) {
  // keep the last item mounted while the modal animates out
  const [shown, setShown] = useState<CrmItem | null>(null)
  useEffect(() => {
    if (current) setShown(current)
  }, [current])
  const item = current ?? shown
  const { publishToBoard } = useStore()
  const navigate = useNavigate()
  const me = brokerById(CURRENT_BROKER_ID)
  const [step, setStep] = useState<Step>('form')
  const [fields, setFields] = useState({ area: true, rooms: true, price: true, image: true, client: false, notes: false })
  const [desc, setDesc] = useState('')
  const [split, setSplit] = useState('חלוקת עמלה שווה')

  useEffect(() => {
    if (!current) return
    const item = current
    setStep('form')
    setFields({ area: true, rooms: true, price: true, image: true, client: false, notes: false })
    setSplit('חלוקת עמלה שווה')
    setDesc(
      item.kind === 'property'
        ? 'נכס בבלעדיות אצלי. מחפשת מתווך עם קונה מתאים לעסקה משותפת.'
        : 'לקוח רציני ומוכן לעסקה. מחפשת מתווך עם נכס מתאים.',
    )
  }, [current])

  if (!item) return null

  const isProperty = item.kind === 'property'
  const note = [desc.trim(), fields.client && `איש קשר: ${item.client}.`, fields.notes && item.note]
    .filter(Boolean)
    .join(' ')

  const preview: BoardCard = {
    id: `m-${item.id}`,
    kind: item.kind,
    title: item.title,
    area: fields.area ? item.area : 'האזור יימסר בפנייה',
    rooms: fields.rooms ? item.rooms : undefined,
    price: fields.price ? item.price : undefined,
    note,
    split,
    brokerId: me.id,
    time: 'עכשיו',
    image: isProperty && fields.image ? item.image : undefined,
    fresh: true,
  }

  const publish = () => {
    setStep('sending')
    window.setTimeout(() => {
      publishToBoard({ ...preview, id: `m-${item.id}-${Date.now()}` }, item.id)
      setStep('done')
    }, 1100)
  }

  const toggle = (k: keyof typeof fields) => setFields((f) => ({ ...f, [k]: !f[k] }))

  const publicFields: [keyof typeof fields, string, string][] = [
    ['area', 'אזור', item.area],
    ['rooms', 'מספר חדרים', `${item.rooms} חדרים`],
    ['price', isProperty ? 'מחיר מבוקש' : 'תקציב', formatPrice(item.price)],
    ...(isProperty && item.image ? ([['image', 'תמונת הנכס', 'תמונה ראשית']] as [keyof typeof fields, string, string][]) : []),
  ]

  return (
    <Modal
      open={!!current}
      wide={step === 'form'}
      onClose={step === 'sending' ? () => {} : onClose}
      title={step === 'form' ? 'פרסום לקהילה' : undefined}
      subtitle={step === 'form' ? 'בוחרים מה יופיע בלוח השיתוף. פרטי הלקוח מוסתרים כברירת מחדל.' : undefined}
    >
      <AnimatePresence mode="wait" initial={false}>
        {step === 'form' && (
          <motion.div key="form" exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <div className="modal-body publish">
              <div className="publish-fields">
                <fieldset>
                  <legend>מה מוצג לקהילה</legend>
                  <div className="switch-row is-locked">
                    <div>
                      <strong>כותרת</strong>
                      <span>{item.title}</span>
                    </div>
                    <span className="tag">תמיד מוצג</span>
                  </div>
                  {publicFields.map(([k, label, value]) => (
                    <Switch key={k} label={label} value={value} on={fields[k]} onToggle={() => toggle(k)} />
                  ))}
                </fieldset>

                <fieldset className="private">
                  <legend>
                    <Lock />
                    פרטים פרטיים
                  </legend>
                  <Switch label="שם הלקוח" value={item.client} on={fields.client} onToggle={() => toggle('client')} lock />
                  <Switch label="הערות פנימיות" value={item.note} on={fields.notes} onToggle={() => toggle('notes')} lock />
                </fieldset>

                <label className="field">
                  <span>תיאור קצר לקהילה</span>
                  <textarea className="textarea publish-desc" value={desc} onChange={(e) => setDesc(e.target.value)} />
                </label>

                <div className="field">
                  <span className="field-label">חלוקת עמלה</span>
                  <div className="chip-row">
                    {['חלוקת עמלה שווה', 'חלוקה לפי סיכום'].map((s) => (
                      <button key={s} type="button" className="chip" aria-pressed={split === s} onClick={() => setSplit(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="publish-preview">
                <span className="field-label">כך זה ייראה בלוח השיתוף</span>
                <div className="card preview-card">
                  {preview.image && <Photo src={preview.image} alt="" ratio="16 / 9" eager />}
                  <div className="board-body">
                    <span className={`tag ${isProperty ? 'tag-gold' : 'tag-blue'}`}>
                      {isProperty ? <Handshake /> : <UserSearch />}
                      {isProperty ? 'נכס לשיתוף פעולה' : 'לקוח מחפש'}
                    </span>
                    <h3>{preview.title}</h3>
                    <div className="board-meta">
                      <span>
                        <MapPin />
                        {preview.area}
                      </span>
                      {preview.rooms && (
                        <span>
                          <BedDouble />
                          <span className="num">{preview.rooms}</span> חדרים
                        </span>
                      )}
                    </div>
                    {preview.price != null && (
                      <div className="board-price">
                        <span>{isProperty ? 'מחיר מבוקש' : 'תקציב עד'}</span>
                        <strong className="num">{formatPrice(preview.price)}</strong>
                      </div>
                    )}
                    {note && <p className="board-note">{note}</p>}
                  </div>
                  <div className="board-foot">
                    <div className="board-broker">
                      <Avatar src={me.avatar} name={me.name} size={34} />
                      <div>
                        <strong>{me.name}</strong>
                        <span>{split}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {!fields.client && (
                  <span className="privacy-note">
                    <EyeOff />
                    שם הלקוח לא יופיע בפרסום
                  </span>
                )}
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-gold" onClick={publish}>
                <Share2 />
                פרסום ללוח השיתוף
              </button>
              <button className="btn btn-quiet" onClick={onClose}>
                ביטול
              </button>
            </div>
          </motion.div>
        )}

        {step === 'sending' && (
          <motion.div
            key="sending"
            className="publish-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="status"
          >
            <span className="spinner" />
            <strong>מפרסם ללוח השיתוף...</strong>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div
            key="done"
            className="publish-state"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE }}
            role="status"
          >
            <div className="success">
              {[...Array(10)].map((_, i) => (
                <motion.i
                  key={i}
                  style={{ rotate: `${i * 36}deg` }}
                  initial={{ opacity: 0, scaleY: 0.2, y: -34 }}
                  animate={{ opacity: [0, 1, 0], scaleY: [0.2, 1, 0.6], y: [-34, -62, -74] }}
                  transition={{ duration: 0.9, delay: 0.25 + (i % 3) * 0.04, ease: EASE }}
                />
              ))}
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
                    transition={{ duration: 0.5, delay: 0.25, ease: EASE }}
                  />
                </svg>
              </motion.span>
            </div>
            <h2>{isProperty ? 'הנכס פורסם בלוח השיתוף' : 'הלקוח פורסם בלוח השיתוף'}</h2>
            <p>מתווכים בקהילה יכולים לפנות אליך כבר עכשיו. פרטי הלקוח נשארו רק אצלך.</p>
            <div className="publish-done-actions">
              <button className="btn btn-gold" onClick={() => navigate('/app/community?tab=board')}>
                מעבר ללוח השיתוף
                <ArrowLeft />
              </button>
              <button className="btn btn-ghost" onClick={onClose}>
                חזרה ל-CRM
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}

function Switch({
  label,
  value,
  on,
  onToggle,
  lock = false,
}: {
  label: string
  value: string
  on: boolean
  onToggle: () => void
  lock?: boolean
}) {
  return (
    <button type="button" className={`switch-row${on ? ' is-on' : ''}`} role="switch" aria-checked={on} onClick={onToggle}>
      <div>
        <strong>{label}</strong>
        <span>{lock && !on ? 'מוסתר מהקהילה' : value}</span>
      </div>
      <span className="switch" aria-hidden>
        <i />
      </span>
    </button>
  )
}
