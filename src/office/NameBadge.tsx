import { BadgeCheck, Zap } from 'lucide-react'
import { CURRENT_BROKER_ID } from '../config'
import { useMember } from '../config/member'
import { OFFICE_BROKER_IDS } from './officeData'

/** Is this broker an office member in the demo? The visitor is, when the switch says so; a few sample brokers always are. */
export function useIsOfficeBroker(brokerId: string) {
  const { isOffice } = useMember()
  return brokerId === CURRENT_BROKER_ID ? isOffice : OFFICE_BROKER_IDS.includes(brokerId)
}

/** The verified mark next to a broker's name: in the feed, in the index and in a match. */
export default function NameBadge({ brokerId }: { brokerId: string }) {
  if (!useIsOfficeBroker(brokerId)) return null
  return (
    <em className="ms-badge" title="חבר משרד מאומת">
      <BadgeCheck /> חבר משרד
    </em>
  )
}

/** On a match pop-up: an office member is told the match reached them first. */
export function MatchFirst() {
  const { isOffice } = useMember()
  if (!isOffice) return null
  return (
    <p className="match-first">
      <Zap /> חבר משרד: ההתאמה הגיעה אליך ראשונה
    </p>
  )
}
