import { useCallback, useEffect, useMemo, useState } from 'react'
import { BedDouble, Lock, MapPin, Ruler } from 'lucide-react'
import { asset } from '../config'
import { signedIn } from '../auth/session'
import { useMember } from '../config/member'
import { useStore } from '../store'
import { Modal } from '../components/ui'
import { WhatsAppIcon } from '../templates/LandingTemplate'
import type { CrmItem } from '../data/demo'
import ClientPicker from './ClientPicker'
import NewClient from './NewClient'
import { AskPhone } from './AskPhone'
import { clientActions, useClients } from './clients'
import type { Client } from './clients'
import { buyerLink, fromCard, messageFor, priceWords, waLink } from './sendProperty'
import type { SendProp } from './sendProperty'
import '../styles/referral.css'

/**
 * "שלח ללקוח בוואטסאפ" (24.11.2026): the property at the top, the buyer picked from the CRM, and the message as it will
 * look in WhatsApp (it can be changed). The green button opens the broker's own WhatsApp on that chat; the broker
 * sends it. The site sends nothing.
 */
export default function SendToBuyer({ prop, preset, onClose }: { prop: SendProp | null; preset?: string; onClose: () => void }) {
  const { isOffice } = useMember()
  const { toast } = useStore()
  const all = useClients()
  // keep the last property mounted while the window animates out
  const [last, setLast] = useState<SendProp | null>(prop)
  if (prop && prop !== last) setLast(prop)
  const p = prop ?? last
  const [pick, setPick] = useState<string | null>(preset ?? null)
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const [edited, setEdited] = useState(false)
  const closeAdd = useCallback(() => setAdding(false), [])
  // a client with no phone cannot be picked for a WhatsApp message (26.11.2026): "הוסף טלפון" on the row asks for it
  const [askFor, setAskFor] = useState<string | null>(null)
  const closeAsk = useCallback(() => setAskFor(null), [])

  // a property for sale goes to buyers, a rent to renters; the ones looking in its city first
  const side = p?.rent ? 'renter' : 'buyer'
  const people = useMemo(() => all.filter((c) => c.type === 'buyer' || c.type === 'renter'), [all])
  const fits = useCallback((cl: Client) => (p && cl.type === side && cl.cities.includes(p.city) ? `מחפש ב${p.city}` : null), [p, side])
  const picked = people.find((c) => c.id === pick) ?? null
  // only a client with a phone is really picked; one that came in without a phone waits, grey, in the list
  const client = picked?.phone ? picked : null
  const asking = people.find((c) => c.id === askFor) ?? null
  const link = p ? buyerLink(p, signedIn ? { name: signedIn.name } : undefined) : ''

  // a new window starts clean; the message follows the picked buyer until the broker writes in it
  useEffect(() => {
    if (!prop) return
    setPick(preset ?? null)
    setEdited(false)
  }, [prop, preset])
  useEffect(() => {
    if (p && !edited) setText(messageFor(p, client, link, signedIn?.name))
  }, [p, client, link, edited])

  if (!p) return null
  const open = () => {
    if (!client || !client.phone) return
    window.open(waLink(client.phone, text), '_blank', 'noopener')
    clientActions.patch(client.id, {})
    toast('וואטסאפ נפתח עם ההודעה. בודקים ושולחים בעצמכם.')
    onClose()
  }

  return (
    <>
      <Modal open={!!prop && !adding && !askFor} onClose={onClose} title="שליחה ללקוח בוואטסאפ" subtitle="בוחרים קונה, רואים את ההודעה, ושולחים מהוואטסאפ שלכם.">
        <div className="modal-body sh" data-sheet="send-buyer">
          <article className="sh-prop" data-prop={p.id}>
            {p.image ? <img src={asset(p.image)} alt="" /> : <i className="sh-prop-ph" aria-hidden><BedDouble /></i>}
            <span>
              <b>{p.title}</b>
              <small>
                <MapPin aria-hidden /> {p.hood ? `${p.city}, ${p.hood}` : p.city}
              </small>
              <small>
                {p.rooms ? (
                  <>
                    <BedDouble aria-hidden /> <span className="num">{p.rooms}</span> חדרים ·{' '}
                  </>
                ) : p.sqm ? (
                  <>
                    <Ruler aria-hidden /> <span className="num">{p.sqm}</span> מ"ר ·{' '}
                  </>
                ) : null}
                <b className="num">{priceWords(p)}</b>
              </small>
            </span>
          </article>

          <ClientPicker clients={people} value={client ? pick : null} onChange={setPick} onNew={() => setAdding(true)} fits={fits} label="למי לשלוח" needPhone onAddPhone={(cl) => setAskFor(cl.id)} />

          {client && (
            <div className="sh-wa" data-preview>
              <span className="cp-label">ההודעה שתיפתח בוואטסאפ</span>
              <div className="sh-chat">
                <label className="sh-bubble">
                  <span className="sr-only">ההודעה, אפשר לשנות אותה</span>
                  <textarea
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value)
                      setEdited(true)
                    }}
                    rows={9}
                    dir="rtl"
                    data-f="wa-text"
                  />
                </label>
              </div>
              <p className="sh-safe">
                <Lock aria-hidden />
                בלי הטלפון של בעל הנכס ובלי מספר הדירה. רק עיר, שכונה, חדרים, מחיר וקישור.
              </p>
            </div>
          )}
        </div>
        <div className="modal-foot sh-foot">
          <button type="button" className="btn sh-wa-btn" onClick={open} disabled={!client} data-act="open-whatsapp">
            <WhatsAppIcon />
            {client ? 'פתיחה בוואטסאפ' : 'בוחרים למי לשלוח'}
          </button>
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            ביטול
          </button>
        </div>
      </Modal>
      <AskPhone open={!!askFor && !!prop} client={asking} what="לשלוח ללקוח בוואטסאפ" onClose={closeAsk} onReady={() => asking && setPick(asking.id)} />
      <NewClient
        open={adding}
        onClose={closeAdd}
        isOffice={isOffice}
        onAdd={(input) => {
          const id = clientActions.add(input)
          setAdding(false)
          setPick(id)
          toast(`${input.name} נוסף לרשימת הלקוחות`)
        }}
      />
    </>
  )
}

/** The button on a property card of the CRM's board. */
export function SendCardButton({ item }: { item: CrmItem }) {
  const [prop, setProp] = useState<SendProp | null>(null)
  const close = useCallback(() => setProp(null), [])
  if (item.kind !== 'property') return null
  return (
    <>
      <button type="button" className="sh-card-btn" onClick={() => setProp(fromCard(item))} data-act="send-to-buyer">
        <WhatsAppIcon />
        שלח ללקוח בוואטסאפ
      </button>
      <SendToBuyer prop={prop} onClose={close} />
    </>
  )
}
