// must stay first: it removes what an earlier session left in the browser before any store reads it
import './config/cleanStart'
import './styles/global.css'
import { Route } from 'react-router-dom'
import { BadgeCheck } from 'lucide-react'
import { start } from './bootstrap'
import { PLATFORM_NAME, PLATFORM_SUBNAME } from './config'
import HomeGreen from './pages/HomeGreen'
import Join from './pages/Join'
import AgentArea from './agent/AgentArea'
import AgentPage from './agent/AgentPage'
import JoinChoice from './join/JoinChoice'
import JoinOffice from './join/JoinOffice'
import DemoReset from './components/DemoReset'
import MemberSwitch, { MemberBadge } from './components/MemberSwitch'
import About from './pages/About'
import { memberActions } from './config/member'
import { agentActions } from './agent/useAgent'
import { registerNav, registerReset, registerShell } from './config/navExtras'
import './styles/lite.css'
import './styles/theme-green.css'

document.documentElement.dataset.theme = 'green'

// "הסוכן שלנו" and joining the office exist only in the green look
registerNav({ to: '/app/agent', label: 'הסוכן שלנו', short: 'הסוכן', icon: BadgeCheck })
registerReset(() => agentActions.reset())
registerReset(() => memberActions.reset())
// the demo's view switch (community member / office member) and the office member's mark
registerShell({ bar: MemberSwitch, badge: MemberBadge })

start(<HomeGreen />, {
  // joining is a choice: the free community (the existing onboarding) or the office
  join: <JoinChoice />,
  appRoutes: <Route path="agent" element={<AgentArea />} />,
  routes: (
    <>
      <Route path="/join/community" element={<Join />} />
      <Route path="/join/office" element={<JoinOffice />} />
      <Route path="/agent/:slug" element={<AgentPage />} />
      <Route path="/about" element={<About />} />
    </>
  ),
  // the "start again" tab is for the demo only: a real launch builds with VITE_DEMO_RESET=false
  overlay: import.meta.env.VITE_DEMO_RESET === 'false' ? null : <DemoReset />,
})

// the name always comes with its second line, in the tab too
document.title = `${PLATFORM_NAME} | ${PLATFORM_SUBNAME}`
