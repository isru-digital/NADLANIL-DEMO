import './styles/global.css'
import { Route } from 'react-router-dom'
import { BadgeCheck } from 'lucide-react'
import { start } from './bootstrap'
import HomeGreen from './pages/HomeGreen'
import AgentArea from './agent/AgentArea'
import AgentPage from './agent/AgentPage'
import { agentActions } from './agent/useAgent'
import { registerNav, registerReset } from './config/navExtras'
import './styles/lite.css'
import './styles/theme-green.css'

document.documentElement.dataset.theme = 'green'

// "הסוכן שלנו" exists only in the green look
registerNav({ to: '/app/agent', label: 'הסוכן שלנו', short: 'הסוכן', icon: BadgeCheck })
registerReset(() => agentActions.reset())

start(<HomeGreen />, {
  appRoutes: <Route path="agent" element={<AgentArea />} />,
  routes: <Route path="/agent/:slug" element={<AgentPage />} />,
})
