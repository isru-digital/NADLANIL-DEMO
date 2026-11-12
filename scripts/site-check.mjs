// The published site: the green and white demo is the main address, the old /green/ links still arrive at the same
// page, deep links work, and the share image is the NadlanUP logo.
// Without BASE it builds nothing: it serves ./dist the way GitHub Pages does (404.html for a missing path, with a 404
// status) on a local port and checks that. With BASE=https://isru-digital.github.io/NADLANIL-DEMO it checks the live site.
// Usage: npm run build:site && node scripts/site-check.mjs
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const PORT = 5299
const PREFIX = '/NADLANIL-DEMO'
const live = process.env.BASE
const origin = live ? new URL(live).origin : `http://localhost:${PORT}`
const base = live ? new URL(live).pathname.replace(/\/$/, '') : PREFIX
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.svg': 'image/svg+xml', '.json': 'application/json' }

let server
if (!live) {
  const dist = path.resolve('dist')
  server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0])
    let file = url.startsWith(PREFIX) ? path.join(dist, url.slice(PREFIX.length)) : ''
    if (file && fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    if (file && fs.existsSync(file) && file.startsWith(dist)) {
      res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' })
      return fs.createReadStream(file).pipe(res)
    }
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
    fs.createReadStream(path.join(dist, '404.html')).pipe(res)
  })
  await new Promise((r) => server.listen(PORT, r))
}

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`)

const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
const land = async (p, ms = 2200) => {
  await page.goto(origin + base + p, { waitUntil: 'load' })
  await wait(ms)
  return page.evaluate(() => ({ path: location.pathname, theme: document.documentElement.dataset.theme, title: document.title, hero: !!document.querySelector('.hg-hero'), join: !!document.querySelector('.jo-hero'), app: !!document.querySelector('.shell'), text: document.body.textContent.length }))
}

// the main address
let s = await land('/')
check('the main address is the green and white demo', s.path === `${base}/` && s.theme === 'green' && s.hero, JSON.stringify(s))
check('its title carries both lines of the name', s.title === 'NadlanUP | המתווכים החופשיים')
const meta = await page.evaluate(() => ({ og: document.querySelector('meta[property="og:image"]')?.content, twitter: document.querySelector('meta[name="twitter:image"]')?.content, ogTitle: document.querySelector('meta[property="og:title"]')?.content, desc: document.querySelector('meta[property="og:description"]')?.content, icon: document.querySelector('link[rel="icon"]')?.getAttribute('href') }))
// the address in the page is always the published one, even when this runs against a local copy
check('the share image is the NadlanUP logo card, at the main address', meta.og === `https://isru-digital.github.io${base}/og-green.jpg` && meta.twitter === meta.og, JSON.stringify(meta))
const img = await page.evaluate(async (u) => {
  const r = await fetch(u)
  const b = await createImageBitmap(await r.blob())
  return { ok: r.ok, type: r.headers.get('content-type'), w: b.width, h: b.height }
}, `${origin}${base}/og-green.jpg`)
check('... it loads, and it is 1200 x 630', img.ok && img.type.includes('jpeg') && img.w === 1200 && img.h === 630, JSON.stringify(img))
check('the share text speaks about the office (0% to the office), not the old system line', meta.ogTitle.includes('המתווכים החופשיים') && meta.desc.includes('0% עמלה למשרד') && !meta.desc.includes('למערכת'), meta.desc)
const html = await (await fetch(origin + base + '/')).text()
check('nothing in the page points to the old navy files or to /green/', !html.includes('og.jpg') && !html.includes('/green/') && !html.includes('favicon.png') && !html.includes('apple-touch-icon.png'))

// links that were shared before (they say /green/) arrive at the same page
s = await land('/green/')
check('an old /green/ link arrives at the main address', s.path === `${base}/` && s.hero, JSON.stringify(s))
s = await land('/green/join/office')
check('an old /green/join/office link arrives at the same page at the main address', s.path === `${base}/join/office` && s.join, JSON.stringify(s))
s = await land('/green/app/office')
check('an old /green/app/office link arrives at the office area', s.path === `${base}/app/office` && s.app, JSON.stringify(s))

// deep links at the main address
for (const p of ['/join/office', '/join', '/about', '/upgrade', '/app/community', '/agent/demo']) {
  s = await land(p)
  check(`a deep link works at the main address: ${p}`, s.path === `${base}${p}` && s.text > 500 && s.theme === 'green', `${s.path} (${s.text} characters)`)
}
check('no errors on the way', errors.length === 0, errors.slice(0, 2).join(' | '))

await browser.close().catch(() => {})
server?.close()
console.log(results.join('\n'))
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
