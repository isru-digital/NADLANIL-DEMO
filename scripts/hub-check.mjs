// The "כל העסקאות שלך עוברות כאן" band on the community page (16.11.2026): it comes right after the head, the mark sits
// in the middle with six worlds around it, lights flow only while the band is on screen, notes pop up and never cover a
// world, the phone fits, and "less motion" gets a still picture. Also saves screenshots and a short recording.
// Usage: node scripts/hub-check.mjs [outDir]     (BASE_GREEN overrides the address; RECORD=0 skips the recording)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/hub'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
let fails = 0
const check = (name, ok, info) => {
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info) + ']'}`)
}

const LABELS = ['נכסים', 'קונים', 'שיתופי פעולה', 'מתווך בעיר אחרת', 'מתווכים', 'ידע ושאלות']
// the site follows the clock in Israel (light 08:00-18:00, dark after): the day parts pin the day look, so the check
// gives the same answer at any hour (the night part below sets night itself)
const dayLook = (page) => page.evaluateOnNewDocument(() => { try { localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 })) } catch {} })

for (const [tag, vp] of [
  ['desktop', { width: 1440, height: 900 }],
  ['laptop', { width: 1024, height: 768 }],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
  ['small phone', { width: 360, height: 740, isMobile: true, hasTouch: true }],
]) {
  const page = await browser.newPage()
  await dayLook(page)
  await page.setViewport(vp)
  await page.goto(green + '/kehila', { waitUntil: 'networkidle0' })
  await wait(600)
  const before = await page.evaluate(() => {
    const hub = document.querySelector('[data-hub]')
    return {
      afterHead: hub?.previousElementSibling?.classList.contains('kh-hero'),
      heading: hub?.querySelector('h2')?.textContent,
      labels: [...document.querySelectorAll('.khh-node-label')].map((l) => l.textContent),
      mark: !!hub?.querySelector('.khh-core .cb-mark svg'),
      dots: hub?.querySelectorAll('.khh-dots g').length,
      awake: hub?.classList.contains('is-awake'),
      onScreen: hub ? hub.getBoundingClientRect().top < innerHeight * 0.8 : null,
    }
  })
  const look = await page.evaluate(() => {
    const lum = (c) => {
      const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map((v) => {
        v = v / 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const hub = document.querySelector('[data-hub]')
    const disc = getComputedStyle(document.querySelector('.khh-node-disc'))
    const note = getComputedStyle(document.querySelector('.khh-note')).color
    // the band's light floor near the note is about #e6f6ee
    const floor = lum('rgb(230, 246, 238)')
    const contrast = (floor + 0.05) / (lum(note) + 0.05)
    return {
      title: getComputedStyle(hub.querySelector('h2')).color,
      titleDark: lum(getComputedStyle(hub.querySelector('h2')).color) < 0.1,
      disc: disc.backgroundColor,
      icon: disc.color,
      note,
      contrast: Math.round(contrast * 10) / 10,
      noteSize: parseFloat(getComputedStyle(document.querySelector('.khh-note')).fontSize),
      bgDark: getComputedStyle(hub).backgroundImage.includes('rgb(4, 36, 26)'),
    }
  })
  check(`${tag}: light band (dark green title, white worlds, gold icons)`, look.titleDark && look.disc === 'rgb(255, 255, 255)' && look.icon === 'rgb(176, 122, 20)' && !look.bgDark, look)
  check(`${tag}: the "sample" line is small and readable (contrast 4.5 and up)`, look.contrast >= 4.5 && look.noteSize <= 13.5 && look.noteSize >= 12.5, look)
  check(`${tag}: the band comes right after the head, with its heading`, before.afterHead && before.heading === 'כל העסקאות שלך עוברות כאן', before)
  const bend = await page.evaluate(() =>
    [...document.querySelectorAll('.khh-line:not(.is-glow)')].map((p) => {
      const L = p.getTotalLength()
      const a = p.getPointAtLength(0)
      const b = p.getPointAtLength(L)
      const m = p.getPointAtLength(L / 2)
      // how far the curve's middle stands off the straight line, in the 600 box
      return Math.round(Math.abs((b.x - a.x) * (a.y - m.y) - (a.x - m.x) * (b.y - a.y)) / Math.hypot(b.x - a.x, b.y - a.y))
    }),
  )
  check(`${tag}: six clearly curved lines (the middle stands 30 or more off the straight line)`, bend.length === 6 && bend.every((d) => d >= 30), bend)
  check(`${tag}: the mark in the middle and the six worlds, in order`, before.mark && JSON.stringify(before.labels) === JSON.stringify(LABELS), before.labels)
  if (!before.onScreen) check(`${tag}: nothing moves before the band is on screen`, before.dots === 0 && !before.awake, before)

  await page.evaluate(() => document.querySelector('[data-hub] .khh-stage').scrollIntoView({ block: 'center' }))
  // watch for 9 seconds
  let maxDots = 0
  let maxPills = 0
  let seenPills = new Set()
  let clash = []
  let spill = []
  let pulses = 0
  let far = []
  for (let k = 0; k < 36; k++) {
    await wait(250)
    const s = await page.evaluate(() => {
      const box = (el) => el.getBoundingClientRect()
      const hit = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1
      const pills = [...document.querySelectorAll('.khh-pill:not(.is-out)')].filter((p) => getComputedStyle(p).opacity > 0.9)
      const worlds = [...document.querySelectorAll('.khh-node-disc, .khh-node-label, .khh-core')]
      const clash = []
      for (const p of pills) for (const w of worlds) if (hit(box(p), box(w))) clash.push(`${p.textContent} on ${w.textContent || 'the mark'}`)
      for (let i = 0; i < pills.length; i++) for (let j = i + 1; j < pills.length; j++) if (hit(box(pills[i]), box(pills[j]))) clash.push('two notes meet')
      const spill = pills.filter((p) => box(p).left < 0 || box(p).right > innerWidth).map((p) => p.textContent)
      // how far is each note from its own world (gap between the two boxes, 0 when they touch)
      const far = pills
        .map((p) => {
          const a = box(p)
          const w = box(document.querySelector(`.khh-node.is-${p.dataset.pill} .khh-node-disc`))
          const gx = Math.max(0, w.left - a.right, a.left - w.right)
          const gy = Math.max(0, w.top - a.bottom, a.top - w.bottom)
          const tail = getComputedStyle(p, '::after').content !== 'none'
          return { t: p.textContent, gap: Math.round(Math.hypot(gx, gy)), tail }
        })
        .filter((x) => x.gap > 48 || !x.tail)
      return {
        dots: document.querySelectorAll('.khh-dots g').length,
        pills: pills.map((p) => p.textContent),
        clash,
        spill,
        far,
        pulse: document.querySelector('.khh-core').getAnimations().length,
      }
    })
    maxDots = Math.max(maxDots, s.dots)
    maxPills = Math.max(maxPills, s.pills.length)
    s.pills.forEach((p) => seenPills.add(p))
    clash.push(...s.clash)
    spill.push(...s.spill)
    far.push(...s.far)
    pulses += s.pulse ? 1 : 0
  }
  check(`${tag}: lights flow into the mark once the band is on screen`, maxDots >= 4, { maxDots })
  check(`${tag}: the mark beats when it takes a light`, pulses >= 3, { pulses })
  check(`${tag}: notes pop up, at most two at a time`, seenPills.size >= 3 && maxPills <= 2, { seen: [...seenPills], maxPills })
  check(`${tag}: a note never covers a world, the mark or another note`, clash.length === 0, [...new Set(clash)].slice(0, 6))
  check(`${tag}: a note never leaves the screen`, spill.length === 0, [...new Set(spill)])
  check(`${tag}: every note sits right by its own world, with a tail pointing at it`, far.length === 0, far.slice(0, 4))
  const fit = await page.evaluate(() => ({
    wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    label: Math.min(...[...document.querySelectorAll('.khh-node-label')].map((l) => parseFloat(getComputedStyle(l).fontSize))),
    pill: Math.min(...[...document.querySelectorAll('.khh-pill')].map((l) => parseFloat(getComputedStyle(l).fontSize)), 99),
    node: document.querySelector('.khh-node-disc').getBoundingClientRect().width,
  }))
  check(`${tag}: no sideways scroll, readable names (13px and up), worlds big enough to see`, fit.wide <= 1 && fit.label >= 13 && fit.pill >= 12.5 && fit.node >= 44, fit)
  await page.screenshot({ path: `${out}/${tag.replace(' ', '-')}.png` })

  // scrolled away: it rests
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight }))
  await wait(700)
  const rest = await page.evaluate(() => document.querySelectorAll('.khh-dots g').length)
  check(`${tag}: it rests when the band leaves the screen`, rest === 0, { rest })
  await page.close()
}

// less motion: a still picture
for (const [tag, vp] of [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
]) {
  const page = await browser.newPage()
  await dayLook(page)
  await page.setViewport(vp)
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.goto(green + '/kehila', { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.querySelector('[data-hub] .khh-stage').scrollIntoView({ block: 'center' }))
  await wait(800)
  const a = await page.evaluate(() => ({
    still: document.querySelector('[data-hub]').classList.contains('is-still'),
    dots: [...document.querySelectorAll('.khh-dots g')].map((g) => g.getAttribute('transform')).join('|'),
    pills: [...document.querySelectorAll('.khh-pill')].map((p) => p.textContent),
    spin: getComputedStyle(document.querySelector('.khh-dash')).animationName,
  }))
  await wait(1500)
  const b = await page.evaluate(() => ({
    dots: [...document.querySelectorAll('.khh-dots g')].map((g) => g.getAttribute('transform')).join('|'),
    pills: [...document.querySelectorAll('.khh-pill')].map((p) => p.textContent),
    pulse: document.querySelector('.khh-core').getAnimations().length,
  }))
  check(`less motion, ${tag}: a still picture (lights in place, two notes, nothing turns)`, a.still && a.dots && a.dots === b.dots && a.pills.length === 2 && JSON.stringify(a.pills) === JSON.stringify(b.pills) && a.spin === 'none' && b.pulse === 0, { a, b })
  const clash = await page.evaluate(() => {
    const hit = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1
    const out = []
    for (const p of document.querySelectorAll('.khh-pill')) for (const w of document.querySelectorAll('.khh-node-disc, .khh-node-label, .khh-core')) if (hit(p.getBoundingClientRect(), w.getBoundingClientRect())) out.push(p.textContent)
    return out
  })
  check(`less motion, ${tag}: the two notes cover nothing`, clash.length === 0, clash)
  await page.screenshot({ path: `${out}/still-${tag}.png` })
  await page.close()
}

// night mode: the band stays deep green
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 860 })
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate(() => localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'night', until: Date.now() + 9e9 })))
  await page.goto(green + '/kehila', { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.querySelector('[data-hub] .khh-stage').scrollIntoView({ block: 'center' }))
  await wait(3500)
  const n = await page.evaluate(() => ({
    wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    dark: getComputedStyle(document.querySelector('[data-hub]')).backgroundImage.includes('rgb(4, 36, 26)'),
    title: getComputedStyle(document.querySelector('[data-hub] h2')).color,
  }))
  check('night: the band turns deep green, white title, nothing spills', n.wide <= 1 && n.dark && n.title === 'rgb(255, 255, 255)', n)
  await page.screenshot({ path: `${out}/night.png` })
  await page.close()
}

// a short recording of the band, desktop and phone (frames from the screen, put together by ffmpeg)
if (process.env.RECORD !== '0') {
  for (const [tag, vp, sel] of [
    ['desktop', { width: 1440, height: 900 }, '.khh-in'],
    ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, '.khh-in'],
  ]) {
    const page = await browser.newPage()
    await page.setViewport(vp)
    // the day look (the night check before left night mode on)
    await page.goto(green + '/', { waitUntil: 'load' })
    await page.evaluate(() => localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 })))
    await page.goto(green + '/kehila', { waitUntil: 'networkidle0' })
    await page.evaluate((s) => document.querySelector('[data-hub] ' + s).scrollIntoView({ block: 'center' }), sel)
    await wait(300)
    const rec = await page.screencast({ path: `${out}/rec-${tag}.webm`, fps: 30 })
    await wait(9000)
    await rec.stop()
    await page.close()
  }
  console.log('recordings saved')
}

console.log(fails ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
