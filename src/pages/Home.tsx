import { isAvailable } from '../lib/coins'
import { useI18n } from '../i18n'
import { useShop } from '../data/context'
import { go } from '../lib/route'
import { useUi } from '../store/ui'
import { Icon } from '../components/icons'
import { ItemArt } from '../art/ItemArt'
import { HomeScene } from '../components/HomeScene'
import { basePrice } from '../lib/pricing'

const BEST = ['latte', 'cappuccino', 'croissant', 'icedlatte']

export function Home() {
  const { t, n, lang, price } = useI18n()
  const { data } = useShop()
  const select = useUi((s) => s.select)
  const offer = data?.offers[0]
  const seasonItem = (offer && data?.byId(offer.itemId)) || data?.byId('cheesecake')
  const open = (id: string) => { select(id); go('menu') }
  return (
    <HomeScene active="home">
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
              <button key={id} type="button" className="tile" onClick={() => open(id)} disabled={!isAvailable(m)}>
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
    </HomeScene>
  )
}
