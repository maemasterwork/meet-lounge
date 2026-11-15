import type { ReactNode } from 'react'
import { useI18n } from '../i18n'
import { useShop } from '../data/context'
import { go, type View } from '../lib/route'
import { useCart } from '../store/cart'
import { Icon } from './icons'
import { ItemArt, SceneArt } from '../art/ItemArt'
import { timeKey } from '../data/catalog'

const NAV: { v: View; icon: string }[] = [
  { v: 'home', icon: 'home' }, { v: 'menu', icon: 'cup' }, { v: 'shop', icon: 'basket' }, { v: 'events', icon: 'cal' }, { v: 'bag', icon: 'bag' },
]

/** The landing scene (building, headline, vertical nav, tag card) with the right-hand column supplied by the page. Used by Home and My bag. */
export function HomeScene({ active, className = '', children }: { active: View; className?: string; children: ReactNode }) {
  const { t, n } = useI18n()
  const { data } = useShop()
  const count = useCart((s) => s.lines.reduce((a, l) => a + l.qty, 0))
  return (
    <div className={`home ltr ${className}`}>
      <div className="hero-art" data-slot="hero" aria-hidden="true"><SceneArt kind="hero" time={timeKey()} /></div>
      <div className="hl">
        <h1 className="hl-h script">
          <span className="ln">{t('brand.heroLine1')}</span><span className="ln b">{t('brand.heroLine2')}</span>
          {/* <span className="ln c">{t('brand.heroLine3')}</span> */}
        </h1>
        <p className="caps">{t('brand.heroSub')}</p>
        <svg className="squig" viewBox="0 0 70 14" aria-hidden="true"><path d="M2 9 C14 2 24 13 36 7 S58 4 68 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        <nav className="vnav" aria-label={t('nav.main')}>
          {NAV.map((x) => (
            <button key={x.v} type="button" onClick={() => go(x.v)} aria-current={x.v === active ? 'page' : undefined}>
              <Icon name={x.icon} /><span>{t(`nav.${x.v}`)}</span>
              {x.v === 'bag' && count > 0 && <span className="cnt">{n(count)}</span>}
              <Icon name="chevL" className="chev" />
            </button>
          ))}
        </nav>
        <div className="tagcard ltr">
          <div className="ti" aria-hidden="true">{data?.byId('espresso') && <ItemArt item={data.byId('espresso')!} uid="tg" />}</div>
          <p style={{ whiteSpace: 'pre-line' }}>{t('brand.tagCard')}</p>
        </div>
      </div>
      <div className="hr">{children}</div>
    </div>
  )
}
