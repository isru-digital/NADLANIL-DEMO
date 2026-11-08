// Checks the green version: the home page hero (map, nodes, moving packets), no sideways overflow,
// the green logo, the switch between the two looks, and that no console errors appear.
// Usage: node scripts/green-check.mjs   (BASE_GREEN / BASE_NAVY override the two addresses)
import puppeteer from 'puppeteer-core'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const navy = process.env.BASE_NAVY ?? 'http://localhost:5230/NADLANIL-DEMO'
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`)

for (const [label, vp, phone] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 375, height: 812, isMobile: true, hasTouch: true }, true],
]) {
  const page = await browser.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.setViewport(vp)
  await page.goto(green + '/', { waitUntil: 'load' })
  await wait(1800)

  const info = await page.evaluate(() => {
    const q = (s) => document.querySelectorAll(s)
    const land = document.querySelector('.hg-land')
    const rect = land?.getBoundingClientRect()
    const packets = [...q('.hg-packet')]
    return {
      theme: document.documentElement.dataset.theme,
      nodes: q('.hg-node').length,
      majors: q('.hg-node.is-major').length,
      packets: packets.length,
      arcs: q('.hg-arcs path').length,
      clip: land ? getComputedStyle(land).clipPath.startsWith('polygon') : false,
      mapW: rect ? Math.round(rect.width) : 0,
      mapH: rect ? Math.round(rect.height) : 0,
      logo: document.querySelector('.hg-nav .logo img')?.getAttribute('src') ?? '',
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      title: document.querySelector('h1')?.textContent ?? '',
      switchLinks: [...q('.vswitch a')].map((a) => a.getAttribute('href')),
    }
  })
  check(`${label}: green theme attribute set`, info.theme === 'green')
  check(`${label}: map has nodes, arcs and clipped land`, info.nodes >= 10 && info.majors >= 5 && info.arcs >= 4 && info.clip, `${info.nodes} nodes, ${info.arcs} arcs`)
  check(`${label}: map is tall like the country (about 2.7 x)`, info.mapW > 0 && Math.abs(info.mapH / info.mapW - 2.74) < 0.1, `${info.mapW}x${info.mapH}`)
  check(`${label}: packets present`, info.packets >= (phone ? 4 : 8), `${info.packets}`)
  check(`${label}: green logo file in the nav`, info.logo.includes('logo-green.png'), info.logo)
  check(`${label}: headline is there`, info.title.includes('הדבר הבא') && info.title.includes('בעולם המתווכים'))
  check(`${label}: no sideways overflow`, info.overflowX <= 1, `${info.overflowX}px`)

  // packets really move (transform changes between two moments) when motion is allowed
  const t1 = await page.evaluate(() => [...document.querySelectorAll('.hg-packet')].map((p) => getComputedStyle(p).transform))
  await wait(900)
  const t2 = await page.evaluate(() => [...document.querySelectorAll('.hg-packet')].map((p) => getComputedStyle(p).transform))
  const moved = t1.filter((v, i) => v !== t2[i]).length
  check(`${label}: packets move`, moved >= 2, `${moved} of ${t1.length} changed`)

  // the switch points to the navy version of the same screen
  check(`${label}: switch links to both looks`, info.switchLinks.length === 2 && info.switchLinks.some((h) => h.includes('5230')) && info.switchLinks.some((h) => h.includes('5240')), info.switchLinks.join(' , '))

  // contrast of the primary button text on the emerald (white on the deep end of the gradient)
  const btn = await page.evaluate(() => {
    const b = document.querySelector('.hg-nav .btn-gold')
    return b ? getComputedStyle(b).color : ''
  })
  check(`${label}: primary button text is white`, btn === 'rgb(255, 255, 255)', btn)

  // every main screen opens in the green look without console errors
  for (const path of ['/join', '/app', '/app/community', '/app/brokers', '/app/crm', '/app/builder', '/app/folder']) {
    await page.goto(green + path, { waitUntil: 'load' })
    await wait(700)
  }
  check(`${label}: no console errors across screens`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

// the navy version is still navy and still has the switch
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(navy + '/', { waitUntil: 'load' })
  await page.waitForSelector('.vswitch a', { timeout: 15000 }).catch(() => {})
  await wait(500)
  const n = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme ?? '',
    logo: document.querySelector('.home-nav .logo img')?.getAttribute('src') ?? '',
    sw: document.querySelectorAll('.vswitch a').length,
  }))
  check('navy: no theme attribute, gold logo, switch present', n.theme === '' && n.logo.endsWith('logo.png') && n.sw === 2, JSON.stringify(n))
  await page.close()
}

await browser.close().catch(() => {})
console.log(results.join('\n'))
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
