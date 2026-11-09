import { PLATFORM_NAME } from '../config'

/**
 * Joining the office (green version). The office is the paid way in: a fixed monthly fee, no percentage of the
 * commission, and a minimum commitment. Only after paying can a broker join it and open "הסוכן שלנו".
 * The numbers live here and nowhere else.
 */
export const OFFICE_NAME = `משרד ${PLATFORM_NAME}`
export const OFFICE_PRICE = 689
export const OFFICE_MIN_MONTHS = 3
export const OFFICE_MIN_TOTAL = OFFICE_PRICE * OFFICE_MIN_MONTHS
export const OFFICE_YEAR = OFFICE_PRICE * 12

export const shekel = (n: number) => `₪${Math.round(n).toLocaleString('he-IL')}`
