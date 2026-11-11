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

/**
 * Pieces the green version adds to the app's frame: a bar at the top (the view switch, the wallet or the quota),
 * a mark next to the user's name, and its own wrapper around the beta lab (the three layers).
 */
type LabProps = { view: null | string; setView: (v: null | string) => void }
export const shellSlots: { bar?: ComponentType; badge?: ComponentType; lab?: ComponentType<LabProps> } = {}
export function registerShell(slots: typeof shellSlots) {
  Object.assign(shellSlots, slots)
}

/**
 * What the green version changes inside the beta lab: the mark on each tool, the words at the top of an open tool,
 * the tools in groups by layer, and the small print. With nothing registered the lab looks as it always did.
 */
export const labSlots: {
  Chip?: ComponentType<{ id: string }>
  Badge?: ComponentType<{ id: string }>
  groups?: { title: string; sub: string; ids: string[] }[]
  hubSub?: string
  hubNote?: string
  peekNote?: string
} = {}
export function registerLab(slots: typeof labSlots) {
  Object.assign(labSlots, slots)
}

/**
 * Marks the green version puts next to a broker's name (the office member's verified mark), and a line it adds to
 * a match pop-up. With nothing registered, names and matches look as they always did.
 */
export const nameSlots: { Badge?: ComponentType<{ brokerId: string }>; MatchNote?: ComponentType } = {}
export function registerNames(slots: typeof nameSlots) {
  Object.assign(nameSlots, slots)
}
