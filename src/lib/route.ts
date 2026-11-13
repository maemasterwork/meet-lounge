import { useSyncExternalStore } from 'react'

export const VIEWS = ['home', 'menu', 'shop', 'story', 'gallery', 'events', 'bag', 'me', 'admin'] as const
export type View = (typeof VIEWS)[number]

const read = (): View => {
  const h = window.location.hash.replace(/^#\/?/, '')
  return (VIEWS as readonly string[]).includes(h) ? (h as View) : 'home'
}
const subscribe = (cb: () => void) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb) }

/** Hash routing: works on GitHub Pages with no server rewrites. */
export const useView = (): View => useSyncExternalStore(subscribe, read, () => 'home')
export const go = (v: View) => { if (read() !== v) window.location.hash = v; else window.dispatchEvent(new HashChangeEvent('hashchange')) }
