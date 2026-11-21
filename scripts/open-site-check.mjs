// The site is open (Itzik 21.11.2026, "תפתח את האתר"): whoever comes to the main address sees the platform itself,
// not "האתר בבנייה". This check serves ./dist the way GitHub Pages does and opens it under a name that is NOT this
// computer's (nadlanup.test, mapped to this computer inside the browser only), so the code runs exactly as it does on
// the real address, where the switch alone decides. Every request that would leave this computer is written down and
// stopped (only the letters' fonts are let through), so nothing reaches the real server and no e-mail can go out.
//   1. a visitor, on a computer and a phone: the home page, the community's page, the sign-up form and the sign-in
//      page all open with no curtain, no error and nothing spilling sideways; the app itself stays closed to a visitor
//   2. the phone's top bar on the home page has "כניסה" next to "הצטרפות", each a full finger's height
//   3. the switch: the page "האתר בבנייה" and its key field are still in the built site (they are only switched off)
//   4. privacy in the feed (the open demo): no phone number and no call link in the feed or the list of brokers,
//      no street in a post, and the example user is not on a visitor's pages
//   5. nothing of Yad2: no link to it, no picture from it, no request to it, on any page that was opened
// Usage: npm run build:site && node scripts/open-site-check.mjs [outDir]
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const PORT = 5298
const PREFIX = '/NADLANIL-DEMO'
const HOST = 'nadlanup.test'
const site = `http://${HOST}:${PORT}${PREFIX}`
const out = process.argv[2] ?? '_shots/open-site'
fs.mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
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
const check = (name, ok, info) => {
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info) + ']'}`)
}
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars', `--host-resolver-rules=MAP ${HOST} 127.0.0.1`] })
process.on('uncaughtException', () => {})

const FONTS = /^fonts\.(googleapis|gstatic)\.com$/
const outside = new Set() // every address a page asked for that is not this computer's copy of the site
const fresh = async (vp, before) => {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)))
  await page.setRequestInterception(true)
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (u.protocol === 'data:' || u.protocol === 'blob:' || u.hostname === HOST) return r.continue()
    outside.add(u.hostname)
    // the letters' fonts may load (so the pictures show the real look); everything else stops here
    if (FONTS.test(u.hostname)) return r.continue()
    r.abort()
  })
  await page.setViewport(vp)
  // the look follows the hour; the pictures are always taken by day (MODE=night for the other one), so two runs match
  await page.evaluateOnNewDocument((m) => {
    try {
      localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: Date.now() + 9e9 }))
    } catch {}
  }, process.env.MODE === 'night' ? 'night' : 'day')
  if (before) await page.evaluateOnNewDocument(before)
  return { ctx, page, errors }
}
const DESK = { width: 1440, height: 900 }
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const look = (page) =>
  page.evaluate(() => {
    const t = document.body.innerText
    return {
      path: location.pathname,
      host: location.hostname,
      curtain: !!document.querySelector('[data-construction]') || t.includes('האתר בבנייה'),
      title: document.title,
      chars: t.length,
      wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      hero: !!document.querySelector('.hg-hero h1'),
      kehila: !!document.querySelector('.kh-hero'),
      form: !!document.querySelector('[data-f="name"]') && !!document.querySelector('[data-f="license"]'),
      login: !!document.querySelector('form.au-card [data-f="email"]'),
      feed: document.querySelectorAll('article').length,
      yad2: [...document.querySelectorAll('a[href*="yad2" i], img[src*="yad2" i], source[src*="yad2" i], iframe[src*="yad2" i], link[href*="yad2" i], script[src*="yad2" i]')].length,
      maya: t.includes('מאיה לנדאו'),
    }
  })

// ---------------------------------------------------------------- 1. a visitor at the real kind of address
const VISIT = [
  ['/', 'home', (s) => s.hero],
  ['/kehila', 'kehila', (s) => s.kehila],
  ['/kehila/join', 'join', (s) => s.form],
  ['/kehila/login', 'login', (s) => s.login],
  ['/about', 'about', (s) => s.chars > 400],
  ['/join/office', 'office', (s) => s.chars > 400],
]
for (const [dev, vp] of [['desktop', DESK], ['phone', PHONE]]) {
  const { ctx, page, errors } = await fresh(vp)
  for (const [p, name, there] of VISIT) {
    await page.goto(site + p, { waitUntil: 'load' })
    await wait(1800)
    const s = await look(page)
    check(`${dev}, a visitor at ${p}: the platform itself, no "האתר בבנייה"`, s.host === HOST && !s.curtain && !s.title.includes('בבנייה') && there(s), s)
    check(`${dev}, ${p}: nothing spills sideways, nothing of Yad2 in the page, and the example user is not on it`, s.wide <= 1 && s.yad2 === 0 && !s.maya, { wide: s.wide, yad2: s.yad2, maya: s.maya })
    if (['home', 'kehila', 'join', 'login'].includes(name)) await page.screenshot({ path: `${out}/${dev}-${name}.png` })
  }
  // the app is for members: a visitor who goes straight to the feed gets the door, not the feed
  await page.goto(site + '/app/community', { waitUntil: 'load' })
  await wait(1800)
  const door = await look(page)
  check(`${dev}, a visitor at /app/community: no curtain, and the feed stays closed (the way in is offered)`, !door.curtain && door.feed === 0 && door.chars > 60, door)
  await page.screenshot({ path: `${out}/${dev}-door.png` })

  if (dev === 'phone') {
    // ---------------------------------------------------------------- 2. "כניסה" in the phone's bar
    await page.goto(site + '/', { waitUntil: 'load' })
    await wait(1200)
    const bar = await page.evaluate(() => {
      const box = (e) => (e ? (({ width, height, left, right }) => ({ w: Math.round(width), h: Math.round(height), left: Math.round(left), right: Math.round(right) }))(e.getBoundingClientRect()) : null)
      const login = document.querySelector('.hg-nav .hg-login')
      const join = document.querySelector('.hg-nav .hg-nav-cta .btn')
      const logo = document.querySelector('.hg-nav-in > a')
      return { login: box(login), join: box(join), logo: box(logo), text: login?.textContent.trim(), to: login?.getAttribute('href'), heroTop: Math.round(document.querySelector('.hg-pill').getBoundingClientRect().top), cta: Math.round(document.querySelector('.hg-cta').getBoundingClientRect().bottom), vh: innerHeight }
    })
    check('phone, home: "כניסה" is in the top bar next to "הצטרפות", each a full finger high, and none of them touch', bar.text === 'כניסה' && bar.login.h >= 44 && bar.join.h >= 44 && bar.login.w > 30 && bar.login.right <= bar.logo.left - 4 && bar.join.right <= bar.login.left + 1 && /\/kehila\/login$/.test(bar.to), bar)
    check('phone, home: the promise starts right under the bar and both buttons are in the first screen', bar.heroTop < 130 && bar.cta < bar.vh * 0.62, bar)
    for (const w of [350, 360, 430]) {
      await page.setViewport({ ...PHONE, width: w })
      await wait(400)
      const fit = await page.evaluate(() => {
        const r = (q) => document.querySelector(q).getBoundingClientRect()
        return { wide: document.documentElement.scrollWidth - innerWidth, gap: Math.round(r('.hg-nav-in > a').left - r('.hg-nav .hg-login').right), shown: r('.hg-nav .hg-login').width > 0 }
      })
      check(`phone ${w}px wide: the bar holds the logo, "כניסה" and "הצטרפות" with air between them`, fit.shown && fit.gap >= 4 && fit.wide <= 1, fit)
    }
    await page.setViewport(PHONE)
  }
  check(`${dev}: no errors on a visitor's way`, errors.length === 0, errors.slice(0, 3))
  await ctx.close()
}

