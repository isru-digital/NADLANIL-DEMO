import { PLATFORM_NAME } from '../config'
import { FROM_FEE } from './pricing'

/**
 * Joining the office (green version). The office takes 0% of the commission and costs a monthly membership by
 * plan: BASIC, PLUS or PRO (the price list of 14.11.2026, in config/pricing.ts, replaced the single fee of 689).
 * Credits (pay per use, for community members) still have no price.
 */
export const OFFICE_NAME = `משרד ${PLATFORM_NAME}`

/** The membership fee where one short line stands for the three plans: "החל מ-549 ₪ + מע"מ לחודש". */
export const OFFICE_FEE = FROM_FEE
/** What is shown where a price is not decided yet (credits only). */
export const PRICE_TBD = 'מחיר יקבע'

export const shekel = (n: number) => `₪${Math.round(n).toLocaleString('he-IL')}`
