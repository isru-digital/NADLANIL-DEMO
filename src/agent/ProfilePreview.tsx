import { ShieldCheck } from 'lucide-react'
import { inArea } from './agentData'
import type { AgentProfile } from './agentData'
import AreasMap from './AreasMap'

/** A small card that shows the page taking shape: used beside the questionnaire and in the dashboard. */
export default function ProfilePreview({ profile: p }: { profile: AgentProfile }) {
  const name = p.name.trim()
  const role = p.gender === 'f' ? 'מתווכת נדל"ן' : 'מתווך נדל"ן'
  const where = p.areas.length ? ` ${inArea(p.areas[0])}${p.areas.length > 1 ? ` ועוד ${p.areas.length - 1}` : ''}` : ''
  return (
    <div className="agp-mini">
      <div className="agp-mini-photo">
        {p.photo ? (
          <img src={p.photo} alt="" />
        ) : name ? (
          <span>{name[0]}</span>
        ) : (
          // nobody's card yet (a visitor on the home page): a plain figure, not a question mark (Itzik 20.11.2026)
          <svg className="agp-mini-nobody" viewBox="0 0 96 120" aria-hidden data-nobody>
            <circle cx="48" cy="44" r="19" />
            <path d="M12 120c0-22 16-37 36-37s36 15 36 37z" />
          </svg>
        )}
        {p.licenseFile && (
          <i title="רישיון הועלה">
            <ShieldCheck />
          </i>
        )}
      </div>
      <div className="agp-mini-body">
        <small>
          {role}
          {where}
        </small>
        <h3>{name || 'השם שלכם יופיע כאן'}</h3>
        {p.office && <p>{p.office}</p>}
        {p.firstLine && <blockquote>{p.firstLine}</blockquote>}
        <ul className="agp-mini-chips">
          {p.specialties.slice(0, 4).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
      <div className="agp-mini-map">
        <AreasMap selected={p.areas} width={78} />
      </div>
    </div>
  )
}
