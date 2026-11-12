// The logo, top right, on every screen, and a click on it goes to the home page.
// Usage: node scripts/logo-home-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => console.error((ok ? 'ok   ' : 'FAIL ') + name, detail) || results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`)

const routes = (process.env.ROUTES ?? '/,/join,/join/office,/about,/upgrade,/app,/app/community,/app/brokers,/app/crm,/app/builder,/app/folder,/app/office,/app/office/leads,/app/office/report,/app/office/pitch,/app/office/growth,/app/office/deal,/app/office/assistant,/app/office/benefits,/app/office/badge,/app/agent,/b/demo,/f/demo,/agent/demo')
  .split(',')
  .map((r) => (r === 'home' ? '/' : r.startsWith('/') ? r : '/' + r))

// finds the platform logo that is a link to the home page, in the top strip of the screen
const probe = () =>
  document.fonts.ready.then(() => {
    const homes = [...document.querySelectorAll('a')].filter((a) => {
      return /\/NADLANIL-DEMO(\/green)?\/?$/.test(a.pathname) && a.querySelector('.logo img')
    })
    const vis = homes
      .map((a) => ({ a, r: a.getBoundingClientRect() }))
      .filter(({ a, r }) => r.width > 8 && r.height > 8 && getComputedStyle(a).visibility !== 'hidden' && !a.closest('[hidden]'))
    if (!vis.length) return { found: false }
    // the highest one on the screen at the top of the page
    vis.sort((x, y) => x.r.top - y.r.top)
    const { a, r } = vis[0]
    const stack = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return {
      found: true,
      top: Math.round(r.top + scrollY),
      right: Math.round(innerWidth - r.right),
      left: Math.round(r.left),
      w: Math.round(r.width),
      reachable: !!stack && a.contains(stack),
      inside: r.left >= 0 && r.right <= innerWidth,
    }
  })

for (const dev of [{ name: 'desktop', vp: { width: 1440, height: 900 } }, { name: 'phone', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } }]) {
  const page = await browser.newPage()
  await page.setViewport(dev.vp)
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate(() => {
    localStorage.setItem('nadlanup-member-v1', 'office')
    localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 }))
  })
  for (const r of routes) {
    await page.goto(green + r, { waitUntil: 'load' })
    await wait(1500)
    await page.evaluate(() => window.scrollTo(0, 0))
    const s = await page.evaluate(probe)
    const where = s.found ? `top=${s.top} right=${s.right} left=${s.left} w=${s.w}` : 'none'
    // top right: in the upper part of the screen, and on the right half (the page is right to left)
    const ok = s.found && s.top < 130 && s.left > dev.vp.width / 2 - 40 && s.reachable && s.inside
    check(`${dev.name} ${r}: logo link top right and reachable`, ok, where)
    if (process.env.SHOTS) await page.screenshot({ path: `${out}/logo-${dev.name}-${r === '/' ? 'home' : r.slice(1).replace(/\//g, '-')}.png`, clip: { x: 0, y: 0, width: dev.vp.width, height: 160 } })
  }
  // a click on it from a deep screen goes to the home page
  for (const r of ['/app/office/leads', '/app/crm', '/about', '/b/demo', '/f/demo', '/agent/demo']) {
    await page.goto(green + r, { waitUntil: 'load' })
    await wait(1400)
    const clicked = await page.evaluate(() => {
      const a = [...document.querySelectorAll('a')].filter((x) => /\/NADLANIL-DEMO(\/green)?\/?$/.test(x.pathname) && x.querySelector('.logo img'))
        .map((x) => ({ x, r: x.getBoundingClientRect() })).filter(({ r }) => r.width > 8)
        .sort((p, q) => p.r.top - q.r.top)[0]
      if (!a) return false
      a.x.click()
      return true
    })
    await wait(900)
    const path = await page.evaluate(() => location.pathname)
    check(`${dev.name} click on the logo from ${r} goes home`, clicked && /\/NADLANIL-DEMO(\/green)?\/?$/.test(path), path)
  }
  await page.close()
}

await browser.close().catch(() => {})
console.log(results.join('\n'))
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
