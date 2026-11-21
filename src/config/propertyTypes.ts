import { Building2, Home } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * The kinds of property, in two steps (Itzik 22.11.2026): first "מגורים" or "מסחרי", then one kind from that group's
 * list. This is the ONE list: the new property form, the community's filter, the CRM, the buyer's form and the match
 * all read it from here, so a kind is written the same way everywhere and the match can compare like with like.
 *
 * A kind is its Hebrew name. "מגרש" is in both lists, so a kind is always kept together with its group.
 * What was saved before this list ('משרדי/עסקי', "דירה במגדל", "דירה להשכרה"...) is read through `kindOf`, which
 * finds the closest kind of the list. Nothing saved is rewritten or removed.
 */
export type PropGroup = 'home' | 'business'

export const GROUPS: { id: PropGroup; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'מגורים', icon: Home },
  { id: 'business', label: 'מסחרי', icon: Building2 },
]
export const groupLabel = (g: PropGroup) => (g === 'business' ? 'מסחרי' : 'מגורים')

export const KINDS: Record<PropGroup, string[]> = {
  home: ['דירה', 'דירת גן', 'פנטהאוז', 'מיני פנטהאוז', 'דירת גג', 'דופלקס', "קוטג'", 'בית פרטי', 'וילה', 'בית דו משפחתי', 'סטודיו', 'יחידת דיור', 'מרתף', 'סאבלט', 'מגרש'],
  business: ['שטח מסחרי', 'משרד', 'בניין משרדים', 'חנות', 'מבנה מסחרי', 'מגרש', 'מרפאה', 'חלל עבודה משותף', 'אולם אירועים', 'מחסן', 'מבנה תעשייה', 'מלונאות', 'צימר', 'בית אבות ודיור מוגן', 'תחנת דלק', 'עסק למכירה'],
}
/** when nothing more exact is known: the plainest kind of each group */
export const DEFAULT_KIND: Record<PropGroup, string> = { home: 'דירה', business: 'שטח מסחרי' }

export const isKind = (group: PropGroup, kind: string | undefined | null): kind is string => !!kind && KINDS[group].includes(kind)

/** A kind that is measured in square metres and has no rooms: every commercial one, and a plot of land. */
export const hasRooms = (group: PropGroup, kind: string) => group === 'home' && kind !== 'מגרש'

/** kinds that belong to "מסחרי" only (so "מגרש", which is in both, says nothing about the group) */
const ONLY_BUSINESS = KINDS.business.filter((k) => !KINDS.home.includes(k))
/** what was written before the list existed, and still means an office or a business property */
const OLD_BUSINESS = /משרדי\/עסקי|משרד|עסק|מסחר|חנות/

/** Is this word (a kind, or an older label) a commercial one? */
export const isBusinessWord = (word: string | undefined | null) => !!word && (ONLY_BUSINESS.includes(word) || OLD_BUSINESS.test(word))

/**
 * Older words, and words a title may carry, in the order they are looked for (the longer and the more exact first:
 * "מיני פנטהאוז" before "פנטהאוז", "בניין משרדים" before "משרד").
 */
const WORDS: Record<PropGroup, [RegExp, string][]> = {
  home: [
    [/מיני[\s-]?פנטהאוז/, 'מיני פנטהאוז'],
    [/פנטהאוז/, 'פנטהאוז'],
    [/דירת[\s-]גג/, 'דירת גג'],
    [/דירת[\s-]גן/, 'דירת גן'],
    [/דופלקס/, 'דופלקס'],
    [/קוטג/, "קוטג'"],
    [/דו[\s-]משפחתי/, 'בית דו משפחתי'],
    [/וילה/, 'וילה'],
    [/בית פרטי/, 'בית פרטי'],
    [/סטודיו/, 'סטודיו'],
    [/יחידת דיור/, 'יחידת דיור'],
    [/מרתף/, 'מרתף'],
    [/סאבלט/, 'סאבלט'],
    [/מגרש/, 'מגרש'],
  ],
  business: [
    [/בניין משרדים/, 'בניין משרדים'],
    [/חלל עבודה/, 'חלל עבודה משותף'],
    [/משרד(?!י)/, 'משרד'],
    [/חנות/, 'חנות'],
    [/מרפאה|קליניקה/, 'מרפאה'],
    [/אולם/, 'אולם אירועים'],
    [/מחסן/, 'מחסן'],
    [/תעשי/, 'מבנה תעשייה'],
    [/מלון|מלונא/, 'מלונאות'],
    [/צימר/, 'צימר'],
    [/בית אבות|דיור מוגן/, 'בית אבות ודיור מוגן'],
    [/תחנת דלק/, 'תחנת דלק'],
    [/עסק למכירה/, 'עסק למכירה'],
    [/מבנה מסחרי/, 'מבנה מסחרי'],
    [/מגרש/, 'מגרש'],
  ],
}

/** the closest kind of the group's list to a free word or a title; the group's plainest kind when nothing fits */
export function closestKind(group: PropGroup, ...words: (string | undefined | null)[]): string {
  for (const w of words) {
    if (!w) continue
    if (isKind(group, w)) return w
    const hit = WORDS[group].find(([re]) => re.test(w))
    if (hit) return hit[1]
  }
  return DEFAULT_KIND[group]
}

/**
 * The group and the kind of anything that holds a property: a CRM card, a post in the community, a search.
 * `group` and `kind` as they were saved win; an older record is read from its old label and its title.
 */
export function kindOf(x: { group?: PropGroup | null; kind?: string | null; oldCategory?: string | null; title?: string | null; business?: boolean }): { group: PropGroup; kind: string } {
  const group: PropGroup = x.group ?? (x.business || (x.oldCategory && x.oldCategory !== 'home') || (!isKind('home', x.kind) && isBusinessWord(x.kind)) ? 'business' : 'home')
  return { group, kind: closestKind(group, x.kind, x.title) }
}

/** "דירת 4 חדרים בפתח תקווה", "פנטהאוז 5 חדרים בתל אביב", "משרד 120 מ"ר בחולון", "מגרש בחדרה" */
export function kindTitle(group: PropGroup, kind: string, o: { rooms?: number | null; sqm?: number | null; city?: string }) {
  const where = o.city ? ` ב${o.city}` : ''
  if (!hasRooms(group, kind)) return `${kind}${o.sqm ? ` ${o.sqm} מ"ר` : ''}${where}`
  const rooms = o.rooms ? `${o.rooms} חדרים` : ''
  if (kind === 'דירה') return `דירת ${rooms || 'מגורים'}${where}`
  return `${kind}${rooms ? ` ${rooms}` : ''}${where}`
}

/** Does a property of this group and kind answer a search for these kinds? An empty search takes every kind of its group. */
export function kindFits(p: { group: PropGroup; kind: string }, wanted: string[] | undefined, wantedGroup: PropGroup): boolean {
  if (p.group !== wantedGroup) return false
  const list = (wanted ?? []).filter((k) => isKind(wantedGroup, k))
  // nothing named, or only an older general word ("משרדי/עסקי"): every kind of the group
  return list.length === 0 || list.includes(p.kind)
}

/** the group a search is for: as it was saved, or read from its kinds (an older search) */
export const searchGroup = (s: { group?: PropGroup | null; kinds?: string[] }): PropGroup => s.group ?? (s.kinds?.some((k) => isBusinessWord(k)) ? 'business' : 'home')
