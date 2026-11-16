import { useEffect, useState, type DragEvent } from 'react'
import { useI18n } from '../i18n'
import { repos, type AdminItem, type AdminItemPatch } from '../repos'
import { useRepo } from '../lib/useRepo'
import { ItemArt } from '../art/ItemArt'
import { IMAGE_ACCEPT, Msg, NumInput, Switch, useAct } from './common'
import type { Category } from '../types'
import { swapVisibleItems } from './item-order'
import { isDrinkCategory } from '../data/catalog'

const CATS: Category[] = ['hot', 'cold', 'tea', 'breakfast', 'food', 'sweet', 'goods']

function PriceInput({ item, onSave, disabled }: { item: AdminItem; onSave: (p: number) => void; disabled: boolean }) {
  const [v, setV] = useState(String(item.price / 1000))
  useEffect(() => setV(String(item.price / 1000)), [item.price])
  const commit = () => {
    const thousands = Number(v)
    const p = thousands * 1000
    if (v.trim() && Number.isInteger(thousands) && thousands > 0 && p !== item.price) onSave(p)
    else setV(String(item.price / 1000))
  }
  return <input type="number" min={1} step={1} dir="ltr" value={v} disabled={disabled} aria-label={item.name.fa} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
}

function Editor({ item, onClose, onStage, act }: { item: AdminItem; onClose: () => void; onStage: (patch: AdminItemPatch) => void; act: ReturnType<typeof useAct> }) {
  const { t } = useI18n()
  const [f, setF] = useState({ nameFa: item.name.fa, nameEn: item.name.en, descFa: item.desc.fa, descEn: item.desc.en })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  const ok = f.nameFa.trim() && f.nameEn.trim()
  return (
    <div className="panel">
      <h3>{t('common.edit')}</h3>
      <div className="twocol">
        <label className="field">{t('admin.nameFa')}<input value={f.nameFa} maxLength={80} onChange={set('nameFa')} /></label>
        <label className="field">{t('admin.nameEn')}<input dir="ltr" value={f.nameEn} maxLength={80} onChange={set('nameEn')} /></label>
        <label className="field">{t('a2.descFa')}<textarea rows={2} value={f.descFa} maxLength={400} onChange={set('descFa')} /></label>
        <label className="field">{t('a2.descEn')}<textarea dir="ltr" rows={2} value={f.descEn} maxLength={400} onChange={set('descEn')} /></label>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn sm" disabled={act.busy || !ok} onClick={() => { onStage({ name: { fa: f.nameFa.trim(), en: f.nameEn.trim() }, desc: { fa: f.descFa.trim(), en: f.descEn.trim() } }); onClose() }}>{t('a2.doneEditing')}</button>
        <button type="button" className="btn ghost sm" onClick={onClose}>{t('common.cancel')}</button>
      </div>
    </div>)
}

function NewItem({ act }: { act: ReturnType<typeof useAct> }) {
  const { t } = useI18n()
  const blank = { nameFa: '', nameEn: '', descFa: '', descEn: '', cat: 'hot' as Category, price: '', milk: false, syrupOptions: false, reward: false, coins: '1', cost: '6', stock: '' }
  const [f, setF] = useState(blank)
  const thousands = Number(f.price)
  const price = thousands * 1000
  const coins = Math.round(Number(f.coins)), cost = Math.round(Number(f.cost)), stock = f.stock.trim() === '' ? null : Math.round(Number(f.stock))
  const ok = f.nameFa.trim() && f.nameEn.trim() && Number.isInteger(thousands) && thousands > 0 && coins >= 0 && coins <= 50 && cost >= 1 && cost <= 200 && (stock === null || (Number.isFinite(stock) && stock >= 0))
  return (
    <div className="panel">
      <h3>{t('a2.newItem')}</h3>
      <div className="twocol">
        <label className="field">{t('admin.nameFa')}<input value={f.nameFa} maxLength={80} onChange={(e) => setF({ ...f, nameFa: e.target.value })} /></label>
        <label className="field">{t('admin.nameEn')}<input dir="ltr" value={f.nameEn} maxLength={80} onChange={(e) => setF({ ...f, nameEn: e.target.value })} /></label>
        <label className="field">{t('a2.descFa')}<input value={f.descFa} maxLength={400} onChange={(e) => setF({ ...f, descFa: e.target.value })} /></label>
        <label className="field">{t('a2.descEn')}<input dir="ltr" value={f.descEn} maxLength={400} onChange={(e) => setF({ ...f, descEn: e.target.value })} /></label>
        <label className="field">{t('a2.category')}
          <select value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value as Category })}>{CATS.map((c) => <option key={c} value={c}>{t(`cat.${c}`)}</option>)}</select>
        </label>
        <label className="field">{t('admin.price')}<input type="number" dir="ltr" min={1} step={1} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></label>
        <label className="field">{t('a2.coinsEarned')}<input type="number" dir="ltr" min={0} max={50} value={f.coins} onChange={(e) => setF({ ...f, coins: e.target.value })} /><small className="muted">{t('a2.coinsEarnedHelp')}</small></label>
        <label className="field">{t('a2.stock')}<input type="number" dir="ltr" min={0} placeholder={t('a2.unlimited')} value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} /><small className="muted">{t('a2.stockHelp')}</small></label>
        {f.reward && <label className="field">{t('a2.rewardCost')}<input type="number" dir="ltr" min={1} max={200} value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} /><small className="muted">{t('a2.rewardCostHelp')}</small></label>}
      </div>
      <div className="row" style={{ gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {isDrinkCategory(f.cat) && <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={f.milk} onChange={(e) => setF({ ...f, milk: e.target.checked })} />{t('milk.whole')} / {t('milk.oat')}</label>}
        {isDrinkCategory(f.cat) && <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={f.syrupOptions} onChange={(e) => setF({ ...f, syrupOptions: e.target.checked })} />{t('admin.syrupOptions')}</label>}
        <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={f.reward} onChange={(e) => setF({ ...f, reward: e.target.checked })} />{t('admin.rewardEligible')}</label>
        <button type="button" className="btn sm" disabled={act.busy || !ok} onClick={async () => {
          const id = await act.run(() => repos.admin.addItem({ name: { fa: f.nameFa.trim(), en: f.nameEn.trim() }, desc: { fa: f.descFa.trim(), en: f.descEn.trim() }, cat: f.cat, price, milk: f.milk && isDrinkCategory(f.cat), syrupOptions: f.syrupOptions && isDrinkCategory(f.cat), rewardEligible: f.reward, coinsEarned: coins, rewardCost: cost, stock }))
          if (id) setF(blank)
        }}>{t('a2.create')}</button>
      </div>
    </div>)
}

