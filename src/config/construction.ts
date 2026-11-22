/**
 * "האתר בבנייה" (Itzik, 17.11.2026): while a big round of changes is made, every visitor sees one page that says the
 * system is being upgraded, on every address (/kehila, /kehila/join, /kehila/login, /kehila/admin, /demo, all of it).
 *
 * THE SWITCH. One word on the line `export const UNDER_CONSTRUCTION = ...` below, then commit and push. Nothing else.
 *   false = the site is open: every address shows the platform itself.
 *   true  = "the site is being upgraded": every visitor sees the one page, on every address.
 * 21.11.2026: Itzik opened the site ("open the site") to show it to the partners.
 * 22.11.2026: after the meeting Itzik closed it again (`true`), the page exactly as it was before.
 *
 * THE WAY IN (Itzik 22.11.2026, in place of the preview key and the five taps on the logo): "כניסת צוות" on the page
 * itself. A partner writes the address they are staff with, the server sends a code of six digits ONLY to an address
 * of its own `staff` table (/api/staff-login), and the code opens a session, the same one the usual sign-in opens.
 * From then on the site opens on this device for as long as the session lives (the server gives it 30 days).
 * Who is on the list is the server's answer alone: the list is in D1, never in this code.
 * This is a curtain, not a lock: the site's code is public (GitHub Pages, a public repo), so someone determined can
 * still read it. The server checks every sign-in and every admin screen on its own, as before.
 */
export const UNDER_CONSTRUCTION = true

/** where auth/session.ts keeps the session of whoever signed in (read here, never written) */
const SESSION = 'nadlanup-session-v1'
/** on this computer the checks run against the real site, unless ?gate=on asks to see the curtain */
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)

const get = (k: string, s: Storage = localStorage) => {
  try {
    return s.getItem(k)
  } catch {
    return null
  }
}
const set = (k: string, v: string | null, s: Storage = localStorage) => {
  try {
    if (v === null) s.removeItem(k)
    else s.setItem(k, v)
  } catch {
    /* storage unavailable: the curtain stays */
  }
}

/** Is a member of the staff signed in on this device? Their session was given by the server, for a code it mailed. */
export function staffHere(): boolean {
  try {
    const s = JSON.parse(get(SESSION) ?? 'null') as { staff?: { email?: string } | null } | null
    return !!s?.staff?.email
  } catch {
    return false
  }
}

/** Is the real site open for this browser? */
export async function siteOpen(): Promise<boolean> {
  // on this computer the page can still be called up with ?gate=on, so the checks of the page and of the way in keep
  // running while the switch is off, and bringing the page back is known to work
  const url = new URL(location.href)
  const gate = url.searchParams.get('gate')
  if (gate !== null) {
    url.searchParams.delete('gate')
    history.replaceState(history.state, '', url.pathname + url.search + url.hash)
  }
  if (gate === 'on') set('nadlanup-gate-test', '1', sessionStorage)
  if (gate === 'off') set('nadlanup-gate-test', null, sessionStorage)
  if (!UNDER_CONSTRUCTION && !LOCAL) return true
  if (staffHere()) return true
  return LOCAL && get('nadlanup-gate-test', sessionStorage) !== '1'
}
