import { useI18n } from '../i18n'
import { useShop } from '../data/context'
import { go } from '../lib/route'
import { useUi } from '../store/ui'
import { useCart } from '../store/cart'
import { Frame, LoadState } from '../components/Frame'
import { ItemArt } from '../art/ItemArt'
import { sizeKeyOf, unitPrice } from '../lib/pricing'
import { isAvailable, stockLeft } from '../lib/coins'

export function ShopPage() {
  const { t, price } = useI18n()
  const { data, error, reload } = useShop()
  const add = useCart((s) => s.add)
  const lines = useCart((s) => s.lines)
  const toast = useUi((s) => s.toast)
  const goods = data?.menu.filter((m) => m.cat === 'goods') ?? []
  return (
    <Frame title={t('shop.title')} caps={t('shop.sub')}>
      {!data ? <LoadState error={error} onRetry={reload} /> : (
        <div className="body"><h2>{t('shop.heading')}</h2>
          {goods.length === 0 ? <p className="muted">{t('shop.empty')}</p> : (
            <div className="grid">
              {goods.map((g) => (
                <div key={g.id} className="gc">
                  <div className="im"><ItemArt item={g} uid={`s${g.id}`} /></div>
                  <b>{t(`item.${g.id}.name`)}</b>
                  <span className="muted sm">{t(`item.${g.id}.desc`)}</span>
                  <span>{price(unitPrice(g, { size: sizeKeyOf(g), milk: 0 }, data.offers))}</span>
                  <button type="button" className="btn sm" disabled={!isAvailable(g) || stockLeft(g, lines) < 1} onClick={() => {
                    add({ itemId: g.id, size: sizeKeyOf(g), milk: 0, syrupId: null, syrupPumps: 0, qty: 1, free: false })
                    toast(t('menu.addedToast', { name: t(`item.${g.id}.name`) }), { action: { label: t('menu.openBag'), run: () => go('bag') } })
                  }}>{t(!isAvailable(g) ? 'menu.soldOut' : stockLeft(g, lines) < 1 ? 'menu.maxInBag' : 'menu.add')}</button>
                </div>
              ))}
            </div>)}
        </div>)}
    </Frame>
  )
}

export function StoryPage() {
  const { t } = useI18n()
  return (
    <Frame title={t('story.title')} caps={t('story.sub')}>
      <div className="body story"><h2>{t('brand.name')}</h2><p>{t('story.p1')}</p><p>{t('story.p2')}</p><p className="muted sm">{t('story.placeholder')}</p></div>
    </Frame>
  )
}

export function GalleryPage() {
  const { t } = useI18n()
  const { data, error, reload } = useShop()
  const select = useUi((s) => s.select)
  const items = data?.menu.filter((m) => m.cat !== 'goods') ?? []
  return (
    <Frame title={t('gallery.title')} caps={t('gallery.sub')}>
      {!data ? <LoadState error={error} onRetry={reload} /> : (
        <div className="body"><h2>{t('gallery.heading')}</h2>
          {items.length === 0 ? <p className="muted">{t('gallery.empty')}</p> : (
            <div className="grid">
              {items.map((m) => (
                <button key={m.id} type="button" className="gc" onClick={() => { select(m.id); go('menu') }}>
                  <div className="im"><ItemArt item={m} uid={`ga${m.id}`} /></div><b>{t(`item.${m.id}.name`)}</b>
                </button>
              ))}
            </div>)}
        </div>)}
    </Frame>
  )
}

