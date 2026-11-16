import { useEffect, useRef, useState, createElement } from 'react'
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
  if (ml.assets.models[item.id]) return <ModelStage item={item} sel={sel} src={ml.assets.models[item.id]} />
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
  return <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: sceneSVG(kind, t('brand.name'), t('brand.name'), kind) }} />
}

/**
 * Interactive 3D model (GLB) for one item, drag to orbit. The flat picture stays until the model has loaded,
 * and stays for good if it fails (old browser, no WebGL, missing file), so the stage is never empty.
 * The viewer library is a separate chunk, downloaded only when an item actually has a model.
 */
function ModelStage({ item, sel, src }: { item: MenuItem; sel: { size: string; milk: number; sugar: number }; src: string }) {
  const { t } = useI18n()
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const el = useRef<HTMLElement | null>(null)
  useEffect(() => { setState('loading'); import('@google/model-viewer').catch(() => setState('failed')) }, [src])
  useEffect(() => {
    const m = el.current
    if (!m) return
    const ok = () => setState('ready'), bad = () => setState('failed')
    m.addEventListener('load', ok); m.addEventListener('error', bad)
    return () => { m.removeEventListener('load', ok); m.removeEventListener('error', bad) }
  }, [src])
  const s = sizeOf(item, sel.size).scale
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {state !== 'ready' && <div style={{ position: 'absolute', inset: 0, display: 'grid' }}><ItemArt item={item} opts={stageOpts(item, sel)} uid="main" /></div>}
      {state !== 'failed' && createElement('model-viewer', {
        ref: el, src, alt: t(`item.${item.id}.name`), 'camera-controls': '', 'touch-action': 'pan-y', 'shadow-intensity': '1', 'interaction-prompt': 'none',
        ...(still ? {} : { 'auto-rotate': '', 'rotation-per-second': '20deg' }), scale: `${s} ${s} ${s}`,
        style: { width: '100%', height: '100%', background: 'transparent', opacity: state === 'ready' ? 1 : 0, '--poster-color': 'transparent' },
      })}
    </div>)
}
