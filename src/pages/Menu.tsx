import { Fragment, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { useI18n } from '../i18n'
import { useShop } from '../data/context'
import { go } from '../lib/route'
import { useUi } from '../store/ui'
import { useCart } from '../store/cart'
import { Icon } from '../components/icons'
import { Frame, LoadState } from '../components/Frame'
import { ItemArt, ItemStage } from '../art/ItemArt'
import { MILKS, REC, SUGARS, isDrink, timeKey } from '../data/catalog'
import { basePrice, offerFor, unitPrice } from '../lib/pricing'
import { rewardsAvailable } from '../lib/coins'
import { clamp } from '../lib/format'
import type { MenuItem } from '../types'

const GROUPS = ['hot', 'cold', 'sweet'] as const

export function MenuPage() {
  const { t, n, price } = useI18n()
  const { data, error, reload } = useShop()
  if (!data) return <Frame title={t('menu.title')} caps={t('menu.sub')} here><LoadState error={error} onRetry={reload} /></Frame>
  const items = data.menu.filter((m) => m.cat !== 'goods')
  if (!items.length) return <Frame title={t('menu.title')} caps={t('menu.sub')} here><div className="body"><p className="muted">{t('menu.empty')}</p><button type="button" className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => go('home')}>{t('nav.home')}</button></div></Frame>
  return <MenuBody items={items} key="menu" t={t} n={n} price={price} />
}

