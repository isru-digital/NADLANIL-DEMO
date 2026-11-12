import { useSyncExternalStore } from 'react'

/**
 * Day and night (Itzik, 12.11.2026): the same site in two moods, light like a sunny day and dark like an evening.
 * It follows the clock in Israel: light from 08:00 to 18:00, dark from 18:01 to 07:59. The visitor can always switch;
 * a choice made by hand lasts until the clock's next change (08:00 or 18:01), and then the site follows the clock again.
 * The mood is a `data-mode` attribute on <html>; the colours are in styles/day-night.css.
 */
export type Mode = 'day' | 'night'

const KEY = 'nadlanup-mode-v1'
const DAY_FROM = 8 * 60 // 08:00
const DAY_TO = 18 * 60 // 18:00, the last light minute

/** Minutes since midnight in Israel, whatever the visitor's own clock says. */
function israelMinutes(at: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(at)
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  return (n('hour') % 24) * 60 + n('minute')
}

export const modeByClock = (at = new Date()): Mode => {
  const m = israelMinutes(at)
  return m >= DAY_FROM && m <= DAY_TO ? 'day' : 'night'
}

/** When the clock next changes the mood: the moment a hand-made choice ends. */
function nextChange(at = new Date()) {
  const m = israelMinutes(at)
  const until = m < DAY_FROM ? DAY_FROM - m : m <= DAY_TO ? DAY_TO + 1 - m : 24 * 60 - m + DAY_FROM
  return at.getTime() - at.getSeconds() * 1000 - at.getMilliseconds() + until * 60_000
}

type Choice = { mode: Mode; until: number }

function loadChoice(): Choice | null {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Choice | null
    return c && (c.mode === 'day' || c.mode === 'night') && c.until > Date.now() ? c : null
  } catch {
    return null
  }
}

let choice: Choice | null = loadChoice()
let state: { mode: Mode; byHand: boolean } = { mode: choice?.mode ?? modeByClock(), byHand: !!choice }
const listeners = new Set<() => void>()

/** Pages a broker's client sees (landing page, folder, agent page) keep their own look and are always light. */
const alwaysDay = () => /\/(b|f|agent)\//.test(location.pathname)

function apply() {
  if (choice && choice.until <= Date.now()) {
    choice = null
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* storage unavailable */
    }
  }
  const next = { mode: alwaysDay() ? ('day' as Mode) : (choice?.mode ?? modeByClock()), byHand: !!choice }
  document.documentElement.dataset.mode = next.mode
  if (next.mode !== state.mode || next.byHand !== state.byHand) {
    state = next
    listeners.forEach((l) => l())
  }
}

export const dayNight = {
  /** Sets the mood on the page. Called before the first paint, on every navigation and once a minute. */
  apply,
  /** A choice by hand. Choosing what the clock says anyway goes back to following the clock. */
  set(mode: Mode) {
    choice = mode === modeByClock() ? null : { mode, until: nextChange() }
    try {
      if (choice) localStorage.setItem(KEY, JSON.stringify(choice))
      else localStorage.removeItem(KEY)
    } catch {
      /* storage unavailable: the choice lasts until the page is closed */
    }
    apply()
  },
  /** Back to following the clock. */
  auto() {
    dayNight.set(modeByClock())
  },
}

export function useDayNight() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
}
