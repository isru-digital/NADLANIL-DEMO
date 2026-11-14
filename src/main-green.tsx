// must stay first: it removes what an earlier session left in the browser before any store reads it
import './config/cleanStart'
// must come before the screens: it gives a shared lab tool its name in this look
import { ROOM_NAME } from './config/labNames'
import './styles/global.css'
import { Route } from 'react-router-dom'
import { BadgeCheck, Building2 } from 'lucide-react'
import { start } from './bootstrap'
import { dayNight } from './config/dayNight'
import DayNightSwitch from './components/DayNightSwitch'
import { PLATFORM_NAME } from './config'
import { COMMUNITY_FEED, COMMUNITY_FROM, COMMUNITY_HOME, COMMUNITY_JOIN, COMMUNITY_NAME } from './config/community'
import CommunityHome from './community/CommunityHome'
import CommunityBrand from './community/CommunityBrand'
import { AppIndex, OfficeOnly, ShellBrand, UpgradeBanner, useCommunityNav } from './community/CommunityShell'
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
import { registerActions, registerCrm, registerLab, registerNames, registerNav, registerReset, registerShell } from './config/navExtras'
import ClientsTable from './crm/ClientsTable'
import { CATEGORIES, CommercialSeed, categoryOf } from './crm/categories'
import OwnerPage from './owner/OwnerPage'
import { AutoPublish, AutoPublishNote, OwnerLinkButton } from './owner/OwnerPublish'
import { OWNER_PATH, ownerActions } from './owner/ownerLink'
import { clientActions } from './crm/clients'
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
registerReset(() => clientActions.reset())
registerReset(() => ownerActions.reset())
// the CRM's clients are one simple table (search, types, matches, quick marks); the board keeps the properties
registerCrm({
  Clients: ClientsTable,
  subtitle: 'הלקוחות בטבלה אחת, והנכסים על הלוח. התאמות מהקהילה בלחיצה אחת.',
  // each view is a screen of its own, opened from the lines under "CRM" in the side menu
  heads: {
    client: { title: 'לקוחות', subtitle: 'כל הלקוחות בטבלה אחת. התאמות מהקהילה בלחיצה אחת.' },
    property: { title: 'נכסים', subtitle: 'הנכסים שלך על לוח אחד, לפי שלב. כל נכס חדש מתפרסם אוטומטית בקהילה.' },
  },
})
// every property put in the CRM goes up to the community by itself; a published card carries the link for its owner
registerCrm({ AutoBar: AutoPublishNote, CardExtra: OwnerLinkButton })
// a property is a private home, an office or a business property: picked when it is opened, shown and filtered on the board
registerCrm({ categories: CATEGORIES.map(({ id, label }) => ({ id, label })), categoryOf })
// the top bar (the view switch with the wallet or the quota), the office member's mark, and the lab in three layers
registerShell({ bar: MemberBar, badge: MemberBadge, lab: TieredLab })
// the community under its own name: its name at the top for a community member, no dashboard and two locked lines
// in the menu, and a strip that leads to the office's page
registerShell({ useNav: useCommunityNav, brand: ShellBrand, banner: UpgradeBanner })
registerLab({
  Chip: LabChip,
  Badge: LabBadge,
  Action: LabAction,
  groups: [
    { title: 'חינם בקהילה', sub: 'פתוח לכל חבר, תמיד', ids: FREE_IDS },
    { title: 'כלים מתקדמים', sub: 'לחבר קהילה בקרדיטים, לחבר משרד כלול במכסה החודשית', ids: PAID_IDS },
  ],
  roomName: ROOM_NAME,
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

// joining the community runs under its own name, ends in the feed, and has no landing page step
const joinCommunity = (
  <Join
    community={{
      brand: <CommunityBrand size="sm" />,
      home: COMMUNITY_HOME,
      after: COMMUNITY_FEED,
      foot: `${COMMUNITY_NAME}, ${COMMUNITY_FROM}`,
      propertyLead: 'נכס אחד מספיק כדי להתחיל לקבל פניות ממתווכים באזור. הוא נכנס ל-CRM שלכם ועולה אוטומטית לקהילה, באזור של הנכס. שם בעל הנכס והטלפון שלו לא מתפרסמים.',
    }}
  />
)

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
      <Route path={COMMUNITY_HOME} element={<CommunityHome />} />
      <Route path={COMMUNITY_JOIN} element={joinCommunity} />
      <Route path="/join/community" element={joinCommunity} />
      <Route path="/join/office" element={<JoinOffice />} />
      <Route path="/agent/:slug" element={<AgentPage />} />
      <Route path="/about" element={<About />} />
      <Route path="/upgrade" element={<Upgrade />} />
      <Route path={OWNER_PATH} element={<OwnerPage />} />
    </>
  ),
  // the "start again" tab is for the demo only: a real launch builds with VITE_DEMO_RESET=false
  // the corner switch: light (day) or dark (night), instead of the old navy / green comparison
  switcher: <DayNightSwitch />,
  // a community member has no dashboard: the first screen inside is the feed
  appIndex: <AppIndex />,
  // the landing page builder and the digital folder belong to the office
  gate: (id, screen) => <OfficeOnly id={id}>{screen}</OfficeOnly>,
  overlay: (
    <>
      <GreenActions />
      <AutoPublish />
      <CommercialSeed />
      {import.meta.env.VITE_DEMO_RESET === 'false' ? null : <DemoReset />}
    </>
  ),
})

// the tab carries the office's name; the community's own page sets its own while it is open
document.title = `${PLATFORM_NAME} | משרד תיווך ארצי`
