import { useEffect, useState } from 'react'

/**
 * The site as an app on the home screen (Itzik 18.11.2026, stage 1 of phone notices).
 * - registers the Service Worker (public/sw.js) on the built site; locally only with ?sw=on, so the dev server's
 *   quick reloads are never held by it (?sw=off forgets it)
 * - keeps the browser's own "install" offer (Chrome on Android and on a computer) for the install guide's button
 * - tells which phone this is, and whether the site is already open as the app
 * Imported first thing by the entry file, so the browser's offer is never missed.
 */

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const SW_FLAG = 'nadlanup-sw'
let offer: InstallEvent | null = null
let installedNow = false
const listeners = new Set<() => void>()
const tell = () => listeners.forEach((f) => f())

function swWanted() {
  if (import.meta.env.PROD) return true
  try {
    const q = new URLSearchParams(location.search).get('sw')
    if (q === 'on') sessionStorage.setItem(SW_FLAG, '1')
    if (q === 'off') sessionStorage.removeItem(SW_FLAG)
    return sessionStorage.getItem(SW_FLAG) === '1'
  } catch {
    return false
  }
}

export function startApp() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => {
    // keep it for our own button instead of the browser's small bar
    e.preventDefault()
    offer = e as InstallEvent
    tell()
  })
  window.addEventListener('appinstalled', () => {
    offer = null
    installedNow = true
    tell()
  })
  if ('serviceWorker' in navigator && swWanted()) {
    const base = import.meta.env.BASE_URL
    const go = () => navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {})
    if (document.readyState === 'complete') go()
    else window.addEventListener('load', go, { once: true })
  }
}

export type Platform = 'ios' | 'android' | 'desktop'

export function platformOf(ua = navigator.userAgent, touch = navigator.maxTouchPoints): Platform {
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && touch > 1)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

/** Opened inside another app (WhatsApp, Instagram, Facebook): such a window cannot add to the home screen. */
export function inAppBrowser(ua = navigator.userAgent) {
  return /FBAN|FBAV|Instagram|WhatsApp|Line\/|; wv\)/i.test(ua)
}

export function runningAsApp() {
  return (
    installedNow ||
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** The install guide's view of all this, updated when the browser offers to install or the app is installed. */
export function useInstall() {
  const [, bump] = useState(0)
  useEffect(() => {
    const f = () => bump((n) => n + 1)
    listeners.add(f)
    return () => {
      listeners.delete(f)
    }
  }, [])
  return {
    platform: platformOf(),
    inApp: inAppBrowser(),
    installed: runningAsApp(),
    canPrompt: !!offer,
    /** the browser's own install window; true when the broker said yes */
    prompt: async () => {
      if (!offer) return false
      const e = offer
      offer = null
      await e.prompt()
      const { outcome } = await e.userChoice
      if (outcome === 'accepted') installedNow = true
      tell()
      return outcome === 'accepted'
    },
  }
}
