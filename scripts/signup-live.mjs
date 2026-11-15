// A harmless look at the LIVE site after a deploy: the door is closed, the form is there, the live server answers
// the site (and only validates: nothing is registered and no e-mail is sent), and the demo link opens the open demo.
// Usage: node scripts/signup-live.mjs
import puppeteer from 'puppeteer-core'
const site = process.env.BASE_GREEN ?? 'https://isru-digital.github.io/NADLANIL-DEMO'
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const check = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`) }
const ctx = await browser.createBrowserContext()
const page = await ctx.newPage()
await page.setViewport({ width: 1440, height: 900 })
const state = () => page.evaluate(() => document.querySelector('[data-state]')?.dataset.state ?? null)
await page.goto(site + '/app/community', { waitUntil: 'load' }); await wait(2500)
check('live: the community is closed to a visitor', (await state()) === 'locked')
await page.goto(site + '/kehila/admin', { waitUntil: 'load' }); await wait(2500)
check('live: the approvers screen is closed to a visitor', (await state()) === 'admin-locked')
await page.goto(site + '/kehila/join', { waitUntil: 'load' }); await wait(2500)
check('live: the sign-up form is there', await page.evaluate(() => !!document.querySelector('form.au-card [data-act="register"]')))
const api = await page.evaluate(async () => {
  const mod = [...document.querySelectorAll('script[type="module"]')].length
  const A = 'https://nadlanup-api.isru.workers.dev'
  const r = await fetch(A + '/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then(async (x) => ({ s: x.status, j: await x.json() }), (e) => ({ s: 0, e: String(e) }))
  const me = await fetch(A + '/api/me').then((x) => x.status, () => 0)
  const adm = await fetch(A + '/api/admin/members').then((x) => x.status, () => 0)
  return { mod, r: r.s, fields: Object.keys(r.j?.fields ?? {}).length, me, adm }
})
check('live: the server answers the site, and refuses an empty form', api.r === 400 && api.fields >= 7, JSON.stringify(api))
check('live: no details without a signed-in approver', api.me === 401 && api.adm === 401)
await page.goto(site + '/demo', { waitUntil: 'load' }); await wait(4000)
check('live: the demo link opens the open demo with the example user', await page.evaluate(() => /\/app(\/community)?$/.test(location.pathname) && document.body.innerText.includes('מאיה לנדאו')))
console.log(fails ? 'SOME CHECKS FAILED' : 'ALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)]); process.exit(0)
