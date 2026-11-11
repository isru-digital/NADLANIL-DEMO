import { PLATFORM_NAME } from '../config'

/**
 * Joining the office (green version). The office takes 0% of the commission; its membership fee and commitment
 * period are NOT decided yet, so every screen shows the placeholders below.
 * The one exception is the calculator on the office page: Itzik chose (11.11.2026) to keep it working with the
 * example fee of 689 a month, so the numbers below are used there and nowhere else.
 */
export const OFFICE_NAME = `משרד ${PLATFORM_NAME}`
export const OFFICE_PRICE = 689
export const OFFICE_MIN_MONTHS = 3
export const OFFICE_MIN_TOTAL = OFFICE_PRICE * OFFICE_MIN_MONTHS
export const OFFICE_YEAR = OFFICE_PRICE * 12

/** What every screen shows instead of a price, until one is decided. */
export const PRICE_TBD = 'מחיר יקבע'
export const COMMIT_TBD = 'תקופת התחייבות - יקבע'

export const shekel = (n: number) => `₪${Math.round(n).toLocaleString('he-IL')}`
