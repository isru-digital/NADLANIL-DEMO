/**
 * "האתר בבנייה" (Itzik, 17.11.2026): while a big round of changes is made, every visitor sees one page that says the
 * system is being upgraded, on every address (/kehila, /kehila/join, /kehila/login, /kehila/admin, /demo, all of it).
 *
 * TO OPEN THE SITE TO EVERYONE AGAIN: set UNDER_CONSTRUCTION to false below, commit and push. Nothing else.
 *
 * Itzik's own way in: the link with ?preview=<his key> once, and this browser remembers it (localStorage). The key
 * itself is not in the code, only its SHA-256, so reading the code does not give it away. ?preview=off forgets it.
 * This is a curtain, not a lock: the site's code is public (GitHub Pages, a public repo), so someone determined can
 * still read it. The server checks every sign-in and every admin screen on its own, as before.
 */
export const UNDER_CONSTRUCTION = true

const KEY_HASH = '6d5eaaca072bf02f647051d8688d1337a4ab7a6cb92a2a8b3924cf91fda89e8b'
const STORE = 'nadlanup-preview-v1'
/** on this computer the checks run against the real site, unless ?gate=on asks to see the curtain */
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)

async function sha256(text: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

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

/** Is the real site open for this browser? Reads (and then removes) ?preview= from the address. */
export async function siteOpen(): Promise<boolean> {
  if (!UNDER_CONSTRUCTION) return true
  const url = new URL(location.href)
  const given = url.searchParams.get('preview')
  const gate = url.searchParams.get('gate')
  if (given !== null || gate !== null) {
    url.searchParams.delete('preview')
    url.searchParams.delete('gate')
    history.replaceState(history.state, '', url.pathname + url.search + url.hash)
  }
  if (gate === 'on') set('nadlanup-gate-test', '1', sessionStorage)
  if (gate === 'off') set('nadlanup-gate-test', null, sessionStorage)
  if (given === 'off') set(STORE, null)
  else if (given) {
    try {
      if ((await sha256(given)) === KEY_HASH) set(STORE, KEY_HASH)
    } catch {
      /* no crypto here (not https): the key cannot be checked */
    }
  }
  if (get(STORE) === KEY_HASH) return true
  return LOCAL && get('nadlanup-gate-test', sessionStorage) !== '1'
}

/** On this computer only, a key for the checks (scripts/curtain-key-check.mjs); it opens nothing on the real site. */
const LOCAL_TEST_HASH = 'ed80667ec3d95b40e0d38f0ca5661b5c2765c1dd62682640d0976f20bbd8254a'

/**
 * The key typed on the curtain itself (Itzik 18.11.2026): five taps on the logo open a field, with no link in sight.
 * It is for the app on an iPhone's home screen, which has its own storage and no address bar for ?preview=. The right
 * key is remembered exactly as ?preview= remembers it. Same curtain, not a lock: see the note at the top.
 */
export async function tryKey(key: string): Promise<boolean> {
  const k = key.trim()
  if (!k) return false
  try {
    const h = await sha256(k)
    if (h === KEY_HASH || (LOCAL && h === LOCAL_TEST_HASH)) {
      set(STORE, KEY_HASH)
      return get(STORE) === KEY_HASH
    }
  } catch {
    /* no crypto here (not https): the key cannot be checked */
  }
  return false
}
