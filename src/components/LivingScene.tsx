import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

// Positions are percentages of the skyline picture, so everything sits on the
// right spot at any screen size. All motion here is transform / opacity only:
// the browser animates it off the main thread, so it costs almost nothing.

type Point = [number, number]
type Path = [Point, Point, Point]
/** A bird inside a flock: [dx px, dy px, scale, wing-beat seconds]. */
type Bird = [number, number, number, number]

const flocks: { path: Path; dur: number; delay: number; birds: Bird[] }[] = [
  {
    path: [
      [105.6, 18.4],
      [48, 15.5],
      [-6, 10.4],
    ],
    dur: 44,
    delay: -9,
    birds: [
      [0, 0, 0.8, 0.41],
      [26, 9, 0.7, 0.45],
      [-22, 12, 0.72, 0.38],
      [48, 20, 0.62, 0.43],
      [-46, 25, 0.6, 0.47],
      [12, 30, 0.55, 0.4],
    ],
  },
  {
    path: [
      [105.6, 28.5],
      [50, 26.4],
      [-6, 27.4],
    ],
    dur: 58,
    delay: -37,
    birds: [
      [0, 0, 0.6, 0.44],
      [24, 8, 0.52, 0.39],
      [-20, 11, 0.5, 0.46],
    ],
  },
]

// the street between the trees (bottom centre) and the coastal road (left)
const street: Path = [
  [39, 101.3],
  [37.5, 87],
  [36.6, 79.3],
]
const streetBack: Path = [
  [36, 79.3],
  [37.2, 90],
  [38.4, 101.3],
]
const coast: Path = [
  [-2.2, 80.6],
  [11, 74],
  [22.3, 62.8],
]
const coastBack: Path = [
  [22.3, 63.8],
  [11.5, 75],
  [-2.2, 81.6],
]
/** Warm white = headlights, red = tail lights. */
const cars: { path: Path; dur: number; delay: number; color: string; size: number }[] = [
  { path: street, dur: 7.5, delay: -1, color: '#fff1c9', size: 5 },
  { path: street, dur: 7.5, delay: -4.6, color: '#fff1c9', size: 5 },
  { path: streetBack, dur: 8.5, delay: -2.5, color: '#ff7a66', size: 4 },
  { path: streetBack, dur: 8.5, delay: -6.4, color: '#ff7a66', size: 4 },
  { path: coast, dur: 17, delay: -3, color: '#fff1c9', size: 4 },
  { path: coast, dur: 17, delay: -11, color: '#fff1c9', size: 4 },
  { path: coastBack, dur: 19, delay: -7, color: '#ff7a66', size: 3.5 },
  { path: coastBack, dur: 19, delay: -15, color: '#ff7a66', size: 3.5 },
]

const route = (path: Path, dur: number, delay: number) =>
  ({
    '--x0': `${path[0][0]}%`,
    '--y0': `${path[0][1]}%`,
    '--x1': `${path[1][0]}%`,
    '--y1': `${path[1][1]}%`,
    '--x2': `${path[2][0]}%`,
    '--y2': `${path[2][1]}%`,
    animationDuration: `${dur}s`,
    animationDelay: `${delay}s`,
  }) as CSSProperties

/**
 * Small signs of life over the skyline: birds crossing the sky and car lights
 * on the roads. Quiet on purpose. Pauses when the hero is off screen.
 * `lite` (phones) shows the birds only: no road is visible in the narrow crop.
 */
export default function LivingScene({ lite = false }: { lite?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scene = ref.current
    if (!scene) return
    const io = new IntersectionObserver(([entry]) => scene.classList.toggle('is-paused', !entry.isIntersecting), {
      threshold: 0.02,
    })
    io.observe(scene)
    return () => io.disconnect()
  }, [])

  return (
    <div className="life-scene" ref={ref}>
      {flocks.map((f, i) => (
        <div key={i} className="life-mover life-fly" style={route(f.path, f.dur, f.delay)}>
          <div className="life-flock">
            {f.birds.map(([dx, dy, s, beat], j) => (
              // the flap runs on a plain element (not on the svg), so it stays off the main thread
              <span
                key={j}
                className="life-bird"
                style={{
                  left: dx,
                  top: dy,
                  width: 16 * s,
                  height: 10 * s,
                  animationDuration: `${beat}s`,
                  animationDelay: `${-j * 0.17}s`,
                }}
              >
                <svg viewBox="-8 -6 16 10">
                  <path d="M-7,0 Q-3.5,-5 0,0 Q3.5,-5 7,0" />
                </svg>
              </span>
            ))}
          </div>
        </div>
      ))}

      {!lite &&
        cars.map((c, i) => (
          <div key={i} className="life-mover life-drive" style={route(c.path, c.dur, c.delay)}>
            <i className="life-car" style={{ color: c.color, width: c.size, height: c.size }} />
          </div>
        ))}
    </div>
  )
}
