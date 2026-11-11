// Checks the three opening panels on both homes: one open at a time, hover / tap / keyboard open another,
// the open one is wide (desktop) or tall (phone), nothing overflows, and the tour stops once the visitor takes over.
// Usage: node scripts/panels-check.mjs [outDir]   (BASE_GREEN / BASE_NAVY override the addresses)
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const out = process.argv[2] ?? '_shots'
fs.mkdirSync(out, { recursive: true })
const looks = [
  ['navy', process.env.BASE_NAVY ?? 'http://localhost:5230/NADLANIL-DEMO'],
  ['green', process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'],
]
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`)

const state = (page) =>
  page.evaluate(() => {
    const ps = [...document.querySelectorAll('.op-panel')]
    return {
      open: ps.map((p) => p.classList.contains('is-open')),
      expanded: ps.map((p) => p.querySelector('.op-hit').getAttribute('aria-expanded')),
      w: ps.map((p) => Math.round(p.getBoundingClientRect().width)),
      h: ps.map((p) => Math.round(p.getBoundingClientRect().height)),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })

for (const [look, base] of looks) {
  for (const [label, vp, phone] of [
    ['desktop', { width: 1440, height: 900 }, false],
    ['phone', { width: 375, height: 812, isMobile: true, hasTouch: true }, true],
  ]) {
    const page = await browser.newPage()
    const errors = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.setViewport(vp)
    await page.addStyleTag({ content: '' }).catch(() => {})
    await page.goto(base + '/', { waitUntil: 'load' })
    await page.evaluate(() => document.querySelector('.op')?.scrollIntoView({ block: 'center' }))
    await wait(1600)
    const tag = `${look} ${label}`

    const n = await page.evaluate(() => document.querySelectorAll('.op-panel').length)
    // the green home has a fourth panel, the office
    check(`${tag}: ${look === 'green' ? 'four' : 'three'} panels`, n === (look === 'green' ? 4 : 3), `${n}`)

    let s = await state(page)
    check(`${tag}: exactly one open at the start`, s.open.filter(Boolean).length === 1 && s.expanded.filter((v) => v === 'true').length === 1)

    // open the second panel: hover on desktop, tap on phone
    const rect = await page.evaluate(() => {
      const r = document.querySelectorAll('.op-panel')[1].getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    })
    if (phone) await page.touchscreen.tap(rect.x, rect.y)
    else await page.mouse.move(rect.x, rect.y)
    await wait(1200)
    s = await state(page)
    check(`${tag}: second panel opens`, s.open[1] === true && s.open.filter(Boolean).length === 1, JSON.stringify(s.open))
    if (phone) check(`${tag}: open panel is the tall one`, s.h[1] > s.h[0] * 3 && s.h[1] > s.h[2] * 3, s.h.join(','))
    else check(`${tag}: open panel is the wide one`, s.w[1] > s.w[0] * 3 && s.w[1] > s.w[2] * 3, s.w.join(','))
    check(`${tag}: no sideways overflow`, s.overflow <= 1, `${s.overflow}px`)

    // the open panel's text and product piece are inside it (not cut off)
    const fit = await page.evaluate(() => {
      const p = document.querySelectorAll('.op-panel')[1]
      const pr = p.getBoundingClientRect()
      const parts = ['h3', 'p', '.op-mock'].map((sel) => p.querySelector(sel).getBoundingClientRect())
      return parts.every((r) => r.left >= pr.left - 1 && r.right <= pr.right + 1 && r.top >= pr.top - 1 && r.bottom <= pr.bottom + 1)
    })
    check(`${tag}: title, text and product piece sit inside the panel`, fit)

    // keyboard: focusing the third panel's button opens it
    await page.evaluate(() => document.querySelectorAll('.op-hit')[2].focus())
    await wait(1000)
    s = await state(page)
    check(`${tag}: keyboard focus opens the third`, s.open[2] === true && s.expanded[2] === 'true')
    await page.screenshot({ path: `${out}/panels-${look}-${label}-3.png` })

    // after a visit by the user the tour no longer moves things
    const before = s.open.join()
    await wait(6200)
    s = await state(page)
    check(`${tag}: tour leaves it alone after the visitor chose`, s.open.join() === before)

    await page.mouse.move(rect.x, rect.y).catch(() => {})
    await page.evaluate(() => document.querySelectorAll('.op-hit')[0].focus())
    await wait(1000)
    await page.screenshot({ path: `${out}/panels-${look}-${label}-1.png` })
    await page.evaluate(() => document.querySelectorAll('.op-hit')[1].focus())
    await wait(1000)
    await page.screenshot({ path: `${out}/panels-${look}-${label}-2.png` })

    check(`${tag}: no console errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
    await page.close()
  }
}

// the tour: left alone on desktop the open panel changes by itself
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(looks[1][1] + '/', { waitUntil: 'load' })
  await page.evaluate(() => document.querySelector('.op')?.scrollIntoView({ block: 'center' }))
  await page.mouse.move(5, 5)
  await wait(1200)
  const a = (await state(page)).open.join()
  await wait(5600)
  const b = (await state(page)).open.join()
  check('green desktop: tour moves to the next panel by itself', a !== b, `${a} -> ${b}`)
  await page.close()
}

await browser.close().catch(() => {})
console.log(results.join('\n'))
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
