import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Coins, Gift } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useStore } from '../store'
import { useMember } from '../config/member'
import { PAID_IDS, QUOTA, TOOLS, creditsText, useWallet, walletActions } from '../config/tiers'
import { PRICE_TBD } from '../config/office'
import { Modal } from './ui'
import { labItems } from './BetaLab'
import MemberSwitch from './MemberSwitch'
import '../styles/tiers.css'

/**
 * The top bar of the app in the green version: the demo's view switch, and next to it what that member has.
 * A community member has a wallet of credits; an office member has a monthly quota that covers every advanced tool.
 */
export default function MemberBar() {
  const { isOffice } = useMember()
  const w = useWallet()
  const { toast } = useStore()
  const [open, setOpen] = useState(false)
  const paid = labItems.filter((x) => PAID_IDS.includes(x.id))

  return (
    <div className="mb">
      {isOffice ? (
        <button type="button" className="mb-chip is-quota" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`מכסה חודשית: ${w.quotaUsed} מתוך ${QUOTA}`}>
          <i className="mb-ring" style={{ '--p': w.quotaUsed / QUOTA } as CSSProperties} aria-hidden />
          <b className="num">
            {w.quotaUsed}/{QUOTA}
          </b>
          <span>החודש</span>
        </button>
      ) : (
        <button type="button" className="mb-chip is-wallet" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`ארנק קרדיטים: ${w.credits}`}>
          <Coins />
          <b className="num">{w.credits}</b>
          <span>קרדיטים</span>
        </button>
      )}
      <MemberSwitch />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={isOffice ? 'המכסה החודשית שלכם' : 'ארנק הקרדיטים'}
        subtitle={isOffice ? 'כל הכלים המתקדמים כלולים בחברות במשרד.' : 'כלים מתקדמים לפי שימוש, בלי להצטרף למשרד. נתוני דמו.'}
      >
        <div className="modal-body mb-sheet">
          {isOffice ? (
            <>
              <div className="mb-big">
                <i className="mb-ring is-lg" style={{ '--p': w.quotaUsed / QUOTA } as CSSProperties} aria-hidden />
                <div>
                  <b className="num">
                    {w.quotaUsed}/{QUOTA}
                  </b>
                  <small>שימושים החודש</small>
                </div>
              </div>
              <ul className="mb-list">
                {paid.map((x) => (
                  <li key={x.id} className={w.openedOffice.includes(x.id) ? 'is-on' : ''}>
                    <x.icon />
                    <span>{x.title}</span>
                    <em>{w.openedOffice.includes(x.id) ? 'נפתח החודש' : 'כלול'}</em>
                  </li>
                ))}
              </ul>
              <p className="mb-note">המכסה מתחדשת בתחילת כל חודש. בדמו אין חיוב אמיתי.</p>
            </>
          ) : (
            <>
              <div className="mb-big">
                <span className="mb-coin">
                  <Coins />
                </span>
                <div>
                  <b className="num">{w.credits}</b>
                  <small>קרדיטים בארנק. מחיר קרדיט: {PRICE_TBD}</small>
                </div>
              </div>
              <ul className="mb-list">
                {paid.map((x) => (
                  <li key={x.id} className={w.opened.includes(x.id) ? 'is-on' : ''}>
                    <x.icon />
                    <span>{x.title}</span>
                    <em>{w.opened.includes(x.id) ? 'פתוח' : x.id === 'urgent' && !w.urgentFreeUsed ? '1 חינם בחודש' : creditsText(TOOLS[x.id].cost)}</em>
                  </li>
                ))}
              </ul>
              <Link to="/upgrade" className="btn btn-gold btn-lg mb-cta" onClick={() => setOpen(false)}>
                <BadgeCheck /> במשרד הכול כלול. להשוואה <ArrowLeft />
              </Link>
              <button
                type="button"
                className="tl-alt"
                onClick={() => {
                  walletActions.refill()
                  toast('יתרת הדמו חזרה ל-12 קרדיטים')
                }}
              >
                <Gift /> בדמו: להחזיר את היתרה להתחלה
              </button>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
