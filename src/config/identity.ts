/**
 * A small signal: the signed-in person has just changed how they appear (they saved "עריכת פרופיל").
 * auth/profile.ts listens first and rewrites the app's "current broker"; the app's root listens next and draws
 * every screen again, so the new name and picture are everywhere at once, with no reload.
 */
const listeners = new Set<() => void>()
let version = 0

export const identity = {
  version: () => version,
  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },
  changed() {
    version++
    // in the order they were added: the data first, the screens after it
    listeners.forEach((fn) => fn())
  },
}
