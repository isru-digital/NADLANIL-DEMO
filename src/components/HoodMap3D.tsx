import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import type { ExpressionSpecification, GeoJSONSource, LayerSpecification, Map as MlMap, StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Minus, Navigation2, Plus } from 'lucide-react'
import type { CityPlaces } from '../config/places'
import type { StageProps } from './HoodMap'

/**
 * The 3D map of the neighbourhoods (Itzik 23.11.2026: "מתווך פותח את המפה ואומר וואו"). Loaded only when a map is
 * opened (this file and MapLibre are their own chunk), never with the page.
 *  - base map: OpenFreeMap (free, no key, no sign-up), its "positron" style by day and "dark" by night, with its
 *    words taken off so the only names on the map are ours;
 *  - the neighbourhoods are plates raised over the city in the site's soft green; the one under the mouse rises a
 *    little, the one picked rises high in the full green, with a short spring;
 *  - close in (zoom 14.5 and more) the buildings stand up in 3D and the plates grow thin, so the streets are seen;
 *  - opening it, the camera comes down into the city and tilts, in about a second and a half; any touch stops it;
 *  - less motion asked for (prefers-reduced-motion): the same map laid flat, no tilt, no flight, no rising;
 *  - if MapLibre or the tiles cannot start, onFail() and the window shows the flat SVG map instead.
 */

/** how high a plate stands, in metres at the zoom of the whole city (smaller as the map comes closer) */
// (the one under the mouse rises only a little, so what is under the mouse does not move away from it)
const LIFT = { base: 260, near: 330, on: 980 }
const BUILDINGS_FROM = 14.5
const PITCH = 52
const BEARING = 16
const INTRO_MS = 1600
const SPRING_MS = 420

/** any CSS colour as #rrggbb, through the browser's own parser */
function hex(css: string): string {
  const c = document.createElement('canvas').getContext('2d')!
  c.fillStyle = '#000'
  c.fillStyle = css.trim() || '#000'
  return c.fillStyle.startsWith('#') ? c.fillStyle : '#000000'
}
function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const [x, y] = [p(hex(a)), p(hex(b))]
  return '#' + x.map((v, i) => Math.round(v * (1 - t) + y[i] * t).toString(16).padStart(2, '0')).join('')
}
const cssVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n)

/** the same scale as heightExpr, for the names and the checks */
const liftScale = (z: number) => {
  const st: [number, number][] = [[10, 1.5], [12, 1], [13, 0.5], [14, 0.16], [15, 0.05]]
  if (z <= st[0][0]) return st[0][1]
  for (let i = 1; i < st.length; i++) if (z <= st[i][0]) return st[i - 1][1] + ((st[i][1] - st[i - 1][1]) * (z - st[i - 1][0])) / (st[i][0] - st[i - 1][0])
  return st[st.length - 1][1]
}
/** the zoom-scaled height of a plate: tall over the whole city, thin among the buildings */
const heightExpr = (): ExpressionSpecification => {
  const lift: ExpressionSpecification = ['coalesce', ['feature-state', 'lift'], LIFT.base]
  return ['interpolate', ['linear'], ['zoom'], 10, ['*', lift, 1.5], 12, lift, 13, ['*', lift, 0.5], 14, ['*', lift, 0.16], 15, ['*', lift, 0.05]]
}

type Label = { n: string; x: number; y: number }

