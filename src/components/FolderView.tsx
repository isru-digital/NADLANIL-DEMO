import { useState } from 'react'
import { BedDouble, Building2, CalendarCheck, Download, FileText, Heart, MapPin, Ruler } from 'lucide-react'
import { CURRENT_BROKER_ID, PLATFORM_NAME, asset } from '../config'
import { brokerById, folder, formatPrice } from '../data/demo'
import { useStore } from '../store'
import { Logo, Modal, Reveal } from './ui'
import { WhatsAppIcon } from '../templates/LandingTemplate'
import '../styles/folder.css'

/** Client-facing branded property folder. Used inside the app and at /f/demo. */
export default function FolderView() {
  const { toast } = useStore()
  const broker = brokerById(CURRENT_BROKER_ID)
  const [loved, setLoved] = useState<Record<string, boolean>>({})
  const [pdfOpen, setPdfOpen] = useState(false)
  const prices = folder.properties.map((p) => p.price)
  const lovedCount = Object.values(loved).filter(Boolean).length

  return (
    <div className="folder">
      <header className="folder-cover">
        <img className="folder-cover-bg" src={asset(folder.properties[0].image)} alt="" />
        <div className="folder-cover-top">
          <Logo size={30} withName tone="dark" />
          <span className="folder-kind">פולדר דיגיטלי</span>
        </div>
        <div className="folder-cover-main">
          <span className="folder-for">הוכן במיוחד עבור</span>
          <h1>{folder.client}</h1>
          <p>{folder.title}</p>
        </div>
        <div className="folder-cover-foot">
          <div className="folder-broker">
            <img src={asset(broker.avatar)} alt={broker.name} />
            <div>
              <strong>{broker.name}</strong>
              <span>{broker.title}</span>
            </div>
          </div>
          <button className="btn btn-gold" onClick={() => setPdfOpen(true)}>
            <Download />
            הורד PDF
          </button>
        </div>
      </header>

      <section className="folder-intro">
        <Reveal>
          <p>{folder.intro}</p>
        </Reveal>
        <ul className="folder-summary">
          <li>
            <strong className="num">{folder.properties.length}</strong>
            <span>נכסים בתיק</span>
          </li>
          <li>
            <strong className="num">{formatPrice(Math.min(...prices))}</strong>
            <span>המחיר הנמוך</span>
          </li>
          <li>
            <strong className="num">{formatPrice(Math.max(...prices))}</strong>
            <span>המחיר הגבוה</span>
          </li>
          <li>
            <strong>{folder.date.replace('עודכן ב-', '')}</strong>
            <span>עדכון אחרון</span>
          </li>
        </ul>
      </section>

      <div className="folder-list">
        {folder.properties.map((p, i) => (
          <Reveal as="article" key={p.id} className="folder-prop">
            <div className="folder-prop-media">
              <img src={asset(p.image)} alt={p.title} loading="lazy" />
              <span className="folder-prop-num num">0{i + 1}</span>
              <button
                className={`folder-love${loved[p.id] ? ' is-on' : ''}`}
                aria-pressed={!!loved[p.id]}
                aria-label={loved[p.id] ? 'הסרה מהמועדפים' : 'אהבתי את הנכס'}
                onClick={() => setLoved((l) => ({ ...l, [p.id]: !l[p.id] }))}
              >
                <Heart />
              </button>
            </div>
            <div className="folder-prop-body">
              <span className="folder-prop-area">
                <MapPin />
                {p.area}
              </span>
              <h2>{p.title}</h2>
              <ul className="folder-specs">
                <li>
                  <BedDouble />
                  <span>
                    <b className="num">{p.rooms}</b> חדרים
                  </span>
                </li>
                <li>
                  <Ruler />
                  <span>
                    <b className="num">{p.sqm}</b> מ"ר
                  </span>
                </li>
                <li>
                  <Building2 />
                  <span>{p.floor}</span>
                </li>
              </ul>
              <div className="folder-tags">
                {p.highlights.map((h) => (
                  <span key={h}>{h}</span>
                ))}
              </div>
              <blockquote className="folder-note">
                <img src={asset(broker.avatar)} alt="" />
                <div>
                  <strong>ההערה של {broker.name.split(' ')[0]}</strong>
                  <p>{p.brokerNote}</p>
                </div>
              </blockquote>
              <div className="folder-prop-foot">
                <div className="folder-price">
                  <span>מחיר מבוקש</span>
                  <strong className="num">{formatPrice(p.price)}</strong>
                </div>
                <button className="folder-btn" onClick={() => toast('בדמו לא נשלחת בקשה לתיאום סיור')}>
                  <CalendarCheck />
                  לתיאום סיור
                </button>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <footer className="folder-end">
        <h2>
          {lovedCount > 0 ? (
            <>
              סימנתם <span className="num">{lovedCount}</span> נכסים שאהבתם.
            </>
          ) : (
            'מצאתם משהו שאהבתם?'
          )}
        </h2>
        <p>אשמח לתאם סיור בכל אחד מהנכסים, או לחפש עבורכם אפשרויות נוספות.</p>
        <div className="folder-end-btns">
          <button className="folder-btn folder-btn-wa" onClick={() => toast('בדמו לא נפתחת שיחת וואטסאפ אמיתית')}>
            <WhatsAppIcon />
            דברו איתי בוואטסאפ
          </button>
          <button className="folder-btn folder-btn-line" onClick={() => setPdfOpen(true)}>
            <FileText />
            הורד PDF
          </button>
        </div>
        <span className="folder-credit">
          הפולדר הופק ב-{PLATFORM_NAME} · {folder.date} · נתוני דמו
        </span>
      </footer>

      <Modal
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        title="תצוגה מקדימה של ה-PDF"
        subtitle="כך ייראה הקובץ שיישלח ללקוח. בדמו ההורדה עצמה אינה פעילה."
        wide
      >
        <div className="modal-body">
          <div className="pdf-pages">
            <div className="pdf-page pdf-cover">
              <img src={asset(folder.properties[0].image)} alt="" />
              <div>
                <img className="pdf-logo" src={asset('logo.png')} alt="" />
                <span>הוכן במיוחד עבור</span>
                <strong>{folder.client}</strong>
                <em>{broker.name}</em>
              </div>
            </div>
            {folder.properties.map((p, i) => (
              <div className="pdf-page" key={p.id}>
                <img src={asset(p.image)} alt="" />
                <div>
                  <span className="num">0{i + 1}</span>
                  <strong>{p.title}</strong>
                  <em>{p.area}</em>
                  <i />
                  <i />
                  <i className="short" />
                  <b className="num">{formatPrice(p.price)}</b>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-foot">
          <button
            className="btn btn-gold"
            onClick={() => {
              toast('בדמו לא נוצר קובץ PDF אמיתי')
              setPdfOpen(false)
            }}
          >
            <Download />
            הורדה
          </button>
          <span className="pdf-meta num">
            {folder.properties.length + 1} עמודים · A4
          </span>
        </div>
      </Modal>
    </div>
  )
}
