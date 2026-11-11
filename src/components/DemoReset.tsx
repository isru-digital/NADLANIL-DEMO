import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { Modal } from './ui'
import { useStore } from '../store'
import { agentActions } from '../agent/useAgent'
import { memberActions } from '../config/member'
import { walletActions } from '../config/tiers'
import '../styles/demo-reset.css'

/**
 * A tab at the very top of every screen of the demo: it takes the whole demo back to its start (the join, the
 * member view, the built agent page and everything else the visitor changed) so it can be shown again from the
 * beginning. Demo only: the green entry leaves it out when VITE_DEMO_RESET is "false".
 */
export default function DemoReset() {
  const navigate = useNavigate()
  const { reset, toast } = useStore()
  const [open, setOpen] = useState(false)

  const restart = () => {
    reset()
    agentActions.reset()
    memberActions.reset()
    walletActions.reset()
    setOpen(false)
    navigate('/')
    window.scrollTo({ top: 0 })
    toast('הדמו התחיל מחדש')
  }

  return (
    <>
      <button type="button" className="dreset" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <RotateCcw />
        <span className="dreset-t">התחלה מחדש</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="להתחיל את הדמו מחדש?" subtitle="הכול חוזר למצב ההתחלה: ההצטרפות, תצוגת החבר והדף שנבנה.">
        <div className="modal-body dreset-body">
          <button className="btn btn-gold btn-lg" onClick={restart}>
            כן, מחדש
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => setOpen(false)}>
            ביטול
          </button>
        </div>
      </Modal>
    </>
  )
}
