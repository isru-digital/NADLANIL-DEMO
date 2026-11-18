// The site as an app on the home screen (Itzik 18.11.2026, stage 1 of phone notices): the manifest and its icons,
// the iPhone icon, the Service Worker (locally only with ?sw=on), its offline page, and the install guide at /install
// on a computer, an iPhone and an Android phone, day and night. Saves screenshots.
// Usage: node scripts/install-check.mjs [outDir]      (green dev server on 5240)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/install'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const check = (name, ok, info) => {
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info) + ']'}`)
}
const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
}
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const DESK = { width: 1440, height: 900 }
const FONT_HOSTS = /fonts\.(googleapis|gstatic)\.com/

// a step is picked from the list on a computer, from the dots under the picture on a phone
const pickStep = (page, i) =>
  page.evaluate((n) => {
    const b = document.querySelector(`#ig-steps li[data-step="${n}"] button`)
    if (b && b.offsetParent) b.click()
    else document.querySelector(`.ig-dot[data-step="${n}"]`).click()
  }, i)

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })

async function open({ vp, ua, mode = 'day', path = '/install', motion = 'no-preference' }) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  const errors = []
  const outside = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (!/^(localhost|127\.0\.0\.1)$/.test(u.hostname) && !FONT_HOSTS.test(u.hostname) && u.protocol.startsWith('http')) outside.push(u.hostname)
  })
  if (ua) await page.setUserAgent(ua)
  await page.setViewport(vp)
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: motion }])
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate((m) => localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: Date.now() + 9e9 })), mode)
  await page.goto(green + path, { waitUntil: 'load' })
  return { ctx, page, errors, outside }
}

// ------------------------------------------------------------------ the manifest, the icons, the iPhone's tags
{
  const { ctx, page, errors } = await open({ vp: DESK, path: '/' })
  const head = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]')
    const apple = document.querySelector('link[rel="apple-touch-icon"]')
    const meta = (n) => document.querySelector(`meta[name="${n}"]`)?.content
    const res = link ? await fetch(link.href) : null
    const man = res ? await res.json() : null
    const img = async (href) => {
      const r = await fetch(href)
      const b = await r.blob()
      const bmp = await createImageBitmap(b)
      return { ok: r.ok, type: b.type, w: bmp.width, h: bmp.height }
    }
    const base = link ? new URL('.', link.href).href : ''
    return {
      manifest: !!link,
      man,
      icons: man ? await Promise.all(man.icons.map(async (i) => ({ ...i, got: await img(new URL(i.src, base).href) }))) : [],
      start: man ? new URL(man.start_url, base).pathname : null,
      scope: man ? new URL(man.scope, base).pathname : null,
      apple: apple ? { href: apple.getAttribute('href'), got: await img(apple.href) } : null,
      title: meta('apple-mobile-web-app-title'),
      capable: meta('apple-mobile-web-app-capable'),
      theme: meta('theme-color'),
    }
  })
  check('the page links the manifest', head.manifest)
  check('the app is called "מתווכים לעסקאות", "מתווכים" under the icon, Hebrew, right to left', head.man?.name === 'מתווכים לעסקאות' && head.man?.short_name === 'מתווכים' && head.man?.lang === 'he' && head.man?.dir === 'rtl', head.man)
  check('it opens full screen, at the community feed, inside the site', head.man?.display === 'standalone' && head.start === '/NADLANIL-DEMO/green/app/community' && head.scope === '/NADLANIL-DEMO/green/', { start: head.start, scope: head.scope })
  const by = (s, p) => head.icons.find((i) => i.sizes === s && i.purpose === p)
  check('icons 192 and 512, and a maskable 512, all real PNG of the right size', ['192x192|any', '512x512|any', '512x512|maskable'].every((k) => {
    const [s, p] = k.split('|')
    const i = by(s, p)
    return i && i.got.ok && i.got.type === 'image/png' && `${i.got.w}x${i.got.h}` === s
  }), head.icons.map((i) => [i.sizes, i.purpose, i.got]))
  check('the iPhone gets its own 180 icon, a name and full screen', head.apple?.href.endsWith('icons/apple-touch-icon-180.png') && head.apple.got.ok && head.apple.got.w === 180 && head.title === 'מתווכים' && head.capable === 'yes', head)
  check('the theme colour matches the manifest', head.theme?.toLowerCase() === head.man?.theme_color.toLowerCase(), [head.theme, head.man?.theme_color])
  check('home page: no errors', errors.length === 0, errors)
  await ctx.close()
}

