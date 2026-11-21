import { useEffect } from 'react'
import type { CrmItem } from '../data/demo'
import { useStore } from '../store'
import { GROUPS, groupLabel, kindOf, kindTitle } from '../config/propertyTypes'
import type { PropGroup } from '../config/propertyTypes'

/**
 * A property's category (green version, Itzik 14.11.2026): not only private homes, also offices and business
 * properties, as ONE category, "משרדי/עסקי" (he asked not to split them). The category is picked when the property
 * is opened, shows on its card, and the board can be filtered by it. A property with no category is a private home
 * (everything the demo had before).
 */
export type PropCategory = PropGroup

/** 22.11.2026: the two categories are the two groups of config/propertyTypes.ts, "מגורים" and "מסחרי", and under each
    one the property has a kind of that group's list. A card saved before that keeps its category and gets the
    closest kind when it is read (`cardKind`). */
export const CATEGORIES = GROUPS

/** 'office' was a category of its own for a day: a card saved then counts as "משרדי/עסקי". */
export const categoryOf = (item: Pick<CrmItem, 'category'>): PropCategory => (item.category && item.category !== 'home' ? 'business' : 'home')
export const categoryLabel = (id: PropCategory) => groupLabel(id)
/** the kind of a card's property: as it was picked, or the closest one for a card that was saved before the list */
export const cardKind = (item: Pick<CrmItem, 'category' | 'ptype' | 'title'>) => kindOf({ group: categoryOf(item), kind: item.ptype, title: item.title }).kind
export const isCommercial = (item: Pick<CrmItem, 'category'>) => categoryOf(item) !== 'home'

/** What can be marked on an office or a business property (a home has its own list). */
export const commercialExtras = ['חניה', 'מעלית', 'ממ"ק', 'מיזוג', 'נגישות', 'חזית לרחוב', 'מחסן', 'משופץ']

/** "משרד 120 מ"ר בפתח תקווה" */
export const commercialTitle = (sqm: number, city: string, kind = 'שטח מסחרי') => kindTitle('business', kind, { sqm, city })

/** What the community reads under an office or a business property. Never the owner, never the broker's notes. */
export const commercialBody = 'נכס מסחרי חדש אצלי. פתוח לשיתוף פעולה עם מתווך שיש לו לקוח מתאים.'

/** Two demo properties, so the two new categories are not empty when the board opens. Invented, like all the demo's data. */
export const commercialSeed: CrmItem[] = [
  {
    id: 'cm1',
    kind: 'property',
    category: 'business',
    ptype: 'משרד',
    title: 'משרד 120 מ"ר בבניין משרדים',
    area: 'פתח תקווה, קריית מטלון',
    city: 'פתח תקווה',
    rooms: '-',
    sqm: 120,
    price: 1850000,
    status: 'active',
    client: 'ח. ברק',
    note: 'מושכר עד סוף השנה. אפשר לתאם ביקור בשעות הבוקר.',
    updated: 'עודכן אתמול',
    image: 'img/panel-office.webp',
  },
  {
    id: 'cm2',
    kind: 'property',
    category: 'business',
    ptype: 'חנות',
    title: 'חנות 45 מ"ר ברחוב ראשי',
    area: 'חולון, סוקולוב',
    city: 'חולון',
    rooms: '-',
    sqm: 45,
    price: 1250000,
    status: 'new',
    client: 'מ. דיין',
    note: 'חזית לרחוב. בעל הנכס גמיש על מועד המסירה.',
    updated: 'עודכן לפני יומיים',
  },
]
export const commercialSeedIds = commercialSeed.map((x) => x.id)

/**
 * Puts the two demo properties in the CRM when they are missing (a first visit, or after the demo starts again).
 * The shared demo data is not touched. Renders nothing.
 */
export function CommercialSeed() {
  const { crm, addCrm } = useStore()
  useEffect(() => {
    // last one first: each is added to the top of the list
    ;[...commercialSeed].reverse().forEach((item) => {
      if (!crm.some((x) => x.id === item.id) && !adding.has(item.id)) {
        adding.add(item.id)
        addCrm(item)
      }
    })
    // once they are in, they can be added again after a reset
    commercialSeedIds.forEach((id) => crm.some((x) => x.id === id) && adding.delete(id))
  }, [crm, addCrm])
  return null
}
const adding = new Set<string>()
