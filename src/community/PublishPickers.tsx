import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BedDouble, Check, ChevronLeft, Home, MapPin, Plus, Search, UserRound } from 'lucide-react'
import { CURRENT_BROKER_ID, asset } from '../config'
import { actionSlots } from '../config/navExtras'
import { formatPriceShort, roomsLabel } from '../data/demo'
import type { CommunityItem, CrmItem, SearchSpec } from '../data/demo'
import { useStore } from '../store'
import { Modal } from '../components/ui'
import { postOf } from '../owner/OwnerPublish'
import { clientActions, useClients } from '../crm/clients'
import type { Client } from '../crm/clients'
import NewClient from '../crm/NewClient'
import type { NewClientInput } from '../crm/NewClient'
import '../styles/publish-pickers.css'

/**
 * Sharing with the community in as few taps as possible (Itzik 17.11.2026):
 *  - "נכסים לשיתוף פעולה": pick one of my CRM properties (a small photo each), or add a new one. A new property goes
 *    into the CRM first and up to the community by itself (AutoPublish), so it is in both places.
 *  - "מחפש לקונה": pick a buyer or a renter from my CRM, or a new one. A new buyer is saved in the CRM and published.
 * The community sees the city and the neighbourhood only: never the street, the house number, a name or a phone.
 */

/** The key a published client is kept under, so the list can say "already in the community". */
export const clientKey = (id: string) => `client:${id}`

/** What the community sees of a buyer's search: rooms, places, budget and must-haves. No name, no phone. */
export function buyerPost(cl: Client, authorId: string): CommunityItem {
  const rent = cl.type === 'renter'
  const roomsMin = cl.roomsMin ?? Math.max(1, cl.rooms || 3)
  const roomsMax = cl.roomsMax ?? Math.max(roomsMin, cl.rooms || 4)
  const search: SearchSpec = { cities: cl.cities, roomsMin, roomsMax, budget: cl.sum, wants: cl.must ?? [], deal: rent ? 'rent' : 'sale' }
  const where = cl.cities.length ? ` ב${cl.cities.join(' או ב')}` : ''
  const hoods = cl.neighborhoods?.length ? `שכונות: ${cl.neighborhoods.join(', ')}. ` : ''
  return {
    id: `b-${cl.id}-${Date.now()}`,
    topicId: 'seeking',
    authorId,
    city: cl.cities[0] ?? '',
    time: 'עכשיו',
    likes: 0,
    comments: [],
    fresh: true,
    title: `${rent ? 'מחפש לשוכר' : 'מחפש לקונה'}: ${roomsLabel(search)}${where}`,
    body: `${hoods}${cl.wants ? `${cl.wants}. ` : ''}${rent ? 'שוכר רציני' : 'קונה רציני'}. מי שיש לו נכס מתאים, גם שקט, דברו איתי.`,
    search,
  }
}

/* ============================================================ my properties */