type TFn = ReturnType<typeof useI18n>['t']
function MenuBody({ items, t, n, price }: { items: MenuItem[]; t: TFn; n: (v: number) => string; price: (v: number) => string }) {
  const { data } = useShop()
  const selectedId = useUi((s) => s.selectedId)
  const select = useUi((s) => s.select)
  const fav = useUi((s) => s.favorites.includes(selectedId))
  const toggleFav = useUi((s) => s.toggleFavorite)
  const toast = useUi((s) => s.toast)
  const cart = useCart()
  const item = items.find((m) => m.id === selectedId) ?? items[0]
  const [size, setSize] = useState(item.sizes[0].key)
  const [milk, setMilk] = useState(0)
  const [sugar, setSugar] = useState(1)
  const [qty, setQty] = useState(1)
  const strip = useRef<HTMLDivElement>(null)
  const tk = timeKey()

  // Choosing another item resets its options (medium drinks, one sugar cube, quantity 1).
  useEffect(() => {
    setSize(item.cat === 'hot' || item.cat === 'cold' ? 'medium' : item.sizes[0].key)
    setMilk(0); setSugar(1); setQty(1)
  }, [item.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const s = strip.current, el = s?.querySelector<HTMLElement>('.th[aria-pressed="true"]')
    if (s && el) s.scrollLeft = el.offsetLeft - (s.clientWidth - el.offsetWidth) / 2
  }, [item.id])

  const sel = { size: item.sizes.some((z) => z.key === size) ? size : item.sizes[0].key, milk, sugar }
  const offers = data?.offers ?? []
  const off = offerFor(item.id, offers)
  const p = unitPrice(item, sel, offers), b = basePrice(item, sel)
  const freeInBag = cart.lines.filter((l) => l.free).length
  const canFree = !!data && item.rewardEligible && item.available && rewardsAvailable(data.balance, data.settings.rewardEvery, freeInBag) > 0

  const add = () => {
    if (!item.available) return
    cart.add({ itemId: item.id, size: sel.size, milk: item.milk ? milk : 0, sugar: isDrink(item) ? sugar : 1, qty, free: false })
    setQty(1)
    toast(t('menu.addedToast', { name: t(`item.${item.id}.name`) }), { action: { label: t('menu.openBag'), run: () => go('bag') } })
  }
  const takeFree = () => {
    cart.addReward(item.id, item.sizes[0].key)
    toast(t('menu.freeAddedToast', { name: t(`item.${item.id}.name`) }), { gold: true, action: { label: t('menu.openBag'), run: () => go('bag') } })
  }

  // Drag to tilt the picture (a 3D renderer, when registered, handles its own gestures inside the stage).
  const spin = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number } | null>(null)
  const down = (e: RPointerEvent) => { if ((e.target as HTMLElement).closest('.favbtn')) return; drag.current = { x: e.clientX, y: e.clientY }; spin.current?.classList.add('drag'); try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* ignore */ } }
  const move = (e: RPointerEvent) => { const d = drag.current; if (!d || !spin.current) return; spin.current.style.transform = `rotateY(${clamp((e.clientX - d.x) * 0.45, -42, 42)}deg) rotateX(${clamp(-(e.clientY - d.y) * 0.2, -12, 12)}deg)` }
  const up = () => { drag.current = null; if (spin.current) { spin.current.classList.remove('drag'); spin.current.style.transform = '' } }

  const body = (
    <>
      <div className="bigg ltr">
        <div className="artcol">
          <div className="art-wrap" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            <div className="spin" ref={spin} data-slot="item"><ItemStage item={item} sel={sel} /></div>
            <button type="button" className="favbtn" aria-pressed={fav} aria-label={t('menu.fav')} onClick={() => toggleFav(item.id)}><Icon name="heart" size={20} /></button>
          </div>
          <div className="hint ltr"><span><Icon name="chevL" size={16} /></span><span>{t('menu.dragHint')}</span></div>
        </div>
        <div className="info">
          <button type="button" className="back ltr" onClick={() => { if (strip.current) strip.current.scrollLeft = 0 }}><Icon name="arrowL" size={16} /><span>{t('menu.allItems')}</span></button>
          <div className="eyebrow">{t(`cat.${item.cat}`)}</div>
          <h2 className="script" style={{ margin: 0, fontSize: 'clamp(34px,6.2vh,66px)', lineHeight: 1.1, color: 'var(--ml-accent)' }}>{t(`item.${item.id}.name`)}</h2>
          <div className="price">{price(p)}{off && <><s>{price(b)}</s><span className="off">{t('home.offerOff', { pct: n(off.pct) })}</span></>}</div>
          <p className="desc">{t(`item.${item.id}.desc`)}</p>
          <div className="tags">{item.tags.map((k) => <span key={k} className="tag">{t(`tag.${k}`)}</span>)}</div>
          <div className="opt" role="group" aria-label={t('menu.optSize')}>
            {item.sizes.map((z) => <button key={z.key} type="button" aria-pressed={sel.size === z.key} onClick={() => setSize(z.key)}>{t(`size.${z.key}`)}</button>)}
          </div>
          {item.milk && (
            <div className="opt" role="group" aria-label={t('menu.optMilk')}>
              {MILKS.map((m, i) => <button key={m.key} type="button" aria-pressed={milk === i} onClick={() => setMilk(i)}>{t(m.key)}{m.add ? ` (+${n(m.add / 1000)})` : ''}</button>)}
            </div>
          )}
          {isDrink(item) && (
            <div className="opt" role="group" aria-label={t('menu.optSugar')}>
              {SUGARS.map((k, i) => <button key={k} type="button" aria-pressed={sugar === i} onClick={() => setSugar(i)}>{t(k)}</button>)}
            </div>
          )}
          <div className="buy ltr">
            <div className="step" role="group" aria-label={t('menu.optQty')}>
              <button type="button" onClick={() => setQty((q) => clamp(q - 1, 1, 20))} aria-label={t('menu.less')} disabled={qty <= 1}><Icon name="minus" size={16} /></button>
              <output aria-live="polite">{n(qty)}</output>
              <button type="button" onClick={() => setQty((q) => clamp(q + 1, 1, 20))} aria-label={t('menu.more')} disabled={qty >= 20}><Icon name="plus" size={16} /></button>
            </div>
            <button type="button" className="btn" onClick={add} disabled={!item.available}>{t(item.available ? 'menu.add' : 'menu.soldOut')}<Icon name="bag" size={18} /></button>
            {canFree && <button type="button" className="btn gold" onClick={takeFree}>{t('menu.freeWith', { n: n(data!.settings.rewardEvery) })}</button>}
          </div>
        </div>
      </div>
      <div className="dl" />
      <div className="strip" ref={strip} role="group" aria-label={t('menu.allItems')}>
        <div className="in ltr">
          {GROUPS.map((g, gi) => (
            <Fragment key={g}>
              {gi > 0 && <i className="sep" />}
              {items.filter((m) => m.cat === g).map((m) => {
                const o = offerFor(m.id, offers)
                return (
                  <button key={m.id} type="button" className={`th${m.available ? '' : ' off'}`} aria-pressed={item.id === m.id} aria-label={t(`item.${m.id}.name`)} title={t(`item.${m.id}.name`)} onClick={() => select(m.id)}>
                    {o && <i className="sale">{n(o.pct)}٪</i>}
                    {REC[tk].includes(m.id) && <i className="star" />}
                    <ItemArt item={m} uid={`t${m.id}`} />
                  </button>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </>
  )
  return <Frame title={t('menu.title')} caps={t('menu.sub')} here>{body}</Frame>
}
