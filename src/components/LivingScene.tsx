import { useEffect, useRef } from 'react'

// The skyline picture is 1344 x 752. Everything below is placed in that
// coordinate space, so it sits exactly on the buildings at any screen size.
const W = 1344
const H = 752
const px = (xPct: number, yPct: number) => [(xPct / 100) * W, (yPct / 100) * H] as const

/** Windows that switch on and off: [x%, y%, width%, height%, cycle seconds, start offset seconds]. */
const windows: [number, number, number, number, number, number][] = [
  // the tall tower: right column
  [86.7, 21.2, 1.5, 2.6, 19, -2],
  [86.7, 38.3, 1.5, 2.4, 27, -15],
  [86.7, 47.8, 1.5, 2.4, 23, -9],
  [86.7, 14.6, 1.5, 2.6, 31, -22],
  // the tall tower: middle column
  [84.2, 31.6, 1.3, 2.4, 21, -6],
  [84.2, 51.6, 1.3, 2.3, 29, -19],
  [84.2, 10.8, 1.3, 2.5, 25, -12],
  // the tall tower: balconies
  [79.5, 31.7, 1.5, 2.0, 33, -4],
  [80.4, 21.3, 1.4, 2.0, 26, -17],
  // the towers on the horizon
  [69.3, 27.0, 0.7, 1.1, 17, -8],
  [70.6, 33.0, 0.7, 1.1, 24, -1],
  [56.2, 27.2, 0.7, 1.1, 22, -13],
  [56.9, 33.4, 0.7, 1.1, 18, -5],
  [53.6, 31.2, 0.6, 1.0, 28, -20],
  [63.6, 30.4, 0.7, 1.1, 20, -10],
]

/** A bird inside a flock: [dx, dy, scale, wing-beat seconds]. */
const flockA: [number, number, number, number][] = [
  [0, 0, 0.8, 0.82],
  [26, 9, 0.7, 0.9],
  [-22, 12, 0.72, 0.76],
  [48, 20, 0.62, 0.86],
  [-46, 25, 0.6, 0.94],
  [12, 30, 0.55, 0.8],
]
const flockB: [number, number, number, number][] = [
  [0, 0, 0.6, 0.88],
  [24, 8, 0.52, 0.78],
  [-20, 11, 0.5, 0.92],
]

const wingsUp = 'M-7,0 Q-3.5,-5 0,0 Q3.5,-5 7,0'
const wingsDown = 'M-7,-1 Q-3.5,3 0,0 Q3.5,3 7,-1'

/** Cars: [path, seconds, start offset, colour, radius]. Warm white = headlights, red = tail lights. */
const cars: [string, number, number, string, number][] = [
  // the street between the trees, bottom centre
  ['M 524,762 C 512,704 501,652 492,596', 7.5, -1, '#fff1c9', 2.4],
  ['M 524,762 C 512,704 501,652 492,596', 7.5, -4.6, '#fff1c9', 2.4],
  ['M 484,596 C 493,652 504,704 516,762', 8.5, -2.5, '#ff7a66', 2],
  ['M 484,596 C 493,652 504,704 516,762', 8.5, -6.4, '#ff7a66', 2],
  // the coastal road, left
  ['M -30,606 C 90,574 200,542 300,472', 17, -3, '#fff1c9', 2],
  ['M -30,606 C 90,574 200,542 300,472', 17, -11, '#fff1c9', 2],
  ['M 300,480 C 204,548 96,580 -30,614', 19, -7, '#ff7a66', 1.7],
  ['M 300,480 C 204,548 96,580 -30,614', 19, -15, '#ff7a66', 1.7],
]

function Flock({ birds, path, dur, begin }: { birds: typeof flockA; path: string; dur: number; begin: number }) {
  return (
    <g>
      <animateMotion path={path} dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite" />
      {/* the inner group lets CSS shrink the flock on phones, where the picture is shown larger */}
      <g className="life-flock">
        {birds.map(([dx, dy, s, beat], i) => (
          <path key={i} d={wingsUp} transform={`translate(${dx} ${dy}) scale(${s})`}>
            <animate
              attributeName="d"
              values={`${wingsUp};${wingsDown};${wingsUp}`}
              dur={`${beat}s`}
              begin={`${-i * 0.17}s`}
              repeatCount="indefinite"
            />
          </path>
        ))}
      </g>
    </g>
  )
}

/**
 * Small signs of life drawn over the skyline: windows switching on, birds
 * crossing the sky, car lights on the roads. Quiet on purpose: it should be
 * felt more than noticed. Pauses when the hero is off screen.
 */
export default function LivingScene() {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = ref.current
    if (!svg) return
    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? svg.unpauseAnimations() : svg.pauseAnimations()),
      { threshold: 0.02 },
    )
    io.observe(svg)
    return () => io.disconnect()
  }, [])

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" focusable="false">
      <defs>
        <filter id="life-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="life-window" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe7ad" />
          <stop offset="1" stopColor="#ffc35c" />
        </linearGradient>
      </defs>

      <g className="life-windows" filter="url(#life-glow)" fill="url(#life-window)">
        {windows.map(([x, y, w, h, dur, begin], i) => {
          const [cx, cy] = px(x, y)
          const [cw, ch] = px(w, h)
          return (
            <rect key={i} className="lw" x={cx} y={cy} width={cw} height={ch} rx="0.8" opacity="0">
              <animate
                attributeName="opacity"
                values="0;0;1;1;0;0"
                keyTimes="0;0.06;0.085;0.62;0.66;1"
                dur={`${dur}s`}
                begin={`${begin}s`}
                repeatCount="indefinite"
              />
            </rect>
          )
        })}
      </g>

      <g className="life-birds" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <Flock birds={flockA} path="M 1420,138 C 1080,96 620,150 -80,78" dur={44} begin={-9} />
        <Flock birds={flockB} path="M 1420,214 C 1100,236 640,172 -80,206" dur={58} begin={-37} />
      </g>

      <g className="life-cars" filter="url(#life-glow)">
        {cars.map(([path, dur, begin, color, r], i) => (
          <circle key={i} r={r} fill={color} opacity="0">
            <animateMotion path={path} dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite" />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.12;0.86;1"
              dur={`${dur}s`}
              begin={`${begin}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </g>
    </svg>
  )
}
