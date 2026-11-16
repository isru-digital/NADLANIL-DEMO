// The real login on the live site, from this computer (16.11.2026: "אין חיבור לשרת" on a provider that cannot look up
// *.workers.dev). Types the given email in /kehila/login, presses the button, and reports what the page says and which
// server address the page reached. Sends ONE real login mail to that address, so use only your own email.
// Usage: node scripts/login-live-check.mjs <email> [outDir]
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const email = process.argv[2]
if (!email) throw new Error('usage: node scripts/login-live-check.mjs <email> [outDir]')
const base = process.env.BASE_GREEN ?? 'https://isru-digital.github.io/NADLANIL-DEMO'
const out = process.argv[3] ?? '_shots/login-live'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
const hits = []
page.on('requestfinished', (r) => r.url().includes('/api/') && hits.push(`${r.method()} ${r.url()} -> ${r.response()?.status()}`))
page.on('requestfailed', (r) => r.url().includes('/api/') && hits.push(`${r.method()} ${r.url()} -> FAILED ${r.failure()?.errorText}`))
await page.goto(base + '/kehila/login', { waitUntil: 'networkidle0' })
await page.waitForSelector('[data-f="email"]')
await page.type('[data-f="email"]', email)
await page.click('[data-act="login"]')
await page.waitForFunction(() => document.querySelector('[data-state="sent"]') || /אין חיבור|שגיאה|לא נמצא/.test(document.body.innerText), { timeout: 30000 }).catch(() => {})
await wait(500)
const state = await page.evaluate(() => ({ sent: !!document.querySelector('[data-state="sent"]'), text: (document.querySelector('.au-card')?.innerText ?? '').slice(0, 220) }))
await page.screenshot({ path: `${out}/after.png` })
console.log(JSON.stringify(state, null, 1))
console.log(hits.join('\n'))
console.log(state.sent ? '\nLOGIN LINK SENT' : '\nNOT SENT')
await Promise.race([browser.close().catch(() => {}), wait(3000)])
process.exit(0)