export default function HoodMap3D({ places, chosen, flip, near, setNear, onFail }: StageProps & { places: CityPlaces; onFail: () => void }) {
  const geo = places.map!.geo!
  const box = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const [ready, setReady] = useState(false)
  const [labels, setLabels] = useState<Label[]>([])
  const [cam, setCam] = useState({ zoom: 0, min: 0, max: 18, bearing: 0, pitch: 0 })
  const state = useRef({ chosen, near, flip, setNear })
  state.current = { chosen, near, flip, setNear }
  const lifts = useRef(new Map<number, { from: number; to: number; t0: number; now: number }>())
  const reduced = useRef(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches).current
  const ids = useRef(new Map(geo.hoods.map((h, i) => [h.n, i]))).current
  const home = useRef<{ center: maplibregl.LngLat; zoom: number } | null>(null)
  const redraw = useRef<() => void>(() => {})

  /* ------------------------------------------------------------------ the map, once */
  useEffect(() => {
    let dead = false
    let map: MlMap | null = null
    const night = document.documentElement.dataset.mode === 'night'
    const gold = hex(cssVar('--gold') || '#0f9a63')
    const card = hex(cssVar('--card') || (night ? '#0f231b' : '#ffffff'))
    const bg = hex(cssVar('--bg') || (night ? '#07130f' : '#f3faf6'))
    const ink = night ? mix(gold, '#ffffff', 0.45) : mix(gold, '#000000', 0.38)
    const colors = {
      soft: night ? mix(card, gold, 0.42) : mix('#ffffff', gold, 0.3),
      near: night ? mix(card, gold, 0.7) : mix('#ffffff', gold, 0.55),
      on: gold,
      edge: ink,
      building: night ? mix(card, '#ffffff', 0.16) : '#e4e9e6',
    }
    /** a tilted map leaves sky at the top: the city's middle sits a little above the middle of the frame */
    const lift = () => ({ top: 0, left: 0, right: 0, bottom: reduced ? 0 : Math.round((box.current?.clientHeight ?? 0) * 0.16) })
    // the style and the first draw must come within 12 seconds, or the flat map takes over (tiles still coming
    // in later, close in, are fine: that is not a failure)
    let started = false
    const giveUp = window.setTimeout(() => !dead && !started && onFail(), 12000)

    const start = async () => {
      const url = `https://tiles.openfreemap.org/styles/${night ? 'dark' : 'positron'}`
      const style = (await fetch(url, { signal: AbortSignal.timeout(9000) }).then((r) => {
        if (!r.ok) throw new Error('style ' + r.status)
        return r.json()
      })) as StyleSpecification
      if (dead || !box.current) return
      // our names are the only words on the map: the base map's labels and shields go
      style.layers = style.layers.filter((l) => l.type !== 'symbol')
      for (const l of style.layers) {
        // close in, the flat buildings of the base map give way to the 3D ones
        if (l.id === 'building' && !reduced) l.maxzoom = BUILDINGS_FROM + 0.01
        if (l.type === 'background' && night) (l.paint ??= {})['background-color'] = mix(bg, '#000000', 0.1)
      }

      const [w, s, e, n] = geo.bounds
      const dx = (e - w) * 1.1
      const dy = (n - s) * 1.1
      map = new maplibregl.Map({
        container: box.current,
        style,
        bounds: [w, s, e, n],
        fitBoundsOptions: { padding: 24 },
        maxBounds: [w - dx, s - dy, e + dx, n + dy],
        attributionControl: false,
        doubleClickZoom: false,
        dragRotate: !reduced,
        pitchWithRotate: !reduced,
        touchPitch: !reduced,
        maxPitch: reduced ? 0 : 68,
        clickTolerance: 7,
        fadeDuration: reduced ? 0 : 250,
        renderWorldCopies: false,
      })
      mapRef.current = map
      if (reduced) map.touchZoomRotate.disableRotation()
      map.keyboard.disableRotation()
      const fit = map.getZoom()
      // the camera of the whole city: turned as it will be, and a little closer once tilted (the far side shrinks).
      // A tilted map leaves sky at the top, so the city sits a little higher than the middle.
      const cam = map.cameraForBounds([w, s, e, n], { bearing: reduced ? 0 : BEARING, padding: 18 })
      const narrow = box.current.clientWidth < 600
      home.current = {
        center: (cam?.center as maplibregl.LngLat | undefined) ? maplibregl.LngLat.convert(cam!.center!) : map.getCenter(),
        zoom: (cam?.zoom ?? fit) + (reduced ? 0 : narrow ? 0.5 : 0.55),
      }
      map.setMinZoom(fit - 1.3)
      map.setMaxZoom(18)

      map.on('load', () => {
        if (dead || !map) return
        started = true
        const m = map
        // the hatch of the parts of the city with no boundary in the open data
        const hatch = document.createElement('canvas')
        hatch.width = hatch.height = 24
        const hc = hatch.getContext('2d')!
        hc.fillStyle = night ? mix(card, '#ffffff', 0.05) : mix('#ffffff', '#5b6d66', 0.1)
        hc.fillRect(0, 0, 24, 24)
        hc.strokeStyle = night ? 'rgba(255,255,255,0.16)' : 'rgba(8,52,36,0.3)'
        hc.lineWidth = 3
        for (const o of [-24, 0, 24]) {
          hc.beginPath()
          hc.moveTo(o, 24)
          hc.lineTo(o + 24, 0)
          hc.stroke()
        }
        m.addImage('hm-hatch', hc.getImageData(0, 0, 24, 24), { pixelRatio: 2 })

        m.addSource('hm-city', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [geo.outline] } } })
        // the world around the city fades, so the eye stays on the city
        m.addSource('hm-mask', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[-179, -85], [179, -85], [179, 85], [-179, 85], [-179, -85]], [...geo.outline].reverse()] } },
        })
        m.addSource('hm-hoods', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: geo.hoods.map((h, i) => ({ type: 'Feature', id: i, properties: { n: h.n }, geometry: { type: 'Polygon', coordinates: [h.r] } })) },
        })
        const color: ExpressionSpecification = ['case', ['boolean', ['feature-state', 'on'], false], colors.on, ['boolean', ['feature-state', 'near'], false], colors.near, colors.soft]
        const layers: LayerSpecification[] = [
          { id: 'hm-mask', type: 'fill', source: 'hm-mask', paint: { 'fill-color': bg, 'fill-opacity': night ? 0.5 : 0.62 } },
          { id: 'hm-gap', type: 'fill', source: 'hm-city', paint: { 'fill-pattern': 'hm-hatch', 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.9, 15.5, 0.4] } },
          { id: 'hm-city-line', type: 'line', source: 'hm-city', paint: { 'line-color': colors.edge, 'line-width': 2.2, 'line-opacity': 0.75 } },
          reduced
            ? { id: 'hm-slab', type: 'fill', source: 'hm-hoods', paint: { 'fill-color': color, 'fill-opacity': 0.88 } }
            : {
                id: 'hm-slab',
                type: 'fill-extrusion',
                source: 'hm-hoods',
                paint: {
                  'fill-extrusion-color': color,
                  'fill-extrusion-height': heightExpr(),
                  'fill-extrusion-base': 0,
                  'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.9, 15, 0.72],
                  'fill-extrusion-vertical-gradient': true,
                },
              },
          {
            id: 'hm-edge',
            type: 'line',
            source: 'hm-hoods',
            paint: {
              'line-color': colors.edge,
              'line-width': ['case', ['boolean', ['feature-state', 'on'], false], 2.6, ['boolean', ['feature-state', 'near'], false], 2.2, 1.2],
              'line-opacity': 0.85,
            },
          },
        ]
        if (!reduced)
          layers.push({
            id: 'hm-buildings',
            type: 'fill-extrusion',
            source: 'openmaptiles',
            'source-layer': 'building',
            minzoom: BUILDINGS_FROM,
            paint: {
              'fill-extrusion-color': colors.building,
              'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], BUILDINGS_FROM, 0, BUILDINGS_FROM + 0.6, ['coalesce', ['get', 'render_height'], 8]],
              'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
              'fill-extrusion-opacity': 0.88,
            },
          })
        for (const l of layers) m.addLayer(l)
        for (const [n, id] of ids) {
          const on = state.current.chosen.includes(n)
          m.setFeatureState({ source: 'hm-hoods', id }, { on, lift: on ? LIFT.on : LIFT.base })
        }

        // the mouse: the neighbourhood under it is lit and says its name
        m.on('mousemove', (ev) => {
          if (matchMedia('(hover: none)').matches) return
          const f = m.queryRenderedFeatures(ev.point, { layers: ['hm-slab'] })[0]
          const name = (f?.properties?.n as string) ?? null
          m.getCanvas().style.cursor = name ? 'pointer' : ''
          if (name !== state.current.near) state.current.setNear(name)
        })
        // a tap picks (or lets go); a finger is not a pin, so a few pixels around it count too, the closest wins
        m.on('click', (ev) => {
          const { x, y } = ev.point
          // the one lit under the mouse is the one meant, when it is there
          const lit = state.current.near
          const around = m.queryRenderedFeatures([[x - 10, y - 10], [x + 10, y + 10]], { layers: ['hm-slab'] })
          const f = (lit && around.find((q) => q.properties?.n === lit)) || m.queryRenderedFeatures(ev.point, { layers: ['hm-slab'] })[0] || around[0]
          const name = f?.properties?.n as string | undefined
          if (!name) return
          state.current.flip(name)
          if (matchMedia('(hover: none)').matches) state.current.setNear(name)
        })
        const sync = () => setCam({ zoom: m.getZoom(), min: m.getMinZoom(), max: m.getMaxZoom(), bearing: m.getBearing(), pitch: m.getPitch() })
        let queued = false
        const onMove = () => {
          if (queued) return
          queued = true
          requestAnimationFrame(() => {
            queued = false
            sync()
            redraw.current()
          })
        }
        m.on('move', onMove)
        m.on('resize', onMove)
        sync()
        setReady(true)
        redraw.current()

        // the closest camera at which the whole outline is in the frame, tilted and turned as it will be (each city
        // has its own shape, and a phone is narrow): from close in, a step out at a time until it all fits
        {
          const h = home.current!
          const W = m.getContainer().clientWidth
          const H = m.getContainer().clientHeight
          const pts = geo.outline.filter((_, i) => i % Math.max(1, Math.floor(geo.outline.length / 80)) === 0)
          const from = h.zoom
          for (let z = from + 0.9; z > from - 1.5; z -= 0.1) {
            m.jumpTo({ center: h.center, zoom: z, pitch: reduced ? 0 : PITCH, bearing: reduced ? 0 : BEARING, padding: lift() })
            const ok = pts.every((q) => {
              const p = m.project(q)
              // the zoom buttons take the lower corner only
              return p.x >= 10 && p.y >= 10 && p.y <= H - 40 && p.x <= (p.y > H - 210 ? W - 72 : W - 10)
            })
            h.zoom = z
            if (ok) break
          }
          m.setMinZoom(Math.min(m.getMinZoom(), h.zoom - 1))
        }
        // into the city: from higher and turned, down and tilted. Any touch of the user stops it at once.
        if (!reduced) {
          const h = home.current!
          m.jumpTo({ center: h.center, zoom: h.zoom - 1.25, pitch: 0, bearing: BEARING - 34 })
          m.easeTo({ center: h.center, zoom: h.zoom, pitch: PITCH, bearing: BEARING, padding: lift(), duration: INTRO_MS, easing: (t) => 1 - Math.pow(1 - t, 3) })
          m.once('moveend', () => stage.current?.setAttribute('data-intro', 'done'))
        } else {
          stage.current?.setAttribute('data-intro', 'done')
        }
      })
    }
    start().catch(() => !dead && onFail())
    return () => {
      dead = true
      window.clearTimeout(giveUp)
      map?.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ------------------------------------------------------------------ picked and pointed at: the plates rise */
  useEffect(() => {
    const m = mapRef.current
    if (!m || !ready) return
    const now = performance.now()
    for (const [n, id] of ids) {
      const on = chosen.includes(n)
      const to = on ? LIFT.on : near === n ? LIFT.near : LIFT.base
      m.setFeatureState({ source: 'hm-hoods', id }, { on, near: near === n })
      const cur = lifts.current.get(id)
      const at = cur ? cur.now : LIFT.base
      if (cur ? cur.to === to : to === LIFT.base) continue
      if (reduced) {
        m.setFeatureState({ source: 'hm-hoods', id }, { lift: to })
        lifts.current.set(id, { from: to, to, t0: now, now: to })
      } else lifts.current.set(id, { from: at, to, t0: now, now: at })
    }
    redraw.current()
    if (reduced) return
    let raf = 0
    const tick = () => {
      const t = performance.now()
      let busy = false
      for (const [id, a] of lifts.current) {
        const k = Math.min(1, (t - a.t0) / SPRING_MS)
        if (a.now === a.to && k >= 1) continue
        // a soft spring: a little past the mark, then back to it
        const e = k >= 1 ? 1 : 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2)
        a.now = a.from + (a.to - a.from) * e
        if (k >= 1) a.now = a.to
        else busy = true
        m.setFeatureState({ source: 'hm-hoods', id }, { lift: a.now })
      }
      if (busy) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [chosen, near, ready]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ------------------------------------------------------------------ the names, laid over the map */
  useLayoutEffect(() => {
    redraw.current = () => {
      const m = mapRef.current
      const el = box.current
      if (!m || !el) return
      const { chosen: picked, near: lit } = state.current
      const W = el.clientWidth
      const H = el.clientHeight
      const font = 13
      const pitch = (m.getPitch() * Math.PI) / 180
      const zoom = m.getZoom()
      const scale = liftScale(zoom)
      const placed: { x0: number; x1: number; y0: number; y1: number }[] = []
      const out: Label[] = []
      // the picked and the lit first, then the big ones, so a small neighbourhood never hides a big one's name
      const order = [...geo.hoods].sort((a, b) => Number(picked.includes(b.n) || lit === b.n) - Number(picked.includes(a.n) || lit === a.n))
      for (const h of order) {
        // a city with only a few shapes shows every one of their names, they are what there is to find
        const must = picked.includes(h.n) || lit === h.n || geo.hoods.length < 10
        const p = m.project(h.l)
        const lat = (h.l[1] * Math.PI) / 180
        const mpp = (40075016.686 * Math.cos(lat)) / (512 * Math.pow(2, zoom))
        const lift = (lifts.current.get(ids.get(h.n)!)?.now ?? LIFT.base) * (reduced ? 0 : scale)
        const y = p.y - (lift / mpp) * Math.sin(pitch)
        if (p.x < -40 || p.x > W + 40 || y < -20 || y > H + 20) continue
        const tw = h.n.length * font * 0.56 + 14
        const th = font * 1.7
        if (!must) {
          // room for the name inside the neighbourhood on screen
          let x0 = Infinity
          let x1 = -Infinity
          let y0 = Infinity
          let y1 = -Infinity
          const stepN = Math.max(1, Math.floor(h.r.length / 24))
          for (let i = 0; i < h.r.length; i += stepN) {
            const q = m.project(h.r[i])
            x0 = Math.min(x0, q.x)
            x1 = Math.max(x1, q.x)
            y0 = Math.min(y0, q.y)
            y1 = Math.max(y1, q.y)
          }
          if (x1 - x0 < tw * 0.5 || y1 - y0 < th * 0.6) continue
        }
        const b = { x0: p.x - tw / 2, x1: p.x + tw / 2, y0: y - th / 2, y1: y + th / 2 }
        const hits = () => placed.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0)
        if (must && !(picked.includes(h.n) || lit === h.n)) {
          // a name that must show, in a crowd: it steps down under the one it would cover
          for (let i = 0; i < 4 && hits(); i++) {
            b.y0 += th + 4
            b.y1 += th + 4
          }
        } else if (!(picked.includes(h.n) || lit === h.n) && hits()) continue
        placed.push(b)
        out.push({ n: h.n, x: Math.round(p.x), y: Math.round((b.y0 + b.y1) / 2) })
      }
      setLabels(out)
    }
  })

  /* ------------------------------------------------------------------ a handle for the checks (no effect on use) */
  useEffect(() => {
    const el = stage.current as (HTMLDivElement & { __hm?: unknown }) | null
    if (!el) return
    el.__hm = {
      map: () => mapRef.current,
      /** the point on screen of a neighbourhood's top, where a tap lands on it */
      point: (n: string) => {
        const m = mapRef.current
        const h = geo.hoods.find((x) => x.n === n)
        if (!m || !h) return null
        const r = el.getBoundingClientRect()
        const zoom = m.getZoom()
        const lift = (lifts.current.get(ids.get(n)!)?.now ?? LIFT.base) * (reduced ? 0 : liftScale(zoom))
        const up = (ll: [number, number]) => {
          const mpp = (40075016.686 * Math.cos((ll[1] * Math.PI) / 180)) / (512 * Math.pow(2, zoom))
          const p = m.project(ll)
          return { x: p.x, y: p.y - (lift / mpp) * Math.sin((m.getPitch() * Math.PI) / 180) }
        }
        // the name's spot on the plate's top, or else any spot of the plate that is seen (one in front may hide part)
        const xs = h.r.map((q) => q[0])
        const ys = h.r.map((q) => q[1])
        const tries: [number, number][] = [h.l]
        for (let i = 1; i < 8; i++) for (let j = 1; j < 8; j++) tries.push([Math.min(...xs) + ((Math.max(...xs) - Math.min(...xs)) * i) / 8, Math.min(...ys) + ((Math.max(...ys) - Math.min(...ys)) * j) / 8])
        // a spot where this plate alone is under the finger (where two plates meet in the picture, either may answer)
        for (const t of tries) {
          const p = up(t)
          if (p.x < 4 || p.y < 4 || p.x > r.width - 70 || p.y > r.height - 40) continue
          const fs = m.queryRenderedFeatures([[p.x - 6, p.y - 6], [p.x + 6, p.y + 6]], { layers: ['hm-slab'] })
          const at = m.queryRenderedFeatures([p.x, p.y], { layers: ['hm-slab'] })
          if (at.length && fs.every((f) => f.properties?.n === n) && at.every((f) => f.properties?.n === n)) return { x: r.left + p.x, y: r.top + p.y }
        }
        return null
      },
      buildings: () => (mapRef.current?.getLayer('hm-buildings') ? mapRef.current.queryRenderedFeatures({ layers: ['hm-buildings'] }).length : 0),
      lift: (n: string) => lifts.current.get(ids.get(n)!)?.now ?? LIFT.base,
      outline: geo.outline,
      reduced,
    }
  })

  const few = geo.hoods.length < 10
  const m = mapRef.current
  const zoomBy = (d: number) => (d > 0 ? m?.zoomIn({ duration: reduced ? 0 : 260 }) : m?.zoomOut({ duration: reduced ? 0 : 260 }))
  const backHome = () => {
    const lift = () => ({ top: 0, left: 0, right: 0, bottom: reduced ? 0 : Math.round((box.current?.clientHeight ?? 0) * 0.16) })
    const h = home.current
    if (!m || !h) return
    const to = { center: h.center, zoom: h.zoom, pitch: reduced ? 0 : PITCH, bearing: reduced ? 0 : BEARING, padding: lift() }
    if (reduced) m.jumpTo(to)
    else m.easeTo({ ...to, duration: 700 })
  }
  // the credits are fixed and always on screen: OpenStreetMap (the data), OpenFreeMap (the tiles), OpenMapTiles (the schema)
  return (
    <div
      ref={stage}
      className="hm-stage hm3"
      data-map-stage
      data-ready={ready ? '1' : undefined}
      data-zoom={cam.zoom.toFixed(2)}
      data-pitch={Math.round(cam.pitch)}
      data-bearing={Math.round(cam.bearing)}
      data-reduced={reduced ? '1' : undefined}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setNear(null)}
    >
      <div ref={box} className="hm3-map" />
      {!ready && <div className="hm-wait" data-map-loading aria-hidden />}
      <div className="hm3-labels" aria-hidden>
        {labels.map((l) => (
          <span
            key={l.n}
            className={`hm3-label${chosen.includes(l.n) ? ' is-on' : ''}${near === l.n ? ' is-near' : ''}${few ? ' is-tap' : ''}`}
            // in a city with only a few small shapes the name itself is the easy thing to tap
            onClick={few ? () => flip(l.n) : undefined}
            style={{ transform: `translate(${l.x}px, ${l.y}px) translate(-50%, -50%)` }}
            data-label={l.n}
          >
            {l.n}
          </span>
        ))}
      </div>
      {/* for a keyboard and a screen reader: the same neighbourhoods as a list of switches */}
      <div className="sr-only" role="group" aria-label="השכונות במפה">
        {geo.hoods.map((h) => (
          <button key={h.n} type="button" role="checkbox" aria-checked={chosen.includes(h.n)} data-hood={h.n} onClick={() => flip(h.n)} onFocus={() => setNear(h.n)}>
            {h.n}
          </button>
        ))}
      </div>
      <div className="hm-zoom">
        {!reduced && (
          <button type="button" onClick={backHome} aria-label="חזרה לכל העיר" title="חזרה לכל העיר" data-act="map-home">
            <Navigation2 aria-hidden style={{ transform: `rotate(${-cam.bearing}deg)` }} />
          </button>
        )}
        <button type="button" onClick={() => zoomBy(1)} aria-label="הגדלה" disabled={!ready || cam.zoom >= cam.max - 0.01} data-act="zoom-in">
          <Plus aria-hidden />
        </button>
        <button type="button" onClick={() => zoomBy(-1)} aria-label="הקטנה" disabled={!ready || cam.zoom <= cam.min + 0.01} data-act="zoom-out">
          <Minus aria-hidden />
        </button>
      </div>
      <small className="hm-credit" dir="ltr" data-map-credit>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          © OpenStreetMap
        </a>
        {' · '}
        <a href="https://openfreemap.org" target="_blank" rel="noreferrer">
          OpenFreeMap
        </a>
        {' · '}
        <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">
          © OpenMapTiles
        </a>
        {places.map!.source === 'official' && <> · {places.map!.credit}</>}
      </small>
    </div>
  )
}
