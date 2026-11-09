import './styles/global.css'
import { Route } from 'react-router-dom'
import { BadgeCheck } from 'lucide-react'
import { start } from './bootstrap'
import HomeGreen from './pages/HomeGreen'
import Join from './pages/Join'
import AgentArea from './agent/AgentArea'
import AgentPage from './agent/AgentPage'
import JoinChoice from './join/JoinChoice'
import JoinOffice from './join/JoinOffice'
import { agentActions } from './agent/useAgent'
import { registerNav, registerReset } from './config/navExtras'
import './styles/lite.css'
import './styles/theme-green.css'

document.documentElement.dataset.theme = 'green'

// "הסוכן שלנו" and joining the office exist only in the green look
registerNav({ to: '/app/agent', label: 'הסוכן שלנו', short: 'הסוכן', icon: BadgeCheck })
registerReset(() => agentActions.reset())

start(<HomeGreen />, {
  // joining is a choice: the free community (the existing onboarding) or the paid office
  join: <JoinChoice />,
  appRoutes: <Route path="agent" element={<AgentArea />} />,
  routes: (
    <>
      <Route path="/join/community" element={<Join />} />
      <Route path="/join/office" element={<JoinOffice />} />
      <Route path="/agent/:slug" element={<AgentPage />} />
    </>
  ),
})
