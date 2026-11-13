import { useI18n } from '../i18n'
import { useShop } from '../data/context'
import { go, type View } from '../lib/route'
import { useUi } from '../store/ui'
import { useCart } from '../store/cart'
import { Icon } from '../components/icons'
import { ItemArt, SceneArt } from '../art/ItemArt'
import { timeKey } from '../data/catalog'
import { basePrice } from '../lib/pricing'

const NAV: { v: View; icon: string }[] = [
  { v: 'home', icon: 'home' }, { v: 'menu', icon: 'cup' }, { v: 'shop', icon: 'basket' }, { v: 'events', icon: 'cal' }, { v: 'bag', icon: 'bag' },
]
const BEST = ['latte', 'cappuccino', 'croissant', 'icedlatte']

export function Home() {
  const { t, n, lang, price } = useI18n()
  const { data } = useShop()
  const select = useUi((s) => s.select)
  const count = useCart((s) => s.lines.reduce((a, l) => a + l.qty, 0))
  const tk = timeKey()
  const offer = data?.offers[0]
  const seasonItem = (offer && data?.byId(offer.itemId)) || data?.byId('cheesecake')
  const open = (id: string) => { select(id); go('menu') }
  return (
    <div className="home ltr">
      <div className="hero-art" data-slot="hero" aria-hidden="true"><SceneArt kind="hero" time={tk} /></div>
      <div className="hl">
        <h1 className="hl-h script">
          <span className="ln">{t('brand.heroLine1')}</span><span className="ln b">{t('brand.heroLine2')}</span><span className="ln c">{t('brand.heroLine3')}</span>
        </h1>
        <p className="caps">{t('brand.heroSub')}</p>
        <svg className="squig" viewBox="0 0 70 14" aria-hidden="true"><path d="M2 9 C14 2 24 13 36 7 S58 4 68 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        <nav className="vnav" aria-label={t('nav.main')}>
          {NAV.map((x) => (
            <button key={x.v} type="button" onClick={() => go(x.v)} aria-current={x.v === 'home' ? 'page' : undefined}>
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
      <div className="hr">
        <article className="card season ltr">
          <div className="tx">
            <span className="kick"><Icon name="leaf" />{t('home.seasonKicker')}</span>
            <h2 className="script">{offer ? offer.title[lang] : t('offers.seasonTitle')}</h2>
            <p className="caps">{offer ? offer.body[lang] : t('offers.seasonText')}</p>
            <button type="button" className="btnp" onClick={() => open(seasonItem?.id ?? 'cheesecake')}>{t('home.seeMenu')} <Icon name="arrowL" size={16} /></button>
          </div>
          <div className="sa" aria-hidden="true">
            {seasonItem && <ItemArt item={seasonItem} uid="se" />}
            {offer && offer.pct > 0 && <span className="off">{t('home.offerOff', { pct: n(offer.pct) })}</span>}
          </div>
          <span className="sweet" style={{ whiteSpace: 'pre-line' }}>{t('home.sweetDays')}</span>
        </article>
        <article className="card best">
          <div className="chead ltr"><h3><Icon name="check" />{t('home.bestTitle')}</h3><button type="button" onClick={() => go('menu')}>{t('home.seeAll')} <Icon name="arrowL" size={16} /></button></div>
          <div className="tiles ltr">
            {data && BEST.map((id) => { const m = data.byId(id); if (!m) return null; return (
              <button key={id} type="button" className="tile" onClick={() => open(id)} disabled={!m.available}>
                <span className="im"><ItemArt item={m} uid={`b${id}`} /></span>
                <span className="nm">{t(`item.${id}.name`)}</span>
                <span className="pr">{price(basePrice(m, { size: m.sizes[0].key, milk: 0 }))}</span>
              </button>) })}
          </div>
        </article>
        <article className="card goods">
          <div className="chead ltr"><h3><Icon name="basket" />{t('home.goodsTitle')}</h3><button type="button" onClick={() => go('shop')}>{t('home.shopNow')} <Icon name="arrowL" size={16} /></button></div>
          <div className="tiles ltr">
            {data && data.menu.filter((m) => m.cat === 'goods').map((g) => (
              <button key={g.id} type="button" className="tile" onClick={() => go('shop')} aria-label={t(`item.${g.id}.name`)}>
                <span className="im"><ItemArt item={g} uid={`g${g.id}`} /></span>
              </button>
            ))}
          </div>
        </article>
      </div>
    </div>
  )
}
