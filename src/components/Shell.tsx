import { useEffect } from 'react'
import { useI18n } from '../i18n'
import { useUi } from '../store/ui'
import { useCart } from '../store/cart'
import { go, type View } from '../lib/route'
import { useShop } from '../data/context'
import { Coin, Icon, LogoMark } from './icons'
import { repos } from '../repos'
import { useInstall } from '../lib/pwa'
import { disablePush, enablePush, pushSupported } from '../lib/push'
import { useAuth } from '../lib/auth'
import { AuthPanel } from './AuthPanel'

const TOP: View[] = ['home', 'menu', 'shop', 'story', 'gallery']

export function TopBar({ view }: { view: View }) {
  const { t, n, lang } = useI18n()
  const { data } = useShop()
  const favs = useUi((s) => s.favorites.length)
  const pop = useUi((s) => s.pop)
  const setPop = useUi((s) => s.setPop)
  const setMeTab = useUi((s) => s.setMeTab)
  const unread = data ? data.offers.filter((o) => !o.read).length : 0
  const toMe = (tab: 'coins' | 'favs') => { setMeTab(tab); go('me') }
  return (
    <header className="top ltr" id="top">
      <button className="brand ltr" type="button" onClick={() => go('home')} aria-label={t('nav.home')}>
        <LogoMark />
        <span className="wm"><b>{t('brand.name')}</b><small>{t('brand.tagline')}</small></span>
      </button>
      <nav className="topnav" aria-label={t('nav.main')}>
        {TOP.map((v) => (
          <button key={v} type="button" onClick={() => go(v)} aria-current={view === v ? 'page' : undefined}>{t(`nav.${v}`)}</button>
        ))}
      </nav>
      <div className="top-end">
        <button className="ibtn leaf" type="button" aria-label={t('top.offers')} aria-expanded={pop === 'offers'}
          onClick={() => { setPop(pop === 'offers' ? null : 'offers'); if (pop !== 'offers') void repos.offers.markAllRead() }}>
          <Icon name="leaf" size={26} />
          <span className="badge" hidden={!unread}>{n(unread)}</span>
        </button>
        <div className="pill2 ltr" id="coinPill">
          <button type="button" style={{ direction:'ltr' }} onClick={() => toMe('coins')} aria-label={`${t('top.coins')}: ${data ? n(data.balance) : ''}`}>
            <Coin /><span>{data ? n(data.balance) : '–'}</span>
          </button>
          <button type="button" className="plus" onClick={() => toMe('coins')} aria-label={t('top.rewards')}><Icon name="plus" size={14} /></button>
        </div>
        <button className="pill2 ltr" type="button" onClick={() => toMe('favs')} aria-label={`${t('top.favorites')}: ${n(favs)}`} style={{ paddingRight: 16 }}>
          <span style={{ color: 'var(--ml-accent)' }}><Icon name="heart" size={24} /></span><span>{n(favs)}</span>
        </button>
        <button className="ibtn" type="button" onClick={() => setPop(pop === 'settings' ? null : 'settings')} aria-label={t('top.settings')} aria-expanded={pop === 'settings'} data-lang={lang}>
          <Icon name="gear" size={24} />
        </button>
      </div>
    </header>
  )
}

const TABS: { v: View; icon: string }[] = [
  { v: 'home', icon: 'home' }, { v: 'menu', icon: 'cup' }, { v: 'events', icon: 'cal' }, { v: 'bag', icon: 'bag' }, { v: 'me', icon: 'user' },
]
export function FootBar({ view }: { view: View }) {
  const { t, n } = useI18n()
  const count = useCart((s) => s.lines.reduce((a, l) => a + l.qty, 0))
  return (
    <footer className="foot ltr" id="foot">
      <div className="fb ltr">
        <LogoMark className="" />
        <span><b>{t('brand.name')}</b><small>{t('brand.tagline')}</small></span>
      </div>
      <div className="ftag">{t('brand.footerLine')} <i>♥</i></div>
      <div className="credit ltr"><span className="x"><Icon name="cup" size={20} /></span><span><small>{t('foot.credit')}</small><b>{t('foot.creditValue')}</b></span></div>
      <i className="vsep" />
      <nav className="tabs ltr" id="tabs" aria-label={t('nav.main')}>
        {TABS.map((x) => (
          <button key={x.v} type="button" onClick={() => go(x.v)} aria-label={t(`nav.${x.v}`)} aria-current={view === x.v ? 'page' : undefined}>
            <Icon name={x.icon} />
            {x.v === 'bag' && count > 0 && <span className="badge" style={{ insetInlineStart: 'auto', right: -2 }}>{n(count)}</span>}
          </button>
        ))}
      </nav>
    </footer>
  )
}