// ---------------------------------------------------------------- 3. the switch is only off: the page and its key are still there
const built = fs.readdirSync(path.join(dist, 'assets')).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(dist, 'assets', f), 'utf8')).join('\n')
const source = fs.readFileSync('src/config/construction.ts', 'utf8')
check('the switch is one line, and it says the site is open', /^export const UNDER_CONSTRUCTION = false\r?$/m.test(source) && (source.match(/^export const UNDER_CONSTRUCTION = (?:true|false)\r?$/gm) ?? []).length === 1)
check('"האתר בבנייה", the five taps and the key\'s check are still in the built site, only switched off', built.includes('האתר בבנייה') && built.includes('אנחנו משדרגים את המערכת') && built.includes('nadlanup-preview-v1') && /[0-9a-f]{64}/.test(source) && fs.existsSync('src/construction/Construction.tsx'))

// ---------------------------------------------------------------- 4. privacy in the feed, the open demo
const PHONE_NO = /(?:\+972|0)(?:[23489]|5\d|7\d)[\s-]?\d{3}[\s-]?\d{4}/
for (const [dev, vp] of [['desktop', DESK], ['phone', PHONE]]) {
  const { ctx, page, errors } = await fresh(vp)
  await page.goto(site + '/demo', { waitUntil: 'load' })
  await wait(2200)
  await page.goto(site + '/app/community', { waitUntil: 'load' })
  await wait(2200)
  // every post on the page, also the ones that come in on the way down
  for (let i = 0; i < 14; i++) {
    await page.evaluate(() => window.scrollBy(0, innerHeight * 0.9))
    await wait(160)
  }
  const feed = await page.evaluate((re) => {
    const rx = new RegExp(re)
    const posts = [...document.querySelectorAll('article')]
    return {
      posts: posts.length,
      phones: posts.filter((a) => rx.test(a.innerText)).map((a) => a.innerText.slice(0, 60)),
      tel: document.querySelectorAll('a[href^="tel:"], a[href*="wa.me"], a[href*="whatsapp.com/send"]').length,
      street: posts.filter((a) => /(?:רחוב|רח'|סמטת|שדרות)\s+\S+\s+\d{1,3}(?!\d)/.test(a.innerText)).map((a) => a.innerText.slice(0, 60)),
      yad2: document.querySelectorAll('a[href*="yad2" i], img[src*="yad2" i]').length,
      path: location.pathname,
    }
  }, PHONE_NO.source)
  check(`${dev}, the feed: posts are there, and not one of them carries a phone number, a call link or a street with a number`, feed.posts >= 3 && feed.phones.length === 0 && feed.tel === 0 && feed.street.length === 0, feed)
  await page.goto(site + '/app/brokers', { waitUntil: 'load' })
  await wait(1800)
  const list = await page.evaluate((re) => ({ chars: document.body.innerText.length, phone: new RegExp(re).test(document.querySelector('main')?.innerText ?? document.body.innerText), tel: document.querySelectorAll('main a[href^="tel:"]').length }), PHONE_NO.source)
  check(`${dev}, the list of brokers: no phone number and no call link`, list.chars > 300 && !list.phone && list.tel === 0, list)
  check(`${dev}, the feed and the list: nothing of Yad2, no errors`, feed.yad2 === 0 && errors.length === 0, { yad2: feed.yad2, errors: errors.slice(0, 2) })
  await ctx.close()
}

// ---------------------------------------------------------------- 5. where the pages tried to go
const hosts = [...outside]
check('no page asked for anything from Yad2', !hosts.some((h) => /yad2/i.test(h)), hosts)
const known = /^(fonts\.googleapis\.com|fonts\.gstatic\.com|nadlanup-api\.pages\.dev|nadlanup-api\.isru\.workers\.dev)$/
check("outside this site the pages ask only for the fonts and the community's own server", hosts.every((h) => known.test(h)), hosts)
console.log(`asked for outside the site (only the fonts were let through): ${hosts.join(', ') || 'nothing'}`)

console.log(fails ? `\nSOME CHECKS FAILED (${fails})` : '\nALL CHECKS PASSED')
server.close()
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(fails ? 1 : 0)
