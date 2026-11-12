import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ClipboardPaste, Home, Info, MessageSquareText, Search, Send, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { CURRENT_BROKER_ID } from '../config'
import { brokerById, formatPriceShort } from '../data/demo'
import type { CommunityItem, CrmItem } from '../data/demo'
import { useStore } from '../store'
import { Modal } from '../components/ui'
import { greenUi } from './ui'
import type { GreenAsk } from './ui'
import { allExtras, knownCities, parseWhatsapp, sampleMessage, sampleRequest, titleOf } from './whatsapp'
import type { Parsed } from './whatsapp'
import { clientActions } from '../crm/clients'
import '../styles/green-actions.css'

/**
 * The pop-ups of the actions that work in the browser in the green version: a new CRM card, sharing a post with
 * the community, and "מוואטסאפ למערכת". Everything stays in this browser; nothing is sent anywhere.
 */
type Draft = { kind: 'property' | 'request'; city: string; rooms: string; price: string; extras: string[] }
const emptyDraft: Draft = { kind: 'property', city: 'פתח תקווה', rooms: '4', price: '', extras: [] }
const toDraft = (p: Parsed): Draft => ({ kind: p.kind, city: p.city || 'פתח תקווה', rooms: p.rooms ? String(p.rooms) : '', price: p.price ? String(p.price) : '', extras: p.extras })
const num = (s: string) => Number(s.replace(/[^\d.]/g, '')) || 0

