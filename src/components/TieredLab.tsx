import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Check, Coins, Gift, LockOpen } from 'lucide-react'
import { useStore } from '../store'
import { useMember } from '../config/member'
import { QUOTA, TOOLS, creditsText, isPaid, useWallet, walletActions } from '../config/tiers'
import { PRICE_TBD } from '../config/office'
import { Modal } from './ui'
import { greenUi } from '../green/ui'
import BetaLab, { labItems } from './BetaLab'
import type { LabView } from './BetaLab'
import '../styles/tiers.css'

/**
 * The beta lab with the three layers on top of it (green version). The lab itself is unchanged: this wrapper decides
 * whether a tool may open. A free tool opens. A paid tool asks a community member to confirm a demo charge in credits,
 * and opens for an office member inside the monthly quota. Nothing is really charged.
 */
type Ask = null | { id: string; kind: 'pay' | 'empty' | 'quota' }

export default function TieredLab({ view, setView }: { view: LabView; setView: (v: LabView) => void }) {
  const { isOffice } = useMember()
  const w = useWallet()
  const { toast } = useStore()
  const navigate = useNavigate()
  const [ask, setAsk] = useState<Ask>(null)
  // the month's free urgent request, while it is open
  const [freePass, setFreePass] = useState<string | null>(null)
  const shown = useRef<LabView>(null)
  const say = useRef(toast)
  say.current = toast

  const tool = view && view !== 'hub' ? view : null
  const allowed = !tool || !isPaid(tool) || freePass === tool || (isOffice ? w.openedOffice.includes(tool) : w.opened.includes(tool))
  if (allowed) shown.current = view

  useEffect(() => {
    // the free pass lasts only while that tool is open
    if (freePass && view !== freePass) setFreePass(null)
    if (!tool || allowed) return
    if (isOffice) {
      if (walletActions.useQuota(tool)) say.current(`כלול במשרד. ${walletActions.get().quotaUsed} מתוך ${QUOTA} החודש`)
      else if (walletActions.get().quotaUsed >= QUOTA) setAsk({ id: tool, kind: 'quota' })
      return
    }
    if (tool === 'urgent' && walletActions.useUrgentFree()) {
      setFreePass('urgent')
      say.current('זו הבקשה הבוערת החינמית שלכם לחודש הזה')
      return
    }
    setAsk({ id: tool, kind: walletActions.get().credits >= TOOLS[tool].cost ? 'pay' : 'empty' })
  }, [view, tool, allowed, isOffice, freePass])

  // when the WhatsApp tool publishes, the lab steps aside so the new post is in sight
  useEffect(() => greenUi.watch(() => setView(null)), [setView])

  const item = labItems.find((x) => x.id === ask?.id)
  const cost = ask ? TOOLS[ask.id].cost : 0
  const cancel = () => {
    setAsk(null)
    setView(shown.current === ask?.id ? null : shown.current)
  }
  const pay = () => {
    if (!ask) return
    if (walletActions.spend(ask.id)) toast(`הכלי נפתח. נשארו ${creditsText(walletActions.get().credits)}`)
    setAsk(null)
  }
  const compare = () => {
    setAsk(null)
    setView(null)
    navigate('/upgrade')
  }

  return (
    <>
      <BetaLab view={allowed ? view : shown.current} setView={setView} />
      <Modal
        open={!!ask}
        onClose={cancel}
        title={ask?.kind === 'pay' ? 'פתיחה בקרדיטים' : ask?.kind === 'empty' ? 'לא נשארו קרדיטים' : 'המכסה החודשית נוצלה'}
        subtitle={ask?.kind === 'quota' ? undefined : 'חיוב דמו בלבד. אין סליקה ואין חיוב אמיתי.'}
      >
        {ask && item && (
          <div className="modal-body tl-ask" data-kind={ask.kind}>
            <div className="tl-tool">
              <span>
                <item.icon />
              </span>
              <div>
                <b>{item.title}</b>
                <small>{item.tagline}</small>
              </div>
            </div>

            {ask.kind === 'pay' && (
              <>
                <dl className="tl-sum">
                  <div>
                    <dt>עלות השימוש</dt>
                    <dd className="num">{creditsText(cost)}</dd>
                  </div>
                  <div>
                    <dt>היתרה שלכם</dt>
                    <dd className="num">
                      {w.credits} <ArrowLeft aria-label="תרד ל" /> {w.credits - cost}
                    </dd>
                  </div>
                  <div>
                    <dt>מחיר קרדיט</dt>
                    <dd>{PRICE_TBD}</dd>
                  </div>
                </dl>
                {ask.id === 'urgent' && <p className="tl-hint">הבקשה הבוערת החינמית של החודש כבר נוצלה.</p>}
                <button className="btn btn-gold btn-lg tl-go" onClick={pay}>
                  <LockOpen /> פתח בקרדיטים
                </button>
                <button className="tl-alt" onClick={compare}>
                  <BadgeCheck /> במשרד זה כלול. להשוואת המסלולים
                </button>
              </>
            )}

            {ask.kind === 'empty' && (
              <>
                <p className="tl-lead">
                  הכלי עולה <b className="num">{creditsText(cost)}</b>, ונשארו לכם <b className="num">{w.credits}</b>.
                </p>
                <p className="tl-hint">חברי המשרד מקבלים את כל הכלים המתקדמים בלי קרדיטים, בתוך מכסה חודשית.</p>
                <button className="btn btn-gold btn-lg tl-go" onClick={compare}>
                  להשוואת המסלולים ולשדרוג למשרד <ArrowLeft />
                </button>
                <button
                  className="tl-alt"
                  onClick={() => {
                    walletActions.refill()
                    setAsk(null)
                    setView(shown.current)
                    toast('יתרת הדמו חזרה ל-12 קרדיטים')
                  }}
                >
                  <Gift /> בדמו: להחזיר את היתרה להתחלה
                </button>
              </>
            )}

            {ask.kind === 'quota' && (
              <>
                <p className="tl-lead">
                  ניצלתם <b className="num">{QUOTA}</b> מתוך <b className="num">{QUOTA}</b> שימושים החודש.
                </p>
                <p className="tl-hint">המכסה מתחדשת בתחילת החודש הבא. הכלים שכבר פתחתם החודש נשארים פתוחים.</p>
                <button className="btn btn-gold btn-lg tl-go" onClick={cancel}>
                  הבנתי
                </button>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}

/** The mark on a tool's tile: which layer it belongs to, for whoever is looking. */
export function LabChip({ id }: { id: string }) {
  const { isOffice } = useMember()
  const w = useWallet()
  if (!isPaid(id))
    return (
      <em className="bl-chip tl-chip is-free">
        <Check /> חינם בקהילה
      </em>
    )
  if (isOffice)
    return (
      <em className="bl-chip tl-chip is-office">
        <BadgeCheck /> כלול במשרד
      </em>
    )
  if (w.opened.includes(id))
    return (
      <em className="bl-chip tl-chip is-open">
        <LockOpen /> פתוח
      </em>
    )
  if (id === 'urgent' && !w.urgentFreeUsed)
    return (
      <em className="bl-chip tl-chip is-free">
        <Gift /> 1 חינם בחודש
      </em>
    )
  return (
    <em className="bl-chip tl-chip is-credits">
      <Coins /> פתח בקרדיטים · {TOOLS[id].cost}
    </em>
  )
}

/** The same, in words, at the top of an open tool. */
export function LabBadge({ id }: { id: string }) {
  const { isOffice } = useMember()
  if (!isPaid(id)) return <em>חינם בקהילה</em>
  if (isOffice) return <em>כלול במשרד, במכסה החודשית</em>
  return <em>נפתח בקרדיטים</em>
}
