import { Link } from 'react-router-dom'
import { PLATFORM_NAME } from '../config'
import { Logo } from './ui'
import '../styles/home-strip.css'

/**
 * A slim strip with the platform logo at the top right of a broker's public page (landing page, folder, agent page),
 * so a click on it always goes back to the platform's home page. Every other screen has the logo in its own header.
 */
export default function HomeStrip() {
  return (
    <div className="home-strip">
      <div className="home-strip-in">
        <Link to="/" className="home-strip-link" aria-label={`${PLATFORM_NAME}, לדף הבית`}>
          <Logo size={24} withName />
        </Link>
      </div>
    </div>
  )
}
