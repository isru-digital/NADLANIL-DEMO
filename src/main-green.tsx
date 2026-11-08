import './styles/global.css'
import { start } from './bootstrap'
import HomeGreen from './pages/HomeGreen'
import './styles/lite.css'
import './styles/theme-green.css'

document.documentElement.dataset.theme = 'green'
start(<HomeGreen />)
