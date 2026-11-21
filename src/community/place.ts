import type { CrmItem, PropertyInfo } from '../data/demo'

/**
 * Where a property is, as each one may see it (Itzik 22.11.2026):
 *  - every broker in the community: the city, the neighbourhood and the STREET, always;
 *  - the building's number too, only when the broker who put the property in turned "להציג מספר בניין" on;
 *  - the flat's number and the full address: only that broker, on their own card and their own property page.
 * A notice on a phone's lock screen carries the city and the neighbourhood only (`lockScreenPlace`), since anyone
 * near the phone can read it. Names and phones of clients are not part of any of these.
 */

/** "הרצל" is said "רחוב הרצל"; "שדרות רוטשילד" and "סמטת הכרמים" already say what they are */
const NAMED = /^(רחוב|רח'|רח׳|שדרות|שד'|שד׳|שדרת|סמטת|סמטה|דרך|כיכר|מעלה|מעלות|נתיב|טיילת|מבוא|משעול)\s/
export const streetName = (street: string) => (NAMED.test(street.trim()) ? street.trim() : `רחוב ${street.trim()}`)

/** the street as the community sees it: with the building's number only if the post carries it */
export const streetOf = (p: Pick<PropertyInfo, 'street' | 'houseNo'>) => (p.street ? `${streetName(p.street)}${p.houseNo ? ` ${p.houseNo}` : ''}` : '')

/**
 * What a card saved in the CRM gives to its post. A card saved before the new rule was promised that its street stays
 * with the broker, so it gives nothing (`showHouseNo` was not a choice then); a card saved since gives the street, and
 * the number when the broker chose to show it. The flat's number is never given.
 */
export const publicPlace = (item: Pick<CrmItem, 'street' | 'houseNo' | 'showHouseNo'>): Pick<PropertyInfo, 'street' | 'houseNo'> =>
  item.showHouseNo === undefined || !item.street?.trim() ? {} : { street: item.street.trim(), ...(item.showHouseNo && item.houseNo?.trim() ? { houseNo: item.houseNo.trim() } : {}) }

/** the full address, for the broker who put the property in and for nobody else */
export const fullAddress = (item: Pick<CrmItem, 'street' | 'houseNo' | 'aptNo' | 'neighborhood' | 'city'>) =>
  item.street ? [`${item.street}${item.houseNo ? ` ${item.houseNo}` : ''}`, item.aptNo ? `דירה ${item.aptNo}` : '', item.neighborhood ?? '', item.city].filter(Boolean).join(', ') : null

/** for a notice that shows on a locked phone: the city and the neighbourhood, never the street */
export const lockScreenPlace = (p: Pick<PropertyInfo, 'area'>) => p.area.split(' · ')[0].trim()
