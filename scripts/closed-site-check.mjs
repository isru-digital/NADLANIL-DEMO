// The site is closed again (Itzik 22.11.2026, after the meeting): whoever has no key sees "האתר בבנייה" only, on
// every address, also on an inner page typed straight into the bar; Itzik's way in still works.
//   A. the built site (./dist), served the way GitHub Pages serves it, under a name that is not this computer's
//      (nadlanup.test, mapped here inside the browser only), so the code decides exactly as on the real address:
//      a visitor gets the one page on every path, on a computer and a phone, and nothing asks the community's server
//   B. five taps on the logo open the key's field (a finger on a phone, a mouse on a computer); a wrong key is refused
//   C. the browser that holds the key's fingerprint (what the right key, or ?preview=, leaves behind) gets the real
//      site, and what was built on 22.11.2026 is there: the kinds in two steps, the street's switch, the story's
//      switch, the price slider and "עמלת שת"פ"
//   D. on this computer (the dev server, ?gate=on) the key is typed in the field: the checks' own test key, which opens
//      nothing on the real site. The real key is never written anywhere: it is not needed for any of this.
// Usage: npm run build:site && node scripts/closed-site-check.mjs [outDir]    (D needs the green dev server, :5240)
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const PORT = 5297
const PREFIX = '/NADLANIL-DEMO'
const HOST = 'nadlanup.test'
const site = `http://${HOST}:${PORT}${PREFIX}`
const dev = 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/closed-site'
fs.mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const source = fs.readFileSync('src/config/construction.ts', 'utf8')
const KEY_HASH = source.match(/KEY_HASH = '([0-9a-f]{64})'/)[1]
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' }
const dist = path.resolve('dist')
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0])
  let file = url.startsWith(PREFIX) ? path.join(dist, url.slice(PREFIX.length)) : ''
  if (file && fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
  if (file && fs.existsSync(file) && file.startsWith(dist)) {
    res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' })
    return fs.createReadStream(file).pipe(res)
  }
  res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
  fs.createReadStream(path.join(dist, '404.html')).pipe(res)
})
await new Promise((r) => server.listen(PORT, r))

