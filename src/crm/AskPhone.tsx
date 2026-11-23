import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Lock } from 'lucide-react'
import { Modal } from '../components/ui'
import { clientActions } from './clients'
import type { Client } from './clients'
import '../styles/new-client.css'

/**
 * The phone of a client is not a must any more (Itzik 23.11.2026), so an action that really needs one asks for it
 * on the spot: a small window with one field, the number is kept on the client's card, and the action goes on as if
 * the number had been there all along. Nothing else about the client is touched.
 */
export function AskPhone({ open, client, what = 'לשלוח ללקוח', onClose, onReady }: { open: boolean; client: Client | null; what?: string; onClose: () => void; onReady: (phone: string) => void }) {
  const [phone, setPhone] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => {
    if (open) {
      setPhone('')
      setErr('')
    }
  }, [open])
  const save = (e: FormEvent) => {
    e.preventDefault()
    const typed = phone.trim()
    if (typed.replace(/\D/g, '').length < 9) return setErr('מספר הטלפון קצר מדי. למשל: 050-555-0199')
    if (client) clientActions.patch(client.id, { phone: typed })
    onClose()
    onReady(typed)
  }
  return (
    <Modal open={open && !!client} onClose={onClose} title={`להוסיף טלפון כדי ${what}?`} subtitle={client ? `${client.name} נשמר בלי טלפון. המספר יישמר בכרטיס שלו.` : ''}>
      <form onSubmit={save} noValidate>
        <div className="modal-body ct-new nc" data-ask-phone>
          <label className="ct-field">
            <span className="ct-label">טלפון</span>
            <input className="input ltr num" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" enterKeyHint="done" autoFocus data-f="ask-phone" />
          </label>
          <p className="nc-safe">
            <Lock aria-hidden />
            נשמר רק אצלך ב-CRM. אף מתווך בקהילה לא רואה אותו.
          </p>
          {err && (
            <em className="pf-err" role="alert" data-err="ask-phone">
              {err}
            </em>
          )}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose} data-act="ask-phone-cancel">
            לא עכשיו
          </button>
          <button type="submit" className="btn btn-gold" data-act="ask-phone-save">
            שמירה והמשך
          </button>
        </div>
      </form>
    </Modal>
  )
}
