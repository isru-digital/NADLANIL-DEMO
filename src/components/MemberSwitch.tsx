import { BadgeCheck, Users } from 'lucide-react'
import { useStore } from '../store'
import { useMember } from '../config/member'
import type { Member } from '../config/member'
import '../styles/member.css'

/** The demo's view switch: the same screens as a free community member, or as a member of the office. */
export default function MemberSwitch() {
  const { member, setMember } = useMember()
  const { toast } = useStore()
  const pick = (next: Member) => {
    if (next === member) return
    setMember(next)
    toast(next === 'office' ? 'עכשיו רואים את הדמו כחבר משרד' : 'עכשיו רואים את הדמו כחבר קהילה')
  }
  return (
    <div className="ms" data-m={member} role="group" aria-label="תצוגת הדמו">
      <span className="ms-label">תצוגת דמו</span>
      <div className="ms-track">
        <i className="ms-thumb" aria-hidden />
        <button type="button" data-v="community" aria-pressed={member === 'community'} onClick={() => pick('community')}>
          <Users /> חבר קהילה
        </button>
        <button type="button" data-v="office" aria-pressed={member === 'office'} onClick={() => pick('office')}>
          <BadgeCheck /> חבר משרד
        </button>
      </div>
    </div>
  )
}

/** The verified mark of an office member, shown next to a name. Nothing is rendered for a community member. */
export function MemberBadge() {
  const { isOffice } = useMember()
  if (!isOffice) return null
  return (
    <em className="ms-badge">
      <BadgeCheck /> חבר משרד
    </em>
  )
}
