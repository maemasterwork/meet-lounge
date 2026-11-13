import { Suspense, lazy, useEffect } from 'react'
import { I18nProvider, useI18n } from './i18n'
import { DataProvider } from './data/context'
import { useView } from './lib/route'
import { useUi } from './store/ui'
import { useCart } from './store/cart'
import { timeKey } from './data/catalog'
import { FootBar, Popovers, Toasts, TopBar } from './components/Shell'
import { Home } from './pages/Home'
import { MenuPage } from './pages/Menu'
import { EventsPage, GalleryPage, ShopPage, StoryPage } from './pages/Simple'
import { BagPage } from './pages/Bag'
import { MePage } from './pages/Me'

const Admin = lazy(() => import('./admin/Admin'))

function Router() {
  const view = useView()
  const { t } = useI18n()
  const tk = timeKey()
  if (view === 'admin') return <Suspense fallback={<p className="muted" style={{ padding: 24 }}>{t('loading')}</p>}><Admin /></Suspense>
  const page = { home: <Home />, menu: <MenuPage />, shop: <ShopPage />, story: <StoryPage />, gallery: <GalleryPage />, events: <EventsPage />, bag: <BagPage />, me: <MePage /> }[view]
  return (
    <div className="app">
      <TopBar view={view} />
      <main className={`page t-${tk}`} id="page" data-time={tk} key={view}>{page}</main>
      <FootBar view={view} />
      <Popovers />
    </div>
  )
}

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
        <Router />
        <Toasts />
      </DataProvider>
    </I18nProvider>
  )
}
