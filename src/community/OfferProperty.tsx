import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BedDouble, Check, Home, MapPin, Plus, Send, Wallet } from 'lucide-react'
import { CURRENT_BROKER_ID, asset } from '../config'
import { actionSlots } from '../config/navExtras'
import { formatPrice, roomsLabel } from '../data/demo'
import type { CommunityItem } from '../data/demo'
import { useStore } from '../store'
import { Modal } from '../components/ui'
import { postOf } from '../owner/OwnerPublish'
import { MATCH_MIN, scoreOf } from './match'
import { priceText } from './PropertyPage'
import '../styles/publish-pickers.css'
import '../styles/offer.css'

/**
 * "הצעת נכס" on a buyer's post (Itzik 27.11.2026): the window lists my own properties, the ones that fit the buyer
 * (city, neighbourhood, price and rooms) first. One is picked, and it goes to the broker who published the buyer as a
 * small property card in the chat. What leaves is what the community sees of a property anyway: its title, its place,
 * its rooms and its price. Never the owner's name or phone.
 */
export type PropCard = { id: string; title: string; area: string; rooms: string; price: string; image?: string }

/** the small card of a property that goes into the chat */
export const cardOf = (post: CommunityItem): PropCard => ({
  id: post.sourceId ?? post.id,
  title: post.title ?? '',
  area: post.property?.area ?? post.city,
  rooms: post.property?.rooms ?? '',
  price: post.property ? priceText(post.property) : '',
  // a photo the broker uploaded is far too heavy to keep in every chat: the card then shows a small house
  image: post.image && !post.image.startsWith('data:') ? post.image : undefined,
})

export default function OfferProperty({ buyer, open, onClose, onSend }: { buyer: CommunityItem; open: boolean; onClose: () => void; onSend: (card: PropCard) => void }) {
  const { crm, items } = useStore()
  const navigate = useNavigate()
  const search = buyer.search!
  const rows = useMemo(() => {
    if (!open) return []
    // my properties: the ones in my CRM, and the ones I shared in the community that are not a CRM card
    const cards = crm.filter((c) => c.kind === 'property')
    const inCrm = new Set(cards.map((c) => c.id))
    const shared = items.filter((it) => it.authorId === CURRENT_BROKER_ID && it.property && !(it.sourceId && inCrm.has(it.sourceId)))
    return [...cards.map((c) => postOf(c, CURRENT_BROKER_ID)), ...shared.map((it) => ({ ...it, sourceId: it.sourceId ?? it.id }))]
      .map((post) => {
        const r = post.property ? scoreOf(post.city, post.property, search) : null
        return { post, score: r?.score ?? 0, fits: !!r && r.score >= MATCH_MIN }
      })
      .sort((a, b) => Number(b.fits) - Number(a.fits) || b.score - a.score)
  }, [open, crm, items, search])
  const fitting = rows.filter((r) => r.fits)
  const rest = rows.filter((r) => !r.fits)
  const add = () => {
    onClose()
    if (actionSlots.newCard) actionSlots.newCard()
    else navigate('/app/crm?v=properties')
  }
  const row = ({ post, fits }: (typeof rows)[number]) => (
    <li key={post.sourceId}>
      <button type="button" className={`pk-row of-row${fits ? ' is-fit' : ''}`} onClick={() => onSend(cardOf(post))} data-offer={post.sourceId} data-fits={fits ? '1' : '0'}>
        <span className="pk-thumb">{post.image ? <img src={asset(post.image)} alt="" loading="lazy" /> : <Home />}</span>
        <span className="pk-text">
          <b>{post.title}</b>
          <small>
            <MapPin /> {post.property?.area}
            {post.property?.rooms && (
              <>
                {' · '}
                <BedDouble /> <span className="num">{post.property.rooms}</span>
              </>
            )}
          </small>
          <strong className="num">{post.property ? priceText(post.property) : ''}</strong>
          {fits && (
            <em className="of-fit" data-fit>
              <Check aria-hidden /> מתאים לקונה
            </em>
          )}
        </span>
        <span className="pk-state">
          <Send aria-hidden /> שליחה
        </span>
      </button>
    </li>
  )
  return (
    <Modal open={open} onClose={onClose} title="הצעת נכס לקונה" subtitle="בוחרים נכס שלכם, והוא נשלח בצ'אט למתווך שפרסם את הקונה. שם וטלפון של לקוח לא נשלחים.">
      <div className="modal-body pk of" data-offer-window={buyer.id}>
        <div className="of-need" data-need>
          <span className="of-need-label">מה הקונה מחפש</span>
          <ul>
            <li>
              <MapPin aria-hidden /> {search.cities.join(', ')}
              {search.neighborhoods?.length ? ` · ${search.neighborhoods.join(', ')}` : ''}
            </li>
            <li>
              <BedDouble aria-hidden /> {roomsLabel(search)}
            </li>
            <li>
              <Wallet aria-hidden /> עד <span className="num">{formatPrice(search.budget)}</span>
              {search.deal === 'rent' && ' לחודש'}
            </li>
          </ul>
        </div>

        {fitting.length > 0 ? (
          <>
            <h3 className="pk-title">
              נכסים שלי שמתאימים <b className="num">{fitting.length}</b>
            </h3>
            <ul className="pk-list" data-list="fitting">
              {fitting.map(row)}
            </ul>
          </>
        ) : (
          <div className="of-empty" role="status" data-empty>
            <span className="of-empty-ico" aria-hidden>
              <Home />
            </span>
            <b>{rows.length ? 'אין לך כרגע נכס שמתאים לקונה הזה' : 'עדיין אין לך נכסים'}</b>
            <p>{rows.length ? 'אפשר להוסיף נכס חדש, או לשלוח אחד מהנכסים האחרים שלך.' : 'מוסיפים נכס, והוא נשמר ב-CRM שלכם ומתפרסם בקהילה.'}</p>
            <button type="button" className="btn btn-gold" onClick={add} data-act="add-property">
              <Plus aria-hidden /> הוספת נכס
            </button>
          </div>
        )}

        {rest.length > 0 && (
          <>
            <h3 className="pk-title">
              שאר הנכסים שלי <b className="num">{rest.length}</b>
            </h3>
            <ul className="pk-list" data-list="rest">
              {rest.map(row)}
            </ul>
          </>
        )}
      </div>
    </Modal>
  )
}
