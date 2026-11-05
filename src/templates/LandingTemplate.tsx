import { ArrowLeft, BedDouble, MapPin, Phone, Quote, Ruler } from 'lucide-react'
import { PLATFORM_NAME, asset } from '../config'
import { brokers, formatPrice, testimonials } from '../data/demo'
import type { BuilderState, CrmItem } from '../data/demo'
import '../styles/templates.css'

export function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

/**
 * The broker's public landing page. One markup, three art directions (data-template).
 * All breakpoints are container queries, so the same component renders correctly
 * full screen and inside the builder's scaled preview frame.
 */
export default function LandingTemplate({
  data,
  properties,
  onAction,
}: {
  data: BuilderState
  properties: CrmItem[]
  onAction?: (message: string) => void
}) {
  const t = data.template
  const portrait = brokers[0].avatar
  const picked = properties.filter((p) => data.propertyIds.includes(p.id))
  const quotes = testimonials.filter((q) => data.testimonialIds.includes(q.id))
  const heroImage = picked[0]?.image ?? 'img/prop-01.webp'
  const firstName = data.name.trim().split(' ')[0] || 'המתווך'
  const act = (message: string) => () => onAction?.(message)
  const hasContact = data.showForm || data.showWhatsapp || data.showPhone

  return (
    <div className="lp" data-template={t}>
      <div className="lp-in">
        <header className="lp-nav">
          <span className="lp-brand">
            <i aria-hidden>{data.name.trim().charAt(0) || 'מ'}</i>
            <span>{data.name || 'שם המתווך'}</span>
          </span>
          <nav aria-label="ניווט בדף">
            <a href="#lp-about">אודות</a>
            {picked.length > 0 && <a href="#lp-props">נכסים</a>}
            {quotes.length > 0 && <a href="#lp-quotes">המלצות</a>}
            {hasContact && <a href="#lp-contact">יצירת קשר</a>}
          </nav>
          <a href="#lp-contact" className="lp-btn lp-btn-sm">
            בואו נדבר
          </a>
        </header>

        {/* ---------------------------------------------------------- hero */}
        <section className="lp-hero" id="lp-hero">
          <div className="lp-hero-media">
            <img src={asset(t === 'gallery' ? portrait : heroImage)} alt="" />
          </div>
          <div className="lp-hero-copy">
            <span className="lp-kicker">
              {data.title || 'תואר מקצועי'} · {data.area || 'אזור פעילות'}
            </span>
            <h1>{data.name || 'שם המתווך'}</h1>
            <p className="lp-tagline">{data.tagline || 'משפט הפתיחה שלך יופיע כאן.'}</p>
            <div className="lp-hero-cta">
              <a href="#lp-contact" className="lp-btn">
                לתיאום פגישה
                <ArrowLeft />
              </a>
              {picked.length > 0 && (
                <a href="#lp-props" className="lp-btn lp-btn-ghost">
                  לנכסים שלי
                </a>
              )}
            </div>
          </div>
          <ul className="lp-facts">
            <li>
              <strong className="num">{data.years}</strong>
              <span>שנות ניסיון</span>
            </li>
            <li>
              <strong>{data.area || '-'}</strong>
              <span>אזור פעילות</span>
            </li>
            <li>
              <strong>ליווי אישי</strong>
              <span>מהפגישה הראשונה ועד המפתח</span>
            </li>
          </ul>
        </section>

        {/* --------------------------------------------------------- about */}
        <section className="lp-about" id="lp-about">
          <div className="lp-about-media">
            <img src={asset(t === 'gallery' ? heroImage : portrait)} alt={t === 'gallery' ? '' : data.name} loading="lazy" />
          </div>
          <div className="lp-about-copy">
            <span className="lp-label">קצת עליי</span>
            <h2>נעים מאוד, {firstName}.</h2>
            <p className="lp-bio">
              {data.bio || 'הביו שלך יופיע כאן. אפשר לכתוב לבד, או לתת ל-AI לכתוב טיוטה ראשונה.'}
            </p>
            <span className="lp-sign">{data.name}</span>
          </div>
        </section>

        {/* ---------------------------------------------------- properties */}
        {picked.length > 0 && (
          <section className="lp-props" id="lp-props">
            <div className="lp-section-head">
              <span className="lp-label">נכסים נבחרים</span>
              <h2>נכסים שאני מייצגת עכשיו</h2>
            </div>
            <div className="lp-prop-grid" data-count={picked.length}>
              {picked.map((p, i) => (
                <article className="lp-prop" key={p.id}>
                  <div className="lp-prop-media">
                    <img src={asset(p.image ?? heroImage)} alt={p.title} loading="lazy" />
                    <span className="lp-prop-index num">0{i + 1}</span>
                  </div>
                  <div className="lp-prop-body">
                    <h3>{p.title}</h3>
                    <span className="lp-prop-area">
                      <MapPin />
                      {p.area}
                    </span>
                    <div className="lp-prop-specs">
                      <span>
                        <BedDouble />
                        <span className="num">{p.rooms}</span> חדרים
                      </span>
                      {p.sqm && (
                        <span>
                          <Ruler />
                          <span className="num">{p.sqm}</span> מ"ר
                        </span>
                      )}
                    </div>
                    <div className="lp-prop-foot">
                      <strong className="num">{formatPrice(p.price)}</strong>
                      <button className="lp-link" onClick={act('בדמו עמוד הנכס אינו פעיל')}>
                        לפרטים <ArrowLeft />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* -------------------------------------------------- testimonials */}
        {quotes.length > 0 && (
          <section className="lp-quotes" id="lp-quotes">
            <div className="lp-section-head">
              <span className="lp-label">המלצות</span>
              <h2>מה אומרים הלקוחות</h2>
            </div>
            <div className="lp-quote-grid" data-count={quotes.length}>
              {quotes.map((q) => (
                <figure className="lp-quote" key={q.id}>
                  <Quote aria-hidden />
                  <blockquote>{q.body}</blockquote>
                  <figcaption>
                    <strong>{q.name}</strong>
                    <span>{q.role}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* ------------------------------------------------------- contact */}
        {hasContact && (
          <section className="lp-contact" id="lp-contact">
            <div className="lp-contact-copy">
              <span className="lp-label">יצירת קשר</span>
              <h2>
                מחפשים בית?
                <br />
                בואו נתחיל בשיחה.
              </h2>
              <p>משאירים פרטים ואני חוזרת אליכם עוד היום. בלי התחייבות.</p>
              <div className="lp-contact-btns">
                {data.showWhatsapp && (
                  <button className="lp-btn lp-btn-wa" onClick={act('בדמו לא נפתחת שיחת וואטסאפ אמיתית')}>
                    <WhatsAppIcon />
                    שיחה בוואטסאפ
                  </button>
                )}
                {data.showPhone && (
                  <button className="lp-btn lp-btn-ghost" onClick={act('בדמו אין מספר טלפון אמיתי')}>
                    <Phone />
                    <span className="ltr">05X-XXXXXXX</span>
                  </button>
                )}
              </div>
            </div>
            {data.showForm && (
              <form
                className="lp-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  onAction?.('בדמו הטופס לא נשלח באמת')
                }}
              >
                <label>
                  <span>שם מלא</span>
                  <input type="text" autoComplete="off" placeholder="איך קוראים לכם?" />
                </label>
                <label>
                  <span>טלפון</span>
                  <input type="tel" autoComplete="off" placeholder="לאן לחזור אליכם?" />
                </label>
                <label>
                  <span>במה אפשר לעזור?</span>
                  <textarea rows={3} placeholder="קנייה, מכירה, או סתם שאלה" />
                </label>
                <button className="lp-btn">
                  שליחה
                  <ArrowLeft />
                </button>
              </form>
            )}
          </section>
        )}

        <footer className="lp-foot">
          <span>
            {data.name} · {data.title}
          </span>
          <span>הדף נבנה ב-{PLATFORM_NAME} · נתוני דמו</span>
        </footer>
      </div>
    </div>
  )
}
