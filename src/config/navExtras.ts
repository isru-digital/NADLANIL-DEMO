import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'

/**
 * Things only one look of the demo has (the green version's "הסוכן שלנו" area): its entry file registers them
 * here before the app starts, and the shell picks them up. The other look registers nothing and is unchanged.
 */
export type ExtraNav = { to: string; label: string; short?: string; icon: LucideIcon; badge?: string }

export const extraNav: ExtraNav[] = []
export const extraResets: (() => void)[] = []

export function registerNav(item: ExtraNav) {
  if (!extraNav.some((x) => x.to === item.to)) extraNav.push(item)
}
export function registerReset(fn: () => void) {
  if (!extraResets.includes(fn)) extraResets.push(fn)
}

/** Pieces the green version adds to the app's frame: a bar at the top (the view switch) and a mark next to the user's name. */
export const shellSlots: { bar?: ComponentType; badge?: ComponentType } = {}
export function registerShell(slots: { bar?: ComponentType; badge?: ComponentType }) {
  Object.assign(shellSlots, slots)
}
