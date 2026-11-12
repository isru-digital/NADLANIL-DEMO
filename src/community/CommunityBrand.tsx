import { Handshake } from 'lucide-react'
import { PLATFORM_NAME } from '../config'
import { COMMUNITY_NAME } from '../config/community'
import '../styles/kehila.css'

/**
 * The community's own name: "מתווכים לעסקאות" large, "מבית NadlanUP" small under it, next to a simple mark.
 * `tone="white"` is for green and photo backgrounds.
 */
export default function CommunityBrand({ size = 'md', tone = 'ink' }: { size?: 'sm' | 'md' | 'lg'; tone?: 'ink' | 'white' }) {
  return (
    <span className={`cb is-${size} is-${tone}`}>
      <i className="cb-mark" aria-hidden>
        <Handshake />
      </i>
      <span className="cb-words">
        <b>{COMMUNITY_NAME}</b>
        <small>
          מבית <bdi dir="ltr">{PLATFORM_NAME}</bdi>
        </small>
      </span>
    </span>
  )
}
