// Checks the demo reset in the green look: a one-time clean start removes what an earlier session left behind,
// the "התחלה מחדש" tab hangs from the top of every screen, asks first, and takes the whole demo (the join, the
// payment, the built agent page) back to its start. The navy look has no such tab.
// Usage: node scripts/reset-check.mjs [outDir]
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const out = process.argv[2] ?? '_shots'
fs.mkdirSync(out, { recursive: true })
const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const navy = process.env.BASE_NAVY ?? 'http://localhost:5230/NADLANIL-DEMO'
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`)
const click = (page, sel, text) =>
  page.evaluate(
    (s, t) => {
      const el = [...document.querySelectorAll(s)].find((e) => !t || e.textContent.includes(t))
      el?.click()
      return !!el
    },
    sel,
    text,
  )

// what a finished test session leaves in the browser
const leftovers = {
  agent: JSON.stringify({ stage: 'ready', step: 0, paidAt: '2026-11-09T10:00:00.000Z', profile: { name: 'מאיה לנדאו', gender: 'f', areas: ['tlv'], specialties: ['יוקרה'], languages: ['עברית'], phone: '050-1234567' } }),
}

for (const [label, vp] of [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 375, height: 812, isMobile: true, hasTouch: true }],
]) {
  const tag = `green ${label}`
  const page = await browser.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.setViewport(vp)

  // 1. the one-time clean start
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate((a) => {
    localStorage.removeItem('nadlanup-clean-start-1')
    localStorage.setItem('nadlanup-agent-v1', a)
    localStorage.setItem('brokers-demo-state-v5', JSON.stringify({ onboarded: true }))
  }, leftovers.agent)
  await page.reload({ waitUntil: 'load' })
  await wait(1200)
  let k = await page.evaluate(() => ({ agent: localStorage.getItem('nadlanup-agent-v1'), flag: localStorage.getItem('nadlanup-clean-start-1') }))
  check(`${tag}: the first visit after the update removes the old test session`, (k.agent === null || JSON.parse(k.agent).stage === 'locked') && k.flag === '1', JSON.stringify({ stage: k.agent && JSON.parse(k.agent).stage, flag: k.flag }))
  await page.goto(green + '/app/agent', { waitUntil: 'load' })
  await wait(1400)
  check(`${tag}: and the agent area is closed again`, await page.evaluate(() => !!document.querySelector('.ag-gate') && !document.querySelector('.ag-dash')))

  // ... and it happens only once: new work done afterwards is kept
  await page.evaluate((a) => {
    localStorage.setItem('nadlanup-agent-v1', a)
    // the finished page belongs to an office member
    localStorage.setItem('nadlanup-member-v1', 'office')
  }, leftovers.agent)
  await page.reload({ waitUntil: 'load' })
  await wait(1400)
  check(`${tag}: the clean start is one time only (later work is kept)`, await page.evaluate(() => !!document.querySelector('.ag-dash')))

  // 2. the tab on several screens
  for (const path of ['/', '/join', '/join/office', '/app', '/agent/demo']) {
    await page.goto(green + path, { waitUntil: 'load' })
    await wait(1200)
    const r = await page.evaluate(() => {
      const b = document.querySelector('.dreset')
      if (!b) return null
      const x = b.getBoundingClientRect()
      return { top: Math.round(x.top), h: Math.round(x.height), inView: x.left >= 0 && x.right <= innerWidth, text: b.textContent.trim() }
    })
    check(`${tag}: the reset tab hangs from the top of ${path}`, !!r && r.top === 0 && r.inView && r.text === 'התחלה מחדש', JSON.stringify(r))
  }
  await page.goto(green + '/', { waitUntil: 'load' })
  await wait(1200)
  await page.screenshot({ path: `${out}/reset-${label}-1-tab.png` })

  // 3. it asks first, and cancelling changes nothing
  await click(page, '.dreset', '')
  await wait(700)
  check(`${tag}: it asks before it resets`, await page.evaluate(() => document.querySelector('.modal')?.textContent.includes('להתחיל את הדמו מחדש')))
  await page.screenshot({ path: `${out}/reset-${label}-2-ask.png` })
  await click(page, '.modal .btn', 'ביטול')
  await wait(700)
  check(`${tag}: cancelling keeps everything`, await page.evaluate(() => !document.querySelector('.modal') && JSON.parse(localStorage.getItem('nadlanup-agent-v1')).stage === 'ready'))

  // 4. the reset itself, from deep inside the agent area
  await page.goto(green + '/app/agent', { waitUntil: 'load' })
  await wait(1400)
  check(`${tag}: the finished agent page is there before the reset`, await page.evaluate(() => !!document.querySelector('.ag-dash h1')?.textContent.includes('מאיה')))
  await click(page, '.dreset', '')
  await wait(600)
  await click(page, '.modal .btn', 'כן, מחדש')
  await wait(1500)
  const after = await page.evaluate(() => ({ path: location.pathname, member: localStorage.getItem('nadlanup-member-v1'), agent: (() => { try { return JSON.parse(localStorage.getItem('nadlanup-agent-v1') ?? '{}').stage } catch { return 'bad' } })() }))
  check(`${tag}: yes takes the demo home, with the agent state back to the start`, /\/green\/?$/.test(after.path) && (after.agent === 'locked' || after.agent === undefined) && after.member === 'community', JSON.stringify(after))
  await page.goto(green + '/app/agent', { waitUntil: 'load' })
  await wait(1400)
  check(`${tag}: the agent area is closed again, ready to be shown from the join`, await page.evaluate(() => !!document.querySelector('.ag-gate') && document.querySelector('.ag-gate').textContent.includes('כלול במשרד')))
  await page.goto(green + '/agent/demo', { waitUntil: 'load' })
  await wait(1500)
  check(`${tag}: the sample page is still there for the demo`, await page.evaluate(() => document.querySelector('.agp-hero h1')?.textContent === 'מאיה לנדאו'))
  check(`${tag}: no console errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

// the navy look has no such tab
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(navy + '/', { waitUntil: 'load' })
  await wait(1500)
  check('navy: no reset tab (green demo only)', await page.evaluate(() => !document.querySelector('.dreset')))
  await page.close()
}

await browser.close().catch(() => {})
console.log(results.join('\n'))
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