// ------------------------------------------------------------------ the Service Worker
{
  const { ctx, page } = await open({ vp: DESK, path: '/' })
  await wait(1200)
  const none = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)
  check('locally the Service Worker stays off unless asked (?sw=on), so the dev server is never held by it', none === 0, none)

  await page.goto(green + '/?sw=on', { waitUntil: 'load' })
  const reg = await page.evaluate(() =>
    Promise.race([navigator.serviceWorker.ready.then((r) => ({ scope: new URL(r.scope).pathname, script: new URL(r.active.scriptURL).pathname })), new Promise((r) => setTimeout(() => r(null), 10000))]),
  )
  check('with ?sw=on it is registered for the whole site', reg?.scope === '/NADLANIL-DEMO/green/' && reg?.script === '/NADLANIL-DEMO/green/sw.js', reg)
  // it controls pages from the next load
  await page.goto(green + '/about', { waitUntil: 'load' })
  const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller)
  check('the next page is in its care', controlled)

  // no connection: a deep address shows the offline page, with its icon
  // the page and the Service Worker both lose the network (the worker has its own)
  await page.setOfflineMode(true)
  const swTarget = await ctx.waitForTarget((t) => t.type() === 'service_worker', { timeout: 10000 })
  const swCdp = await swTarget.createCDPSession()
  await swCdp.send('Network.enable')
  const net = (offline) => swCdp.send('Network.emulateNetworkConditions', { offline, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  await net(true)
  await page.goto(green + '/app/community', { waitUntil: 'load' }).catch(() => {})
  await wait(500)
  const off = await page.evaluate(() => ({ h1: document.querySelector('h1')?.textContent, icon: document.querySelector('img')?.naturalWidth ?? 0, btn: document.querySelector('button')?.textContent, dir: document.documentElement.dir }))
  check('offline, any address shows "אין חיבור" with the icon and a way to try again', /אין חיבור לאינטרנט/.test(off.h1 ?? '') && off.icon > 0 && off.btn === 'לנסות שוב' && off.dir === 'rtl', off)
  await page.screenshot({ path: `${out}/phone-offline.png` }).catch(() => {})
  await page.setViewport(PHONE)
  await page.reload({ waitUntil: 'load' }).catch(() => {})
  await wait(400)
  await page.screenshot({ path: `${out}/phone-offline.png` })
  await page.setOfflineMode(false)
  await net(false)
  await page.setViewport(DESK)

  // back online, pages come from the network again (a new version is seen at once)
  await page.goto(green + '/install', { waitUntil: 'load' })
  const live = await page.evaluate(() => !!document.querySelector('[data-page="install"]'))
  check('back online, the site itself comes back', live)
  await page.evaluate(async () => {
    for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister()
    sessionStorage.removeItem('nadlanup-sw')
  })
  await ctx.close()
}

// ------------------------------------------------------------------ the install guide
const RUNS = [
  { tag: 'desktop', vp: DESK, ua: null, os: 'ios', seen: 'desktop' },
  { tag: 'iphone', vp: PHONE, ua: UA.iphone, os: 'ios', seen: 'ios' },
  { tag: 'android', vp: PHONE, ua: UA.android, os: 'android', seen: 'android' },
]
for (const run of RUNS) {
  for (const mode of ['day', 'night']) {
    const tag = `${run.tag}${mode === 'night' ? ' night' : ''}`
    const { ctx, page, errors, outside } = await open({ vp: run.vp, ua: run.ua, mode })
    await page.waitForSelector('[data-page="install"] h1', { timeout: 15000 })
    await wait(1300)
    const file = `${out}/${run.tag}${mode === 'night' ? '-night' : ''}`
    await page.screenshot({ path: `${file}-top.png` })
    if (mode === 'night') {
      await page.evaluate(() => window.scrollTo(0, document.querySelector('.ig-guide').getBoundingClientRect().top + scrollY - 16))
      await wait(900)
      await page.screenshot({ path: `${file}-guide.png` })
    if (run.vp === PHONE) {
      const fit = await page.evaluate(() => {
        const pm = document.querySelector('.pm').getBoundingClientRect()
        const st = document.querySelector('#ig-steps li.is-on').getBoundingClientRect()
        return { shown: document.querySelectorAll('#ig-steps li').length - document.querySelectorAll('#ig-steps li:not(.is-on)').length, pmTop: Math.round(pm.top), stepBottom: Math.round(st.bottom), h: innerHeight, stepBelow: st.top >= pm.bottom - 1 }
      })
      check(`${tag}: one step at a time, right under the picture, both on one screen`, fit.stepBelow && fit.stepBottom - fit.pmTop <= fit.h, fit)
      await pickStep(page, 2)
      await wait(300)
      await page.evaluate(() => document.querySelector('[data-act="next"]').click())
      await wait(500)
      const nx = await page.evaluate(() => ({ scene: document.querySelector('.pm').dataset.scene, on: document.querySelector('#ig-steps li.is-on').dataset.step }))
      check(`${tag}: "הבא" moves to step 4`, nx.scene === `${run.os}-3` && nx.on === '3', nx)
      await page.screenshot({ path: `${file}-guide-home.png` })
    }
      check(`${tag}: no errors`, errors.length === 0, errors)
      await ctx.close()
      continue
    }

    const top = await page.evaluate(() => ({
      h1: document.querySelector('h1').textContent,
      seen: document.querySelector('[data-platform]')?.dataset.platform,
      on: document.querySelector('.ig-os [aria-selected="true"]')?.dataset.os,
      steps: document.querySelectorAll('#ig-steps li').length,
      dashes: /[\u2013\u2014]/.test(document.body.innerText),
      wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      small: [...document.querySelectorAll('.ig-cta, .ig-os button, .ig-steps button, .ig-faq summary, .ig-nav-btn, .ig-dot')]
        .map((b) => b.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height < 44).length,
      soon: document.querySelector('.ig-soon')?.closest('.ig-why-card')?.querySelector('h3')?.textContent,
    }))
    check(`${tag}: the page opens with its title`, top.h1 === 'מתווכים לעסקאות, על מסך הבית שלך', top.h1)
    check(`${tag}: it knows the device (${run.seen}) and opens on its steps (${run.os})`, top.seen === run.seen && top.on === run.os, top)
    check(`${tag}: four steps`, top.steps === 4, top.steps)
    check(`${tag}: notices are marked "בקרוב", not promised as ready`, /התראות לנייד\s*בקרוב/.test(top.soon ?? ''), top.soon)
    check(`${tag}: no long dashes in the words`, !top.dashes)
    check(`${tag}: no sideways scroll`, top.wide <= 1, top.wide)
    check(`${tag}: every button is big enough for a finger (44px)`, top.small === 0, top.small)

    // the picture walks by itself
    const s0 = await page.evaluate(() => document.querySelector('.pm').dataset.scene)
    await wait(4200)
    const s1 = await page.evaluate(() => document.querySelector('.pm').dataset.scene)
    check(`${tag}: the drawn phone moves to the next step by itself`, s0 !== s1, [s0, s1])

    // a click on a step shows it, and stops the walk
    await page.evaluate(() => window.scrollTo(0, document.querySelector('.ig-guide').getBoundingClientRect().top + scrollY - 16))
    await pickStep(page, 2)
    await wait(700)
    const picked = await page.evaluate(() => ({ scene: document.querySelector('.pm').dataset.scene, cur: document.querySelector('#ig-steps [aria-current="step"]')?.closest('li').dataset.step, tap: !!document.querySelector('.pm .pm-tap') }))
    await wait(4000)
    const still = await page.evaluate(() => document.querySelector('.pm').dataset.scene)
    check(`${tag}: a click on step 3 shows it, with where to tap, and the picture stays there`, picked.scene === `${run.os}-2` && picked.cur === '2' && picked.tap && still === picked.scene, { picked, still })
    await page.screenshot({ path: `${file}-guide.png` })

    // every scene of both phones
    for (const os of ['ios', 'android']) {
      await page.click(`.ig-os [data-os="${os}"]`)
      await wait(400)
      for (let i = 0; i < 4; i++) {
        await pickStep(page, i)
        await wait(i === 3 ? 900 : 650)
        const scene = await page.evaluate(() => document.querySelector('.pm').dataset.scene)
        if (scene !== `${os}-${i}`) check(`${tag}: ${os} step ${i + 1} is drawn`, false, scene)
        if (run.tag === 'desktop') {
          const el = await page.$('.pm')
          await el.screenshot({ path: `${out}/scene-${os}-${i + 1}.png` })
        }
      }
    }
    check(`${tag}: both phones, all four steps drawn`, true)

    // where Chrome offers to install, one button does it
    if (run.tag !== 'iphone') {
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.evaluate(() => {
        const e = new Event('beforeinstallprompt', { cancelable: true })
        e.prompt = () => Promise.resolve()
        e.userChoice = Promise.resolve({ outcome: 'accepted' })
        window.dispatchEvent(e)
      })
      await wait(300)
      const btn = await page.evaluate(() => document.querySelector('[data-act="install"]')?.textContent.trim())
      check(`${tag}: when the browser offers, "התקנת האפליקציה" is one button`, btn === 'התקנת האפליקציה', btn)
      if (run.tag === 'android') await page.screenshot({ path: `${file}-offer.png` })
      await page.click('[data-act="install"]')
      await wait(400)
      const done = await page.evaluate(() => document.querySelector('[data-state="installed"]')?.textContent)
      check(`${tag}: after yes, it says the app is on the home screen`, /כבר על מסך הבית/.test(done ?? ''), done)
    }
    check(`${tag}: nothing goes to another site`, outside.length === 0, [...new Set(outside)])
    check(`${tag}: no errors`, errors.length === 0, errors)
    await ctx.close()
  }
}

// ------------------------------------------------------------------ less motion: the picture does not walk
{
  const { ctx, page, errors } = await open({ vp: PHONE, ua: UA.iphone, motion: 'reduce' })
  await page.waitForSelector('[data-page="install"] h1')
  const a = await page.evaluate(() => document.querySelector('.pm').dataset.scene)
  await wait(4300)
  const b = await page.evaluate(() => ({ scene: document.querySelector('.pm').dataset.scene, timer: !!document.querySelector('.ig-timer') }))
  check('less motion: the picture stays on its step and no timer runs', a === b.scene && !b.timer, { a, b })
  check('less motion: no errors', errors.length === 0, errors)
  await ctx.close()
}

await browser.close().catch(() => {})
console.log(fails ? `\n${fails} FAILED` : '\nALL CHECKS PASSED')
process.exit(fails ? 1 : 0)
