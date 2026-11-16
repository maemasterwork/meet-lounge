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
import { LOW_STOCK, canTakeReward, isAvailable, rewardCostOf, stockLeft } from '../lib/coins'
import { clamp } from '../lib/format'
import type { MenuItem } from '../types'

const GROUPS = ['hot', 'cold', 'tea', 'breakfast', 'food', 'sweet'] as const
type Filter = 'all' | (typeof GROUPS)[number]

export function MenuPage() {
  const { t, n, price } = useI18n()
  const { data, error, reload } = useShop()
  if (!data) return <Frame title={t('menu.title')} caps={t('menu.sub')} here><LoadState error={error} onRetry={reload} /></Frame>
  const items = data.menu.filter((m) => m.cat !== 'goods')
  if (!items.length) return <Frame title={t('menu.title')} caps={t('menu.sub')} here><div className="body"><p className="muted">{t('menu.empty')}</p><button type="button" className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => go('home')}>{t('nav.home')}</button></div></Frame>
  return <MenuSwitch items={items} t={t} n={n} price={price} />
}

type TFn = ReturnType<typeof useI18n>['t']
type Fmt = { t: TFn; n: (v: number) => string; price: (v: number) => string }

/** Grid first (as on the reference); tapping a card, or an offer/favorite elsewhere, opens that item's options. */
function MenuSwitch({ items, ...f }: { items: MenuItem[] } & Fmt) {
  const detail = useUi((s) => s.menuDetail)
  const setDetail = useUi((s) => s.setMenuDetail)
  useEffect(() => () => setDetail(false), [setDetail])
  return detail ? <MenuBody items={items} key="detail" {...f} /> : <MenuGrid items={items} {...f} />
}

function useMedia(q: string) {
  const [m, setM] = useState(() => typeof matchMedia === 'function' && matchMedia(q).matches)
  useEffect(() => { const mq = matchMedia(q), f = () => setM(mq.matches); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f) }, [q])
  return m
}

function MenuGrid({ items, t, n, price }: { items: MenuItem[] } & Fmt) {
  const { data } = useShop()
  const select = useUi((s) => s.select)
  const toast = useUi((s) => s.toast)
  const cart = useCart()
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(0)
  const phone = useMedia('(max-width: 820px)')
  const per = phone ? 6 : 8
  const tk = timeKey()
  const offers = data?.offers ?? []
  const shown = filter === 'all' ? items : items.filter((m) => m.cat === filter)
  const pages = Math.max(1, Math.ceil(shown.length / per))
  const cur = Math.min(page, pages - 1)
  const view = shown.slice(cur * per, cur * per + per)
  const count = (f: Filter) => (f === 'all' ? items.length : items.filter((m) => m.cat === f).length)
  const quick = (m: MenuItem) => {
    if (!isAvailable(m)) return
    if (stockLeft(m, cart.lines) < 1) { toast(t('menu.maxInBagToast', { name: t(`item.${m.id}.name`) })); return }
    cart.add({ itemId: m.id, size: isDrink(m) ? 'medium' : m.sizes[0].key, milk: 0, sugar: 1, qty: 1, free: false })
    toast(t('menu.addedToast', { name: t(`item.${m.id}.name`) }), { action: { label: t('menu.openBag'), run: () => go('bag') } })
  }
  return (
    <Frame title={t('menu.title')} caps={t('menu.sub')} here>
      <div className="mhead ltr">
        <span className="mt"><Icon name="leaf" size={16} />{t('menu.cardTitle')}</span>
        <div className="chips2" role="group" aria-label={t('menu.cardTitle')}>
          {(['all', ...GROUPS] as Filter[]).filter((f) => count(f) > 0).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => { setFilter(f); setPage(0) }}>{t(`menu.chip.${f}`)}<sup>{n(count(f))}</sup></button>))}
        </div>
      </div>
      <div className="mgrid ltr" style={{ gridTemplateRows: `repeat(${phone ? 3 : 2},minmax(0,1fr))` }}>
        {view.map((m) => {
          const o = offerFor(m.id, offers)
          const name = t(`item.${m.id}.name`)
          return (
            <div key={m.id} className={`mc${isAvailable(m) ? '' : ' off'}`}>
              <button type="button" className="mo" aria-label={t('menu.openItem', { name })} onClick={() => select(m.id)}>
                <span className="im">
                  {o && <i className="sale">{n(o.pct)}٪</i>}
                  {!isAvailable(m) ? <i className="low out">{t('menu.soldOut')}</i> : m.stock !== null && m.stock <= LOW_STOCK && <i className="low">{t('menu.onlyLeft', { n: n(m.stock) })}</i>}
                  {REC[tk].includes(m.id) && <i className="star" />}
                  <ItemArt item={m} uid={`g${m.id}`} />
                </span>
                <b className="nm">{name}</b>
                <span className="sb">{m.tags.slice(0, 2).map((k) => t(`tag.${k}`)).join(' · ')}</span>
              </button>
              <div className="pr2">
                <span>{price(unitPrice(m, { size: isDrink(m) ? 'medium' : m.sizes[0].key, milk: 0 }, offers))}</span>
                <button type="button" className="plus" disabled={!isAvailable(m)} aria-label={t(isAvailable(m) ? 'menu.quickAdd' : 'menu.soldOut', { name })} onClick={() => quick(m)}><Icon name="plus" size={16} /></button>
              </div>
            </div>)
        })}
      </div>
      {pages > 1 && (
        <div className="dots" role="group" aria-label={t('menu.cardTitle')}>
          {Array.from({ length: pages }, (_, i) => <button key={i} type="button" aria-label={t('menu.page', { n: n(i + 1) })} aria-current={i === cur ? 'page' : undefined} onClick={() => setPage(i)} />)}
        </div>)}
    </Frame>
  )
}

