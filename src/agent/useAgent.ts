import { useSyncExternalStore } from 'react'
import { emptyProfile, emptyState } from './agentData'
import type { AgentProfile, AgentState } from './agentData'

/**
 * The agent area's state: a small store that lives in this browser (localStorage) and is shared by the
 * area, the questionnaire and the public page. It is separate from the main demo store on purpose.
 */
const KEY = 'nadlanup-agent-v1'

function load(): AgentState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyState
    const s = JSON.parse(raw) as AgentState
    return { ...emptyState, ...s, profile: { ...emptyProfile, ...s.profile } }
  } catch {
    return emptyState
  }
}

let state: AgentState = load()
const listeners = new Set<() => void>()

function commit(next: AgentState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // a picture too large for the browser's storage: keep working in memory
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...next, profile: { ...next.profile, photo: '', gallery: [] } }))
    } catch {
      /* storage unavailable */
    }
  }
  listeners.forEach((l) => l())
}

export const agentActions = {
  patch(partial: Partial<AgentState>) {
    commit({ ...state, ...partial })
  },
  setProfile(partial: Partial<AgentProfile>) {
    commit({ ...state, profile: { ...state.profile, ...partial } })
  },
  reset() {
    commit(emptyState)
  },
}

export function useAgent() {
  const s = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
  return { ...s, ...agentActions }
}

/** Scales a chosen picture down so it fits comfortably in the browser's storage. */
export function readImage(file: File, max = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k)
      c.height = Math.round(img.height * k)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.84))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('not an image'))
    }
    img.src = url
  })
}
