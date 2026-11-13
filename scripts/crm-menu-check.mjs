// Opening the CRM opens two lines under it in the side menu, "לקוחות" and "נכסים": each one is a screen of its own,
// for a community member and for an office member. On a phone (no side menu) the two stay as tabs at the top of the page.
// Usage: node scripts/crm-menu-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/crm-menu'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`
  results.push(line)
  console.error(line)
}
const state = (page) =>
  page.evaluate(() => {
    const vis = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0
    return {
      path: location.pathname.replace(/^\/NADLANIL-DEMO(\/green)?/, '') + location.search,
      sub: [...document.querySelectorAll('.side-sub .side-sub-link')].filter(vis).map((a) => a.textContent.trim()),
      subOn: [...document.querySelectorAll('.side-sub .side-sub-link.active')].map((a) => a.textContent.trim()),
      parent: [...document.querySelectorAll('.side-nav .side-link')].find((a) => a.getAttribute('href')?.endsWith('/app/crm'))?.textContent.trim(),
      parentOn: !![...document.querySelectorAll('.side-nav .side-link.active')].find((a) => a.getAttribute('href')?.endsWith('/app/crm')),
      title: document.querySelector('.page-head h1')?.textContent.trim(),
      tabs: vis(document.querySelector('.crm-kinds')),
      table: !!document.querySelector('.ct-table'),
      board: !!document.querySelector('.kanban'),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })

for (const member of ['community', 'office']) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate((m) => {
    localStorage.clear()
    localStorage.setItem('nadlanup-member-v1', m)
    localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 }))
  }, member)
  const tag = `desktop ${member}`

  await page.goto(green + '/app/community', { waitUntil: 'load' })
  await wait(1600)
  let s = await state(page)
  check(`${tag}: outside the CRM the two lines are closed, and the entry is called "CRM"`, s.sub.length === 0 && s.parent === 'CRM', JSON.stringify(s.sub) + s.parent)

  await page.evaluate(() => [...document.querySelectorAll('.side-nav .side-link')].find((a) => a.getAttribute('href')?.endsWith('/app/crm'))?.click())
  await wait(1400)
  s = await state(page)
  check(`${tag}: opening the CRM opens "לקוחות" and "נכסים" under it`, s.sub.join() === 'לקוחות,נכסים' && s.parentOn, s.sub.join())
  check(`${tag}: the first screen is the clients, alone: its own title, the table, no board and no tabs in the page`, s.path === '/app/crm' && s.subOn.join() === 'לקוחות' && s.title === 'לקוחות' && s.table && !s.board && !s.tabs, JSON.stringify(s))
  await page.screenshot({ path: `${out}/desktop-${member}-1-clients.png` })

  await page.evaluate(() => [...document.querySelectorAll('.side-sub .side-sub-link')].find((a) => a.textContent.trim() === 'נכסים')?.click())
  await wait(1400)
  s = await state(page)
  check(`${tag}: "נכסים" is a screen of its own: its own title, the board, no clients table`, s.path === '/app/crm?v=properties' && s.subOn.join() === 'נכסים' && s.title === 'נכסים' && s.board && !s.table && !s.tabs, JSON.stringify(s))
  check(`${tag}: the new card button and the publish note are on the properties screen`, await page.evaluate(() => !!document.querySelector('[data-act="new-card"]') && !!document.querySelector('[data-note="auto-publish"]')))
  check(`${tag}: nothing scrolls sideways`, s.overflowX <= 1)
  await page.screenshot({ path: `${out}/desktop-${member}-2-properties.png` })

  await page.reload({ waitUntil: 'load' })
  await wait(1500)
  s = await state(page)
  check(`${tag}: the properties screen has its own address (it survives a reload)`, s.board && s.subOn.join() === 'נכסים')
  await page.evaluate(() => [...document.querySelectorAll('.side-sub .side-sub-link')].find((a) => a.textContent.trim() === 'לקוחות')?.click())
  await wait(1200)
  s = await state(page)
  check(`${tag}: and back to the clients`, s.path === '/app/crm' && s.table && !s.board && s.subOn.join() === 'לקוחות')
  if (member === 'office') check(`${tag}: an office member's clients screen has the office's columns`, await page.evaluate(() => document.querySelector('.ct-table.is-office') !== null))
  await page.close()
}

// a phone has no side menu: the two views are tabs at the top of the page
{
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  await page.goto(green + '/app/crm', { waitUntil: 'load' })
  await wait(1700)
  let s = await state(page)
  check('phone: the two views are tabs at the top of the page, clients first', s.tabs && s.table && !s.board && s.title === 'לקוחות', JSON.stringify(s))
  await page.screenshot({ path: `${out}/phone-1-clients.png` })
  await page.evaluate(() => [...document.querySelectorAll('.crm-kinds .seg-btn')].find((b) => b.textContent.trim() === 'נכסים')?.click())
  await wait(1200)
  s = await state(page)
  check('phone: the "נכסים" tab opens the properties screen', s.path === '/app/crm?v=properties' && s.board && !s.table && s.title === 'נכסים', JSON.stringify(s))
  check('phone: nothing scrolls sideways', s.overflowX <= 1)
  await page.screenshot({ path: `${out}/phone-2-properties.png` })
  await page.close()
}

console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
// some runs hang on closing the browser: the result is already printed
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
