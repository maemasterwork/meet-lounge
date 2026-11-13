import { useI18n } from '../i18n'
import { useShop } from '../data/context'
import { go } from '../lib/route'
import { useUi } from '../store/ui'
import { useCart } from '../store/cart'
import { Frame, LoadState } from '../components/Frame'
import { ItemArt } from '../art/ItemArt'
import { EVENTS, EVENT_COPY } from '../data/catalog'
import { unitPrice } from '../lib/pricing'

export function ShopPage() {
  const { t, price } = useI18n()
  const { data, error, reload } = useShop()
  const add = useCart((s) => s.add)
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
                  <span>{price(unitPrice(g, { size: g.sizes[0].key, milk: 0 }, data.offers))}</span>
                  <button type="button" className="btn sm" disabled={!g.available} onClick={() => {
                    add({ itemId: g.id, size: g.sizes[0].key, milk: 0, sugar: 1, qty: 1, free: false })
                    toast(t('menu.addedToast', { name: t(`item.${g.id}.name`) }), { action: { label: t('menu.openBag'), run: () => go('bag') } })
                  }}>{t(g.available ? 'menu.add' : 'menu.soldOut')}</button>
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

export function EventsPage() {
  const { t, n, lang } = useI18n()
  const registered = useUi((s) => s.registered)
  const toggle = useUi((s) => s.toggleRegistered)
  const toast = useUi((s) => s.toast)
  const date = (d: number) => new Date(Date.now() + d * 864e5).toLocaleDateString(lang === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <Frame title={t('events.title')} caps={t('events.sub')}>
      <div className="body"><h2>{t('events.heading')}</h2>
        {EVENTS.length === 0 ? <p className="muted">{t('events.empty')}</p> : (
          <div className="list">
            {EVENTS.map((e) => {
              const on = registered.includes(e.id), c = EVENT_COPY[e.id][lang]
              return (
                <div key={e.id} className="row">
                  <span className="grow"><b>{c[0]}</b><br />
                    <span className="muted sm">{date(e.daysAhead)} · {t('events.at', { time: e.time.replace(/\d/g, (d) => n(+d)) })} · {t('events.seatsLeft', { n: n(e.seats - (on ? 1 : 0)) })}</span><br />
                    <span className="sm">{c[1]}</span></span>
                  <button type="button" className={`btn sm${on ? ' ghost' : ''}`} aria-pressed={on} onClick={() => { toggle(e.id); toast(t(on ? 'events.toastOff' : 'events.toastOn')) }}>{t(on ? 'events.registered' : 'events.register')}</button>
                </div>)
            })}
          </div>)}
      </div>
    </Frame>
  )
}
