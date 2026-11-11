import { BadgeCheck, Check, Sparkles } from 'lucide-react'
import { formatPriceShort } from '../data/demo'
import { OFFICE_FEE } from '../config/office'
import type { Panel } from './OpenPanels'

/**
 * What the green home changes in the opening panels (Itzik, 11.11.2026: the photos looked too luxurious and too dark):
 * bright daylight photos of ordinary Israeli homes, an ordinary search in the first panel, and a fourth panel for the office.
 */
export const panelChange: Record<string, Partial<Panel>> = {
  request: {
    title: 'פה כל הודעה שווה יותר',
    image: 'img/panel-home.webp',
    position: '50% 50%',
    mock: (
      <div className="op-card">
        <span className="op-kicker">בקשת חיפוש שמורה</span>
        <strong>4 חדרים בפתח תקווה, עד {formatPriceShort(2800000)}</strong>
        <ul className="op-chips">
          <li>מרפסת שמש</li>
          <li>חניה</li>
          <li>מעלית</li>
        </ul>
        <div className="op-alert">
          <span className="op-spark">
            <Sparkles />
          </span>
          <div>
            <b>נמצאה התאמה</b>
            <small>דירת 4 חדרים עם מרפסת שמש</small>
          </div>
        </div>
      </div>
    ),
  },
  match: { image: 'img/panel-street.webp', position: '50% 50%' },
  wallet: { image: 'img/panel-keys.webp', position: '40% 50%' },
}

export const panelOffice: Panel = {
  id: 'office',
  label: 'המשרד',
  title: 'משרד ארצי מאחוריך',
  text: `שם ומותג של משרד תיווך ארצי, לידים מהקמפיינים וצוות שמלווה עד החתימה. ${OFFICE_FEE.replace(/ /g, ' ')}, ו-0% עמלה למשרד.`,
  image: 'img/panel-office.webp',
  position: '50% 50%',
  link: { to: '/join/office', label: 'להכיר את המשרד' },
  mock: (
    <div className="op-card">
      <span className="op-kicker">
        <BadgeCheck /> חבר משרד
      </span>
      <ul className="op-office">
        <li>
          <Check /> <b>מכונת הלידים</b> <small>3 לידים מחכים באזור שלך</small>
        </li>
        <li>
          <Check /> <b>דוח שבועי למוכר</b> <small>נשלח לבד כל שבוע</small>
        </li>
        <li>
          <Check /> <b>מנהלת עסקה</b> <small>הניירת עלינו, עד החתימה</small>
        </li>
      </ul>
      <small className="op-foot">נתוני דמו</small>
    </div>
  ),
}
