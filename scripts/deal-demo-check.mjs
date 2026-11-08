// Checks the "חדר עסקה משותף" demo pop-up in both looks, on desktop and phone: it opens from the sidebar (desktop),
// from the "עוד" sheet (phone) and from the home panel; the match plays and wakes the button; the button moves
// to the deal room; it fits the screen; Escape closes it; no console errors. Saves screenshots of the key moments.
// Usage: node scripts/deal-demo-check.mjs [outDir]
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

const dialog = (page) =>
  page.evaluate(() => {
    const d = document.querySelector('.dr')
    if (!d) return null
    const r = d.getBoundingClientRect()
    const body = d.querySelector('.dr-body')
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      fitsScreen: r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 && r.left >= -1 && r.top >= -1,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      scene: d.querySelector('.dr-room') ? 'room' : d.querySelector('.dr-stage') ? 'match' : '',
      matched: !!d.querySelector('.dr-stage.is-matched'),
      goDisabled: d.querySelector('.dr-go')?.disabled,
      bodyScrolls: body ? body.scrollHeight > body.clientHeight + 2 : false,
    }
  })

for (const [look, base] of looks) {
  for (const [label, vp, phone] of [
    ['desktop', { width: 1440, height: 900 }, false],
    ['phone', { width: 375, height: 812, isMobile: true, hasTouch: true }, true],
  ]) {
    const tag = `${look} ${label}`
    const page = await browser.newPage()
    const errors = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.setViewport(vp)
    await page.goto(base + '/app', { waitUntil: 'load' })
    await wait(1500)

    // open: sidebar on desktop, the "עוד" sheet on a phone
    if (phone) {
      await page.evaluate(() => [...document.querySelectorAll('.bottom-link')].find((b) => b.textContent.includes('עוד'))?.click())
      await wait(700)
      await page.evaluate(() => [...document.querySelectorAll('.more-link')].find((b) => b.textContent.includes('חדר עסקה'))?.click())
    } else {
      const chip = await page.evaluate(() => !!document.querySelector('.side-lab .beta-chip'))
      check(`${tag}: beta lab entry with a beta chip in the sidebar`, chip)
      await page.evaluate(() => document.querySelector('.side-lab-link')?.click())
    }
    await wait(1200)
    let s = await dialog(page)
    check(`${tag}: pop-up opens`, !!s)
    if (!s) {
      await page.close()
      continue
    }
    check(`${tag}: starts on the match, button waiting`, s.scene === 'match' && s.goDisabled === true && !s.matched)
    check(`${tag}: fits the screen, no sideways overflow`, s.fitsScreen && s.overflowX <= 1, `${s.w}x${s.h}, overflow ${s.overflowX}`)
    await page.screenshot({ path: `${out}/deal-${look}-${label}-1-match-start.png` })

    await wait(1400)
    await page.screenshot({ path: `${out}/deal-${look}-${label}-2-match-ticks.png` })
    await wait(1500)
    s = await dialog(page)
    check(`${tag}: the match lands and the button wakes up`, s.matched && s.goDisabled === false)
    await wait(500)
    await page.screenshot({ path: `${out}/deal-${look}-${label}-3-matched.png` })

    const badge = await page.evaluate(() => document.querySelector('.dr-badges')?.textContent ?? '')
    check(`${tag}: marked as beta and look-only`, badge.includes('בטא') && badge.includes('לצפייה בלבד'), badge)

    // on to the deal room
    await page.evaluate(() => document.querySelector('.dr-go')?.click())
    await wait(1600)
    s = await dialog(page)
    check(`${tag}: button moves to the deal room`, s.scene === 'room')
    check(`${tag}: deal room fits, no sideways overflow`, s.fitsScreen && s.overflowX <= 1, `overflow ${s.overflowX}`)
    await page.screenshot({ path: `${out}/deal-${look}-${label}-4-room-start.png` })
    await wait(4200)
    await page.screenshot({ path: `${out}/deal-${look}-${label}-5-room-done.png` })
    if (phone) {
      await page.evaluate(() => (document.querySelector('.dr-body').scrollTop = 9999))
      await wait(500)
      await page.screenshot({ path: `${out}/deal-${look}-${label}-6-room-bottom.png` })
    }
    const room = await page.evaluate(() => ({
      bubbles: document.querySelectorAll('.dr-bubble').length,
      steps: document.querySelectorAll('.dr-steps-list li').length,
      split: document.querySelectorAll('.dr-split i').length,
      input: document.querySelector('.dr-input')?.textContent,
    }))
    check(`${tag}: room shows split, five steps, chat`, room.split === 2 && room.steps === 5 && room.bubbles === 3 && room.input.includes('לצפייה בלבד'), JSON.stringify(room))

    // back to the match, then Escape closes it
    await page.evaluate(() => document.querySelector('.dr-ghost-text')?.click())
    await wait(900)
    s = await dialog(page)
    check(`${tag}: back to the match`, s?.scene === 'match')
    await page.keyboard.press('Escape')
    await wait(900)
    check(`${tag}: Escape closes it`, (await dialog(page)) === null)
    check(`${tag}: page scroll restored after closing`, await page.evaluate(() => document.body.style.overflow !== 'hidden'))
    check(`${tag}: no console errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
    await page.close()
  }

  // the same demo from the home page panel
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(base + '/', { waitUntil: 'load' })
  await page.evaluate(() => document.querySelector('.op')?.scrollIntoView({ block: 'center' }))
  await wait(1200)
  await page.evaluate(() => document.querySelectorAll('.op-hit')[1].focus())
  await wait(1300)
  const hasBtn = await page.evaluate(() => !!document.querySelectorAll('.op-panel')[1].querySelector('.op-demo'))
  check(`${look} home: the match panel has a demo button`, hasBtn)
  await page.evaluate(() => document.querySelector('.op-demo')?.click())
  await wait(1000)
  check(`${look} home: the button opens the same pop-up`, !!(await dialog(page)))
  await page.screenshot({ path: `${out}/deal-${look}-home-open.png` })
  await page.close()
}

await browser.close().catch(() => {})
console.log(results.join('\n'))
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