export function Toasts() {
  const toasts = useUi((s) => s.toasts)
  const dismiss = useUi((s) => s.dismissToast)
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((x) => (
        <div key={x.id} className={`toast${x.gold ? ' gold' : ''}`}>
          <span>{x.text}</span>
          {x.action && <button type="button" onClick={() => { dismiss(x.id); x.action!.run() }}>{x.action.label}</button>}
        </div>
      ))}
    </div>
  )
}

export function Popovers() {
  const { t, lang } = useI18n()
  const { data } = useShop()
  const auth = useAuth()
  const pop = useUi((s) => s.pop)
  const setPop = useUi((s) => s.setPop)
  const s = useUi()
  const install = useInstall()
  const select = useUi((x) => x.select)
  useEffect(() => {
    if (!pop) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPop(null) }
    const onDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement
      if (!el.closest('#pop') && !el.closest('.top-end')) setPop(null)
    }
    window.addEventListener('keydown', onKey); window.addEventListener('pointerdown', onDown)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown) }
  }, [pop, setPop])
  if (!pop) return null
  const dark = (s.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark'
  return (
    <div id="pop" className="pop" role="dialog" aria-label={t(pop === 'offers' ? 'offers.title' : 'settings.title')}>
      {pop === 'settings' ? (
        <>
          <h4>{t('settings.title')}</h4>
          <button type="button" className="it" onClick={() => s.setTheme(dark ? 'light' : 'dark')}>
            <Icon name={dark ? 'sun' : 'moon'} /><span style={{ flex: 1 }}>{t(dark ? 'settings.themeLight' : 'settings.themeDark')}</span>
          </button>
          <button type="button" className="it" onClick={() => s.setLang(lang === 'fa' ? 'en' : 'fa')}>
            <Icon name="globe" /><span style={{ flex: 1 }}>{t('settings.language')}: {lang === 'fa' ? 'English' : 'فارسی'}</span>
          </button>
          <div className="it">
            <Icon name="leaf" /><span style={{ flex: 1 }}>{t('settings.notify')}</span>
            <button type="button" className="sw" aria-pressed={s.notifyOn} aria-label={t('settings.notify')} onClick={async () => {
              const on = !s.notifyOn
              s.setNotify(on)
              if (!on) { void disablePush(); return }
              if (!pushSupported()) return
              const r = await enablePush()
              s.toast(t(r === 'ok' ? 'push.on' : r === 'denied' ? 'push.denied' : r === 'unavailable' ? 'push.unavailable' : 'push.error'))
            }} />
          </div>
          {auth.configured && (
            <button type="button" className="it" onClick={() => { setPop(null); s.setAuthOpen(true) }}>
              <Icon name="user" /><span style={{ flex: 1 }}>{t(auth.email ? 'auth.customerAccount' : 'auth.customerSignIn')}</span>
            </button>
          )}
          {install.canInstall && (
            <button type="button" className="it" onClick={() => void install.install()}>
              <Icon name="plus" /><span style={{ flex: 1 }}>{t('pwa.install')}</span>
            </button>)}
          <button type="button" className="it" onClick={() => { setPop(null); go('admin') }}>
            <Icon name="dash" /><span style={{ flex: 1 }}>{t('settings.admin')}</span>
          </button>
        </>
      ) : (
        <>
          <h4>{t('offers.title')}</h4>
          {data && data.offers.length > 0 ? data.offers.map((o) => (
            <button key={o.id} type="button" className="it" onClick={() => { select(o.itemId); setPop(null); go('menu') }}>
              <span style={{ flex: 1, textAlign: 'start' }}><b>{o.title[lang]}</b><br /><span className="muted sm">{o.body[lang]}</span></span>
            </button>
          )) : <p className="muted sm" style={{ margin: 8 }}>{t('offers.none')}</p>}
        </>
      )}
    </div>
  )
}

export function AuthModalHost() {
  const { t } = useI18n()
  const auth = useAuth()
  const open = useUi((s) => s.authOpen)
  const setOpen = useUi((s) => s.setAuthOpen)
  if (!open || !auth.configured) return null
  return <AuthPanel mode="customer" note={auth.isGuest ? t('auth.guestNote') : undefined} onClose={() => setOpen(false)} />
}
