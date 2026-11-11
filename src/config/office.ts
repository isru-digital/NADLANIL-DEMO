import { PLATFORM_NAME } from '../config'

/**
 * Joining the office (green version). The office takes 0% of the commission and costs a fixed membership fee:
 * 689 a month (Itzik confirmed the price on 11.11.2026). The commitment period is NOT decided yet, so screens
 * show the placeholder below; the calculator still lets the visitor choose 3 to 12 months.
 * Credits (pay per use, for community members) have no price yet either.
 */
export const OFFICE_NAME = `משרד ${PLATFORM_NAME}`
export const OFFICE_PRICE = 689
export const OFFICE_MIN_MONTHS = 3
export const OFFICE_MIN_TOTAL = OFFICE_PRICE * OFFICE_MIN_MONTHS
export const OFFICE_YEAR = OFFICE_PRICE * 12

/** The membership fee as every screen writes it. */
export const OFFICE_FEE = `${OFFICE_PRICE} ₪ לחודש`
/** What is shown where a price is not decided yet (credits). */
export const PRICE_TBD = 'מחיר יקבע'
export const COMMIT_TBD = 'תקופת התחייבות - יקבע'

export const shekel = (n: number) => `₪${Math.round(n).toLocaleString('he-IL')}`
