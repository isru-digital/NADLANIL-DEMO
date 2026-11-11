import { useSyncExternalStore } from 'react'

/**
 * Which experience the demo shows: a free member of the community, or a member of the office. There is no real
 * sign-in: the partners flip a switch in the top bar and see both. The choice lives in this browser only.
 */
export type Member = 'community' | 'office'

const KEY = 'nadlanup-member-v1'

function load(): Member {
  try {
    return localStorage.getItem(KEY) === 'office' ? 'office' : 'community'
  } catch {
    return 'community'
  }
}

let member: Member = load()
const listeners = new Set<() => void>()

export const memberActions = {
  set(next: Member) {
    if (next === member) return
    member = next
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* storage unavailable: the choice lasts until the page is closed */
    }
    listeners.forEach((l) => l())
  },
  reset() {
    memberActions.set('community')
  },
}

export function useMember() {
  const m = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => member,
  )
  return { member: m, isOffice: m === 'office', setMember: memberActions.set }
}
