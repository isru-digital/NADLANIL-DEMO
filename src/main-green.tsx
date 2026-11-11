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
import { MemberBadge } from './components/MemberSwitch'
import MemberBar from './components/MemberBar'
import TieredLab, { LabBadge, LabChip } from './components/TieredLab'
import Upgrade from './pages/Upgrade'
import { FREE_IDS, PAID_IDS, walletActions } from './config/tiers'
import About from './pages/About'
import { memberActions } from './config/member'
import { agentActions } from './agent/useAgent'
import { registerLab, registerNav, registerReset, registerShell } from './config/navExtras'
import './styles/lite.css'
import './styles/theme-green.css'

document.documentElement.dataset.theme = 'green'

// "הסוכן שלנו" and joining the office exist only in the green look
registerNav({ to: '/app/agent', label: 'הסוכן שלנו', short: 'הסוכן', icon: BadgeCheck })
registerReset(() => agentActions.reset())
registerReset(() => memberActions.reset())
registerReset(() => walletActions.reset())
// the top bar (the view switch with the wallet or the quota), the office member's mark, and the lab in three layers
registerShell({ bar: MemberBar, badge: MemberBadge, lab: TieredLab })
registerLab({
  Chip: LabChip,
  Badge: LabBadge,
  groups: [
    { title: 'חינם בקהילה', sub: 'פתוח לכל חבר, תמיד', ids: FREE_IDS },
    { title: 'כלים מתקדמים', sub: 'לחבר קהילה בקרדיטים, לחבר משרד כלול במכסה החודשית', ids: PAID_IDS },
  ],
  hubSub: 'כלים בגרסת בטא. חלק חינם בקהילה, והמתקדמים נפתחים בקרדיטים או כלולים במשרד.',
  hubNote: 'גרסת בטא עם נתוני דמו. אין חיוב אמיתי.',
  peekNote: 'גרסת בטא: הדגמה עם נתוני דמו בלבד.',
})

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
      <Route path="/upgrade" element={<Upgrade />} />
    </>
  ),
  // the "start again" tab is for the demo only: a real launch builds with VITE_DEMO_RESET=false
  overlay: import.meta.env.VITE_DEMO_RESET === 'false' ? null : <DemoReset />,
})

// the name always comes with its second line, in the tab too
document.title = `${PLATFORM_NAME} | ${PLATFORM_SUBNAME}`
