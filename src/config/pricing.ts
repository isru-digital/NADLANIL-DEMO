import { useSyncExternalStore } from 'react'
import { PLATFORM_NAME } from '../config'

/**
 * The office's price list (Itzik, 14.11.2026), replacing the single fee of 689. Every price and every line of text
 * here is written exactly as he gave it: nothing was added, no discounts, no values of its own. All prices are a
 * month and before VAT. "הסוכן שלנו" and everything that was "included in the office" are part of every plan.
 */
export const PRICING_TITLE = `מחירון ${PLATFORM_NAME} - מסלולי חברות`
export const PRICING_SUB = 'כל המחירים חודשיים ולפני מע"מ.'

export type PlanId = 'basic' | 'plus' | 'pro'
/** A line of a plan. `worth` is the value he wrote next to it; `none` marks the line that says what is not included. */
export type PlanLine = { text: string; worth?: string; none?: boolean }
export type Plan = { id: PlanId; name: string; price: number; lines: PlanLine[]; yad2: number }

export const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'BASIC',
    price: 549,
    yad2: 0,
    lines: [
      { text: 'חתימה טובה', worth: 'שווי 50 ₪ בחודש' },
      { text: "קהילה מלאה בחינם עם כל הפיצ'רים", worth: 'שווי 199 ₪ בחודש' },
      { text: 'ליווי שבועי - פגישה אישית עם אריאל', worth: 'שווי 350 ₪' },
      { text: 'ספריית ידע: תיק פרזנטציה מלא, קורס פייסבוק ממומן, תסריטי שיחות, טיפול בהתנגדויות, התנהלות נכונה מול קונים ועוד', worth: 'שווי 2,500 ₪' },
      { text: 'תוכנית עסקית מותאמת אישית עם יעדים שבועיים, חודשיים ושנתיים' },
      { text: 'השתייכות למשרד בפריסה ארצית + דף עסקי ממותג תחת שם המשרד' },
      { text: 'מענה לכל עזרה מקצועית' },
      { text: 'ללא מודעות יד2', none: true },
    ],
  },
  { id: 'plus', name: 'PLUS', price: 887, yad2: 5, lines: [{ text: 'כל שירותי BASIC' }, { text: '5 מודעות יד2' }] },
  { id: 'pro', name: 'PRO', price: 1219, yad2: 10, lines: [{ text: 'כל שירותי BASIC' }, { text: '10 מודעות יד2' }] },
]
export const planById = (id: PlanId) => PLANS.find((p) => p.id === id) ?? PLANS[0]

/** Madlan packages, on top of a plan. */
export const MADLAN_TITLE = 'חבילות מדלן - בתשלום נוסף'
export type MadlanId = 'none' | 'm5' | 'm10'
export const MADLAN_PACKS: { id: Exclude<MadlanId, 'none'>; label: string; ads: number; price: number }[] = [
  { id: 'm5', label: '5 מודעות מדלן', ads: 5, price: 265 },
  { id: 'm10', label: '10 מודעות מדלן', ads: 10, price: 390 },
]
export const MADLAN_EXTRA = { label: 'תוספת של 5 מודעות', ads: 5, price: 125 }
/** How many times the extra can be added in the demo's own controls (a limit of the screen, not of the price list). */
export const MADLAN_EXTRA_MAX = 10

export const TERMS_TITLE = 'תנאי ההתקשרות'
export const TERMS: [string, string][] = [
  ['חברות במשרד', 'התחייבות מינימלית ל-3 חודשים'],
  ['פרסום ביד2', 'התחייבות ל-3 חודשים'],
  ['פרסום במדלן', 'התחייבות ל-6 חודשים'],
  ['עמלות תיווך', '100% נשארות אצל הסוכן'],
  ['דמי הצטרפות', 'ללא עלות'],
]
export const MEMBER_MIN_MONTHS = 3
export const MADLAN_MIN_MONTHS = 6

const num = (n: number) => n.toLocaleString('he-IL')
/** "549 ₪ + מע"מ לחודש", the way every price is written. */
export const priceText = (n: number) => `${num(n)} ₪ + מע"מ לחודש`
/** Where one short line stands for the three plans. */
export const FROM_FEE = `החל מ-${num(PLANS[0].price)} ₪ + מע"מ לחודש`
/** What every plan also has (his fourth note). */
export const ALL_PLANS_NOTE = 'בכל המסלולים כלולים גם "הסוכן שלנו" וכל מה שכלול במשרד.'

// ---------------------------------------------------------------- what the visitor picked
export type PlanPick = { plan: PlanId; madlan: MadlanId; extra: number }
const KEY = 'nadlanup-plan-v1'
const start: PlanPick = { plan: 'basic', madlan: 'none', extra: 0 }

function load(): PlanPick {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<PlanPick> | null
    if (!p) return start
    const plan = PLANS.some((x) => x.id === p.plan) ? (p.plan as PlanId) : 'basic'
    const madlan = p.madlan === 'm5' || p.madlan === 'm10' ? p.madlan : 'none'
    return { plan, madlan, extra: madlan === 'none' ? 0 : Math.min(MADLAN_EXTRA_MAX, Math.max(0, Number(p.extra) || 0)) }
  } catch {
    return start
  }
}

let pick: PlanPick = load()
const listeners = new Set<() => void>()
const save = (next: PlanPick) => {
  // the extra is an addition to a package: with no package there is nothing to add to
  pick = next.madlan === 'none' ? { ...next, extra: 0 } : { ...next, extra: Math.min(MADLAN_EXTRA_MAX, Math.max(0, next.extra)) }
  try {
    localStorage.setItem(KEY, JSON.stringify(pick))
  } catch {
    /* storage unavailable: the choice lasts until the page is closed */
  }
  listeners.forEach((l) => l())
}

export const pickActions = {
  set(p: Partial<PlanPick>) {
    save({ ...pick, ...p })
  },
  /** One extra more or less. It reads the choice as it is now, so two quick clicks count as two. */
  bumpExtra(by: number) {
    save({ ...pick, extra: pick.extra + by })
  },
  reset() {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* nothing to remove */
    }
    pick = start
    listeners.forEach((l) => l())
  },
}

export function usePick() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => pick,
  )
}

/** The parts of a month's payment, before VAT: the plan, and Madlan if it was added. */
export function costOf(p: PlanPick) {
  const plan = planById(p.plan)
  const pack = MADLAN_PACKS.find((m) => m.id === p.madlan)
  const madlan = pack ? pack.price + p.extra * MADLAN_EXTRA.price : 0
  const madlanAds = pack ? pack.ads + p.extra * MADLAN_EXTRA.ads : 0
  return { plan, pack, madlan, madlanAds, month: plan.price + madlan, minMonths: pack ? MADLAN_MIN_MONTHS : MEMBER_MIN_MONTHS }
}
