// Checks the beta lab: the sidebar section (desktop) and the "עוד כלים" entry (phone) open the hub of ten ideas;
// each tile opens its peek card (the deal room opens its own pop-up); every card fits the screen and has its picture;
// next / previous / "כל המעבדה" navigate; Escape closes; no console errors. Saves a screenshot of every card.
// Usage: node scripts/beta-lab-check.mjs [outDir] [look]      (look: navy | green | both, default both)
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const out = process.argv[2] ?? '_shots'
const only = process.argv[3] ?? 'both'
fs.mkdirSync(out, { recursive: true })
const looks = [
  ['navy', process.env.BASE_NAVY ?? 'http://localhost:5230/NADLANIL-DEMO'],
  ['green', process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'],
].filter(([l]) => only === 'both' || only === l)
const titles = [
  'הקלטה אחת, מודעה שלמה',
  'חדר עסקה משותף',
  'בקשה בוערת',
  'רדאר ביקוש',
  'השדכן של NadlanUP',
  'מוואטסאפ למערכת',
  'מדד אמינות מקצועי',
  'הפולדר שמרגיש',
  'ארנק עמלות',
  'שמאי או עו"ד תוך שעה',
]
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`)

const info = (page) =>
  page.evaluate(() => {
    const bl = document.querySelector('.bl')
    const dr = document.querySelector('.dr')
    const el = bl ?? dr
    if (!el) return null
    const r = el.getBoundingClientRect()
    return {
      kind: bl ? 'bl' : 'dr',
      hub: !!document.querySelector('.bl-grid'),
      tiles: document.querySelectorAll('.bl-tile').length,
      title: document.querySelector('.bl-head h2')?.textContent ?? document.querySelector('.dr-title h2')?.textContent ?? '',
      vis: document.querySelector('.bl-vis')?.children.length ?? 0,
      visH: Math.round(document.querySelector('.bl-vis')?.getBoundingClientRect().height ?? 0),
      fits: r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 && r.left >= -1 && r.top >= -1,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      badge: (document.querySelector('.bl-badges') ?? document.querySelector('.dr-badges'))?.textContent ?? '',
      imgsBroken: [...document.querySelectorAll('.bl img, .dr img')].filter((i) => i.complete && i.naturalWidth === 0).length,
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
    await wait(1400)

    const openHub = async () => {
      if (phone) {
        await page.evaluate(() => [...document.querySelectorAll('.bottom-link')].find((b) => b.textContent.includes('עוד'))?.click())
        await wait(600)
        await page.evaluate(() => [...document.querySelectorAll('.more-link')].find((b) => b.textContent.includes('מעבדת בטא'))?.click())
      } else {
        await page.evaluate(() => document.querySelector('.side-lab-link.is-all')?.click())
      }
      await wait(1100)
    }

    if (!phone) {
      const side = await page.evaluate(() => ({
        rows: document.querySelectorAll('.side-lab-link').length,
        chip: !!document.querySelector('.side-lab .beta-chip'),
        first: document.querySelector('.side-lab-link span')?.textContent,
      }))
      check(`${tag}: sidebar lists the lab with a beta chip`, side.rows === 3 && side.chip && side.first === titles[0], JSON.stringify(side))
    }

    await openHub()
    let s = await info(page)
    check(`${tag}: hub opens with ten tiles`, !!s && s.hub && s.tiles === 10, s ? `${s.tiles} tiles` : 'closed')
    check(`${tag}: hub fits the screen`, !!s && s.fits && s.overflowX <= 1, `overflow ${s?.overflowX}`)
    await page.screenshot({ path: `${out}/lab-${look}-${label}-hub.png` })

    // each tile opens its own card
    for (let i = 0; i < titles.length; i++) {
      if (i > 0) await openHub()
      await page.evaluate((n) => document.querySelectorAll('.bl-tile')[n].click(), i)
      await wait(i === 0 ? 1600 : 1400)
      s = await info(page)
      const shown = i === 1 ? s?.kind === 'dr' && s.title.includes('חדר עסקה') : s?.kind === 'bl' && s.title === titles[i]
      check(`${tag}: tile ${i + 1} opens "${titles[i]}"`, !!shown, `${s?.kind}:${s?.title}`)
      if (i !== 1) {
        check(`${tag}: card ${i + 1} has its picture, fits, no overflow`, s.vis > 0 && s.visH > 120 && s.fits && s.overflowX <= 1 && s.imgsBroken === 0, `vis ${s.vis}, h ${s.visH}, overflow ${s.overflowX}, broken ${s.imgsBroken}`)
        check(`${tag}: card ${i + 1} is marked beta`, s.badge.includes('בטא'))
      }
      if (i === 0) {
        await wait(4200)
        await page.screenshot({ path: `${out}/lab-${look}-${label}-${i + 1}-end.png` })
      } else await page.screenshot({ path: `${out}/lab-${look}-${label}-${i + 1}.png` })
      await page.keyboard.press('Escape')
      await wait(700)
    }

    // next / previous / back to the hub from inside a card
    await openHub()
    await page.evaluate(() => document.querySelectorAll('.bl-tile')[2].click())
    await wait(1100)
    await page.evaluate(() => document.querySelectorAll('.bl-nav')[1].click())
    await wait(900)
    s = await info(page)
    check(`${tag}: "הבא" moves to the next card`, s?.title === titles[3], s?.title)
    await page.evaluate(() => document.querySelectorAll('.bl-nav')[0].click())
    await wait(900)
    await page.evaluate(() => document.querySelectorAll('.bl-nav')[0].click())
    await wait(900)
    s = await info(page)
    check(`${tag}: "הקודם" goes back`, s?.kind === 'dr' || s?.title === titles[1], `${s?.kind}:${s?.title}`)
    if (s?.kind === 'dr') {
      await page.keyboard.press('Escape')
      await wait(700)
      await openHub()
      await page.evaluate(() => document.querySelectorAll('.bl-tile')[4].click())
      await wait(900)
    }
    await page.evaluate(() => document.querySelector('.bl-hubbtn')?.click())
    await wait(900)
    s = await info(page)
    check(`${tag}: "כל המעבדה" returns to the hub`, !!s?.hub)
    await page.keyboard.press('Escape')
    await wait(1600)
    check(`${tag}: Escape closes it and the page scrolls again`, (await info(page)) === null && (await page.evaluate(() => document.body.style.overflow !== 'hidden')))
    check(`${tag}: no console errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
    await page.close()
  }
}

await browser.close().catch(() => {})
console.log(results.join('\n'))
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
