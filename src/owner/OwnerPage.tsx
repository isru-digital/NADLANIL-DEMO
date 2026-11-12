import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BadgeCheck, CalendarDays, Lock, MapPin, Users } from 'lucide-react'
import { asset } from '../config'
import { COMMUNITY_HOME, COMMUNITY_NAME } from '../config/community'
import { brokerById, formatPriceShort } from '../data/demo'
import { Avatar, DemoTag } from '../components/ui'
import CommunityBrand from '../community/CommunityBrand'
import { dateHe, readOwnerView, viewersIn } from './ownerLink'
import type { OwnerView } from './ownerLink'
import '../styles/owner.css'

/** Shown when the page is opened without a property in its link. */
const sample: OwnerView = { title: 'דירת 4 חדרים עם מרפסת שמש', area: 'פתח תקווה, כפר גנים', city: 'פתח תקווה', rooms: '4', price: 2650000, date: '', image: 'img/hero-flat.webp', brokerId: 'b1' }

/**
 * The small page a property's owner gets from the broker: the property was published in the community, when, and
 * how many brokers in the area see it (a demo number). It shows the property only, never the owner's details.
 */
export default function OwnerPage() {
  const [q] = useSearchParams()
  const read = readOwnerView(q)
  const v = read ?? { ...sample, date: new Date().toISOString().slice(0, 10) }
  const broker = brokerById(v.brokerId) ?? brokerById('b1')

  useEffect(() => {
    const prev = document.title
    document.title = `הנכס פורסם | ${COMMUNITY_NAME}`
    window.scrollTo({ top: 0 })
    return () => {
      document.title = prev
    }
  }, [])

  return (
    <div className="own">
      <header className="own-top">
        <Link to={COMMUNITY_HOME} className="own-brand" aria-label={`${COMMUNITY_NAME}, דף הקהילה`}>
          <CommunityBrand size="sm" />
        </Link>
        <DemoTag />
      </header>

      <main className="own-main">
        <span className="own-ok">
          <BadgeCheck />
        </span>
        <h1>
          הנכס שלך פורסם
          <br />
          בקהילת <span>{COMMUNITY_NAME}</span>
        </h1>
        <p className="own-lead">מתווכים שעובדים באזור רואים את הנכס, ויכולים להביא אליו קונים.</p>

        <article className="own-card">
          {v.image && <img src={asset(v.image)} alt="" />}
          <div>
            <strong>{v.title}</strong>
            <span>
              <MapPin /> {v.area || v.city}
            </span>
            <span>
              <b className="num">{v.rooms}</b> חדרים{v.price > 0 && ' · '}
              {v.price > 0 && <b className="num">{formatPriceShort(v.price)}</b>}
            </span>
          </div>
        </article>

        <div className="own-stats">
          <div data-stat="date">
            <i>
              <CalendarDays />
            </i>
            <span>תאריך הפרסום</span>
            <b className="num">{dateHe(v.date)}</b>
          </div>
          <div data-stat="viewers">
            <i>
              <Users />
            </i>
            <span>מתווכים באזור {v.city} שרואים את הנכס</span>
            <b>
              <span className="num">{viewersIn(v.city)}</span> <em>נתון דמו</em>
            </b>
          </div>
        </div>

        <p className="own-private">
          <Lock />
          <span>
            <b>מה לא מתפרסם:</b> השם שלך, הטלפון שלך וההערות של המתווך. הם נשארים אצל המתווך בלבד.
          </span>
        </p>

        <div className="own-broker">
          <Avatar src={broker.avatar} name={broker.name} size={48} ring />
          <div>
            <small>המתווך שמלווה את הנכס</small>
            <b>{broker.name}</b>
            <span>{broker.title}</span>
          </div>
        </div>

        <p className="own-foot">{read ? 'עמוד הדגמה. הנתונים בדמו מומצאים.' : 'עמוד לדוגמה: כך ייראה העמוד שבעל הנכס מקבל. הנתונים מומצאים.'}</p>
      </main>
    </div>
  )
}
