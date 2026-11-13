import { useSyncExternalStore } from 'react'
import type { MenuItem } from '../types'
import type { TimeKey } from '../data/catalog'

/** Teardown function a renderer may return; called before it is mounted again. */
type Cleanup = void | (() => void)
export type HeroRenderer = (el: HTMLElement, ctx: { time: TimeKey }) => Cleanup
export type ItemRenderer = (el: HTMLElement, item: MenuItem, state: { size: string; milk: number; sugar: number }) => Cleanup

/**
 * Public plug-in points, also available as window.MeetLounge:
 *  - assets.hero = 'data:image/png;base64,...' or a URL        replaces the cafe scene
 *  - assets.items['latte'] = '...'                              replaces one item's picture everywhere (cards, tiles, strip)
 *  - assets.models['latte'] = './models/latte.glb'              a 3D model for one item; shown with orbit controls on its stage
 *  - setHeroRenderer((el, ctx) => ...)                          mount a 3D canvas in the hero slot
 *  - setItemRenderer((el, item, state) => ...)                  mount a 3D/360 viewer on the product stage
 */
export interface MeetLoungeApi {
  assets: { hero: string; items: Record<string, string>; models: Record<string, string> }
  renderers: { hero: HeroRenderer | null; item: ItemRenderer | null }
  setHeroRenderer(fn: HeroRenderer | null): void
  setItemRenderer(fn: ItemRenderer | null): void
  setHero(url: string): void
  setItemImage(id: string, url: string | null): void
  setItemModel(id: string, url: string | null): void
}

let version = 0
const subs = new Set<() => void>()
const bump = () => { version++; subs.forEach((f) => f()) }

export const ml: MeetLoungeApi = {
  assets: { hero: '', items: {}, models: {} },
  renderers: { hero: null, item: null },
  setHeroRenderer(fn) { this.renderers.hero = fn; bump() },
  setItemRenderer(fn) { this.renderers.item = fn; bump() },
  setHero(url) { this.assets.hero = url; bump() },
  setItemModel(id, url) { if (url) this.assets.models[id] = url; else delete this.assets.models[id]; bump() },
  setItemImage(id, url) { if (url) this.assets.items[id] = url; else delete this.assets.items[id]; bump() },
}
declare global { interface Window { MeetLounge: MeetLoungeApi } }
if (typeof window !== 'undefined') window.MeetLounge = ml

/** Re-renders the component whenever an asset or renderer changes. */
export function useMeetLounge(): MeetLoungeApi {
  useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb) } }, () => version)
  return ml
}