/** The fields a property or a request is made of; shared by the CRM card and the WhatsApp confirmation. */
function Fields({ draft, set, kinds }: { draft: Draft; set: (d: Partial<Draft>) => void; kinds: [string, string] }) {
  return (
    <div className="ga-fields">
      <div className="field">
        <span className="field-label">מה זה?</span>
        <div className="chip-row">
          <button type="button" className="chip" aria-pressed={draft.kind === 'property'} onClick={() => set({ kind: 'property' })}>
            <Home /> {kinds[0]}
          </button>
          <button type="button" className="chip" aria-pressed={draft.kind === 'request'} onClick={() => set({ kind: 'request' })}>
            <Search /> {kinds[1]}
          </button>
        </div>
      </div>
      <div className="ga-row">
        <label className="field">
          <span className="field-label">עיר</span>
          <select className="input" value={draft.city} onChange={(e) => set({ city: e.target.value })}>
            {knownCities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">חדרים</span>
          <input className="input" inputMode="decimal" value={draft.rooms} onChange={(e) => set({ rooms: e.target.value })} placeholder="4" />
        </label>
        <label className="field">
          <span className="field-label">{draft.kind === 'property' ? 'מחיר, בשקלים' : 'תקציב, בשקלים'}</span>
          <input className="input" inputMode="numeric" value={draft.price} onChange={(e) => set({ price: e.target.value })} placeholder="2650000" />
        </label>
      </div>
      <div className="field">
        <span className="field-label">תוספות</span>
        <div className="chip-row">
          {allExtras.map((x) => (
            <button
              key={x}
              type="button"
              className="chip"
              aria-pressed={draft.extras.includes(x)}
              onClick={() => set({ extras: draft.extras.includes(x) ? draft.extras.filter((e) => e !== x) : [...draft.extras, x] })}
            >
              {x}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function GreenActions() {
  const { addCrm, addItem, toast } = useStore()
  const navigate = useNavigate()
  const me = brokerById(CURRENT_BROKER_ID)
  const [ask, setAsk] = useState<GreenAsk | null>(null)
  useEffect(() => greenUi.bind(setAsk), [])
  // one stable function: the pop-up puts the focus back on itself whenever this changes, which would pull the
  // cursor out of a text box on every keystroke
  const close = useCallback(() => setAsk(null), [])

  // ---- a new CRM card
  const [card, setCard] = useState<Draft>(emptyDraft)
  const [client, setClient] = useState('')
  const [paste, setPaste] = useState('')
  const [pasting, setPasting] = useState(false)
  // ---- a message from WhatsApp
  const [wa, setWa] = useState('')
  const [waDraft, setWaDraft] = useState<Draft | null>(null)
  const [waPhone, setWaPhone] = useState(false)
  // ---- sharing a post
  const [words, setWords] = useState('')

  useEffect(() => {
    if (!ask) return
    setCard(emptyDraft)
    setClient('')
    setPaste('')
    setPasting(false)
    setWa('')
    setWaDraft(null)
    setWaPhone(false)
    setWords('')
  }, [ask])

  const saveCard = () => {
    const rooms = num(card.rooms)
    const item: CrmItem = {
      id: `n${Date.now()}`,
      kind: card.kind === 'property' ? 'property' : 'client',
      title: titleOf(card.kind, rooms || null, card.city),
      area: card.city,
      city: card.city,
      rooms: card.rooms || '-',
      price: num(card.price),
      status: 'new',
      client: client.trim() || (card.kind === 'property' ? 'בעל הנכס' : 'לקוח חדש'),
      note: card.extras.join(', '),
      updated: 'נוסף עכשיו',
      search: card.kind === 'request' ? { cities: [card.city], roomsMin: Math.floor(rooms) || 1, roomsMax: Math.ceil(rooms) || 6, budget: num(card.price), wants: card.extras } : undefined,
    }
    addCrm(item)
    // a client who is looking also joins the clients table (the board holds properties only)
    if (item.kind === 'client') clientActions.add({ name: item.client, type: 'buyer', phone: '', about: item.title, cities: [item.city], rooms: Math.round(rooms) || 0, sum: item.price, crmId: item.id })
    close()
    toast(item.kind === 'client' ? 'הלקוח נוסף לטבלת הלקוחות' : 'הכרטיס נוסף לעמודה "חדש"')
  }

  const publishWa = () => {
    if (!waDraft) return
    const rooms = num(waDraft.rooms)
    const price = num(waDraft.price)
    const id = `w${Date.now()}`
    const base = { id, authorId: me.id, city: waDraft.city, time: 'עכשיו', likes: 0, comments: [], fresh: true }
    const item: CommunityItem =
      waDraft.kind === 'property'
        ? {
            ...base,
            topicId: 'coop',
            title: titleOf('property', rooms || null, waDraft.city),
            body: waDraft.extras.length ? `${waDraft.extras.join(', ')}.` : 'פרטים נוספים אצלי.',
            property: { area: waDraft.city, rooms: waDraft.rooms || '-', price, split: 'חלוקת עמלה שווה', showPrice: price > 0 },
          }
        : {
            ...base,
            topicId: 'seeking',
            title: titleOf('request', rooms || null, waDraft.city),
            body: waDraft.extras.length ? `חשוב לקונה: ${waDraft.extras.join(', ')}.` : 'פרטים נוספים אצלי.',
            search: { cities: [waDraft.city], roomsMin: Math.floor(rooms) || 1, roomsMax: Math.ceil(rooms) || 6, budget: price, wants: waDraft.extras },
          }
    addItem(item)
    close()
    greenUi.published()
    toast(waDraft.kind === 'property' ? 'הנכס פורסם בקהילה' : 'הבקשה פורסמה בקהילה')
    navigate(`/app/community?topic=${item.topicId}&item=${id}`)
  }

  const share = () => {
    if (ask?.kind !== 'share') return
    const src = ask.item
    const from = brokerById(src.authorId).name
    const id = `s${Date.now()}`
    addItem({ ...src, id, authorId: me.id, time: 'עכשיו', likes: 0, comments: [], fresh: true, sourceId: undefined, body: `${words.trim() ? `${words.trim()} ` : ''}(שיתוף של פוסט מאת ${from}) ${src.body}` })
    close()
    toast('השיתוף פורסם בקהילה')
    window.setTimeout(() => document.getElementById(`ci-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 350)
  }

  const shared = ask?.kind === 'share' ? ask.item : null
  return (
    <>
      {/* ------------------------------------------------------------ a new CRM card */}
      <Modal open={ask?.kind === 'card'} onClose={close} title="כרטיס חדש ב-CRM" subtitle="נשמר בדמו, בדפדפן הזה בלבד.">
        <div className="modal-body ga">
          {pasting ? (
            <div className="ga-paste">
              <label className="field">
                <span className="field-label">הודעה שהועתקה מוואטסאפ</span>
                <textarea className="textarea" rows={4} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="מדביקים כאן את ההודעה" />
              </label>
              <div className="ga-paste-row">
                <button type="button" className="tl-alt" onClick={() => setPaste(sampleMessage)}>
                  <Sparkles /> הודעה לדוגמה
                </button>
                <button
                  type="button"
                  className="btn btn-gold btn-sm"
                  disabled={!paste.trim()}
                  onClick={() => {
                    setCard(toDraft(parseWhatsapp(paste)))
                    setPasting(false)
                    toast('הפרטים מולאו מההודעה. בדקו ושמרו')
                  }}
                >
                  למלא מההודעה
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="ga-from-wa" onClick={() => setPasting(true)}>
              <ClipboardPaste /> למלא מהודעת וואטסאפ
            </button>
          )}
          <Fields draft={card} set={(d) => setCard((c) => ({ ...c, ...d }))} kinds={['נכס', 'לקוח שמחפש']} />
          <label className="field">
            <span className="field-label">{card.kind === 'property' ? 'שם בעל הנכס' : 'שם הלקוח'} (נשאר אצלכם, לא מתפרסם)</span>
            <input className="input" value={client} onChange={(e) => setClient(e.target.value)} placeholder="לדוגמה: משפחת כהן" />
          </label>
          <button type="button" className="btn btn-gold btn-lg ga-go" onClick={saveCard}>
            הוספה ל-CRM <ArrowLeft />
          </button>
        </div>
      </Modal>

      {/* ------------------------------------------------------------ from WhatsApp to the system */}
      <Modal open={ask?.kind === 'whatsapp'} onClose={close} title="מוואטסאפ למערכת" subtitle={waDraft ? 'בודקים, מתקנים ומאשרים לפני הפרסום.' : 'מדביקים הודעה מקבוצה, ומקבלים נכס או בקשה מסודרים.'}>
        <div className="modal-body ga">
          {!waDraft ? (
            <>
              <label className="field">
                <span className="field-label">ההודעה</span>
                <textarea className="textarea" rows={5} value={wa} onChange={(e) => setWa(e.target.value)} placeholder="מעתיקים הודעה מקבוצת וואטסאפ ומדביקים כאן" autoFocus />
              </label>
              <div className="ga-samples">
                <span>אין הודעה בהישג יד?</span>
                <button type="button" className="tl-alt" onClick={() => setWa(sampleMessage)}>
                  <Home /> נכס לדוגמה
                </button>
                <button type="button" className="tl-alt" onClick={() => setWa(sampleRequest)}>
                  <Search /> בקשה לדוגמה
                </button>
              </div>
              <button
                type="button"
                className="btn btn-gold btn-lg ga-go"
                disabled={!wa.trim()}
                onClick={() => {
                  const p = parseWhatsapp(wa)
                  setWaPhone(p.hadPhone)
                  setWaDraft(toDraft(p))
                }}
              >
                <MessageSquareText /> לסדר את ההודעה
              </button>
              <p className="ga-note">
                <Info /> הדבקה ידנית בלבד. אין חיבור לוואטסאפ, ושום דבר לא נשלח.
              </p>
            </>
          ) : (
            <>
              <div className="ga-found">
                <Sparkles />
                <div>
                  <b>{waDraft.kind === 'property' ? 'זיהינו נכס' : 'זיהינו בקשת חיפוש'}</b>
                  <small>
                    {titleOf(waDraft.kind, num(waDraft.rooms) || null, waDraft.city)}
                    {num(waDraft.price) > 0 && `, ${waDraft.kind === 'property' ? '' : 'עד '}${formatPriceShort(num(waDraft.price))}`}
                  </small>
                </div>
              </div>
              <Fields draft={waDraft} set={(d) => setWaDraft((c) => (c ? { ...c, ...d } : c))} kinds={['נכס לשיתוף פעולה', 'מחפש לקונה']} />
              <p className="ga-privacy">
                <ShieldCheck /> {waPhone ? 'מצאנו מספר טלפון בהודעה, והוא לא יתפרסם. ' : ''}שמות ומספרי טלפון של לקוחות לא מתפרסמים בקהילה.
              </p>
              <div className="ga-actions">
                <button type="button" className="btn btn-ghost btn-lg" onClick={() => setWaDraft(null)}>
                  חזרה להודעה
                </button>
                <button type="button" className="btn btn-gold btn-lg" onClick={publishWa}>
                  <Send /> אישור ופרסום בקהילה
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ------------------------------------------------------------ sharing a post */}
      <Modal open={!!shared} onClose={close} title="שיתוף עם הקהילה" subtitle="הפוסט יופיע בפיד בשמכם.">
        {shared && (
          <div className="modal-body ga">
            <label className="field">
              <span className="field-label">רוצים להוסיף משהו? (לא חובה)</span>
              <textarea className="textarea" rows={3} value={words} onChange={(e) => setWords(e.target.value)} placeholder="כמה מילים משלכם" autoFocus />
            </label>
            <div className="ga-quote">
              <span>
                <UserRound />
              </span>
              <div>
                <b>{brokerById(shared.authorId).name}</b>
                <p>{shared.title ?? shared.body}</p>
              </div>
            </div>
            <button type="button" className="btn btn-gold btn-lg ga-go" onClick={share}>
              <Send /> שיתוף בקהילה
            </button>
          </div>
        )}
      </Modal>
    </>
  )
}

/** In the lab, the free WhatsApp tool has a real button: it opens the paste pop-up. */
export function LabAction({ id }: { id: string }) {
  if (id !== 'whatsapp') return null
  return (
    <button type="button" className="ga-lab" onClick={() => greenUi.open({ kind: 'whatsapp' })}>
      <ClipboardPaste /> לנסות עכשיו: להדביק הודעה
    </button>
  )
}
