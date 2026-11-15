import { Suspense, lazy, useEffect } from 'react'
import { I18nProvider, useI18n } from './i18n'
import { DataProvider } from './data/context'
import { useLocalNotify } from './lib/localNotify'
import { useView, type View } from './lib/route'
import { useUi } from './store/ui'
import { useCart } from './store/cart'
import { timeKey } from './data/catalog'
import { AuthModalHost, FootBar, Popovers, Toasts, TopBar } from './components/Shell'
import { Stage3DLoading } from './components/Stage3DLoading'
import { Home } from './pages/Home'
import { MenuPage } from './pages/Menu'
import { GalleryPage, ShopPage, StoryPage } from './pages/Simple'
import { EventsPage } from './pages/Events'
import { BagPage } from './pages/Bag'
import { MePage } from './pages/Me'
import type { ViewName } from './scene3d/views'

const Admin = lazy(() => import('./admin/Admin'))
const Stage3D = lazy(() => import('./scene3d/Stage3D'))

const CAMERA_FOR_PAGE: Partial<Record<View, ViewName>> = {
  home: 'corner',
  menu: 'street',
  bag: 'inside',
  events: 'above',
  me: 'front',
}

function Router() {
  const view = useView()
  const { t } = useI18n()
  const setView3d = useUi((s) => s.setView3d)
  const tk = timeKey()
  useEffect(() => {
    const camera = CAMERA_FOR_PAGE[view]
    if (camera) setView3d(camera)
  }, [view, setView3d])
  if (view === 'admin') return <Suspense fallback={<p className="muted" style={{ padding: 24 }}>{t('loading')}</p>}><Admin /></Suspense>
  const page = { home: <Home />, menu: <MenuPage />, shop: <ShopPage />, story: <StoryPage />, gallery: <GalleryPage />, events: <EventsPage />, bag: <BagPage />, me: <MePage /> }[view]
  return (
    <>
    <Suspense fallback={<Stage3DLoading />}><Stage3D /></Suspense>
    <div className="app">
      <TopBar view={view} />
      <main className={`page t-${tk}`} id="page" data-time={tk} key={view}>{page}</main>
      <FootBar view={view} />
      <Popovers />
    </div>
    </>
  )
}

/** Shows system notifications for order progress and new offers while the app is open (no server needed). */
function Notifier() { useLocalNotify(); return null }

export default function App() {
  const theme = useUi((s) => s.theme)
  useEffect(() => {
    const r = document.documentElement
    if (theme) r.setAttribute('data-theme', theme); else r.removeAttribute('data-theme')
  }, [theme])
  // A table QR code opens the app as ?table=7; that switches the bag to "at the table" for that table.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('table')
    const num = q ? parseInt(q, 10) : NaN
    if (Number.isInteger(num) && num >= 1 && num <= 200) { useCart.getState().setMode('table'); useCart.getState().setTable(String(num)) }
  }, [])
  return (
    <I18nProvider>
      <DataProvider>
        <Notifier />
        <Router />
        <AuthModalHost />
        <Toasts />
      </DataProvider>
    </I18nProvider>
  )
}
