import { useEffect, useRef } from 'react'
import type { MenuItem } from '../types'
import { art, sceneSVG } from './art'
import { useMeetLounge } from '../lib/meetlounge'
import { useI18n } from '../i18n'
import { sizeOf } from '../lib/pricing'
import type { TimeKey } from '../data/catalog'

export interface ArtOpts { scale?: number; tint?: number; sugar?: number }

/** Every item picture goes through this one component: uploaded image, else flat SVG placeholder. */
export function ItemArt({ item, opts, uid }: { item: MenuItem; opts?: ArtOpts; uid: string }) {
  const { t } = useI18n()
  const ml = useMeetLounge()
  const name = t(`item.${item.id}.name`)
  const url = ml.assets.items[item.id]
  if (url) return <img src={url} alt={name} draggable={false} />
  return <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: art({ ...item, name }, opts ?? {}, uid) }} />
}

export const stageOpts = (item: MenuItem, sel: { size: string; milk: number; sugar: number }): ArtOpts => ({
  scale: sizeOf(item, sel.size).scale, tint: item.milk ? sel.milk : 0, sugar: item.cat === 'hot' || item.cat === 'cold' ? sel.sugar : 0,
})

/** Product stage picture. A registered 3D/360 renderer (MeetLounge.setItemRenderer) takes over the stage. */
export function ItemStage({ item, sel }: { item: MenuItem; sel: { size: string; milk: number; sugar: number } }) {
  const ml = useMeetLounge()
  const host = useRef<HTMLDivElement>(null)
  const renderer = ml.renderers.item
  useEffect(() => {
    if (!renderer || !host.current) return
    const el = host.current
    let cleanup: void | (() => void)
    try { cleanup = renderer(el, item, sel) } catch (e) { console.error('item renderer failed', e); el.textContent = '' }
    return () => { try { if (typeof cleanup === 'function') cleanup() } finally { el.textContent = '' } }
  }, [renderer, item, sel.size, sel.milk, sel.sugar]) // eslint-disable-line react-hooks/exhaustive-deps
  if (renderer) return <div ref={host} className="item-host" style={{ width: '100%', height: '100%' }} />
  return <ItemArt item={item} opts={stageOpts(item, sel)} uid="main" />
}

/** Cafe scene (hero or mini crop). An uploaded hero image or a hero renderer replaces the flat SVG. */
export function SceneArt({ kind, time }: { kind: 'hero' | 'mini'; time: TimeKey }) {
  const { t } = useI18n()
  const ml = useMeetLounge()
  const host = useRef<HTMLDivElement>(null)
  const renderer = kind === 'hero' ? ml.renderers.hero : null
  useEffect(() => {
    if (!renderer || !host.current) return
    const el = host.current
    let cleanup: void | (() => void)
    try { cleanup = renderer(el, { time }) } catch (e) { console.error('hero renderer failed', e) }
    return () => { try { if (typeof cleanup === 'function') cleanup() } finally { el.textContent = '' } }
  }, [renderer, time])
  if (renderer) return <div ref={host} style={{ position: 'absolute', inset: 0 }} />
  if (ml.assets.hero)
    return <img src={ml.assets.hero} alt="" style={kind === 'mini' ? { position: 'absolute', left: 0, bottom: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'left bottom' } : undefined} />
  return <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: sceneSVG(kind, t('brand.name'), t('brand.name')) }} />
}
