// Pictures of the e-mails and of the small pages, from the LOCAL test server (nothing is sent anywhere).
// Run in server/ after `npx wrangler dev --port 8787 --local`, with the site's dev server on :5240 (for the logo).
import puppeteer from '../node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js'
import { mkdirSync } from 'node:fs'

const API = 'http://localhost:8787'
const ORIGIN = 'http://localhost:5240'
const out = process.argv[2] ?? '../_shots/signup'
mkdirSync(out, { recursive: true })
const post = (path, body, token) => fetch(API + path, { method: 'POST', headers: { origin: ORIGIN, 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }).then((r) => r.json())
const outbox = async () => (await (await fetch(API + '/api/test/outbox', { headers: { origin: ORIGIN } })).json()).outbox
const links = (html) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'))

await fetch(API + '/api/test/outbox', { method: 'DELETE', headers: { origin: ORIGIN } })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const page = await browser.newPage()
const fit = async (width) => {
  const h = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight))
  await page.setViewport({ width, height: Math.max(300, h) })
  await new Promise((r) => setTimeout(r, 250))
}
const mail = async (m, name, width = 700) => {
  await page.setViewport({ width, height: 900 })
  await page.setContent(m.html, { waitUntil: 'load' })
  await new Promise((r) => setTimeout(r, 700))
  await fit(width)
  await page.screenshot({ path: `${out}/${name}.png` })
}
const shotPage = async (url, name, width = 700) => {
  await page.setViewport({ width, height: 820 })
  await page.goto(url, { waitUntil: 'load' })
  await fit(width)
  await page.screenshot({ path: `${out}/${name}.png` })
}

// a broker asks to join
await post('/api/register', { name: 'דנה כהן', phone: '052-555-0142', email: 'dana@test.local', license: '3141592', work: 'office', office_name: 'כהן נכסים', cities: ['פתח תקווה', 'ראש העין'], areas: 'כפר גנים, אם המושבות' })
let box = await outbox()
const ask = box.find((m) => m.to_email === 'ofek@test.local')
await mail(ask, 'mail-1-approval')
await mail(ask, 'mail-1-approval-phone', 390)
const yes = links(ask.html).find((l) => l.includes('a=yes'))
const no = links(ask.html).find((l) => l.includes('a=no'))

// "לא" first, on a second request, to picture the reason page and the polite e-mail
await post('/api/register', { name: 'יוסי לוי', phone: '050-555-0177', email: 'yossi@test.local', license: '2718281', work: 'solo', office_name: '', cities: ['חולון'], areas: 'קריית שרת' })
const ask2 = (await outbox()).filter((m) => m.to_email === 'ofek@test.local').at(-1)
const no2 = links(ask2.html).find((l) => l.includes('a=no'))
await shotPage(no2, 'page-2-reject-reason')
await page.type('#reason', 'לא הצלחנו לאמת את מספר הרישיון. אפשר לשלוח לנו צילום של הרישיון ונבדוק שוב.')
await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('button[type="submit"]')])
await fit(700)
await page.screenshot({ path: `${out}/page-3-rejected.png` })
await mail((await outbox()).filter((m) => m.to_email === 'yossi@test.local').at(-1), 'mail-4-rejected')

// "כן, לאשר": the page approves by itself
await page.setViewport({ width: 700, height: 820 })
await page.goto(yes, { waitUntil: 'load' })
await new Promise((r) => setTimeout(r, 1200))
await fit(700)
await page.screenshot({ path: `${out}/page-5-approved.png` })
const welcome = (await outbox()).filter((m) => m.to_email === 'dana@test.local').at(-1)
await mail(welcome, 'mail-6-welcome')
await mail(welcome, 'mail-6-welcome-phone', 390)

// the second approver, afterwards
const arielYes = links((await outbox()).find((m) => m.to_email === 'ariel@test.local').html).find((l) => l.includes('a=yes'))
await shotPage(arielYes, 'page-7-already-handled')
await shotPage(no, 'page-7b-already-handled-no')

// a sign-in link
await post('/api/login', { email: 'dana@test.local' })
await mail((await outbox()).filter((m) => m.to_email === 'dana@test.local').at(-1), 'mail-8-login')

await browser.close().catch(() => {})
console.log('saved to', out)
process.exit(0)
