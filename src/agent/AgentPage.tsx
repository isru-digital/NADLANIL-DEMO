import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Briefcase, Building2, ChevronDown, Gem, Globe, Heart, Home, KeyRound, Languages, Mail, MapPin, MessageCircle, Phone, Quote, ShieldCheck, Sun, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PLATFORM_NAME, asset } from '../config'
import { formatPriceShort } from '../data/demo'
import { useStore } from '../store'
import { BackButton, DemoTag, EASE, Logo, Reveal } from '../components/ui'
import { areaLabel, composeAbout, firstName, joinList, sampleProfile, slugOf, specialtyOptions, styleOptions } from './agentData'
import type { AgentProfile } from './agentData'
import { useAgent } from './useAgent'
import AreasMap from './AreasMap'
import '../styles/agent-page.css'

const icons: Record<string, LucideIcon> = { home: Home, key: KeyRound, gem: Gem, building: Building2, trend: TrendingUp, briefcase: Briefcase, sun: Sun, globe: Globe }

const sampleProps = [
  { img: 'img/prop-01.webp', title: 'פנטהאוז עם נוף לים', area: 'תל אביב, הצפון הישן', rooms: 5, price: 9450000 },
  { img: 'img/prop-03.webp', title: 'דירת אבן עם קשתות', area: 'ירושלים, רחביה', rooms: 4, price: 6900000 },
  { img: 'img/prop-02.webp', title: 'וילה עם בריכה וגינה', area: 'הרצליה פיתוח', rooms: 7, price: 14900000 },
]

const phoneDigits = (s: string) => s.replace(/\D/g, '').replace(/^0/, '972')

/** Titles, description and structured data, so a search engine can understand who the page is about. */
function useSeo(p: AgentProfile | null, slug: string) {
  useEffect(() => {
    if (!p) return
    const role = p.gender === 'f' ? 'מתווכת נדל"ן' : 'מתווך נדל"ן'
    const where = p.areas.length ? ` ב${areaLabel(p.areas[0])}` : ''
    const prevTitle = document.title
    document.title = `${p.name}, ${role}${where}`
    const description = `${firstName(p.name)} מלווה לקוחות${where}${p.years ? ` כבר ${p.years} שנים` : ''}. ${p.specialties.slice(0, 3).join(', ')}.`
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const prevDesc = meta?.content
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = description
    const ld = document.createElement('script')
    ld.type = 'application/ld+json'
    ld.id = 'agent-ld'
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'RealEstateAgent',
      name: p.name,
      jobTitle: role,
      description,
      telephone: p.phone,
      email: p.email || undefined,
      image: p.photo.startsWith('data:') ? undefined : p.photo,
      areaServed: p.areas.map(areaLabel),
      knowsLanguage: p.languages,
      knowsAbout: p.specialties,
      url: window.location.href,
      identifier: p.licenseNo || undefined,
      memberOf: { '@type': 'Organization', name: PLATFORM_NAME },
    })
    document.head.appendChild(ld)
    window.scrollTo({ top: 0 })
    return () => {
      document.title = prevTitle
      if (prevDesc !== undefined && meta) meta.content = prevDesc
      ld.remove()
    }
  }, [p, slug])
}

export default function AgentPage() {
  const { slug = '' } = useParams()
  const decoded = decodeURIComponent(slug)
  const mine = useAgent().profile
  const isMine = mine.name.trim().length > 1 && slugOf(mine.name) === decoded
  const p = isMine ? mine : decoded === 'demo' ? sampleProfile : null
  useSeo(p, decoded)

  if (!p)
    return (
      <div className="agp agp-missing">
        <h1>הדף לא נמצא</h1>
        <p>עוד לא נבנה דף בשם הזה.</p>
        <Link to="/app/agent" className="btn btn-gold btn-lg">
          לאזור הסוכן
        </Link>
      </div>
    )
  return <Page p={p} />
}

