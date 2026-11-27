/**
 * "תיאור הנכס" (Itzik 27.11.2026): free words about a property, a few lines, not a must. The broker writes them on the
 * property form, and they show on the property's page and on its post in the community.
 * Every broker reads them, so a phone number or a client's name has no place there: the form says so under the field,
 * stops a description that carries a number or the owner's name, and whatever goes up is cleaned once more here.
 */
export const DESC_MAX = 600

/** an Israeli phone number as people write it: 050-555-0101, 0505550101, 03 555 1234, +972 50 555 0101 */
const PHONE = /(?:\+?972[\s-]?\d|0\d)(?:[\s-]?\d){7,8}/
const PHONE_ALL = new RegExp(PHONE.source, 'g')

export const hasPhone = (text: string) => PHONE.test(text)

/** What stops a description from being saved: a phone number in it, or the name written in "שם בעל הנכס". */
export function descProblem(desc: string, owner = ''): '' | 'phone' | 'name' {
  if (hasPhone(desc)) return 'phone'
  const name = owner.trim()
  return name.length >= 2 && desc.includes(name) ? 'name' : ''
}

/** the description as the community reads it: no phone number, no empty lines at its ends, never longer than the field */
export const cleanDesc = (desc: string | undefined | null) =>
  (desc ?? '')
    .replace(PHONE_ALL, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, DESC_MAX)
