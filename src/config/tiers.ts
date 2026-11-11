import { useSyncExternalStore } from 'react'

/**
 * The three layers of the demo (green version):
 *   1. the community, always free;
 *   2. advanced tools paid per use with credits, for community members who are not in the office;
 *   3. the office: every advanced tool is included, inside a monthly quota.
 * Nothing here is real: the balance, the charge and the quota are demo numbers that live in this browser.
 * A credit has no price yet, so no screen shows one.
 */
export type ToolTier = 'free' | 'credits'

/** Each beta tool's layer, and what one use costs a community member in credits. */
export const TOOLS: Record<string, { tier: ToolTier; cost: number }> = {
  whatsapp: { tier: 'free', cost: 0 },
  trust: { tier: 'free', cost: 0 },
  urgent: { tier: 'credits', cost: 1 },
  voice: { tier: 'credits', cost: 1 },
  pros: { tier: 'credits', cost: 2 },
  folder: { tier: 'credits', cost: 2 },
  radar: { tier: 'credits', cost: 2 },
  matchmaker: { tier: 'credits', cost: 2 },
  wallet: { tier: 'credits', cost: 2 },
  room: { tier: 'credits', cost: 3 },
}
export const FREE_IDS = Object.keys(TOOLS).filter((id) => TOOLS[id].tier === 'free')
export const PAID_IDS = Object.keys(TOOLS).filter((id) => TOOLS[id].tier === 'credits')
export const isPaid = (id: string) => TOOLS[id]?.tier === 'credits'

/** Demo numbers: a community member starts with 12 credits, an office member with 3 of 10 monthly uses taken. */
export const CREDITS_START = 12
export const QUOTA = 10
export const QUOTA_START = 3
/** A community member gets one free urgent request a month. */
export const URGENT_FREE = 1

export type Wallet = {
  credits: number
  /** paid tools a community member has opened with credits */
  opened: string[]
  urgentFreeUsed: boolean
  quotaUsed: number
  /** advanced tools an office member has opened this month, inside the quota */
  openedOffice: string[]
}

const KEY = 'nadlanup-wallet-v1'
const start: Wallet = { credits: CREDITS_START, opened: [], urgentFreeUsed: false, quotaUsed: QUOTA_START, openedOffice: [] }

function load(): Wallet {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...start, ...(JSON.parse(raw) as Wallet) } : start
  } catch {
    return start
  }
}

let wallet: Wallet = load()
const listeners = new Set<() => void>()

function commit(next: Wallet) {
  wallet = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable: the numbers last until the page is closed */
  }
  listeners.forEach((l) => l())
}

/** Every action answers whether it changed anything, so a caller can speak only once. */
export const walletActions = {
  /** A community member opens a paid tool: the demo charge. False when there are not enough credits. */
  spend(id: string): boolean {
    const cost = TOOLS[id]?.cost ?? 0
    if (wallet.opened.includes(id) || wallet.credits < cost) return false
    commit({ ...wallet, credits: wallet.credits - cost, opened: [...wallet.opened, id] })
    return true
  },
  /** The one free urgent request of the month. */
  useUrgentFree(): boolean {
    if (wallet.urgentFreeUsed) return false
    commit({ ...wallet, urgentFreeUsed: true })
    return true
  },
  /** An office member opens an advanced tool: one use of the monthly quota. False when the quota is full. */
  useQuota(id: string): boolean {
    if (wallet.openedOffice.includes(id) || wallet.quotaUsed >= QUOTA) return false
    commit({ ...wallet, quotaUsed: wallet.quotaUsed + 1, openedOffice: [...wallet.openedOffice, id] })
    return true
  },
  /** Demo only: back to the starting balance, so the flow can be shown again. */
  refill() {
    commit({ ...wallet, credits: CREDITS_START, opened: [], urgentFreeUsed: false })
  },
  reset() {
    commit(start)
  },
  get(): Wallet {
    return wallet
  },
}

export function useWallet() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => wallet,
  )
}

/** "קרדיט אחד" / "2 קרדיטים" */
export const creditsText = (n: number) => (n === 1 ? 'קרדיט אחד' : `${n} קרדיטים`)