let fails = 0
let total = 0
const check = (name, ok, info) => {
  total++
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info) + ']'}`)
}
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars', `--host-resolver-rules=MAP ${HOST} 127.0.0.1`] })
process.on('uncaughtException', () => {})
const DEVICES = [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
]
const fresh = async (vp, { owner = false, mode = 'day' } = {}) => {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  const errors = []
  const api = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)))
  await page.setRequestInterception(true)
  page.on('request', (r) => {
    const h = new URL(r.url()).hostname
    if (/nadlanup-api/.test(h)) {
      api.push(h)
      return r.abort()
    }
    r.continue()
  })
  await page.setViewport(vp)
  await page.evaluateOnNewDocument(
    (o, h, m) => {
      try {
        if (o) localStorage.setItem('nadlanup-preview-v1', h)
        localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: Date.now() + 9e9 }))
      } catch {}
    },
    owner,
    KEY_HASH,
    mode,
  )
  return { ctx, page, errors, api }
}
const look = (page) =>
  page.evaluate(() => ({
    curtain: !!document.querySelector('[data-construction]'),
    words: document.querySelector('[data-construction]')?.innerText.replace(/\s+/g, ' ').trim() ?? '',
    title: document.title,
    app: !!document.querySelector('.hg-hero, .kh-hero, .app-shell, .shell, main.main, .jo, .au-card, .fbx-page, form input[data-f]'),
    logo: (() => {
      const l = document.querySelector('.uc-logo')
      return !!l && l.complete && l.naturalWidth > 0
    })(),
    wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    path: location.pathname,
  }))

check('the switch says the site is closed, on one line', (source.match(/^export const UNDER_CONSTRUCTION = (?:true|false)\r?$/gm) ?? []).join() === 'export const UNDER_CONSTRUCTION = true')

// ---------------------------------------------------------------- A. a visitor, on every kind of address
const PATHS = ['/', '/kehila', '/kehila/join', '/kehila/login', '/kehila/admin', '/kehila/enter', '/demo', '/app', '/app/community', '/app/crm?v=properties', '/app/brokers', '/app/property/p1', '/app/agent', '/about', '/join', '/join/office', '/office', '/install', '/agent/demo', '/o/p', '/b/demo', '/f/demo', '/green/', '/green/app/office', '/no-such-page']
for (const [d, vp] of DEVICES) {
  const t = await fresh(vp)
  const bad = []
  for (const p of PATHS) {
    await t.page.goto(site + p, { waitUntil: 'load' })
    await wait(900)
    const s = await look(t.page)
    if (!s.curtain || s.app || !s.words.includes('האתר בבנייה') || !s.words.includes('אנחנו משדרגים את המערכת, נחזור בקרוב') || s.title !== 'NadlanUP | האתר בבנייה' || s.wide > 1) bad.push({ p, ...s, words: s.words.slice(0, 60) })
    if (p === '/') await t.page.screenshot({ path: `${out}/${d}-1-closed.png` })
    if (p === '/app/crm?v=properties') await t.page.screenshot({ path: `${out}/${d}-2-closed-inner-page.png` })
  }
  check(`${d}, a visitor without the key: "האתר בבנייה" and nothing else on all ${PATHS.length} addresses, inner pages typed straight in too`, bad.length === 0, bad.slice(0, 3))
  const s = await look(t.page)
  check(`${d}: the page has its logo, and nothing spills sideways`, s.logo && s.wide <= 1, s)
  check(`${d}: not one request to the community's server, and no errors`, t.api.length === 0 && t.errors.length === 0, { api: t.api.length, errors: t.errors.slice(0, 2) })

  // ---------------------------------------------------------------- B. five taps on the logo, a wrong key
  await t.page.goto(site + '/', { waitUntil: 'load' })
  await t.page.waitForSelector('[data-construction] [data-logo]', { timeout: 15000 })
  await wait(500)
  const at = await t.page.$eval('[data-logo]', (e) => {
    const r = e.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })
  for (let i = 0; i < 5; i++) {
    if (d === 'phone') await t.page.touchscreen.tap(at.x, at.y)
    else await t.page.mouse.click(at.x, at.y)
    await wait(260)
  }
  const panel = await t.page.waitForSelector('[data-key-panel]', { timeout: 3000 }).then(() => true).catch(() => false)
  check(`${d}: five ${d === 'phone' ? 'finger taps' : 'clicks'} on the logo open the key's field`, panel)
  await wait(400)
  await t.page.screenshot({ path: `${out}/${d}-3-key-field.png` })
  await t.page.type('[data-f="preview-key"]', 'not-the-key')
  await t.page.click('[data-act="key-go"]')
  await wait(900)
  const wrong = await t.page.evaluate(() => ({ msg: document.querySelector('[data-msg="wrong"]')?.textContent.trim() ?? null, still: !!document.querySelector('[data-construction]'), kept: localStorage.getItem('nadlanup-preview-v1') }))
  check(`${d}: a wrong key is refused, says so, and opens nothing`, !!wrong.msg && wrong.still && wrong.kept === null, wrong)
  await t.page.screenshot({ path: `${out}/${d}-4-wrong-key.png` })
  await t.ctx.close()

  // ---------------------------------------------------------------- C. the owner's browser: the real site, and what was built
  const o = await fresh(vp, { owner: true })
  await o.page.goto(site + '/', { waitUntil: 'load' })
  await wait(1500)
  let s2 = await look(o.page)
  check(`${d}, the browser that holds the key: the real home page, not the curtain`, !s2.curtain && s2.app && !s2.title.includes('בבנייה'), s2)
  await o.page.goto(site + '/demo', { waitUntil: 'load' })
  await wait(2200)
  await o.page.goto(site + '/app/community', { waitUntil: 'load' })
  await wait(2000)
  const feed = await o.page.evaluate(() => ({ curtain: !!document.querySelector('[data-construction]'), story: document.querySelector('.stories [data-act="new-story"]')?.textContent.trim(), kind: document.querySelectorAll('article .fb-kind').length, filter: !!document.querySelector('[data-filter="kind"]') }))
  await o.page.goto(site + '/app/community?topic=coop', { waitUntil: 'load' })
  await wait(1800)
  const coopFilter = await o.page.evaluate(() => document.querySelectorAll('[data-filter="kind"] option').length)
  check(`${d}: behind the curtain the feed is there, with "סטורי חדש", kinds on the posts and "סוג נכס" in the filter`, !feed.curtain && feed.story === 'סטורי חדש' && feed.kind > 0 && coopFilter === 34, { feed, coopFilter })
  await o.page.goto(site + '/app/crm?v=properties', { waitUntil: 'load' })
  await wait(1800)
  await o.page.evaluate(() => document.querySelector('[data-act="new-card"]')?.click())
  const form = await o.page.waitForSelector('.ga-fields', { visible: true, timeout: 10000 }).then(() => true).catch(() => false)
  await wait(500)
  await o.page.evaluate(() => document.querySelector('.ga [data-cat="home"]')?.click())
  await wait(500)
  const parts = await o.page.evaluate(() => ({
    groups: [...document.querySelectorAll('.ga .pf-group')].map((g) => g.textContent.trim()).join('|'),
    kinds: document.querySelectorAll('.ga .pf-kind').length,
    houseNo: document.querySelector('[data-toggle="house-no"]')?.getAttribute('aria-checked'),
    story: document.querySelector('[data-toggle="as-story"]')?.getAttribute('aria-checked'),
    mamak: [...document.querySelectorAll('.ga [aria-label="תוספות"] .ga-pick')].some((b) => b.textContent.trim() === 'ממ"ק'),
    price: !!document.querySelector('.ga [data-slider="price"]'),
    coop: document.querySelector('.ga [data-f="coop"] .field-label')?.textContent.trim(),
  }))
  check(`${d}: and the new property form is all there: the two steps, the street's switch, the story's switch, ממ"ק, the price slider and "עמלת שת"פ"`, form && parts.groups === 'מגורים|מסחרי' && parts.kinds === 15 && parts.houseNo === 'false' && parts.story === 'false' && parts.mamak && parts.price && parts.coop?.startsWith('עמלת שת"פ'), parts)
  await o.page.$eval('.ga [data-f="price-field"]', (el) => el.scrollIntoView({ block: 'start' }))
  await wait(400)
  await o.page.screenshot({ path: `${out}/${d}-5-behind-the-curtain.png` })
  check(`${d}: no errors behind the curtain either`, o.errors.length === 0, o.errors.slice(0, 2))
  await o.ctx.close()

  // ---------------------------------------------------------------- D. the key typed in the field (this computer only)
  const k = await fresh(vp)
  let devUp = true
  await k.page.goto(dev + '/?gate=on', { waitUntil: 'load' }).catch(() => (devUp = false))
  if (devUp) {
    await k.page.waitForSelector('[data-construction] [data-logo]', { timeout: 15000 })
    await wait(500)
    const at2 = await k.page.$eval('[data-logo]', (e) => {
      const r = e.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    })
    for (let i = 0; i < 5; i++) {
      if (d === 'phone') await k.page.touchscreen.tap(at2.x, at2.y)
      else await k.page.mouse.click(at2.x, at2.y)
      await wait(260)
    }
    await k.page.waitForSelector('[data-f="preview-key"]', { visible: true, timeout: 3000 })
    // the checks' own key (src/config/construction.ts accepts it on this computer only), never the real one
    await k.page.type('[data-f="preview-key"]', 'local-test-key')
    await wait(200)
    await k.page.screenshot({ path: `${out}/${d}-6-key-typed.png` })
    await k.page.click('[data-act="key-go"]')
    await wait(700)
    await k.page.screenshot({ path: `${out}/${d}-7-key-ok.png` })
    await wait(2500)
    const inside = await look(k.page)
    check(`${d}: the key typed in the field opens the real site, and the browser keeps it`, !inside.curtain && inside.app && (await k.page.evaluate(() => localStorage.getItem('nadlanup-preview-v1'))) === KEY_HASH, inside)
    await k.page.screenshot({ path: `${out}/${d}-8-inside.png` })
  } else check(`${d}: the green dev server is up for part D`, false)
  await k.ctx.close()
}

console.log(fails ? `\nSOME CHECKS FAILED (${fails} of ${total})` : `\nALL CHECKS PASSED (${total})`)
server.close()
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(fails ? 1 : 0)
