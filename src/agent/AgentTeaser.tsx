import { Link } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Sparkles } from 'lucide-react'
import { Reveal } from '../components/ui'
import { areaOptions, emptyProfile, sampleProfile } from './agentData'
import { demo, signedIn } from '../auth/session'
import ProfilePreview from './ProfilePreview'
import '../styles/agent.css'

/**
 * The home page's window onto "הסוכן שלנו": what the questionnaire is, a question as it looks, and the page that
 * comes out of it. The questionnaire itself lives in the area; this section shows it at the opening and links straight in.
 */
export default function AgentTeaser() {
  const shown = ['tlv', 'sharon', 'jerusalem', 'haifa', 'negev', 'eilat']
  return (
    <section className="agt" id="agent">
      <div className="container agt-in">
        <Reveal className="agt-copy">
          <span className="agt-tag">
            <BadgeCheck /> כלול במשרד
          </span>
          <h2>הסוכן שלנו</h2>
          <p className="agt-lead">חמש עשרה שאלות קלילות, ואתם מקבלים דף אישי מרשים בשמכם, שנבנה כדי שיחפשו אתכם בגוגל.</p>
          <ol className="agt-steps">
            <li>
              <b className="num">1</b>
              <span>מצטרפים למשרד</span>
            </li>
            <li>
              <b className="num">2</b>
              <span>עונים על חמש עשרה שאלות, בכיף</span>
            </li>
            <li>
              <b className="num">3</b>
              <span>מקבלים דף אישי שמופיע בגוגל</span>
            </li>
          </ol>
          <div className="agt-cta">
            <Link to="/join/office" className="btn btn-white btn-lg">
              להצטרפות למשרד <ArrowLeft />
            </Link>
            {/* the sample page is the example user's: offered inside a presentation of the demo only */}
            {demo && (
              <Link to="/agent/demo" className="btn btn-outline-white btn-lg">
                לראות דף לדוגמה
              </Link>
            )}
          </div>
          <small className="agt-note">האזור הוא חלק מהמשרד, ונפתח לחברי המשרד. 0% עמלה למשרד.</small>
        </Reveal>

        <Reveal delay={0.1} className="agt-visual">
          <div className="agt-q" aria-hidden>
            <div className="agt-q-top">
              <span>שאלה 5 מתוך 15</span>
              <i>
                <u />
              </i>
            </div>
            <b>איפה אתם עובדים?</b>
            <p>אפשר לבחור כמה אזורים. תראו אותם נדלקים במפה.</p>
            <ul>
              {shown.map((id, i) => {
                const a = areaOptions.find((x) => x.id === id)!
                const on = sampleProfile.areas.includes(id)
                return (
                  <li key={id} className={on ? 'is-on' : ''} style={{ animationDelay: `${0.3 + i * 0.12}s` }}>
                    {a.label}
                  </li>
                )
              })}
            </ul>
          </div>
          <span className="agt-arrow" aria-hidden>
            <Sparkles />
          </span>
          <div className="agt-pv" aria-hidden>
            {/* the example user is on the picture of the page inside a presentation of the demo only. A signed-in
                person sees their own name there, and a visitor sees the place where a name will be */}
            <ProfilePreview profile={demo ? sampleProfile : signedIn ? { ...emptyProfile, gender: 'm', name: signedIn.name } : { ...emptyProfile, gender: 'm', areas: sampleProfile.areas, specialties: sampleProfile.specialties }} />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
