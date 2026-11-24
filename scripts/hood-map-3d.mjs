// Part 4 of scripts/hood-map-check.mjs: the neighbourhood map in 3D (Itzik 23.11.2026), and the maps of ראשון לציון,
// בת ים and חולון. Run through hood-map-check.mjs (ONLY=3d runs this part alone). See the top of that file.

/** a green of the site: its green channel is the strongest of the three */
const isGreen = (hex) => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex ?? '')
  if (!m) return false
  const [r, g, b] = m.slice(1).map((x) => parseInt(x, 16))
  return g > r + 30 && g > b + 15
}

export async function part4({ browser, check, wait, out, CONTRAST, DEVICES, green }) {
  /** a fresh browser context; opts.noGL takes WebGL away, opts.reduced asks for less motion */
  const fresh = async (vp, mode, opts = {}) => {
    const ctx = await browser.createBrowserContext()
    const page = await ctx.newPage()
    const errors = []
    const reqs = []
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
    page.on('request', (r) => reqs.push(r.url()))
    await page.setViewport(vp)
    if (opts.reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    await page.evaluateOnNewDocument(
      (m, noGL) => {
        try {
          localStorage.setItem('nadlanup-demo-v1', '1')
          localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: Date.now() + 9e9 }))
        } catch {}
        if (noGL) {
          const get = HTMLCanvasElement.prototype.getContext
          HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
            return /webgl/.test(type) ? null : get.call(this, type, ...rest)
          }
        }
      },
      mode,
      !!opts.noGL,
    )
    const click = async (sel) => {
      await page.waitForSelector(sel, { visible: true, timeout: 8000 })
      await page.$eval(sel, (el) => (el.scrollIntoView({ block: 'center' }), el.click()))
      await wait(300)
    }
    return { ctx, page, errors, reqs, click }
  }
  /** the property form (or the client's form) with a city, and its neighbourhood field open */
  const toField = async (t, city, form = 'property') => {
    if (form === 'property') {
      await t.page.goto(green + '/app/crm?v=properties', { waitUntil: 'load' })
      await wait(1300)
      await t.click('[data-act="new-card"]')
      await t.page.waitForSelector('.ga-fields', { visible: true })
      await wait(500)
      if (!(await t.page.$(`.ga [data-city="${city}"]`))) await t.click('.ga [data-act="more-cities"]')
      await t.click(`.ga [data-city="${city}"]`)
    } else {
      await t.page.goto(green + '/app/crm?v=clients', { waitUntil: 'load' })
      await wait(1300)
      await t.page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'לקוח חדש')?.click())
      await t.page.waitForSelector('.nc', { visible: true, timeout: 8000 })
      await wait(600)
      await t.page.evaluate((c) => [...document.querySelectorAll('.nc-pick')].find((b) => b.textContent.trim() === c)?.click(), city)
      await wait(500)
    }
    const sel = form === 'property' ? '[data-places="property"]' : '[data-places="buyer"]'
    await t.click(`${sel} [data-kind="hood"]`)
    return sel
  }
  /** opens the map and waits for its flight to end; gives back how long that took */
  const openMap = async (t, sel) => {
    const t0 = Date.now()
    await t.click(`${sel} [data-act="open-map"]`)
    await t.page.waitForSelector('[data-hood-map]', { visible: true, timeout: 15000 }) // 15 s: under a long suite run the window can take longer than 8
    const ok = await t.page.waitForSelector('[data-map-stage][data-intro="done"], [data-hood-map][data-map-mode="flat"] svg', { timeout: 25000 }).then(() => true, () => false)
    const ms = Date.now() - t0
    await wait(900)
    return ok ? ms : null
  }
  const state = (page) =>
    page.evaluate(() => {
      const m = document.querySelector('[data-hood-map]')
      if (!m) return null
      const st = m.querySelector('[data-map-stage]')
      const map = st?.__hm?.map()
      const ok = m.querySelector('[data-act="map-done"], [data-act="map-to-list"]')
      const credit = m.querySelector('.hm-credit')
      return {
        mode: m.dataset.mapMode,
        city: m.dataset.hoodMap,
        hoods: m.querySelectorAll('[data-hood]').length,
        on: [...m.querySelectorAll('[data-hood][aria-checked="true"]')].map((p) => p.dataset.hood),
        labels: [...m.querySelectorAll('[data-label]')].map((l) => l.dataset.label),
        near: [...m.querySelectorAll('[data-label].is-near')].map((l) => l.dataset.label),
        chips: [...m.querySelectorAll('[data-map-chip]')].map((c) => c.dataset.mapChip),
        ok: ok?.textContent.trim(),
        okAct: ok?.dataset.act,
        okOff: !!ok?.disabled,
        tip: m.querySelector('[data-map-tip]')?.innerText.replace(/\s+/g, ' ').trim(),
        sparse: !!m.querySelector('[data-map-sparse]'),
        legend: m.querySelector('[data-map-legend]')?.innerText.replace(/\s+/g, ' ').trim(),
        credit: credit?.textContent.replace(/\s+/g, ' ').trim(),
        creditSize: credit ? parseFloat(getComputedStyle(credit).fontSize) : 0,
        pitch: map ? Math.round(map.getPitch()) : null,
        bearing: map ? Math.round(map.getBearing()) : null,
        zoom: map ? Math.round(map.getZoom() * 100) / 100 : null,
        center: map ? map.getCenter().toArray().map((v) => Math.round(v * 1e5) / 1e5) : null,
        slab: map?.getLayer('hm-slab')?.type ?? null,
        slabColor: map ? JSON.stringify(map.getPaintProperty('hm-slab', map.getLayer('hm-slab').type === 'fill' ? 'fill-color' : 'fill-extrusion-color')) : null,
        buildingsLayer: !!map?.getLayer('hm-buildings'),
        buildings: st?.__hm?.buildings() ?? 0,
        reduced: !!st?.__hm?.reduced,
        home: !!m.querySelector('[data-act="map-home"]'),
        touch: m.querySelector('.maplibregl-canvas') ? getComputedStyle(m.querySelector('.maplibregl-canvas')).touchAction : null,
        svg: !!m.querySelector('[data-map-stage] svg path.hm-city'),
        canvas: !!m.querySelector('.maplibregl-canvas'),
        scrollTop: document.scrollingElement.scrollTop,
      }
    })
  const point = (page, n) => page.evaluate((x) => document.querySelector('[data-map-stage]').__hm.point(x), n)
  const lift = (page, n) => page.evaluate((x) => document.querySelector('[data-map-stage]').__hm.lift(x), n)
  const tap = async (page, n, touch) => {
    const pt = await point(page, n)
    if (!pt) return false
    if (touch) await page.touchscreen.tap(pt.x, pt.y)
    else await page.mouse.click(pt.x, pt.y)
    await wait(650)
    return true
  }
  /** names of plates that can be tapped right now (a spot of their top is seen) */
  const tappable = async (page, k) => {
    const names = await page.evaluate(() => [...document.querySelectorAll('[data-hood-map] [data-hood]')].map((x) => x.dataset.hood))
    const outN = []
    for (const n of names) if ((await point(page, n)) && outN.push(n) >= k) break
    return outN
  }
  const contrast = (page, sel) => page.evaluate(`(${CONTRAST})(${JSON.stringify(sel)})`)

  for (const [dev, vp] of DEVICES) {
    const touch = dev === 'phone'
    for (const mode of ['day', 'night']) {
      const tag = `3D ${dev} ${mode}`
      const shot = (page, n) => page.screenshot({ path: `${out}/3d-${dev}-${mode}-${n}.png` })

      /* ======================================================== A. Tel Aviv, a property */
      const t = await fresh(vp, mode)
      const sel = await toField(t, 'תל אביב')
      const early = t.reqs.filter((u) => /openfreemap|maplibre|HoodMap3D/i.test(u))
      check(`${tag}: nothing of the 3D map is fetched with the page or the form, only when the map is opened`, early.length === 0, early.slice(0, 3))
      const ms = await openMap(t, sel)
      let s = await state(t.page)
      const late = t.reqs.filter((u) => /openfreemap/.test(u)).length
      check(`${tag}: the map opens in 3D (MapLibre on OpenFreeMap tiles)`, s.mode === '3d' && s.canvas && late > 0, { mode: s.mode, canvas: s.canvas, tiles: late })
      check(`${tag}: a short flight into the city (${ms} ms from the tap), ending tilted at ${s.pitch} degrees`, ms !== null && ms < 4500 && s.pitch >= 45 && s.pitch <= 60, { ms, pitch: s.pitch })
      check(`${tag}: the plates are the site's greens (soft, lit, and the full green when picked)`, (s.slabColor?.match(/#[0-9a-f]{6}/gi) ?? []).length === 3 && s.slabColor.match(/#[0-9a-f]{6}/gi).every(isGreen) && s.slab === 'fill-extrusion', s.slabColor)
      check(`${tag}: names on the neighbourhoods (${s.labels.length})`, s.labels.length >= (touch ? 6 : 8), s.labels)
      check(`${tag}: the credits of OpenStreetMap, OpenFreeMap and OpenMapTiles, small but readable`, /OpenStreetMap/.test(s.credit) && /OpenFreeMap/.test(s.credit) && /OpenMapTiles/.test(s.credit) && s.creditSize >= 11.5, { credit: s.credit, size: s.creditSize })
      const ink = await contrast(t.page, '.hm-credit')
      check(`${tag}: and the credit can really be read (${ink}:1)`, ink >= 4.5, ink)
      check(`${tag}: the legend and the line for a property stay (hatch = no boundary in the open map)`, s.legend.includes('אין גבול שכונה במפה הפתוחה') && s.legend.includes('נבחרה') && s.tip.includes('השכונה שבה נמצא הנכס'), { legend: s.legend, tip: s.tip })
      check(`${tag}: no buildings while the whole city is in view (they come only close in)`, s.buildingsLayer && s.buildings === 0, { layer: s.buildingsLayer, n: s.buildings })
      check(`${tag}: the fingers move the map, not the page (touch-action of the map: none)`, s.touch === 'none', s.touch)
      check(`${tag}: with nothing picked the button is off`, s.ok === 'בוחרים שכונה' && s.okOff)
      await shot(t.page, '1-tel-aviv')

      const [a, b] = await tappable(t.page, 2)
      await tap(t.page, a, touch)
      s = await state(t.page)
      const up = await lift(t.page, a)
      check(`${tag}: a tap picks the neighbourhood, its plate rises high (${Math.round(up)} m), and the button counts it`, s.on.join() === a && up > 800 && s.ok === 'אישור שכונה אחת' && !s.okOff && s.labels.includes(a), { a, on: s.on, up, ok: s.ok })
      await shot(t.page, '2-picked')
      await tap(t.page, b, touch)
      s = await state(t.page)
      const down = await lift(t.page, a)
      check(`${tag}: for a property a second one takes the place of the first, which goes back down`, s.on.join() === b && down < 400, { on: s.on, down })
      await tap(t.page, b, touch)
      s = await state(t.page)
      check(`${tag}: a tap on it again lets it go, and the button goes off`, s.on.length === 0 && s.okOff, s.on)

      if (!touch) {
        // the mouse lights a neighbourhood with no name shown, and its name comes up
        const quiet = (await tappable(t.page, 40)).find((n) => !s.labels.includes(n))
        const pt = quiet && (await point(t.page, quiet))
        if (pt) {
          await t.page.mouse.move(pt.x, pt.y)
          await wait(700)
        }
        const h = await state(t.page)
        check(`${tag}: the mouse over a neighbourhood lights it and shows its name ("${quiet}")`, !!pt && h.near.includes(quiet) && h.on.length === 0, { quiet, near: h.near })
        await t.page.mouse.move(5, 5)
      }

      // close in: the buildings stand up
      for (let i = 0; i < 4; i++) {
        await t.click('[data-act="zoom-in"]')
        await wait(450)
      }
      await wait(3000)
      s = await state(t.page)
      check(`${tag}: close in (zoom ${s.zoom}) the buildings stand up in 3D (${s.buildings} drawn)`, s.zoom >= 14.5 && s.buildings > 20, { zoom: s.zoom, n: s.buildings })
      await shot(t.page, '3-buildings')
      await t.click('[data-act="map-home"]')
      await wait(1300)
      s = await state(t.page)
      check(`${tag}: "חזרה לכל העיר" flies back to the whole city, tilted again`, s.zoom < 13 && s.pitch >= 45, { zoom: s.zoom, pitch: s.pitch })
      check(`${tag}: no page errors (Tel Aviv, property)`, t.errors.length === 0, t.errors.slice(0, 2))
      await t.ctx.close()

      /* ======================================================== B. a client: several, chips, and the search */
      const c = await fresh(vp, mode)
      const csel = await toField(c, 'תל אביב', 'client')
      await openMap(c, csel)
      s = await state(c.page)
      check(`${tag}: in a client's map the line is about the client`, s.mode === '3d' && s.tip.includes('הלקוח') && !s.tip.includes('הנכס'), s.tip)
      const three = await tappable(c.page, 3)
      for (const n of three) await tap(c.page, n, touch)
      s = await state(c.page)
      check(`${tag}: each tap adds one: three picked, three chips, "אישור 3 שכונות"`, s.on.length === 3 && three.every((n) => s.on.includes(n)) && s.chips.length === 3 && s.ok === 'אישור 3 שכונות', { three, on: s.on, chips: s.chips, ok: s.ok })
      await shot(c.page, '4-client-three')
      await c.page.evaluate(() => document.querySelector('[data-map-chip] [data-act="map-chip-off"]')?.click())
      await wait(500)
      s = await state(c.page)
      check(`${tag}: the X on a chip lets that one go on the map too`, s.on.length === 2 && s.chips.length === 2, { on: s.on, chips: s.chips })
      await c.click('[data-act="map-done"]')
      await wait(600)
      await c.page.evaluate(() => {
        const el = document.querySelector('[data-places="buyer"] [data-f="hood-search"]')
        el.scrollIntoView({ block: 'center' })
        el.focus()
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, 'נווה צדק')
        el.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await wait(700)
      const added = await c.page.evaluate(() => {
        const row = document.querySelector('[data-places="buyer"] [data-list] [data-pick]')
        row?.click()
        return row?.dataset.pick ?? null
      })
      await wait(500)
      await openMap(c, csel)
      s = await state(c.page)
      check(`${tag}: one picked from the search is picked on the 3D map too, and the two from the map stay`, !!added && s.on.includes(added) && s.on.length === 3, { added, on: s.on })
      check(`${tag}: no page errors (client)`, c.errors.length === 0, c.errors.slice(0, 2))
      await c.ctx.close()

      /* ======================================================== C. the other four cities */
      for (const [city, kind] of [
        ['רמת גן', 'full'],
        ['ראשון לציון', 'few'],
        ['בת ים', 'none'],
        ['חולון', 'none'],
      ]) {
        const k = await fresh(vp, mode)
        const ksel = await toField(k, city)
        const has = await k.page.$(`${ksel} [data-act="open-map"]`)
        const kms = has ? await openMap(k, ksel) : null
        s = has ? await state(k.page) : null
        const inFrame = s
          ? await k.page.evaluate(() => {
              const st = document.querySelector('[data-map-stage]')
              const m = st.__hm.map()
              const ring = st.__hm.outline ?? []
              const W = st.clientWidth
              const H = st.clientHeight
              const off = ring.map((q) => m.project(q)).filter((p) => p.x < -2 || p.y < -2 || p.x > W + 2 || p.y > H + 2).length
              return { points: ring.length, off }
            })
          : null
        check(`${tag}: ${city} opens in 3D, the whole city in the frame`, !!s && s.mode === '3d' && kms !== null && inFrame.points > 10 && inFrame.off === 0, { mode: s?.mode, kms, inFrame })
        if (kind === 'full') {
          const [one] = await tappable(k.page, 1)
          await tap(k.page, one, touch)
          s = await state(k.page)
          check(`${tag}: ${city}: ${s.hoods} neighbourhoods, names on them, and one is picked with a tap`, s.hoods >= 15 && s.labels.length >= 5 && s.on.join() === one, { one, hoods: s.hoods, labels: s.labels.length, on: s.on })
        } else if (kind === 'few') {
          check(`${tag}: ${city}: the few boundaries OpenStreetMap has (${s.hoods}) are plates with their names, and a line says the rest are picked from the search`, s.hoods >= 1 && s.hoods < 10 && s.labels.length === s.hoods && s.sparse && s.legend.includes('אין גבול שכונה'), { hoods: s.hoods, labels: s.labels, sparse: s.sparse })
          const name = s.labels[0]
          const lp = await k.page.evaluate((n) => {
            const r = document.querySelector(`[data-label="${CSS.escape(n)}"]`).getBoundingClientRect()
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
          }, name)
          if (touch) await k.page.touchscreen.tap(lp.x, lp.y)
          else await k.page.mouse.click(lp.x, lp.y)
          await wait(600)
          s = await state(k.page)
          check(`${tag}: ${city}: a tap on a name picks that neighbourhood (the shapes there are small)`, s.on.join() === name, { name, on: s.on })
        } else {
          check(`${tag}: ${city}: OpenStreetMap has no neighbourhood boundary inside it, so the whole city is the hatch, the line says to pick from the search, and the button goes back to it`, s.hoods === 0 && /אין גבולות שכונה ב/.test(s.tip) && s.tip.includes('מרשימת החיפוש') && s.okAct === 'map-to-list' && s.legend.includes('אין גבול שכונה'), { hoods: s.hoods, tip: s.tip, ok: s.okAct })
        }
        await k.page.screenshot({ path: `${out}/3d-${dev}-${mode}-city-${city.replace(/\s+/g, '-')}.png` })
        if (kind === 'none' || kind === 'few') {
          // and its neighbourhoods are there in the list of the search
          await k.click('[data-act="close-map"], [data-act="map-to-list"]')
          await wait(300)
          const listed = await k.page.evaluate((sl) => {
            const el = document.querySelector(`${sl} [data-f="hood-search"]`)
            el.scrollIntoView({ block: 'center' })
            el.focus()
            Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, 'ר')
            el.dispatchEvent(new Event('input', { bubbles: true }))
            return true
          }, ksel)
          await wait(700)
          const picked = await k.page.evaluate((sl) => {
            const row = document.querySelector(`${sl} [data-list] [data-pick]`)
            row?.click()
            return row?.dataset.pick ?? null
          }, ksel)
          await wait(400)
          const chips = await k.page.evaluate((sl) => [...document.querySelectorAll(`${sl} [data-chip="hood"]`)].map((x) => x.dataset.name), ksel)
          check(`${tag}: ${city}: a neighbourhood is picked from the search list ("${picked}")`, listed && !!picked && chips.includes(picked), { picked, chips })
        }
        check(`${tag}: no page errors (${city})`, k.errors.length === 0, k.errors.slice(0, 2))
        await k.ctx.close()
      }
    }

    /* ======================================================== D. a phone: drag, pinch, twist (each in its own context) */
    if (touch) {
      const gesture = async (name, steps) => {
        const g = await fresh(vp, 'day')
        const gsel = await toField(g, 'תל אביב')
        await openMap(g, gsel)
        const before = await state(g.page)
        const box = await g.page.$eval('[data-map-stage]', (el) => {
          const r = el.getBoundingClientRect()
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        })
        const cdp = await g.page.createCDPSession()
        const send = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: Math.round(p.x), y: Math.round(p.y), id: i })) })
        const frames = steps(box)
        await send('touchStart', frames[0])
        for (const f of frames.slice(1)) {
          await send('touchMove', f)
          await wait(16)
        }
        await send('touchEnd', [])
        await wait(900)
        const after = await state(g.page)
        await g.ctx.close()
        return { before, after }
      }
      const N = 24
      let r = await gesture('drag', (c) => Array.from({ length: N }, (_, i) => [{ x: c.x, y: c.y - 60 + (i * 140) / N }]))
      check(`3D phone: one finger drags the map, picks nothing, and the page behind stays`, r.after.center.join() !== r.before.center.join() && r.after.on.length === 0 && r.after.scrollTop === r.before.scrollTop, { from: r.before.center, to: r.after.center, on: r.after.on })
      r = await gesture('pinch', (c) => Array.from({ length: N }, (_, i) => [{ x: c.x - 30 - i * 4, y: c.y }, { x: c.x + 30 + i * 4, y: c.y }]))
      check(`3D phone: two fingers apart zoom in smoothly (${r.before.zoom} to ${r.after.zoom}), the page stays`, r.after.zoom > r.before.zoom + 0.5 && r.after.scrollTop === r.before.scrollTop && r.after.on.length === 0, { from: r.before.zoom, to: r.after.zoom })
      r = await gesture('twist', (c) =>
        Array.from({ length: N }, (_, i) => {
          const a = (i / (N - 1)) * (Math.PI / 3)
          return [
            { x: c.x - 70 * Math.cos(a), y: c.y - 70 * Math.sin(a) },
            { x: c.x + 70 * Math.cos(a), y: c.y + 70 * Math.sin(a) },
          ]
        }),
      )
      check(`3D phone: two fingers turning turn the map (${r.before.bearing} to ${r.after.bearing} degrees)`, Math.abs(r.after.bearing - r.before.bearing) > 15, { from: r.before.bearing, to: r.after.bearing })
    }

    /* ======================================================== E. less motion asked for: a flat map, no flight */
    const rm = await fresh(vp, touch ? 'night' : 'day', { reduced: true })
    const rsel = await toField(rm, 'תל אביב')
    const rms = await openMap(rm, rsel)
    let s = await state(rm.page)
    check(`3D ${dev}: with "less motion" the map is flat (no tilt, north up, flat shapes, no 3D buildings, no flight button)`, s.mode === '3d' && s.reduced && s.pitch === 0 && s.bearing === 0 && s.slab === 'fill' && !s.buildingsLayer && !s.home, { pitch: s.pitch, bearing: s.bearing, slab: s.slab, b: s.buildingsLayer, home: s.home })
    check(`3D ${dev}: and it is there at once, with no camera flight (${rms} ms)`, rms !== null && rms < 2500, rms)
    const [rp] = await tappable(rm.page, 1)
    await tap(rm.page, rp, touch)
    s = await state(rm.page)
    check(`3D ${dev}: a tap still picks on the flat map`, s.on.join() === rp, { rp, on: s.on })
    await rm.page.screenshot({ path: `${out}/3d-${dev}-reduced-motion.png` })
    await rm.ctx.close()

    /* ======================================================== F. no WebGL: the flat map of before */
    const ng = await fresh(vp, 'day', { noGL: true })
    const nsel = await toField(ng, 'תל אביב')
    await openMap(ng, nsel)
    s = await state(ng.page)
    check(`3D ${dev}: a device with no WebGL gets the flat map (the SVG one), and nothing of MapLibre is fetched`, s.mode === 'flat' && s.svg && !s.canvas && !ng.reqs.some((u) => /openfreemap|maplibre/i.test(u)), { mode: s.mode, svg: s.svg })
    await ng.page.screenshot({ path: `${out}/3d-${dev}-no-webgl.png` })
    check(`3D ${dev}: no page errors (less motion, no WebGL)`, rm.errors.length === 0 && ng.errors.length === 0, [...rm.errors, ...ng.errors].slice(0, 2))
    await ng.ctx.close()
  }
}
