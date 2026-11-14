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
/** One line of the app's menu. `locked` is the note shown on a line that is there but closed to this member. */
export type ShellNav = {
  to: string
  label: string
  short?: string
  icon: LucideIcon
  end?: boolean
  locked?: string
  /** lines that open under this one in the side menu while the visitor is inside it */
  children?: { to: string; label: string; icon?: LucideIcon }[]
}
export const shellSlots: {
  bar?: ComponentType
  badge?: ComponentType
  lab?: ComponentType<LabProps>
  /** a hook that may drop, lock or reorder the menu's lines for the member who is looking */
  useNav?: (items: ShellNav[]) => ShellNav[]
  /** the name at the top of the menu and of the phone's top bar, in place of the logo */
  brand?: ComponentType<{ place: 'side' | 'top' }>
  /** a strip above every screen inside the app */
  banner?: ComponentType
} = {}
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
  /** a working button inside an open tool's card */
  Action?: ComponentType<{ id: string }>
  /** the name of the shared deal room tool, where the look gives it another one */
  roomName?: string
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

/**
 * Actions the green version makes work in the browser (stage D). A shared screen calls one if it is registered,
 * and otherwise does what it always did (a note that the demo does not do this).
 */
export const actionSlots: {
  newCard?: () => void
  share?: (item: { id: string }) => void
  /** what the folder says after its link is copied, also where the browser has no clipboard */
  copied?: string
} = {}
export function registerActions(slots: typeof actionSlots) {
  Object.assign(actionSlots, slots)
}

/**
 * The green version shows the CRM's clients as a table of its own, in place of their cards on the board. With
 * nothing registered the CRM is the one board it always was. `onPublish` opens the CRM's own publish window.
 */
export const crmSlots: {
  Clients?: ComponentType<{ onPublish: (item: import('../data/demo').CrmItem) => void }>
  subtitle?: string
  /** the page's own title and line for each of the two views, when they are separate entries of the side menu */
  heads?: Record<'client' | 'property', { title: string; subtitle: string }>
  /** in place of the on / off switch above the board */
  AutoBar?: ComponentType
  /** the categories a property can have: the board can be filtered by them, and a card carries its own */
  categories?: { id: string; label: string }[]
  categoryOf?: (item: import('../data/demo').CrmItem) => string
  /** an extra line of actions at the bottom of a card on the board */
  CardExtra?: ComponentType<{ item: import('../data/demo').CrmItem; publishedTo?: string }>
} = {}
export function registerCrm(slots: typeof crmSlots) {
  Object.assign(crmSlots, slots)
}

/**
 * What the green version puts at the very top of the community feed (its nameplate, with the day's figures as
 * filters). With nothing registered the feed starts with its plain title, as it always did.
 */
export const communitySlots: {
  Top?: ComponentType<{ items: import('../data/demo').CommunityItem[]; view: string; onView: (v: never) => void }>
} = {}
export function registerCommunity(slots: typeof communitySlots) {
  Object.assign(communitySlots, slots)
}