function Page({ p }: { p: AgentProfile }) {
  const { toast } = useStore()
  const [open, setOpen] = useState(0)
  const name = p.name.trim()
  const fn = firstName(name)
  const role = p.gender === 'f' ? 'מתווכת נדל"ן' : 'מתווך נדל"ן'
  const first = p.areas[0] ? areaLabel(p.areas[0]) : ''
  const about = composeAbout(p)
  const words = p.threeWords.filter(Boolean)
  const wa = `https://wa.me/${phoneDigits(p.whatsapp || p.phone)}`
  const styleTitle = styleOptions.find((s) => s.id === p.style)?.title
  const specs = p.specialties.map((id) => specialtyOptions.find((o) => o.id === id)).filter(Boolean) as (typeof specialtyOptions)[number][]

  const faq = [
    { q: 'באילו אזורים אפשר לעבוד איתי?', a: p.areas.length ? `אני עובד${p.gender === 'f' ? 'ת' : ''} ב${joinList(p.areas.map(areaLabel))}.` : 'בכל הארץ, לפי הצורך.' },
    { q: 'באילו שפות אפשר לדבר איתי?', a: `${joinList(p.languages)}.` },
    { q: 'איך מתחילים?', a: 'שולחים הודעה בוואטסאפ או ממלאים את הטופס, ואני חוזר אליכם. שיחת ההיכרות לא מחייבת.'.replace('חוזר', p.gender === 'f' ? 'חוזרת' : 'חוזר') },
    { q: 'מה עושים אחרי שיחת ההיכרות?', a: 'מגדירים יחד מה מחפשים, ואני מחפש${s} ומסנן${s} בשבילכם, עד שנמצא הנכס הנכון.'.replace(/\$\{s\}/g, p.gender === 'f' ? 'ת' : '') },
  ]

  const send = (e: FormEvent) => {
    e.preventDefault()
    toast('בדמו ההודעה לא נשלחת, אבל ככה זה ייראה אצל הלקוח')
  }

  return (
    <div className="agp">
      <header className="agp-nav">
        <div className="agp-wrap agp-nav-in">
          <a href="#top" className="agp-brand" aria-label={name}>
            <span>{name}</span>
          </a>
          <nav aria-label="ניווט בדף">
            <a href="#about">קצת עליי</a>
            <a href="#spec">התמחויות</a>
            <a href="#areas">אזורים</a>
            <a href="#props">נכסים</a>
            <a href="#faq">שאלות</a>
          </nav>
          <a href={wa} target="_blank" rel="noreferrer" className="agp-wa-pill">
            <MessageCircle /> וואטסאפ
          </a>
        </div>
      </header>

      {/* ------------------------------------------------------------ hero */}
      <section className="agp-hero" id="top">
        <i className="agp-blob" aria-hidden />
        <div className="agp-wrap agp-hero-in">
          <div className="agp-hero-copy">
            <motion.span className="agp-eyebrow" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
              {role}
              {first && ` ב${first}`}
            </motion.span>
            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.1, ease: EASE }}>
              {name}
            </motion.h1>
            {p.firstLine && (
              <motion.p className="agp-tagline" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.2, ease: EASE }}>
                {p.firstLine}
              </motion.p>
            )}
            <motion.ul className="agp-trust" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3, ease: EASE }}>
              {p.licenseNo && (
                <li>
                  <ShieldCheck /> רישיון מתווך מספר {p.licenseNo}
                </li>
              )}
              {p.office && <li>{p.office}</li>}
            </motion.ul>
            <motion.div className="agp-cta" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.4, ease: EASE }}>
              <a href={wa} target="_blank" rel="noreferrer" className="agp-btn is-wa">
                <MessageCircle /> לשיחה בוואטסאפ
              </a>
              <a href={`tel:${p.phone}`} className="agp-btn">
                <Phone /> {p.phone}
              </a>
            </motion.div>
            <motion.dl className="agp-stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.55 }}>
              <div>
                <dt className="num">{p.years}+</dt>
                <dd>שנות ניסיון</dd>
              </div>
              <div>
                <dt className="num">{p.areas.length || 1}</dt>
                <dd>אזורי עבודה</dd>
              </div>
              <div>
                <dt className="num">{p.languages.length}</dt>
                <dd>שפות</dd>
              </div>
            </motion.dl>
          </div>

          <motion.div className="agp-hero-photo" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.15, ease: EASE }}>
            <div className="agp-arch">
              {p.photo ? <img src={p.photo} alt={name} /> : <span>{name[0]}</span>}
            </div>
            <i className="agp-ring" aria-hidden />
            <div className="agp-chip is-a">
              <b className="num">{p.years}+</b>
              <span>שנות ניסיון</span>
            </div>
            <div className="agp-chip is-b">
              <Languages /> {joinList(p.languages.slice(0, 3))}
            </div>
            <div className="agp-chip is-c">
              <MapPin /> {first || 'בכל הארץ'}
            </div>
          </motion.div>
        </div>
        <i className="agp-curve" aria-hidden />
      </section>

      {/* ------------------------------------------------------------ about */}
      <section className="agp-section" id="about">
        <div className="agp-wrap agp-about">
          <Reveal className="agp-about-quote">
            <Quote />
            <p>{p.firstLine || `${fn}, ${role}`}</p>
            <span>{fn}</span>
          </Reveal>
          <Reveal delay={0.08} className="agp-about-text">
            <span className="agp-kick">קצת עליי</span>
            <h2>{`היי, אני ${fn}`}</h2>
            {about.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
            {styleTitle && (
              <div className="agp-style">
                <Heart /> סגנון עבודה: <b>{styleTitle}</b>
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ specialties */}
      {specs.length > 0 && (
        <section className="agp-section is-tint" id="spec">
          <div className="agp-wrap">
            <Reveal className="agp-head">
              <span className="agp-kick">במה אני מתמחה</span>
              <h2>מה אני עושה הכי טוב</h2>
            </Reveal>
            <div className="agp-spec">
              {specs.map((s, i) => {
                const Icon = icons[s.icon] ?? Home
                return (
                  <Reveal key={s.id} delay={i * 0.06} className="agp-spec-card">
                    <span>
                      <Icon />
                    </span>
                    <h3>{s.id}</h3>
                  </Reveal>
                )
              })}
            </div>
            {p.clients.length > 0 && (
              <Reveal className="agp-clients">
                <b>לקוחות שאני עובד{p.gender === 'f' ? 'ת' : ''} איתם:</b>
                <ul>
                  {p.clients.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </Reveal>
            )}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ three words */}
      {words.length > 0 && (
        <section className="agp-section agp-words-sec">
          <div className="agp-wrap">
            <Reveal className="agp-head is-center">
              <span className="agp-kick">בשלוש מילים</span>
              <h2>כך אני מתאר{p.gender === 'f' ? 'ת' : ''} את עצמי</h2>
            </Reveal>
            <div className="agp-words">
              {words.map((w, i) => (
                <Reveal key={w} delay={i * 0.12} className="agp-word">
                  {w}
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ areas */}
      <section className="agp-section is-dark" id="areas">
        <div className="agp-wrap agp-areas">
          <Reveal className="agp-areas-copy">
            <span className="agp-kick">איפה אני עובד{p.gender === 'f' ? 'ת' : ''}</span>
            <h2>האזורים שלי</h2>
            <ul>
              {p.areas.map((a) => (
                <li key={a}>
                  <MapPin /> {areaLabel(a)}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1} className="agp-areas-map">
            <AreasMap selected={p.areas} labels width={190} />
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ how I work */}
      <section className="agp-section">
        <div className="agp-wrap">
          <Reveal className="agp-head is-center">
            <span className="agp-kick">איך עובדים איתי</span>
            <h2>ארבעה צעדים עד המפתח</h2>
          </Reveal>
          <ol className="agp-steps">
            {['שיחת היכרות קצרה', 'מגדירים מה באמת מחפשים', 'מחפשים, מסננים ומבקרים', 'משא ומתן וליווי עד החתימה'].map((t, i) => (
              <Reveal key={t} delay={i * 0.08} as="li">
                <b className="num">{i + 1}</b>
                <span>{t}</span>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------ properties */}
      <section className="agp-section is-tint" id="props">
        <div className="agp-wrap">
          <Reveal className="agp-head">
            <span className="agp-kick">נכסים נבחרים</span>
            <h2>כמה מהנכסים שלי</h2>
            <p>נכסים לדוגמה, נתוני דמו.</p>
          </Reveal>
          <div className="agp-props">
            {sampleProps.map((x, i) => (
              <Reveal key={x.title} delay={i * 0.08} className="agp-prop">
                <div className="agp-prop-img">
                  <img src={asset(x.img)} alt="" loading="lazy" />
                  <b className="num">{formatPriceShort(x.price)}</b>
                </div>
                <h3>{x.title}</h3>
                <p>
                  <MapPin /> {x.area}, {x.rooms} חדרים
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ gallery */}
      {p.gallery.length > 0 && (
        <section className="agp-section">
          <div className="agp-wrap">
            <Reveal className="agp-head">
              <span className="agp-kick">מהשטח</span>
              <h2>רגעים מהעבודה</h2>
            </Reveal>
            <div className="agp-gallery">
              {p.gallery.map((g, i) => (
                <Reveal key={i} delay={i * 0.08} className="agp-gal">
                  <img src={g} alt="" loading="lazy" />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ faq */}
      <section className="agp-section" id="faq">
        <div className="agp-wrap agp-faq-wrap">
          <Reveal className="agp-head">
            <span className="agp-kick">שאלות נפוצות</span>
            <h2>לפני שמדברים</h2>
          </Reveal>
          <ul className="agp-faq">
            {faq.map((f, i) => (
              <li key={f.q} className={open === i ? 'is-open' : ''}>
                <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                  {f.q}
                  <ChevronDown />
                </button>
                <div>
                  <p>{f.a}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ contact */}
      <section className="agp-contact" id="contact">
        <div className="agp-wrap agp-contact-in">
          <div className="agp-contact-copy">
            <span className="agp-kick is-light">דברו איתי</span>
            <h2>בואו נתחיל בשיחה</h2>
            <p>ספרו לי מה מחפשים, ואחזור אליכם בהקדם.</p>
            <div className="agp-contact-links">
              <a href={wa} target="_blank" rel="noreferrer">
                <MessageCircle /> {p.whatsapp || p.phone}
              </a>
              <a href={`tel:${p.phone}`}>
                <Phone /> {p.phone}
              </a>
              {p.email && (
                <a href={`mailto:${p.email}`}>
                  <Mail /> {p.email}
                </a>
              )}
            </div>
          </div>
          <form className="agp-form" onSubmit={send}>
            <label>
              <span>שם</span>
              <input placeholder="איך קוראים לכם?" required />
            </label>
            <label>
              <span>טלפון</span>
              <input placeholder="050-0000000" inputMode="tel" required />
            </label>
            <label>
              <span>מה מחפשים?</span>
              <textarea rows={3} placeholder="כמה מילים על הנכס שאתם מחפשים" />
            </label>
            <button className="agp-btn is-wa" type="submit">
              שליחה
            </button>
          </form>
        </div>
      </section>

      <footer className="agp-foot">
        <div className="agp-wrap agp-foot-in">
          <span className="agp-foot-brand">
            <Logo size={28} />
            <span>
              הדף נבנה ב<b>{PLATFORM_NAME}</b>
            </span>
          </span>
          <small>אב טיפוס להדגמה. הנכסים והנתונים בדף מומצאים.</small>
        </div>
      </footer>

      <div className="agp-bar" role="region" aria-label="סרגל הדמו">
        <BackButton fallback="/app/agent" className="is-icon public-back" />
        <DemoTag />
        <span>ככה לקוחות יראו את הדף</span>
      </div>
    </div>
  )
}