export function MenuTab({ owner }: { owner: boolean }) {
  const { t, lang } = useI18n()
  const items = useRepo(() => repos.admin.items(), [repos.admin])
  const act = useAct()
  const [editing, setEditing] = useState<string | null>(null)
  const [archived, setArchived] = useState(false)
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [dragging, setDragging] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, AdminItemPatch>>({})
  const [orderIds, setOrderIds] = useState<string[] | null>(null)
  const [pendingImages, setPendingImages] = useState<Record<string, File | null>>({})
  const baseItems = items.data ?? []
  const baseIds = baseItems.map((i) => i.id)
  const allIds = orderIds ?? baseIds
  const byId = new Map(baseItems.map((i) => [i.id, i]))
  const orderedItems = [...allIds.flatMap((id) => { const item = byId.get(id); return item ? [{ ...item, ...drafts[id] }] : [] }),
    ...baseItems.filter((i) => !allIds.includes(i.id)).map((i) => ({ ...i, ...drafts[i.id] }))]
  const list = orderedItems.filter((i) => (archived || !i.archived) && (category === 'all' || i.cat === category))
  const dis = act.busy || !owner
  const stage = (id: string, patch: AdminItemPatch) => setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }))
  const swap = (firstId: string, secondId: string) => {
    const ids = swapVisibleItems(allIds, list.map((i) => i.id), firstId, secondId)
    setOrderIds(ids.some((id, i) => id !== baseIds[i]) ? ids : null)
  }
  const startDrag = (e: DragEvent<HTMLButtonElement>, id: string) => {
    setDragging(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }
  const dropOn = (e: DragEvent<HTMLTableRowElement>, id: string) => {
    e.preventDefault()
    const source = dragging || e.dataTransfer.getData('text/plain')
    if (source) swap(source, id)
    setDragging(null)
  }
  const editItem = items.data?.find((i) => i.id === editing)
  const orderChanged = orderIds !== null
  const imageCount = Object.keys(pendingImages).length
  const changeCount = Object.keys(drafts).length + Number(orderChanged) + imageCount
  const saveAll = () => void act.run(async () => {
    const changes = Object.entries(drafts).map(([id, patch]) => ({ id, patch }))
    const saves: Promise<unknown>[] = []
    if (changes.length) saves.push(repos.admin.saveItems(changes))
    if (orderChanged && orderIds) saves.push(repos.admin.reorderItems(orderIds))
    for (const [id, file] of Object.entries(pendingImages)) saves.push(repos.admin.setItemImage(id, file))
    await Promise.all(saves)
    setDrafts({})
    setOrderIds(null)
    setPendingImages({})
    return true
  })
  return (
    <div className="apane" style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
      <div className="panel">
        <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{t('admin.menuTitle')}</h3>
          <label className="row" style={{ gap: 8 }}>
            {t('a2.category')}
            <select value={category} onChange={(e) => setCategory(e.target.value as Category | 'all')}>
              <option value="all">{t('a2.allCategories')}</option>
              {CATS.map((c) => <option key={c} value={c}>{t(`cat.${c}`)}</option>)}
            </select>
          </label>
          <label className="row" style={{ gap: 8, marginInlineStart: 'auto' }}><input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />{t('a2.showArchived')}</label>
        </div>
        <Msg msg={act.msg} />
        {changeCount > 0 && <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span className="muted sm">{t('a2.unsavedChanges', { n: changeCount })}</span>
          <button type="button" className="btn ghost sm" disabled={act.busy} onClick={() => { setDrafts({}); setOrderIds(null); setPendingImages({}) }}>{t('a2.discardChanges')}</button>
          <button type="button" className="btn sm" disabled={act.busy} onClick={saveAll}>{t('a2.saveChanges')}</button>
        </div>}
        {!owner && <p className="muted sm" style={{ margin: 0 }}>{t('a2.ownerOnly')}</p>}
        <div className="tblw">
          <table>
            <thead><tr><th>{t('a2.item')}</th><th>{t('admin.price')}</th><th>{t('admin.available')}</th><th>{t('a2.stock')}</th><th title={t('a2.coinsEarnedHelp')}>{t('a2.coinsEarned')}</th><th>{t('admin.rewardEligible')}</th><th title={t('a2.rewardCostHelp')}>{t('a2.rewardCost')}</th><th>{t('admin.image')}</th><th /></tr></thead>
            <tbody>
              {list.map((i, index) => (
                <tr key={i.id} className={dragging === i.id ? 'item-dragging' : undefined} style={i.archived ? { opacity: 0.55 } : undefined} onDragOver={(e) => e.preventDefault()} onDrop={(e) => dropOn(e, i.id)}>
                  <td><div className="row" style={{ gap: 8, alignItems: 'center' }}><span className="thumb" style={{ width: 40, height: 40 }}><ItemArt item={i} uid={`ad${i.id}`} /></span><span><b>{i.name[lang]}</b><br /><span className={`item-category item-category-${i.cat}`}>{t(`cat.${i.cat}`)}</span></span></div></td>
                  <td><PriceInput item={i} disabled={dis} onSave={(p) => stage(i.id, { price: p })} /></td>
                  <td><Switch on={i.available} label={t('admin.available')} disabled={dis} onChange={(v) => stage(i.id, { available: v })} /></td>
                  <td>
                    <NumInput value={i.stock} min={0} max={100000} nullable placeholder={t('a2.unlimited')} label={`${t('a2.stock')} — ${i.name[lang]}`} disabled={dis} onSave={(v) => stage(i.id, { stock: v })} />
                    {i.stock === 0 && <span className="pillst bad">{t('menu.soldOut')}</span>}
                  </td>
                  <td><NumInput value={i.coinsEarned} min={0} max={50} label={`${t('a2.coinsEarned')} — ${i.name[lang]}`} disabled={dis} onSave={(v) => stage(i.id, { coinsEarned: v ?? 1 })} /></td>
                  <td><Switch on={i.rewardEligible} label={t('admin.rewardEligible')} disabled={dis} onChange={(v) => stage(i.id, { rewardEligible: v })} /></td>
                  <td><NumInput value={i.rewardCost} min={1} max={200} label={`${t('a2.rewardCost')} — ${i.name[lang]}`} disabled={dis || !i.rewardEligible} onSave={(v) => stage(i.id, { rewardCost: v ?? 6 })} /></td>
                  <td>
                    <input type="file" accept={IMAGE_ACCEPT} disabled={dis} aria-label={t('admin.image')} onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingImages((current) => ({ ...current, [i.id]: f })); e.target.value = '' }} />
                    {Object.hasOwn(pendingImages, i.id) && <span className="muted sm">{pendingImages[i.id]?.name ?? t('admin.removeImage')}</span>}
                    {!Object.hasOwn(pendingImages, i.id) && i.image && <button type="button" className="btn ghost sm" disabled={dis} onClick={() => setPendingImages((current) => ({ ...current, [i.id]: null }))}>{t('admin.removeImage')}</button>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button type="button" className="item-order-btn" disabled={dis || index === 0} aria-label={t('a2.moveUp')} title={t('a2.moveUp')} onClick={() => swap(i.id, list[index - 1].id)}>↑</button>{' '}
                    <button type="button" className="item-order-btn" disabled={dis || index === list.length - 1} aria-label={t('a2.moveDown')} title={t('a2.moveDown')} onClick={() => swap(i.id, list[index + 1].id)}>↓</button>{' '}
                    <button type="button" className="item-order-btn item-drag-handle" draggable={!dis} disabled={dis} aria-label={t('a2.dragItem')} title={t('a2.dragItem')} onDragStart={(e) => startDrag(e, i.id)} onDragEnd={() => setDragging(null)}>⋮⋮</button>{' '}
                    <button type="button" className="btn ghost sm" disabled={dis} onClick={() => setEditing(i.id)}>{t('common.edit')}</button>{' '}
                    <button type="button" className="btn ghost sm" disabled={dis} onClick={() => stage(i.id, { archived: !i.archived })}>{t(i.archived ? 'a2.unarchive' : 'admin.archive')}</button>
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>
      </div>
      {owner && editItem && <Editor key={editItem.id} item={{ ...editItem, ...drafts[editItem.id] }} act={act} onStage={(patch) => stage(editItem.id, patch)} onClose={() => setEditing(null)} />}
      {owner && <NewItem act={act} />}
    </div>)
}
