import { brokers, builderDefaults, cities, communityItems } from '../data/demo'
import type { BuilderState, Comment, CommunityItem } from '../data/demo'
import { CURRENT_BROKER_ID } from '../config'
import { signedIn } from './session'
import { identity } from '../config/identity'
import { initials } from '../config/initials'

/**
 * Whose area this browser shows. It must be imported at the very top of the green entry, before any store: the
 * stores read the browser's storage once, when they are loaded.
 *
 * The demo was built around one example user (מאיה). A real person must never land in her area or carry her name
 * (Itzik 19.11.2026: "שמות ההדגמה יופיעו רק בדף /demo, ואף פעם לא אצל משתמש אמיתי"). A real person is whoever is
 * signed in: an approved broker, and also one of the staff who has no broker's card (until 19.11.2026 staff were
 * left in the example user's area, so a signed-in manager saw "מאיה" all over the app). So:
 *   1. the "current broker" of the app becomes the signed-in person (name, where they work, their initials);
 *   2. what the app keeps in this browser is kept per person: the example user's things are put aside and the person
 *      gets their own, which starts empty (no clients, no properties, none of the example user's posts). Switching
 *      back (a presentation of the demo, another person on the same device) brings each one's things back;
 *   3. what the example user "said" in the invented feed (her comments under other brokers' posts) is taken out of a
 *      real person's feed: under the real name it would read as if they wrote it.
 * Everything is still kept in this browser only: nothing a broker uploads reaches the server or other brokers yet.
 */
const KEYS = [
  'brokers-demo-state-v5',
  'nadlanup-clients-v1',
  'nadlanup-owner-v1',
  'nadlanup-wallet-v1',
  'nadlanup-agent-v1',
  'nadlanup-member-v1',
  'nadlanup-plan-v1',
  // 19.11.2026: these are a person's own too (a typed name and phone, chats, what was sent)
  'nadlanup-callback-v1',
  'nadlanup-chats-v1',
  'nadlanup-city-watch-v1',
  'nadlanup-crm-draft-v1',
  'nadlanup-match-v1',
  'nadlanup-referrals-sent-v1',
  'nadlanup-sim-interest-v1',
]
const STATE = 'brokers-demo-state-v5'
const OWNER = 'nadlanup-area-of'
const stashOf = (who: string) => `nadlanup-area:${who}`

const who = signedIn ? signedIn.key : 'demo'

// ---------------------------------------------------------------- what belonged to the example user in the feed

const isSeedOfHers = new Set(communityItems.filter((it) => it.authorId === CURRENT_BROKER_ID).map((it) => it.id))
const saidByHer = new Set<string>()
const collect = (list?: Comment[]) =>
  list?.forEach((c) => {
    if (c.authorId === CURRENT_BROKER_ID) saidByHer.add(c.body)
    collect(c.replies)
  })
communityItems.forEach((it) => collect(it.comments))

/** A post's comments without the example user's invented ones. The same array comes back when nothing was hers. */
function withoutHers(list: Comment[] | undefined): Comment[] | undefined {
  if (!list) return list
  let changed = false
  const out: Comment[] = []
  list.forEach((c) => {
    if (c.authorId === CURRENT_BROKER_ID && saidByHer.has(c.body)) {
      changed = true
      return
    }
    const replies = withoutHers(c.replies)
    if (replies !== c.replies) {
      changed = true
      out.push({ ...c, replies })
    } else out.push(c)
  })
  return changed ? out : list
}

/** The feed as a real person gets it: the invented brokers' posts, with nothing of the example user's in it. */
function feedFor(items: CommunityItem[]): CommunityItem[] {
  let changed = false
  const out: CommunityItem[] = []
  items.forEach((it) => {
    if (isSeedOfHers.has(it.id)) {
      changed = true
      return
    }
    const comments = withoutHers(it.comments)
    if (comments !== it.comments) {
      changed = true
      out.push({ ...it, comments: comments ?? [] })
    } else out.push(it)
  })
  return changed ? out : items
}

/** The personal page's first draft for a real person: their own name and place, no invented years or reviews. */
const ownPage = (): BuilderState => ({
  ...builderDefaults,
  name: signedIn!.name,
  title: signedIn!.title,
  area: signedIn!.cities.slice(0, 2).join(' ו'),
  bio: '',
  years: 0,
  testimonialIds: [],
  propertyIds: [],
})

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
    } else if (signedIn) {
      // a person's first time here: their own area, empty, in the cities they work in
      localStorage.setItem(
        STATE,
        JSON.stringify({
          crm: [],
          items: feedFor(communityItems),
          notices: [],
          myCities: signedIn.cities.filter((c) => cities.includes(c)),
          onboarded: true,
          builder: ownPage(),
        }),
      )
      localStorage.setItem('nadlanup-clients-v1', '[]')
    }
    localStorage.setItem(OWNER, who)
  }

  if (signedIn) {
    // an area that was opened before 19.11.2026 can still hold the example user's comments and her page's draft
    const raw = localStorage.getItem(STATE)
    const state = raw ? (JSON.parse(raw) as { items?: CommunityItem[]; builder?: BuilderState }) : null
    if (state) {
      let changed = false
      if (Array.isArray(state.items)) {
        const items = feedFor(state.items)
        if (items !== state.items) {
          state.items = items
          changed = true
        }
      }
      if (!state.builder || state.builder.name === builderDefaults.name) {
        state.builder = ownPage()
        changed = true
      }
      if (changed) localStorage.setItem(STATE, JSON.stringify(state))
    }
  }
} catch {
  /* storage unavailable: nothing is remembered; the name below is still the signed-in person's */
}

/** The app's "current broker" is the signed-in person, as they chose to appear (their own picture, or initials). */
function becomeMe() {
  if (!signedIn) return
  const me = brokers.find((b) => b.id === CURRENT_BROKER_ID)
  if (!me) return
  me.name = signedIn.name
  me.title = signedIn.title
  me.area = signedIn.cities[0] ?? ''
  me.region = signedIn.areas
  me.specialties = []
  me.years = 0
  me.avatar = signedIn.photo || initials(signedIn.name)
  me.bio = ''
  me.phone = signedIn.phone
}
becomeMe()
// "עריכת פרופיל" was saved: the same person, with a new name or picture, before any screen is drawn again
identity.subscribe(becomeMe)

export {}
