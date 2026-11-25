import { useCallback, useEffect, useMemo, useState } from 'react'
import { LoaderCircle, Phone, X } from 'lucide-react'
import { call } from './session'
import '../styles/leads.css'

/**
 * "לידים נכנסים" in the admin (24.11.2026): everyone who asked for details on the office page, newest first. Each card
 * has the date, the name, a phone to call, the city and the note, and three states: חדש, בטיפול, נסגר. The server
 * gives this list to signed-in staff only; nothing of it is shown anywhere public.
 */
export type Lead = { id: string; name: string; phone: string; city: string; note: string; status: LeadStatus; created_at: number; updated_at: number | null; updated_by: string | null }
type LeadStatus = 'new' | 'working' | 'closed'
const STATUS: { id: LeadStatus; label: string }[] = [
  { id: 'new', label: 'חדש' },
  { id: 'working', label: 'בטיפול' },
  { id: 'closed', label: 'נסגר' },
]
const when = (ms: number) => new Date(ms).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const telOf = (phone: string) => phone.replace(/[^\d+]/g, '')

export default function LeadsPanel({ onCount }: { onCount?: (fresh: number) => void }) {
  const [leads, setLeads] = useState<Lead[] | null>(null)
  // the one address the server sends every lead's e-mail to (its setting LEADS_TO), '' when none is set
  const [mailTo, setMailTo] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | LeadStatus>('all')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    const r = await call<{ leads: Lead[]; mail_to: string }>('/api/admin/leads')
    if (!r.ok) return setError(r.data.error ?? 'לא הצלחנו לטעון את הלידים.')
    setError('')
    setLeads(r.data.leads)
    setMailTo(r.data.mail_to ?? '')
  }, [])
  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    if (leads) onCount?.(leads.filter((l) => l.status === 'new').length)
  }, [leads, onCount])

  const setStatus = async (lead: Lead, status: LeadStatus) => {
    if (lead.status === status) return
    setBusy(lead.id)
    // the card moves at once; a failure puts it back
    setLeads((list) => list?.map((l) => (l.id === lead.id ? { ...l, status } : l)) ?? null)
    const r = await call(`/api/admin/leads/${lead.id}/status`, { method: 'POST', body: { status } })
    setBusy('')
    if (!r.ok) {
      setLeads((list) => list?.map((l) => (l.id === lead.id ? { ...l, status: lead.status } : l)) ?? null)
      setError(r.data.error ?? 'לא הצלחנו לעדכן את הסטטוס.')
    }
  }

  const count = useMemo(() => {
    const c = { all: leads?.length ?? 0, new: 0, working: 0, closed: 0 }
    for (const l of leads ?? []) c[l.status]++
    return c
  }, [leads])
  const shown = (leads ?? []).filter((l) => filter === 'all' || l.status === filter)

  return (
    <section id="dk-leads" className="dk-section" aria-label="לידים נכנסים" data-panel="leads">
      <p className="lds-mode" data-mail-mode={mailTo ? 'set' : 'none'}>
        {mailTo ? (
          <>
            על כל ליד חדש נשלח מייל אל <bdi dir="ltr">{mailTo}</bdi>.
          </>
        ) : (
          'לא הוגדרה כתובת למיילים של הלידים. הלידים נשמרים כאן, ומייל לא נשלח.'
        )}
      </p>
      <div className="lds-filter" role="group" aria-label="סינון לפי סטטוס">
        {([{ id: 'all', label: 'הכול' }, ...STATUS] as { id: 'all' | LeadStatus; label: string }[]).map((f) => (
          <button key={f.id} type="button" className="lds-chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} data-filter={f.id}>
            {f.label} <b className="num">{count[f.id]}</b>
          </button>
        ))}
      </div>
      {error && (
        <p className="au-fail" role="alert">
          <X /> {error}
        </p>
      )}
      {leads === null ? (
        <p className="dk-none">
          <LoaderCircle className="au-spin" /> טוענים...
        </p>
      ) : shown.length === 0 ? (
        <p className="lds-empty" data-empty>
          {leads.length === 0 ? 'עוד לא הגיעו לידים. כשמישהו ישאיר פרטים בדף ההצטרפות למשרד, הוא יופיע כאן.' : 'אין לידים בסטטוס הזה.'}
        </p>
      ) : (
        <ul className="lds-list">
          {shown.map((l) => (
            <li key={l.id} className="lds-card" data-lead={l.id} data-status={l.status}>
              <div className="lds-head">
                <span className="lds-face" aria-hidden>
                  {l.name.trim().charAt(0)}
                </span>
                <span className="lds-who">
                  <b data-lead-name>{l.name}</b>
                  <small>
                    <span data-lead-city>{l.city}</span> · <span className="num">{when(l.created_at)}</span>
                  </small>
                </span>
                <a className="lds-call num" href={`tel:${telOf(l.phone)}`} data-lead-phone dir="ltr">
                  <Phone aria-hidden /> {l.phone}
                </a>
              </div>
              {l.note && <p className="lds-note">{l.note}</p>}
              <div className="lds-status" role="group" aria-label={`הסטטוס של ${l.name}`}>
                {STATUS.map((s) => (
                  <button key={s.id} type="button" aria-pressed={l.status === s.id} data-v={s.id} disabled={busy === l.id} onClick={() => setStatus(l, s.id)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
