// must stay first: it removes what an earlier session left in the browser before any store reads it
import './config/cleanStart'
// must come before every store: it decides whose area this browser shows (a signed-in broker's own, or the demo's)
import './auth/profile'
// must come before the screens: it gives a shared lab tool its name in this look
import { ROOM_NAME } from './config/labNames'
import './styles/global.css'
import { Route } from 'react-router-dom'
import { BadgeCheck, Building2 } from 'lucide-react'
import { start } from './bootstrap'
import { dayNight } from './config/dayNight'
import DayNightSwitch, { DayNightCompact } from './components/DayNightSwitch'
import { PLATFORM_NAME } from './config'
import { COMMUNITY_HOME, COMMUNITY_JOIN } from './config/community'
import CommunityHome from './community/CommunityHome'
import { AppIndex, DemoFoot, OfficeOnly, ShellBrand, UpgradeBanner, useCommunityNav, useQuietShell } from './community/CommunityShell'
import HomeGreen from './pages/HomeGreen'
import AgentArea from './agent/AgentArea'
import AgentPage from './agent/AgentPage'
import JoinChoice from './join/JoinChoice'
import JoinOffice from './join/JoinOffice'
import OfficeStory from './office/OfficeStory'
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
import InstallGuide from './pwa/InstallGuide'
import { SignInCard } from './auth/SignInPrompt'
import { startApp } from './pwa/pwa'
import { memberActions } from './config/member'
import { agentActions } from './agent/useAgent'
import { registerActions, registerCommunity, registerCrm, registerLab, registerNames, registerNav, registerReset, registerShell } from './config/navExtras'
import ClientsTable from './crm/ClientsTable'
import PropertyPage from './community/PropertyPage'
import SignUp from './auth/SignUp'
import Admin from './auth/Admin'
import { AppGuard, DemoStart, Enter, Login } from './auth/Access'
import { demo } from './auth/session'
import { pickActions } from './config/pricing'
import FeedWelcome from './community/FeedWelcome'
import { CATEGORIES, CommercialSeed, categoryOf } from './crm/categories'
import OwnerPage from './owner/OwnerPage'
import { AutoPublish, AutoPublishNote, OwnerLinkButton } from './owner/OwnerPublish'
import MatchMoment from './community/MatchMoment'
import { OWNER_PATH, ownerActions } from './owner/ownerLink'
import { clientActions } from './crm/clients'
import './styles/lite.css'
import './styles/theme-green.css'

document.documentElement.dataset.theme = 'green'
// light by day, dark in the evening: set before the first paint, so the page never flashes the other mood
dayNight.apply()
// the site as an app on the home screen: the Service Worker, and the browser's own offer to install
startApp()

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
registerReset(() => pickActions.reset())
// the CRM's clients are one simple table (search, types, matches, quick marks); the board keeps the properties
registerCrm({
  Clients: ClientsTable,
  subtitle: 'הלקוחות בטבלה אחת, והנכסים על הלוח. התאמות מהקהילה בלחיצה אחת.',
  // each view is a screen of its own, opened from the lines under "CRM" in the side menu
  heads: {
    client: { title: 'לקוחות', subtitle: 'כל הלקוחות בטבלה אחת. התאמות מהקהילה בלחיצה אחת.' },
    property: { title: 'נכסים', subtitle: 'כל הנכסים שלך במקום אחד. כל נכס חדש מתפרסם אוטומטית בקהילה.' },
  },
})
// the feed opens with a personal hello, four cards for what a broker came to do, and the four rooms (17.11.2026)
registerCommunity({ Top: FeedWelcome as never })
// every property put in the CRM goes up to the community by itself; a published card carries the link for its owner
registerCrm({ AutoBar: AutoPublishNote, CardExtra: OwnerLinkButton })
// a property is a private home, an office or a business property: picked when it is opened, shown and filtered on the board
registerCrm({ categories: CATEGORIES.map(({ id, label }) => ({ id, label })), categoryOf })
// the community's properties have no stages: one list of cards (Itzik 17.11.2026)
registerCrm({ flatProperties: true })
// the top bar (the view switch with the wallet or the quota), the office member's mark, and the lab in three layers
registerShell({ bar: MemberBar, badge: MemberBadge, lab: TieredLab })
// the community under its own name: its name at the top for a community member, no dashboard and two locked lines
// in the menu, and a strip that leads to the office's page
registerShell({ useNav: useCommunityNav, brand: ShellBrand, banner: UpgradeBanner })
// a community member sees a live community: no beta lab, demo tags or reset inside; one small demo line at the foot
registerShell({ useQuiet: useQuietShell, foot: DemoFoot })
// on a phone inside the app, the day / night switch is a small button in the top bar, not a float over the content
registerShell({ topEnd: DayNightCompact })
// the way in for whoever is not signed in, in the menu (the app on a phone has no address bar to type it)
registerShell({ account: SignInCard })
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

start(<HomeGreen />, {
  // joining is a choice: the free community (the existing onboarding) or the office
  join: <JoinChoice />,
  appRoutes: (
    <>
      <Route path="agent" element={<AgentArea />} />
      <Route path="office" element={<OfficeHub />} />
      <Route path="office/:id" element={<OfficeScreen />} />
      <Route path="property/:id" element={<PropertyPage />} />
    </>
  ),
  routes: (
    <>
      <Route path={COMMUNITY_HOME} element={<CommunityHome />} />
      {/* joining the community is real now: a form, an approver's yes, and a sign-in link by e-mail */}
      <Route path={COMMUNITY_JOIN} element={<SignUp />} />
      <Route path="/join/community" element={<SignUp />} />
      <Route path="/kehila/login" element={<Login />} />
      <Route path="/kehila/enter" element={<Enter />} />
      <Route path="/kehila/admin" element={<Admin />} />
      {/* the link for presentations: the open demo, with the example user */}
      <Route path="/demo" element={<DemoStart />} />
      <Route path="/join/office" element={<JoinOffice />} />
      {/* the office's page on its own, for the community's public page (inside the app it is "המשרד") */}
      <Route path="/office" element={<OfficeStory standalone />} />
      <Route path="/agent/:slug" element={<AgentPage />} />
      <Route path="/about" element={<About />} />
      <Route path="/install" element={<InstallGuide />} />
      <Route path="/upgrade" element={<Upgrade />} />
      <Route path={OWNER_PATH} element={<OwnerPage />} />
    </>
  ),
  // the "start again" tab is for the demo only: a real launch builds with VITE_DEMO_RESET=false
  // the corner switch: light (day) or dark (night), instead of the old navy / green comparison
  switcher: <DayNightSwitch />,
  // a community member has no dashboard: the first screen inside is the feed
  appIndex: <AppIndex />,
  // the community's screens are for approved brokers (and staff, and a presentation of the demo)
  appGuard: (app) => <AppGuard>{app}</AppGuard>,
  // the landing page builder and the digital folder belong to the office
  gate: (id, screen) => <OfficeOnly id={id}>{screen}</OfficeOnly>,
  overlay: (
    <>
      <GreenActions />
      <AutoPublish />
      {/* the match moment: what fits a property or a buyer I share; in the demo the other broker's side is played */}
      <MatchMoment sim={demo} />
      {/* the demo's own example data and its start-again tab are not for a real broker's area */}
      {demo && <CommercialSeed />}
      {demo && import.meta.env.VITE_DEMO_RESET !== 'false' ? <DemoReset /> : null}
    </>
  ),
})

// the tab carries the office's name; the community's own page sets its own while it is open
document.title = `${PLATFORM_NAME} | משרד תיווך ארצי`