export function PropertyPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { crm, publishedIds, addItem, toast } = useStore()
  const navigate = useNavigate()
  const mine = crm.filter((c) => c.kind === 'property')
  const share = (item: CrmItem) => {
    const post = postOf(item, CURRENT_BROKER_ID)
    addItem(post, item.id)
    onClose()
    toast('הנכס פורסם בנכסים לשיתוף פעולה')
    navigate(`/app/community?topic=coop&item=${post.id}`)
  }
  const fresh = () => {
    onClose()
    if (actionSlots.newCard) actionSlots.newCard()
    else navigate('/app/crm?v=properties')
  }
  return (
    <Modal open={open} onClose={onClose} title="שיתוף נכס בקהילה" subtitle="בוחרים נכס מה-CRM שלכם, או מוסיפים נכס חדש. בקהילה רואים רק עיר ושכונה.">
      <div className="modal-body pk" data-picker="property">
        <button type="button" className="pk-new" onClick={fresh} data-act="new-property">
          <span className="pk-new-ico">
            <Plus />
          </span>
          <span>
            <b>נכס חדש</b>
            <small>נשמר ב-CRM שלכם ומתפרסם בקהילה</small>
          </span>
          <ChevronLeft className="pk-go" />
        </button>
        <h3 className="pk-title">
          הנכסים הקיימים שלי <b className="num">{mine.length}</b>
        </h3>
        {mine.length === 0 ? (
          <p className="pk-empty">עדיין אין נכסים ב-CRM. מוסיפים נכס חדש, והוא נשמר בשני המקומות.</p>
        ) : (
          <ul className="pk-list">
            {mine.map((it) => {
              const done = publishedIds[it.id] === 'coop'
              return (
                <li key={it.id}>
                  <button type="button" className={`pk-row${done ? ' is-done' : ''}`} onClick={() => !done && share(it)} disabled={done} data-pick={it.id}>
                    <span className="pk-thumb">{it.image ? <img src={asset(it.image)} alt="" loading="lazy" /> : <Home />}</span>
                    <span className="pk-text">
                      <b>{it.title}</b>
                      <small>
                        <MapPin /> {it.area}
                        {it.rooms && it.rooms !== '-' && (
                          <>
                            {' · '}
                            <BedDouble /> <span className="num">{it.rooms}</span>
                          </>
                        )}
                      </small>
                      <strong className="num">{formatPriceShort(it.price)}</strong>
                    </span>
                    <span className="pk-state">{done ? <><Check /> כבר בקהילה</> : 'שיתוף'}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}

/* ============================================================ my buyers */

export function BuyerPicker({ open, onClose, startNew = false }: { open: boolean; onClose: () => void; startNew?: boolean }) {
  const { publishedIds, addItem, toast } = useStore()
  const navigate = useNavigate()
  const clients = useClients().filter((c) => c.type === 'buyer' || c.type === 'renter')
  const [adding, setAdding] = useState(false)
  // "קונה חדש" straight from the feed opens the form at once
  useEffect(() => {
    if (open) setAdding(startNew)
  }, [open, startNew])
  const publish = (cl: Client, isNew: boolean) => {
    const post = buyerPost(cl, CURRENT_BROKER_ID)
    addItem(post, clientKey(cl.id))
    toast(isNew ? `${cl.type === 'renter' ? 'השוכר' : 'הקונה'} נשמר ב-CRM ופורסם במחפש לקונה` : 'הבקשה פורסמה במחפש לקונה')
    navigate(`/app/community?topic=seeking&item=${post.id}`)
  }
  const addNew = (p: NewClientInput) => {
    const id = clientActions.add(p)
    setAdding(false)
    onClose()
    publish({ ...(p as Client), id, stage: 'new', lastDays: 0, backToOwner: false, tourSet: false, exclusive: false, note: '', rating: 3, followUpDays: null, createdDays: 0, about: p.about ?? '', cities: p.cities ?? [], rooms: p.rooms ?? 0, sum: p.sum ?? 0 }, true)
  }
  return (
    <>
      <Modal open={open && !adding} onClose={onClose} title="פרסום קונה בקהילה" subtitle="בוחרים קונה מה-CRM שלכם, או קונה חדש. שם וטלפון לא מתפרסמים.">
        <div className="modal-body pk" data-picker="buyer">
          <button type="button" className="pk-new" onClick={() => setAdding(true)} data-act="new-buyer">
            <span className="pk-new-ico">
              <Plus />
            </span>
            <span>
              <b>קונה חדש</b>
              <small>נשמר ב-CRM שלכם ומתפרסם בקהילה</small>
            </span>
            <ChevronLeft className="pk-go" />
          </button>
          <h3 className="pk-title">
            הקונים והשוכרים שלי <b className="num">{clients.length}</b>
          </h3>
          {clients.length === 0 ? (
            <p className="pk-empty">עדיין אין קונים ב-CRM. מוסיפים קונה חדש, והוא נשמר בשני המקומות.</p>
          ) : (
            <ul className="pk-list">
              {clients.map((cl) => {
                const done = !!publishedIds[clientKey(cl.id)]
                return (
                  <li key={cl.id}>
                    <button
                      type="button"
                      className={`pk-row${done ? ' is-done' : ''}`}
                      onClick={() => {
                        if (done) return
                        onClose()
                        publish(cl, false)
                      }}
                      disabled={done}
                      data-pick={cl.id}
                    >
                      <span className="pk-thumb is-person">{cl.type === 'renter' ? <Search /> : <UserRound />}</span>
                      <span className="pk-text">
                        <b>
                          {cl.name} <em>{cl.type === 'renter' ? 'שוכר' : 'קונה'}</em>
                        </b>
                        <small>{cl.about || (cl.cities.length ? cl.cities.join(', ') : 'בלי אזור')}</small>
                        <strong className="num">
                          עד {cl.type === 'renter' ? `${cl.sum.toLocaleString('he-IL')} ₪ לחודש` : formatPriceShort(cl.sum)}
                        </strong>
                      </span>
                      <span className="pk-state">{done ? <><Check /> כבר בקהילה</> : 'פרסום'}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="pk-note">השם והטלפון של הלקוח נשארים אצלכם. בקהילה מופיעים רק מה הוא מחפש ואיפה.</p>
        </div>
      </Modal>
      <NewClient
        open={open && adding}
        onClose={() => {
          setAdding(false)
          if (startNew) onClose()
        }}
        isOffice={false}
        onAdd={addNew}
        searchOnly
      />
    </>
  )
}
