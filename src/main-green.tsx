// must stay first: it removes what an earlier session left in the browser before any store reads it
import './config/cleanStart'
import './styles/global.css'
import { Route } from 'react-router-dom'
import { BadgeCheck, Building2 } from 'lucide-react'
import { start } from './bootstrap'
import { dayNight } from './config/dayNight'
import DayNightSwitch from './components/DayNightSwitch'
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
import { OfficeHub, OfficeScreen } from './office/OfficeArea'
import NameBadge, { MatchFirst } from './office/NameBadge'
import GreenActions, { LabAction } from './green/GreenActions'
import { greenUi } from './green/ui'
import type { CommunityItem } from './data/demo'
import { FREE_IDS, PAID_IDS, walletActions } from './config/tiers'
import About from './pages/About'
import { memberActions } from './config/member'
import { agentActions } from './agent/useAgent'
import { registerActions, registerLab, registerNames, registerNav, registerReset, registerShell } from './config/navExtras'
import './styles/lite.css'
import './styles/theme-green.css'

document.documentElement.dataset.theme = 'green'
// light by day, dark in the evening: set before the first paint, so the page never flashes the other mood
dayNight.apply()

// "הסוכן שלנו" and joining the office exist only in the green look
// what only the office gives: its own area, and "הסוכן שלנו" (part of the office)
registerNav({ to: '/app/office', label: 'המשרד שלי', short: 'המשרד', icon: Building2 })
registerNav({ to: '/app/agent', label: 'הסוכן שלנו', short: 'הסוכן', icon: BadgeCheck })
// the office member's verified mark next to names, and first place in a match
registerNames({ Badge: NameBadge, MatchNote: MatchFirst })
registerReset(() => agentActions.reset())
registerReset(() => memberActions.reset())
registerReset(() => walletActions.reset())
// the top bar (the view switch with the wallet or the quota), the office member's mark, and the lab in three layers
registerShell({ bar: MemberBar, badge: MemberBadge, lab: TieredLab })
registerLab({
  Chip: LabChip,
  Badge: LabBadge,
  Action: LabAction,
  groups: [
    { title: 'חינם בקהילה', sub: 'פתוח לכל חבר, תמיד', ids: FREE_IDS },
    { title: 'כלים מתקדמים', sub: 'לחבר קהילה בקרדיטים, לחבר משרד כלול במכסה החודשית', ids: PAID_IDS },
  ],
  hubSub: 'כלים בגרסת בטא. חלק חינם בקהילה, והמתקדמים נפתחים בקרדיטים או כלולים במשרד.',
  hubNote: 'גרסת בטא עם נתוני דמו. אין חיוב אמיתי.',
  peekNote: 'גרסת בטא: הדגמה עם נתוני דמו בלבד.',
})

// what works in the browser in this version: a new CRM card, sharing a post, a folder link that always confirms
registerActions({
  newCard: () => greenUi.open({ kind: 'card' }),
  share: (item) => greenUi.open({ kind: 'share', item: item as CommunityItem }),
  copied: 'הקישור הועתק',
})

start(<HomeGreen />, {
  // joining is a choice: the free community (the existing onboarding) or the office
  join: <JoinChoice />,
  appRoutes: (
    <>
      <Route path="agent" element={<AgentArea />} />
      <Route path="office" element={<OfficeHub />} />
      <Route path="office/:id" element={<OfficeScreen />} />
    </>
  ),
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
  // the corner switch: light (day) or dark (night), instead of the old navy / green comparison
  switcher: <DayNightSwitch />,
  overlay: (
    <>
      <GreenActions />
      {import.meta.env.VITE_DEMO_RESET === 'false' ? null : <DemoReset />}
    </>
  ),
})

// the name always comes with its second line, in the tab too
document.title = `${PLATFORM_NAME} | ${PLATFORM_SUBNAME}`