function MenuBody({ items, t, n, price }: { items: MenuItem[] } & Fmt) {
  const setDetail = useUi((s) => s.setMenuDetail)
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
    setSize(isDrink(item) ? 'medium' : item.sizes[0].key)
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
  const left = stockLeft(item, cart.lines), maxQty = Math.min(20, left), onSale = isAvailable(item)
  const canFree = !!data && item.rewardEligible && onSale && left >= 1 && canTakeReward(data.balance, item.rewardCost, rewardCostOf(cart.lines, data.menu))

  const add = () => {
    if (!onSale || left < 1) return
    cart.add({ itemId: item.id, size: sel.size, milk: item.milk ? milk : 0, sugar: isDrink(item) ? sugar : 1, qty: Math.min(qty, left), free: false })
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
          <button type="button" className="back ltr" onClick={() => setDetail(false)}><Icon name="arrowL" size={16} /><span>{t('menu.allItems')}</span></button>
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
          {onSale && item.stock !== null && item.stock <= LOW_STOCK && <p className="lowline">{t('menu.onlyLeft', { n: n(item.stock) })}</p>}
          <div className="buy ltr">
            <div className="step" role="group" aria-label={t('menu.optQty')}>
              <button type="button" onClick={() => setQty((q) => clamp(q - 1, 1, 20))} aria-label={t('menu.less')} disabled={qty <= 1}><Icon name="minus" size={16} /></button>
              <output aria-live="polite">{n(qty)}</output>
              <button type="button" onClick={() => setQty((q) => clamp(q + 1, 1, Math.max(1, maxQty)))} aria-label={t('menu.more')} disabled={qty >= maxQty}><Icon name="plus" size={16} /></button>
            </div>
            <button type="button" className="btn" onClick={add} disabled={!onSale || left < 1}>{t(!onSale ? 'menu.soldOut' : left < 1 ? 'menu.maxInBag' : 'menu.add')}<Icon name="bag" size={18} /></button>
            {canFree && <button type="button" className="btn gold" onClick={takeFree}>{t('menu.freeWith', { n: n(item.rewardCost) })}</button>}
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
                  <button key={m.id} type="button" className={`th${isAvailable(m) ? '' : ' off'}`} aria-pressed={item.id === m.id} aria-label={t(`item.${m.id}.name`)} title={t(`item.${m.id}.name`)} onClick={() => select(m.id)}>
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
