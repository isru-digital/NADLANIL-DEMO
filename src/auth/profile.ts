import { brokers, cities, communityItems } from '../data/demo'
import { CURRENT_BROKER_ID } from '../config'
import { asMember } from './session'

/**
 * Whose area this browser shows. It must be imported at the very top of the green entry, before any store: the
 * stores read the browser's storage once, when they are loaded.
 *
 * The demo was built around one example user (מאיה). A real, approved broker must not land in her area: what he
 * uploads belongs to him. So:
 *   1. the "current broker" of the app becomes the signed-in broker (his name, where he works, his initials);
 *   2. what the app keeps in this browser is kept per person: the example user's things are put aside and the broker
 *      gets his own, which starts empty (no clients, no properties, none of the example user's posts). Switching
 *      back (a presentation of the demo, another broker on the same device) brings each one's things back.
 * Everything is still kept in this browser only: nothing a broker uploads reaches the server or other brokers yet.
 */
const KEYS = ['brokers-demo-state-v5', 'nadlanup-clients-v1', 'nadlanup-owner-v1', 'nadlanup-wallet-v1', 'nadlanup-agent-v1', 'nadlanup-member-v1', 'nadlanup-plan-v1']
const OWNER = 'nadlanup-area-of'
const stashOf = (who: string) => `nadlanup-area:${who}`

const who = asMember ? `m:${asMember.id}` : 'demo'

try {
  const before = localStorage.getItem(OWNER) ?? 'demo'
  if (before !== who) {
    // put aside what belongs to whoever was here
    const mine: Record<string, string> = {}
    KEYS.forEach((k) => {
      const v = localStorage.getItem(k)
      if (v !== null) mine[k] = v
      localStorage.removeItem(k)
    })
    localStorage.setItem(stashOf(before), JSON.stringify(mine))

    const kept = JSON.parse(localStorage.getItem(stashOf(who)) ?? 'null') as Record<string, string> | null
    if (kept) {
      Object.entries(kept).forEach(([k, v]) => localStorage.setItem(k, v))
    } else if (asMember) {
      // a broker's first time here: his own area, empty, in the cities he works in
      localStorage.setItem(
        'brokers-demo-state-v5',
        JSON.stringify({
          crm: [],
          items: communityItems.filter((it) => it.authorId !== CURRENT_BROKER_ID),
          notices: [],
          myCities: asMember.cities.filter((c) => cities.includes(c)),
          onboarded: true,
        }),
      )
      localStorage.setItem('nadlanup-clients-v1', '[]')
    }
    localStorage.setItem(OWNER, who)
  }
} catch {
  /* storage unavailable: the app shows the example user's area */
}

/** The signed-in broker's initials on a green disc, in place of a photo. */
function initials(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#07643f"/><stop offset="1" stop-color="#0fa46b"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/><text x="60" y="62" text-anchor="middle" dominant-baseline="central" font-family="Heebo,Arial,sans-serif" font-size="46" font-weight="800" fill="#fff">${letters}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

if (asMember) {
  const me = brokers.find((b) => b.id === CURRENT_BROKER_ID)
  if (me) {
    me.name = asMember.name
    me.title = asMember.work === 'office' ? `מתווך, ${asMember.office_name}` : 'מתווך עצמאי'
    me.area = asMember.cities[0] ?? ''
    me.region = asMember.areas
    me.specialties = []
    me.years = 0
    me.avatar = initials(asMember.name)
    me.bio = ''
  }
}

export {}
