import { useEffect } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { BedDouble, Lock, MapPin, MessageCircle, Ruler } from 'lucide-react'
import { asset } from '../config'
import { COMMUNITY_HOME, COMMUNITY_NAME } from '../config/community'
import { Avatar, DemoTag } from '../components/ui'
import CommunityBrand from '../community/CommunityBrand'
import { priceWords } from './sendProperty'
import '../styles/owner.css'
import '../styles/referral.css'

/**
 * The page a buyer opens from the broker's WhatsApp message (24.11.2026): the property, where it is (city and
 * neighbourhood), its size and price, and the broker who sent it. There is no server, so all of it travels in the link,
 * and nothing of the owner is in it: no name, no phone, no building or flat number.
 */
export default function BuyerPage() {
  const [q] = useSearchParams()
  const title = q.get('t')?.slice(0, 90)
  const city = q.get('c')?.slice(0, 40) ?? ''
  const hood = q.get('h')?.slice(0, 40) ?? ''
  const rooms = q.get('r')?.slice(0, 5) ?? ''
  const sqm = Number(q.get('s')) || 0
  const price = Number(q.get('p')) || 0
  const rent = q.get('m') === '1'
  const img = q.get('i')
  const image = img && /^img\/[\w.-]+$/.test(img) ? img : undefined
  const by = q.get('n')?.trim().slice(0, 60)

  useEffect(() => {
    const prev = document.title
    document.title = title ? `${title} | ${COMMUNITY_NAME}` : COMMUNITY_NAME
    window.scrollTo({ top: 0 })
    return () => {
      document.title = prev
    }
  }, [title])

  if (!title) return <Navigate to={COMMUNITY_HOME} replace />

  return (
    <div className="own buy" data-page="buyer">
      <header className="own-top">
        <Link to={COMMUNITY_HOME} className="own-brand" aria-label={`${COMMUNITY_NAME}, דף הקהילה`}>
          <CommunityBrand size="sm" />
        </Link>
        <DemoTag />
      </header>

      <main className="own-main">
        <p className="buy-eyebrow">{by ? `נכס שנשלח אליך מ${by}` : 'נכס שנשלח אליך'}</p>
        <h1 data-buyer-title>{title}</h1>

        <article className="buy-card">
          {image && <img src={asset(image)} alt="" />}
          <ul className="buy-facts">
            <li>
              <MapPin aria-hidden />
              <span>מיקום</span>
              <b>{hood ? `${city}, ${hood}` : city}</b>
            </li>
            {(rooms || sqm > 0) && (
              <li>
                {rooms ? <BedDouble aria-hidden /> : <Ruler aria-hidden />}
                <span>גודל</span>
                <b className="num">{rooms ? `${rooms} חדרים` : `${sqm} מ"ר`}</b>
              </li>
            )}
            {price > 0 && (
              <li className="is-price">
                <span>{rent ? 'שכירות' : 'מחיר'}</span>
                <b className="num">{priceWords({ price, rent })}</b>
              </li>
            )}
          </ul>
        </article>

        {by && (
          <div className="own-broker">
            <Avatar src="" name={by} size={48} ring />
            <div>
              <small>המתווך ששלח לך את הנכס</small>
              <b data-broker-name>{by}</b>
            </div>
          </div>
        )}
        <p className="buy-next">
          <MessageCircle aria-hidden />
          רוצים לראות את הנכס? עונים למתווך באותה שיחה בוואטסאפ.
        </p>
        <p className="own-private">
          <Lock />
          <span>הכתובת המדויקת נמסרת בתיאום עם המתווך.</span>
        </p>
        <p className="own-foot">עמוד הדגמה. הנתונים בדמו מומצאים.</p>
      </main>
    </div>
  )
}
