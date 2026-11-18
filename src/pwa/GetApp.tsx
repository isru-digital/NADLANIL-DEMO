import { Link } from 'react-router-dom'
import { ArrowLeft, Download } from 'lucide-react'
import { runningAsApp } from './pwa'
import '../styles/get-app.css'

/**
 * "הורדת האפליקציה" (Itzik 18.11.2026): the way to the install guide (/install), in the menu (the side menu on a
 * computer, "עוד" on a phone), at the foot of the home page and on the bottom line of the app's screens. Inside the
 * installed app there is nothing to download, so it is not shown there.
 */
export const INSTALL_PATH = '/install'
const ICON = `${import.meta.env.BASE_URL}icons/app-192.png`

export default function GetApp({ place }: { place: 'side' | 'more' | 'foot' | 'line' }) {
  if (runningAsApp()) return null

  if (place === 'foot')
    return (
      <Link to={INSTALL_PATH} className="ga-badge" data-getapp="foot">
        <img src={ICON} alt="" width={44} height={44} />
        <span>
          <small>האפליקציה של הקהילה</small>
          <b>הורדת האפליקציה</b>
        </span>
        <ArrowLeft className="ga-badge-arrow" aria-hidden />
      </Link>
    )
  if (place === 'line')
    return (
      <Link to={INSTALL_PATH} className="ga-line" data-getapp="line">
        <Download aria-hidden /> הורדת האפליקציה
      </Link>
    )
  return (
    <Link to={INSTALL_PATH} className={`ga-row is-${place}`} data-getapp={place}>
      <img src={ICON} alt="" width={place === 'more' ? 40 : 34} height={place === 'more' ? 40 : 34} />
      <span className="ga-row-words">
        <strong>הורדת האפליקציה</strong>
        <span>{place === 'side' ? 'בלי חנות אפליקציות' : 'למסך הבית, בלי חנות אפליקציות'}</span>
      </span>
      <Download className="ga-row-icon" aria-hidden />
    </Link>
  )
}
