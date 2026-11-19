// The community feed's top (green version, since 17.11.2026 a personal welcome in place of the paper's nameplate and
// figures): a room is a filter (one tap shows that topic, a second goes back), the posts keep their own shapes, the
// welcome reads well at night, stands still with reduced motion, and nothing breaks on a narrow phone.
// The welcome's own words, cards and actions are checked in welcome-check.mjs.
// Usage: node scripts/feed-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/feed'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const PREVIEW = '6d5eaaca072bf02f647051d8688d1337a4ab7a6cb92a2a8b3924cf91fda89e8b'
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`
  results.push(line)
  console.error(line)
}
const state = (page) =>
  page.evaluate(() => {
    const lum = (c) => {
      const [r, g, b] = c.match(/[\d.]+/g).map(Number)
      return Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)
    }
    // 19.11.2026: the top of the feed is light; the share line stands where the hello stood
    const hello = document.querySelector('[data-act="share"]')
    const wl = document.querySelector('[data-welcome]')
    return {
      path: location.pathname.replace(/^\/NADLANIL-DEMO(\/green)?/, '') + location.search,
      hello: !!hello,
      rooms: [...document.querySelectorAll('[data-room]')].map((r) => ({ id: r.dataset.room, on: r.getAttribute('aria-pressed') === 'true' })),
      rail: Object.fromEntries([...document.querySelectorAll('.comm-rail .rail-btn')].map((b) => [b.querySelector('.rail-label')?.textContent.trim(), Number(b.querySelector('.rail-count')?.textContent)])),
      // 19.11.2026: the header with the search field left the page; the title for screen readers stayed
      h1: document.querySelector('.fbx-page > h1')?.textContent.trim(),
      h1Seen: (document.querySelector('.fbx-page > h1')?.getBoundingClientRect().width ?? 0) > 2,
      cards: document.querySelectorAll('.fb.ci').length,
      topics: [...new Set([...document.querySelectorAll('.fb.ci .fb-topic')].map((t) => t.textContent.trim()))],
      ov: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      helloLum: hello ? lum(getComputedStyle(hello).color) : 0,
      paperLum: wl ? lum(getComputedStyle(wl).backgroundColor) : 0,
      anim: wl ? getComputedStyle(wl).animationName : '',
      meLink: (document.querySelector('.me-card .me-link')?.getBoundingClientRect().width ?? 0) > 0,
      fits: (() => {
        const r = wl?.getBoundingClientRect()
        return !!r && r.left >= 0 && r.right <= innerWidth + 1
      })(),
    }
  })

for (const dev of [{ name: 'desktop', vp: { width: 1440, height: 900 } }, { name: 'phone', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } }]) {
  const d = dev.name
  const page = await browser.newPage()
  await page.evaluateOnNewDocument((h) => {
    try {
      localStorage.setItem('nadlanup-demo-v1', '1')
      localStorage.setItem('nadlanup-preview-v1', h)
    } catch {}
  }, PREVIEW)
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.setViewport(dev.vp)
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate((h) => {
    localStorage.clear()
    localStorage.setItem('nadlanup-demo-v1', '1')
    localStorage.setItem('nadlanup-preview-v1', h)
    localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 }))
  }, PREVIEW)
  await page.goto(green + '/app/community', { waitUntil: 'load' })
  await wait(2000)
  let s = await state(page)
  check(`${d} the feed opens with the share line and the rooms`, s.hello && s.rooms.map((r) => r.id).join() === 'all,coop,seeking,referrals,knowledge,posts,wins' && s.rooms[0].on, JSON.stringify(s.rooms))
  check(`${d} the old plain title stays for screen readers, out of sight`, s.h1 === 'קהילה' && !s.h1Seen)
  check(`${d} nothing scrolls sideways`, s.ov <= 1, `${s.ov}px`)
  check(`${d} a community member's card does not lead to the landing page (it belongs to the office)`, !s.meLink || d === 'phone')
  await page.screenshot({ path: `${out}/${d}-1-front.png` })

  // a room is a filter
  await page.evaluate(() => document.querySelector('[data-room="seeking"]').click())
  await wait(1100)
  s = await state(page)
  check(`${d} a tap on a room shows that topic only`, s.path === '/app/community?topic=seeking' && s.rooms.find((r) => r.id === 'seeking').on && s.cards === s.rail['מחפש לקונה'] && s.topics.join() === 'מחפש לקונה', JSON.stringify({ p: s.path, c: s.cards, t: s.topics }))
  await page.screenshot({ path: `${out}/${d}-2-filtered.png` })
  await page.evaluate(() => document.querySelector('[data-room="seeking"]').click())
  await wait(1100)
  s = await state(page)
  check(`${d} a second tap goes back to every topic`, s.path === '/app/community' && !s.rooms.find((r) => r.id === 'seeking').on && s.topics.length > 2)

  // the cards speak in their own shapes
  const shapes = await page.evaluate(() => {
    const tag = document.querySelector('.fb-prop:has(.fb-media) .fb-facts > strong')
    const ticket = document.querySelector('.fb-search')
    return { tag: tag ? getComputedStyle(tag).position : null, ticket: ticket ? getComputedStyle(ticket).outlineStyle : null, h3: getComputedStyle(document.querySelector('.fb-embed h3')).fontFamily.split(',')[0].replace(/["']/g, '') }
  })
  check(`${d} a listing carries its price on the photo, a wanted notice is a ticket, and titles are in the serif face`, shapes.tag === 'absolute' && shapes.ticket === 'dashed' && shapes.h3 === 'Frank Ruhl Libre', JSON.stringify(shapes))

  // night
  await page.evaluate(() => localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'night', until: Date.now() + 9e9 })))
  await page.reload({ waitUntil: 'load' })
  await wait(2000)
  s = await state(page)
  check(`${d} at night the share line is light on a dark top`, s.helloLum > 150 && s.paperLum < 60, `${s.helloLum} on ${s.paperLum}`)
  await page.screenshot({ path: `${out}/${d}-3-night.png` })

  // reduced motion: the welcome stands still
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.reload({ waitUntil: 'load' })
  await wait(1400)
  s = await state(page)
  check(`${d} with reduced motion the welcome does not move`, s.anim === 'none', s.anim)
  await page.emulateMediaFeatures([])

  check(`${d} no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

// a narrow phone
{
  const page = await browser.newPage()
  await page.evaluateOnNewDocument((h) => {
    try {
      localStorage.setItem('nadlanup-demo-v1', '1')
      localStorage.setItem('nadlanup-preview-v1', h)
    } catch {}
  }, PREVIEW)
  await page.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true })
  await page.goto(green + '/app/community', { waitUntil: 'load' })
  await wait(2000)
  const s = await state(page)
  check('360px: the welcome fits, nothing scrolls sideways', s.ov <= 1 && s.fits, `${s.ov}px`)
  await page.close()
}

console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
