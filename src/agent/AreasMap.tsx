import type { CSSProperties } from 'react'
import { MAP_CLIP, MAP_H, MAP_W, mapX, mapY } from '../components/NetworkMap'
import { areaLabel, areaOptions } from './agentData'

/**
 * The country as a field of dots, with the broker's areas lit up. Used live in the questionnaire (it reacts to
 * every area picked) and on the public page. Only transform and opacity move.
 */
export default function AreasMap({ selected, labels = false, width = 150 }: { selected: string[]; labels?: boolean; width?: number }) {
  return (
    <div className="agm" style={{ '--w': `${width}px` } as CSSProperties} aria-hidden>
      <div className="agm-land" style={{ clipPath: MAP_CLIP, WebkitClipPath: MAP_CLIP }} />
      {areaOptions.map((a, i) => {
        const on = selected.includes(a.id)
        return (
          <span
            key={a.id}
            className={`agm-node${on ? ' is-on' : ''}`}
            style={{ left: `${(mapX(a.lon) / MAP_W) * 100}%`, top: `${(mapY(a.lat) / MAP_H) * 100}%`, '--d': `${(i * 0.3) % 2}s` } as CSSProperties}
          >
            <i />
            {on && <b />}
            {labels && on && <em>{areaLabel(a.id)}</em>}
          </span>
        )
      })}
    </div>
  )
}
