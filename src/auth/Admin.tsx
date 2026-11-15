import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, FlaskConical, LoaderCircle, LogOut, MailWarning, RefreshCw, Trash2, UserPlus, X } from 'lucide-react'
import { COMMUNITY_HOME, COMMUNITY_NAME } from '../config/community'
import { Modal } from '../components/ui'
import CommunityBrand from '../community/CommunityBrand'
import { call, session, sessionActions } from './session'
import type { MemberInfo } from './session'
import '../styles/join-green.css'
import '../styles/auth.css'
import '../styles/admin.css'

/**
 * The approvers' screen: the requests that wait, the ones that were approved and the ones that were rejected, with a
 * yes or a no from here too; a test registrant, to try the whole way through; and the list of approvers.
 * Brokers' details come from the server only to a signed-in member of staff.
 */
type Mail = { to_email: string; kind: string; status: string; error: string; created_at: number }
type Staff = { email: string; name: string; approver: boolean }
type Tab = 'pending' | 'approved' | 'rejected'
const TABS: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'ממתינות' },
  { id: 'approved', label: 'מאושרות' },
  { id: 'rejected', label: 'נדחו' },
]
const when = (ms: number | null) => (ms ? new Date(ms).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')
const mailWords: Record<string, string> = { sent: 'נשלח', no_password: 'לא נשלח: חסרה סיסמת האפליקציה', failed: 'השליחה נכשלה', test: 'מצב בדיקה' }
const kindWords: Record<string, string> = { approval: 'בקשת אישור', welcome: 'ברוכים הבאים', reject: 'דחייה', login: 'קישור כניסה' }

export default function Admin() {
  const staff = session?.staff ?? null
  const [members, setMembers] = useState<MemberInfo[] | null>(null)
  const [mail, setMail] = useState<Mail[]>([])
  const [mailReady, setMailReady] = useState(true)
  const [team, setTeam] = useState<Staff[]>([])
  const [tab, setTab] = useState<Tab>('pending')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')
  const [rejecting, setRejecting] = useState<MemberInfo | null>(null)
  const [reason, setReason] = useState('')
  const [testName, setTestName] = useState('')
  const [testEmail, setTestEmail] = useState(staff?.email ?? '')
  const [toAll, setToAll] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')

  const load = useCallback(async () => {
    const r = await call<{ members: MemberInfo[]; mail: Mail[]; mailReady: boolean }>('/api/admin/members')
    if (r.status === 401 || r.status === 403) return sessionActions.signOut('/kehila/login')
    if (!r.ok) return setError(r.data.error ?? 'לא הצלחנו לטעון את הבקשות.')
    setError('')
    setMembers(r.data.members)
    setMail(r.data.mail)
    setMailReady(r.data.mailReady)
    const t = await call<{ staff: Staff[] }>('/api/admin/staff')
    if (t.ok) setTeam(t.data.staff)
  }, [])

  useEffect(() => {
    const prev = document.title
    document.title = `מסך הניהול | ${COMMUNITY_NAME}`
    if (staff) load()
    return () => {
      document.title = prev
    }
  }, [staff, load])
  const closeReject = useCallback(() => setRejecting(null), [])

  if (!staff) {
    return (
      <div className="au">
        <header className="jc-top">
          <Link to={COMMUNITY_HOME} className="kh-brand" aria-label={COMMUNITY_NAME}>
            <CommunityBrand />
          </Link>
        </header>
        <main className="au-main is-narrow">
          <section className="au-card au-wait" data-state="admin-locked">
            <h1>מסך הניהול פתוח למאשרים בלבד</h1>
            <p className="au-lead">נכנסים עם קישור שנשלח למייל של מאשר.</p>
            <div className="au-actions">
              <Link to="/kehila/login" className="btn btn-gold btn-lg">
                כניסה
              </Link>
            </div>
          </section>
        </main>
      </div>
    )
  }

  const act = async (key: string, run: () => Promise<{ ok: boolean; data: { error?: string } }>, done: string) => {
    setBusy(key)
    setNote('')
    setError('')
    const r = await run()
    setBusy('')
    if (!r.ok) setError(r.data.error ?? 'הפעולה לא הצליחה.')
    else setNote(done)
    await load()
    return r.ok
  }
  const approve = (m: MemberInfo) => act(`ok-${m.id}`, () => call(`/api/admin/members/${m.id}/approve`, { method: 'POST' }), `${m.name} אושר, ונשלח אליו מייל "ברוכים הבאים".`)
  const reject = async (e: FormEvent) => {
    e.preventDefault()
    if (!rejecting) return
    const m = rejecting
    const ok = await act(`no-${m.id}`, () => call(`/api/admin/members/${m.id}/reject`, { method: 'POST', body: { reason } }), `הבקשה של ${m.name} נדחתה, ונשלח אליו מייל עם הסיבה.`)
    if (ok) {
      setRejecting(null)
      setReason('')
    }
  }
  const makeTest = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await act('test', () => call('/api/admin/test', { method: 'POST', body: { name: testName, email: testEmail, to_all: toAll } }), toAll ? 'נרשם הבדיקה נוצר, ומייל האישור נשלח לכל המאשרים.' : `נרשם הבדיקה נוצר, ומייל האישור נשלח אליך בלבד (${staff.email}).`)
    if (ok) {
      setTestName('')
      setTab('pending')
    }
  }
  const addStaff = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await act('staff', () => call('/api/admin/staff', { method: 'POST', body: { name: newName, email: newEmail } }), `${newName} נוסף לרשימת המאשרים, ויקבל את בקשות האישור הבאות.`)
    if (ok) {
      setNewName('')
      setNewEmail('')
    }
  }

  const shown = (members ?? []).filter((m) => m.status === tab)
  const count = (t: Tab) => (members ?? []).filter((m) => m.status === t).length

  return (
    <div className="au ad">
      <header className="jc-top">
        <Link to={COMMUNITY_HOME} className="kh-brand" aria-label={COMMUNITY_NAME}>
          <CommunityBrand />
        </Link>
        <div className="jc-top-end">
          <span className="ad-me">{staff.name}</span>
          <button type="button" className="ad-out" onClick={() => sessionActions.signOut()}>
            <LogOut /> יציאה
          </button>
        </div>
      </header>

      <main className="ad-main">
        <div className="ad-head">
          <span className="au-kicker">מסך הניהול</span>
          <h1>בקשות הצטרפות לקהילה</h1>
          <button type="button" className="btn btn-ghost" onClick={load} data-act="reload">
            <RefreshCw /> רענון
          </button>
        </div>

        {!mailReady && (
          <p className="ad-warn" data-warn="mail">
            <MailWarning /> המיילים עדיין לא נשלחים: חסרה סיסמת האפליקציה של Gmail בשרת. הבקשות נשמרות, ואפשר לאשר ולדחות מכאן, אבל אף מייל לא יוצא.
          </p>
        )}
        {error && (
          <p className="au-fail" role="alert">
            <X /> {error}
          </p>
        )}
        {note && (
          <p className="ad-note" role="status">
            <Check /> {note}
          </p>
        )}

        <div className="ad-tabs" role="tablist" aria-label="מצב הבקשה">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} data-tab={t.id} onClick={() => setTab(t.id)}>
              {t.label}
              <b className="num">{count(t.id)}</b>
            </button>
          ))}
        </div>

        {members === null ? (
          <p className="ad-empty">
            <LoaderCircle className="au-spin" /> טוענים...
          </p>
        ) : shown.length === 0 ? (
          <p className="ad-empty">{tab === 'pending' ? 'אין בקשות שממתינות לאישור.' : tab === 'approved' ? 'עוד לא אושרו מתווכים.' : 'לא נדחו בקשות.'}</p>
        ) : (
          <ul className="ad-list">
            {shown.map((m) => (
              <li key={m.id} className="ad-row" data-id={m.id} data-status={m.status}>
                <div className="ad-who">
                  <strong>
                    {m.name}
                    {m.is_test && <em className="ad-test">בדיקה</em>}
                  </strong>
                  <span>
                    <bdi dir="ltr">{m.phone}</bdi> · <bdi dir="ltr">{m.email}</bdi>
                  </span>
                </div>
                <dl className="ad-facts">
                  <div>
                    <dt>רישיון</dt>
                    <dd className="num">{m.license}</dd>
                  </div>
                  <div>
                    <dt>עובד</dt>
                    <dd>{m.work === 'office' ? `במשרד: ${m.office_name}` : 'עצמאי'}</dd>
                  </div>
                  <div>
                    <dt>ערים</dt>
                    <dd>{m.cities.join(', ')}</dd>
                  </div>
                  <div>
                    <dt>אזורים</dt>
                    <dd>{m.areas}</dd>
                  </div>
                  <div>
                    <dt>נשלחה</dt>
                    <dd className="num">{when(m.created_at)}</dd>
                  </div>
                  {m.status !== 'pending' && (
                    <div>
                      <dt>{m.status === 'approved' ? 'אושרה' : 'נדחתה'}</dt>
                      <dd>
                        <span className="num">{when(m.decided_at)}</span>
                        {m.decided_by ? `, על ידי ${m.decided_by}` : ''}
                      </dd>
                    </div>
                  )}
                  {m.status === 'rejected' && (
                    <div className="is-wide">
                      <dt>הסיבה</dt>
                      <dd>{m.reason}</dd>
                    </div>
                  )}
                </dl>
                <div className="ad-acts">
                  {m.status === 'pending' && (
                    <>
                      <button type="button" className="btn btn-gold" disabled={!!busy} data-act="approve" onClick={() => approve(m)}>
                        {busy === `ok-${m.id}` ? <LoaderCircle className="au-spin" /> : <Check />} כן, לאשר
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={!!busy}
                        data-act="reject"
                        onClick={() => {
                          setReason('')
                          setRejecting(m)
                        }}
                      >
                        <X /> לא
                      </button>
                      <button type="button" className="ad-quiet" disabled={!!busy} data-act="resend" onClick={() => act(`re-${m.id}`, () => call(`/api/admin/members/${m.id}/resend`, { method: 'POST' }), 'מייל האישור נשלח שוב למאשרים.')}>
                        שליחת מייל האישור שוב
                      </button>
                    </>
                  )}
                  {m.is_test && (
                    <button type="button" className="ad-quiet is-danger" disabled={!!busy} data-act="delete" onClick={() => act(`del-${m.id}`, () => call(`/api/admin/members/${m.id}`, { method: 'DELETE' }), 'נרשם הבדיקה נמחק.')}>
                      <Trash2 /> מחיקת נרשם הבדיקה
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="ad-side">
          <form className="ad-box" onSubmit={makeTest} data-box="test">
            <h2>
              <FlaskConical /> נרשם בדיקה
            </h2>
            <p>יוצר בקשה לדוגמה ושולח את מייל האישור, כדי לבדוק את כל התהליך: אישור או דחייה, המייל למתווך, והכניסה.</p>
            <label className="au-field">
              <span>שם</span>
              <input className="input" value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="למשל: בדיקה של איציק" data-f="test-name" required />
            </label>
            <label className="au-field">
              <span>המייל של הנרשם (אליו יגיע "ברוכים הבאים")</span>
              <input className="input ltr" type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} data-f="test-email" required />
            </label>
            <label className="ad-check">
              <input type="checkbox" checked={toAll} onChange={(e) => setToAll(e.target.checked)} data-f="test-all" />
              <span>לשלוח את מייל האישור לכל המאשרים (בלי הסימון הוא נשלח רק אליך)</span>
            </label>
            <button className="btn btn-gold" type="submit" disabled={!!busy} data-act="make-test">
              {busy === 'test' ? <LoaderCircle className="au-spin" /> : <FlaskConical />} יצירת נרשם בדיקה
            </button>
          </form>

          <div className="ad-box" data-box="staff">
            <h2>
              <UserPlus /> רשימת המאשרים
            </h2>
            <p>מי שברשימה מקבל את מיילי האישור ויכול להיכנס למסך הזה. זו הרשימה היחידה: מוסיפים כאן, וזה הכול.</p>
            <ul className="ad-team">
              {team.map((t) => (
                <li key={t.email}>
                  <span>
                    <b>{t.name}</b>
                    <bdi dir="ltr">{t.email}</bdi>
                  </span>
                  <em>{t.approver ? 'מאשר, מקבל מיילים' : 'מנהל, בלי מיילי אישור'}</em>
                  {t.email !== staff.email && (
                    <button type="button" className="ad-quiet is-danger" disabled={!!busy} aria-label={`הסרת ${t.name}`} onClick={() => act(`rm-${t.email}`, () => call(`/api/admin/staff?email=${encodeURIComponent(t.email)}`, { method: 'DELETE' }), `${t.name} הוסר מהרשימה.`)}>
                      <Trash2 />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <form className="ad-add" onSubmit={addStaff}>
              <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="שם, למשל: אריאל" aria-label="שם המאשר" data-f="staff-name" required />
              <input className="input ltr" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="mail@example.com" aria-label="המייל של המאשר" data-f="staff-email" required />
              <button className="btn btn-ghost" type="submit" disabled={!!busy} data-act="add-staff">
                <UserPlus /> הוספת מאשר
              </button>
            </form>
          </div>

          <div className="ad-box" data-box="mail">
            <h2>מיילים אחרונים</h2>
            {mail.length === 0 ? (
              <p>עוד לא נשלחו מיילים.</p>
            ) : (
              <ul className="ad-mail">
                {mail.map((x, i) => (
                  <li key={i} data-status={x.status}>
                    <span>
                      <b>{kindWords[x.kind] ?? x.kind}</b> אל <bdi dir="ltr">{x.to_email}</bdi>
                    </span>
                    <em>
                      {mailWords[x.status] ?? x.status}
                      {x.error ? `: ${x.error}` : ''}
                    </em>
                    <small className="num">{when(x.created_at)}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>

      <Modal open={!!rejecting} onClose={closeReject} title={rejecting ? `לא לאשר את ${rejecting.name}` : ''} subtitle="כותבים סיבה קצרה. המתווך יקבל מייל מנומס עם הסיבה הזו.">
        <form onSubmit={reject}>
          <div className="modal-body">
            <label className="au-field">
              <span>הסיבה</span>
              <textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={600} rows={4} placeholder="למשל: לא הצלחנו לאמת את מספר הרישיון" data-f="reason" required />
            </label>
          </div>
          <div className="modal-foot">
            <button className="btn btn-gold" type="submit" disabled={!!busy || reason.trim().length < 3} data-act="confirm-reject">
              שליחה ודחיית הבקשה
            </button>
            <button className="btn btn-quiet" type="button" onClick={closeReject}>
              ביטול
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
