import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, Search, Sparkles } from 'lucide-react'
import { initials } from '../config/initials'
import { typeOf } from './clients'
import type { Client } from './clients'

/**
 * Picking a client of the CRM inside a window (24.11.2026): one tap on a row, like picking a friend on a phone. The
 * first row is "+ לקוח חדש", which opens the CRM's own new client form and comes back here with the new client picked.
 * Once a client is picked the list folds to that one row, with "החלפה" to open it again.
 * Where the pick is for a WhatsApp message (`needPhone`, 26.11.2026), a client with no phone cannot be picked: the row
 * is grey, says "חסר טלפון", and has a small "הוסף טלפון" that asks for the number and keeps it on the client's card.
 */
export default function ClientPicker({
  clients,
  value,
  onChange,
  onNew,
  fits,
  label,
  needPhone = false,
  onAddPhone,
}: {
  clients: Client[]
  value: string | null
  onChange: (id: string) => void
  onNew: () => void
  /** why a client fits (a word on the row), or null; the ones that fit come first */
  fits?: (cl: Client) => string | null
  label: string
  /** the pick is for a message to the client's phone: one without a phone is shown, but cannot be picked */
  needPhone?: boolean
  /** "הוסף טלפון" on such a row */
  onAddPhone?: (cl: Client) => void
}) {
  const [open, setOpen] = useState(!value)
  const [q, setQ] = useState('')
  // a client picked from outside (the window opened for one, or a new one was just added) folds the list
  useEffect(() => {
    if (value) setOpen(false)
  }, [value])
  const picked = clients.find((c) => c.id === value) ?? null
  const rows = useMemo(() => {
    const term = q.trim()
    const list = clients.filter((c) => !term || c.name.includes(term) || c.about.includes(term))
    const off = (c: Client) => Number(needPhone && !c.phone)
    // the ones that fit first, and the ones that cannot be picked last
    return [...list].sort((a, b) => off(a) - off(b) || (fits ? Number(!!fits(b)) - Number(!!fits(a)) : 0))
  }, [clients, q, fits, needPhone])

  if (picked && !open) {
    return (
      <div className="cp is-folded" data-picker="folded">
        <span className="cp-label">{label}</span>
        <div className="cp-row is-on" data-id={picked.id}>
          <Face cl={picked} on />
          <span className="cp-text">
            <b>{picked.name}</b>
            <small>{picked.about || typeOf(picked.type).one}</small>
          </span>
          <button type="button" className="cp-change" onClick={() => setOpen(true)} data-act="change-client">
            החלפה
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="cp" data-picker="open">
      <span className="cp-label" id="cp-label">
        {label}
      </span>
      {clients.length > 5 && (
        <label className="cp-search">
          <Search aria-hidden />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם" aria-label="חיפוש לקוח לפי שם" />
        </label>
      )}
      <div className="cp-list" role="radiogroup" aria-labelledby="cp-label">
        <button type="button" className="cp-row is-new" onClick={onNew} data-act="picker-new-client">
          <i className="cp-face is-new" aria-hidden>
            <Plus />
          </i>
          <span className="cp-text">
            <b>+ לקוח חדש</b>
            <small>פותח את טופס הלקוח, וחוזר לכאן</small>
          </span>
        </button>
        {rows.map((cl) => {
          const on = cl.id === value
          const why = fits?.(cl) ?? null
          if (needPhone && !cl.phone)
            return (
              <div key={cl.id} className="cp-row is-off" data-id={cl.id} data-no-phone aria-disabled="true">
                <Face cl={cl} />
                <span className="cp-text">
                  <b>{cl.name}</b>
                  <small>{cl.about || typeOf(cl.type).one}</small>
                </span>
                <em className="cp-tag" data-tag="no-phone">
                  חסר טלפון
                </em>
                <button type="button" className="cp-add-phone" onClick={() => onAddPhone?.(cl)} aria-label={`הוסף טלפון ל${cl.name}`} data-act="add-phone-row">
                  הוסף טלפון
                </button>
              </div>
            )
          return (
            <button
              key={cl.id}
              type="button"
              role="radio"
              aria-checked={on}
              className={`cp-row${on ? ' is-on' : ''}`}
              data-id={cl.id}
              onClick={() => {
                onChange(cl.id)
                setOpen(false)
                setQ('')
              }}
            >
              <Face cl={cl} on={on} />
              <span className="cp-text">
                <b>{cl.name}</b>
                <small>{cl.about || typeOf(cl.type).one}</small>
              </span>
              {why && (
                <em className="cp-fit">
                  <Sparkles aria-hidden />
                  {why}
                </em>
              )}
            </button>
          )
        })}
        {rows.length === 0 && <p className="cp-empty">אין לקוח בשם הזה. אפשר להוסיף לקוח חדש.</p>}
      </div>
    </div>
  )
}

function Face({ cl, on }: { cl: Client; on?: boolean }) {
  return (
    <i className={`cp-face is-${cl.type}`} aria-hidden>
      {on ? <Check /> : <img src={initials(cl.name)} alt="" />}
    </i>
  )
}
