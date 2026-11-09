import { useLocation } from 'react-router-dom'
import '../styles/version-switch.css'

/**
 * A small two-way switch that jumps between the two looks of the demo (navy and gold, green and white)
 * on the same screen, so the two can be compared. It is a comparison aid for the meeting, not part of the product.
 */
export default function VersionSwitch() {
  const { pathname, search } = useLocation()
  if (pathname.startsWith('/b/') || pathname.startsWith('/f/') || pathname.includes('/agent')) return null

  const green = __THEME__ === 'green'
  const baseUrl = import.meta.env.BASE_URL
  const rest = `${pathname.replace(/^\//, '')}${search}`
  const href = (toGreen: boolean) => {
    const root = toGreen ? (green ? baseUrl : `${baseUrl}green/`) : green ? baseUrl.replace(/green\/$/, '') : baseUrl
    // dev servers run on two ports, one per look
    const origin = import.meta.env.DEV ? `${location.protocol}//${location.hostname}:${toGreen ? 5240 : 5230}` : ''
    const path = import.meta.env.DEV ? root.replace(/^(\/[^/]+\/).*$/, '$1') + (toGreen ? 'green/' : '') : root
    return `${origin}${path}${rest}`
  }

  return (
    <nav className={`vswitch${pathname.startsWith('/app') ? ' on-app' : ''}`} aria-label="בחירת עיצוב">
      <span>עיצוב</span>
      <a href={href(false)} aria-current={green ? undefined : 'true'} className={green ? '' : 'is-on'}>
        כחול
      </a>
      <a href={href(true)} aria-current={green ? 'true' : undefined} className={green ? 'is-on' : ''}>
        ירוק
      </a>
    </nav>
  )
}
