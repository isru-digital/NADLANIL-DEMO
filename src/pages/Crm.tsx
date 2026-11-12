import { useEffect, useState } from 'react'
import type { DragEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import {
  ArrowLeft,
  BedDouble,
  Check,
  ChevronLeft,
  Handshake,
  Home,
  Lock,
  MapPin,
  Plus,
  Share2,
  Sparkles,
  UserSearch,
  Zap,
} from 'lucide-react'
import { CURRENT_BROKER_ID } from '../config'
import { REFERRAL_DISCLAIMER, REFERRAL_TERMS, topicById, topics } from '../config/topics'
import type { TopicId } from '../config/topics'
import { brokerById, cities, crmStages, fitsSearch, formatPriceShort, roomsLabel, simulatedListings } from '../data/demo'
import type { CommunityItem, CrmItem, CrmStatus } from '../data/demo'
import { useStore } from '../store'
import { actionSlots, crmSlots } from '../config/navExtras'
import type { MatchAlert } from '../store'
import { EASE, Modal, PageHead, Photo } from '../components/ui'
import CommunityCard from '../components/CommunityCard'
import '../styles/crm.css'
import '../styles/crm-publish.css'

type Kind = 'all' | 'property' | 'client'

/** The message a CRM item becomes in a given topic. Client name and phone are never part of it. */
const draftFor = (item: CrmItem, topicId: TopicId, authorId: string): CommunityItem => {
  const base = { id: `m-${item.id}`, topicId, authorId, time: 'עכשיו', likes: 0, comments: [], sourceId: item.id }
  if (topicId === 'coop') {
    return {
      ...base,
      city: item.city,
      title: item.title,
      body: 'נכס בבלעדיות אצלי. פתוח לשיתוף פעולה עם מתווך שיש לו קונה מתאים.',
      image: item.image,
      property: { area: item.area, rooms: item.rooms, price: item.price, split: 'חלוקת עמלה שווה', showPrice: true },
    }
  }
  if (topicId === 'seeking' && item.search) {
    return {
      ...base,
      city: item.search.cities[0],
      title: `מחפש לקונה חם: ${roomsLabel(item.search)} ב${item.search.cities.join(' או ב')}`,
      body: 'קונה רציני ומוכן לעסקה. מי שיש לו נכס מתאים, גם שקט, דברו איתי.',
      search: item.search,
    }
  }
  const isClient = item.kind === 'client'
  return {
    ...base,
    topicId: 'referrals',
    city: 'תל אביב',
    title: isClient ? 'קונה שמחפש מחוץ לאזור שלי' : 'מוכר עם נכס נוסף בעיר אחרת',
    body: isClient
      ? 'לקוח שלי מחפש נכס בעיר שאני לא עובדת בה. מחפשת מתווך מקומי שילווה אותו עד הסגירה.'
      : 'בעל נכס שאני מלווה רוצה למכור נכס נוסף בעיר אחרת. מחפשת מתווך מקומי שייקח את זה.',
    referral: { side: isClient ? 'buyer' : 'seller', toCity: 'ירושלים', terms: REFERRAL_TERMS },
  }
}

/** Publishes to the community and reports whether the new message matches something. */
function usePublisher() {
  const { items, addItem, addNotice, showMatch } = useStore()
  const me = brokerById(CURRENT_BROKER_ID)

  return (source: CrmItem, draft: CommunityItem): MatchAlert | null => {
    const stamp = Date.now()
    addItem({ ...draft, id: `${draft.id}-${stamp}`, fresh: true }, source.id)

    if (draft.property) {
      const p = { city: draft.city, rooms: draft.property.rooms, price: draft.property.price }
      const hit = items.find((it) => it.search && it.authorId !== me.id && fitsSearch(it.search, p))
      if (hit) {
        const broker = brokerById(hit.authorId)
        const alert: MatchAlert = {
          id: `ma-${stamp}`,
          kind: 'found',
          title: 'נמצאה התאמה',
          text: `הנכס שלך מתאים לבקשה של ${broker.name}: "${hit.title}".`,
          topicId: 'seeking',
          itemId: hit.id,
          brokerId: broker.id,
        }
        addNotice({ id: alert.id, kind: 'match', title: alert.title, text: alert.text, time: 'עכשיו', read: false, topicId: 'seeking', itemId: hit.id })
        return alert
      }
    }

    if (draft.search) {
      // demo simulation: a few seconds later "another broker" lists a property that fits this saved search
      const sim = simulatedListings[source.id]
      if (sim && !items.some((it) => it.id.startsWith(sim.id))) {
        window.setTimeout(() => {
          const id = `${sim.id}-${stamp}`
          const broker = brokerById(sim.authorId)
          addItem({ ...sim, id, fresh: true })
          const alert: MatchAlert = {
            id: `ma-${stamp}`,
            kind: 'incoming',
            title: 'זה יכול להתאים לך',
            text: `${broker.name} פרסם עכשיו "${sim.title}". זה מתאים לבקשה ששמרת.`,
            topicId: 'coop',
            itemId: id,
            brokerId: broker.id,
          }
          addNotice({ id: alert.id, kind: 'match', title: alert.title, text: alert.text, time: 'עכשיו', read: false, topicId: 'coop', itemId: id })
          showMatch(alert)
        }, 6500)
      }
    }
    return null
  }
}

export default function Crm() {
  const { crm, moveCrm, publishedIds, toast, autoPublish, setAutoPublish, showMatch } = useStore()
  const me = brokerById(CURRENT_BROKER_ID)
  const publishNow = usePublisher()
  // the green version has the clients in a table of their own: two tabs, clients first, and the board holds the properties
  const Clients = crmSlots.Clients
  const [kind, setKind] = useState<Kind>(Clients ? 'client' : 'all')
  const table = !!Clients && kind === 'client'
  const [stage, setStage] = useState<CrmStatus>('new')
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<CrmStatus | null>(null)
  const [publishing, setPublishing] = useState<{ item: CrmItem; topicId: TopicId } | null>(null)

  const items = kind === 'all' ? crm : crm.filter((c) => c.kind === kind)

  const onDrop = (status: CrmStatus) => (e: DragEvent) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || dragId
    if (id) moveCrm(id, status)
    setDragId(null)
    setOverStage(null)
  }

  const nextStage = (s: CrmStatus) => crmStages[crmStages.findIndex((x) => x.id === s) + 1]

  /** Marking a property as שת"פ: opens the preview, or publishes right away when auto-publish is on. */
  const markCoop = (item: CrmItem) => {
    if (!autoPublish) return setPublishing({ item, topicId: 'coop' })
    const alert = publishNow(item, draftFor(item, 'coop', me.id))
    toast('פורסם אוטומטית בנושא "נכסים לשיתוף פעולה"')
    if (alert) window.setTimeout(() => showMatch(alert), 900)
  }

  return (
    <>
      <PageHead
        eyebrow="CRM"
        title="לקוחות ונכסים"
        subtitle={crmSlots.subtitle ?? 'כל העבודה שלך על לוח אחד. מסמנים שת"פ או לוחצים "פרסם בקהילה", והפריט הופך להודעה בנושא המתאים.'}
      >
        <div className="seg" role="group" aria-label="סוג כרטיס">
          {(
            (Clients
              ? [
                  ['client', 'לקוחות'],
                  ['property', 'נכסים'],
                ]
              : [
                  ['all', 'הכול'],
                  ['property', 'נכסים'],
                  ['client', 'לקוחות'],
                ]) as [Kind, string][]
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
        {!table && (
          <button className="btn btn-ghost" data-act="new-card" onClick={() => (actionSlots.newCard ? actionSlots.newCard() : toast('בדמו לא ניתן להוסיף כרטיסים חדשים'))}>
            <Plus />
            כרטיס חדש
          </button>
        )}
      </PageHead>

      {table && Clients && <Clients onPublish={(item) => setPublishing({ item, topicId: 'seeking' })} />}
      {!table && (
        <>

      {crmSlots.AutoBar ? <crmSlots.AutoBar /> : (
      <button
        className={`auto-bar${autoPublish ? ' is-on' : ''}`}
        role="switch"
        aria-checked={autoPublish}
        onClick={() => setAutoPublish(!autoPublish)}
      >
        <span className="auto-icon">
          <Zap />
        </span>
        <span className="auto-text">
          <strong>פרסם אוטומטית נכסים שסומנו שת"פ</strong>
          <span>
            {autoPublish
              ? 'פועל: סימון שת"פ מפרסם את הנכס מיד, בלי שלב אישור. נתוני לקוח לעולם לא מתפרסמים אוטומטית.'
              : 'כבוי: לפני כל פרסום מוצגת תצוגה מקדימה לאישור.'}
          </span>
        </span>
        <span className="switch" aria-hidden>
          <i />
        </span>
      </button>
      )}

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
                    const publishedTo = publishedIds[it.id]
                    const isProperty = it.kind === 'property'
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
                              <span className={`tag ${isProperty ? 'tag-gold' : 'tag-blue'}`}>
                                {isProperty ? <Home /> : <UserSearch />}
                                {isProperty ? 'נכס' : 'לקוח'}
                              </span>
                              {isProperty ? (
                                <button
                                  className={`coop-pill${publishedTo === 'coop' ? ' is-on' : ''}`}
                                  aria-pressed={publishedTo === 'coop'}
                                  disabled={!!publishedTo}
                                  onClick={() => markCoop(it)}
                                  title='סימון שת"פ הופך את הנכס להודעה בנושא "נכסים לשיתוף פעולה"'
                                >
                                  <Handshake />
                                  שת"פ
                                </button>
                              ) : (
                                <span className="kan-updated">{it.updated}</span>
                              )}
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
                              <span>{isProperty ? 'מחיר' : 'תקציב עד'}</span>
                              <strong className="num">{formatPriceShort(it.price)}</strong>
                            </div>
                            <div className="kan-client">
                              <Lock />
                              <span>{it.client}</span>
                            </div>
                            <p className="kan-note">{it.note}</p>
                            <div className="kan-actions">
                              {publishedTo ? (
                                <Link to={`/app/community?topic=${publishedTo}`} className="tag tag-green kan-published">
                                  <Check />
                                  פורסם בקהילה
                                </Link>
                              ) : (
                                <button
                                  className="btn btn-sm kan-publish"
                                  onClick={() => setPublishing({ item: it, topicId: isProperty ? 'coop' : 'seeking' })}
                                >
                                  <Share2 />
                                  פרסם בקהילה
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
                            {crmSlots.CardExtra && <crmSlots.CardExtra item={it} publishedTo={publishedTo} />}
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
        </>
      )}

      <PublishModal request={publishing} onClose={() => setPublishing(null)} publishNow={publishNow} />
    </>
  )
}

/* ============================================================ publish flow */

type Step = 'form' | 'sending' | 'done'

function PublishModal({
  request,
  onClose,
  publishNow,
}: {
  request: { item: CrmItem; topicId: TopicId } | null
  onClose: () => void
  publishNow: (source: CrmItem, draft: CommunityItem) => MatchAlert | null
}) {
  const navigate = useNavigate()
  const me = brokerById(CURRENT_BROKER_ID)
  // keep the last request mounted while the modal animates out
  const [shown, setShown] = useState(request)
  const [step, setStep] = useState<Step>('form')
  const [draft, setDraft] = useState<CommunityItem | null>(null)
  const [alert, setAlert] = useState<MatchAlert | null>(null)

  useEffect(() => {
    if (!request) return
    setShown(request)
    setStep('form')
    setAlert(null)
    setDraft(draftFor(request.item, request.topicId, me.id))
  }, [request, me.id])

  const current = request ?? shown
  if (!current || !draft) return null
  const { item } = current
  const topic = topicById(draft.topicId)
  const options = topics.filter((t) => t.fromCrm.includes(item.kind))
  const patch = (p: Partial<CommunityItem>) => setDraft((d) => (d ? { ...d, ...p } : d))

  const publish = () => {
    setStep('sending')
    window.setTimeout(() => {
      setAlert(publishNow(item, draft))
      setStep('done')
    }, 1100)
  }

  const go = (topicId: TopicId, itemId?: string) =>
    navigate(`/app/community?topic=${topicId}${itemId ? `&item=${itemId}` : ''}`)

  return (
    <Modal
      open={!!request}
      wide={step === 'form'}
      onClose={step === 'sending' ? () => {} : onClose}
      title={step === 'form' ? 'פרסום בקהילה' : undefined}
      subtitle={step === 'form' ? 'בוחרים נושא, רואים בדיוק מה ייחשף, עורכים ומאשרים.' : undefined}
    >
      <AnimatePresence mode="wait" initial={false}>
        {step === 'form' && (
          <motion.div key="form" exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <div className="modal-body publish">
              <div className="publish-fields">
                <div className="field">
                  <span className="field-label">לאיזה נושא?</span>
                  <div className="topic-menu" role="radiogroup" aria-label="נושא בקהילה">
                    {options.map((t) => (
                      <button
                        key={t.id}
                        role="radio"
                        aria-checked={draft.topicId === t.id}
                        className={`topic-opt tone-${t.tone}${draft.topicId === t.id ? ' is-on' : ''}`}
                        onClick={() => setDraft(draftFor(item, t.id, me.id))}
                      >
                        <span className="topic-opt-icon">
                          <t.icon />
                        </span>
                        <span>
                          <strong>{t.name}</strong>
                          <em>{t.description}</em>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {draft.property && (
                  <>
                    <fieldset>
                      <legend>מה מוצג לקהילה</legend>
                      <Switch
                        label="מחיר מבוקש"
                        value={formatPriceShort(item.price)}
                        on={draft.property.showPrice !== false}
                        onToggle={() =>
                          patch({ property: { ...draft.property!, showPrice: draft.property!.showPrice === false } })
                        }
                      />
                      {item.image && (
                        <Switch
                          label="תמונת הנכס"
                          value="תמונה ראשית"
                          on={!!draft.image}
                          onToggle={() => patch({ image: draft.image ? undefined : item.image })}
                        />
                      )}
                    </fieldset>
                    <div className="field">
                      <span className="field-label">חלוקת עמלה</span>
                      <div className="chip-row">
                        {['חלוקת עמלה שווה', 'חלוקה לפי סיכום'].map((s) => (
                          <button
                            key={s}
                            type="button"
                            className="chip"
                            aria-pressed={draft.property!.split === s}
                            onClick={() => patch({ property: { ...draft.property!, split: s } })}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {draft.search && item.search && (
                  <div className="field">
                    <span className="field-label">הפרמטרים שיוצגו (לחיצה מסירה או מחזירה)</span>
                    <div className="chip-row">
                      {item.search.wants.map((w) => {
                        const on = draft.search!.wants.includes(w)
                        return (
                          <button
                            key={w}
                            type="button"
                            className="chip"
                            aria-pressed={on}
                            onClick={() =>
                              patch({
                                search: {
                                  ...draft.search!,
                                  wants: on ? draft.search!.wants.filter((x) => x !== w) : [...draft.search!.wants, w],
                                },
                              })
                            }
                          >
                            {on && <Check />}
                            {w}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {draft.referral && (
                  <>
                    <div className="field">
                      <span className="field-label">באיזו עיר דרוש מתווך?</span>
                      <div className="chip-row">
                        {cities
                          .filter((c) => c !== draft.city)
                          .map((c) => (
                            <button
                              key={c}
                              type="button"
                              className="chip"
                              aria-pressed={draft.referral!.toCity === c}
                              onClick={() => patch({ referral: { ...draft.referral!, toCity: c } })}
                            >
                              {c}
                            </button>
                          ))}
                      </div>
                    </div>
                    <div className="ci-terms">
                      <strong>{REFERRAL_TERMS}</strong>
                      <span>{REFERRAL_DISCLAIMER}</span>
                    </div>
                  </>
                )}

                <label className="field">
                  <span>כותרת</span>
                  <input className="input" value={draft.title ?? ''} onChange={(e) => patch({ title: e.target.value })} />
                </label>
                <label className="field">
                  <span>טקסט ההודעה</span>
                  <textarea className="textarea publish-desc" value={draft.body} onChange={(e) => patch({ body: e.target.value })} />
                </label>

                <div className="privacy-lock">
                  <Lock />
                  <div>
                    <strong>שם וטלפון הלקוח לא מתפרסמים לעולם</strong>
                    <span>"{item.client}" וההערות הפנימיות נשארים רק ב-CRM שלך.</span>
                  </div>
                </div>
              </div>

              <div className="publish-preview">
                <span className="field-label">תצוגה מקדימה: בדיוק כך זה ייראה בקהילה</span>
                <CommunityCard item={draft} preview />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-gold" onClick={publish}>
                <Share2 />
                אישור ופרסום
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
            <strong>מפרסם בנושא "{topic.name}"...</strong>
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
            <h2>פורסם בנושא "{topic.name}"</h2>
            <p>
              {draft.search
                ? 'הבקשה נשמרה ולא תיבלע. כשמתווך אחר יפרסם נכס מתאים, תקפוץ לך התראה.'
                : 'מתווכים מהאזור יכולים לפנות אליך כבר עכשיו. פרטי הלקוח נשארו רק אצלך.'}
            </p>

            {alert && (
              <motion.div
                className="match-inline"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7, ease: EASE }}
              >
                <span className="match-spark">
                  <Sparkles />
                </span>
                <div>
                  <strong>{alert.title}</strong>
                  <span>{alert.text}</span>
                </div>
                <button className="btn btn-gold btn-sm" onClick={() => go(alert.topicId, alert.itemId)}>
                  לצפייה
                </button>
              </motion.div>
            )}

            <div className="publish-done-actions">
              <button className={`btn ${alert ? 'btn-ghost' : 'btn-gold'}`} onClick={() => go(draft.topicId)}>
                מעבר לנושא בקהילה
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

function Switch({ label, value, on, onToggle }: { label: string; value: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={`switch-row${on ? ' is-on' : ''}`} role="switch" aria-checked={on} onClick={onToggle}>
      <div>
        <strong>{label}</strong>
        <span>{value}</span>
      </div>
      <span className="switch" aria-hidden>
        <i />
      </span>
    </button>
  )
}
