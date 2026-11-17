import { asset } from '../config'
import './construction.css'

/** The one page every visitor sees while the site is being upgraded (see src/config/construction.ts). */
export default function Construction() {
  return (
    <main className="uc" data-construction>
      <div className="uc-card">
        <img className="uc-logo" src={asset('brand/nadlanup-lockup-light.png')} alt="NadlanUP" width={1000} height={323} />
        <span className="uc-line" aria-hidden />
        <h1>האתר בבנייה</h1>
        <p>אנחנו משדרגים את המערכת, נחזור בקרוב</p>
        <span className="uc-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      </div>
      <small className="uc-foot">
        <bdi dir="ltr">NadlanUP</bdi> · מתווכים לעסקאות
      </small>
    </main>
  )
}
