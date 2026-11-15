/**
 * Keeps screens fresh even when the live connection (realtime) is silent: browsers pause it in background tabs and on
 * sleeping phones, and it can drop on a bad network. Every screen that loads data registers a reload function here, and
 * all of them reload together when the app comes back to the front, regains focus or network, and every `intervalMs`
 * while the app is open (background tabs run it more slowly, as browsers allow).
 */
export interface RefreshEnv {
  on(target: 'window' | 'document', type: string, fn: () => void): () => void
  visible(): boolean
  online(): boolean
  now(): number
  every(fn: () => void, ms: number): () => void
}

export function createRefresher(env: RefreshEnv, intervalMs = 20_000, minGapMs = 2_000) {
  const runners = new Set<() => void>()
  let stop: Array<() => void> = []
  let last = -Infinity
  const fire = () => {
    if (!env.online()) return
    const t = env.now()
    if (t - last < minGapMs) return
    last = t
    runners.forEach((f) => f())
  }
  const start = () => {
    stop = [
      env.on('document', 'visibilitychange', () => { if (env.visible()) fire() }),
      env.on('window', 'focus', fire),
      env.on('window', 'online', fire),
      env.on('window', 'pageshow', fire),
      env.every(fire, intervalMs),
    ]
  }
  return {
    /** Registers a reload function; returns the function that removes it. Listeners exist only while something is registered. */
    add(run: () => void) {
      runners.add(run)
      if (runners.size === 1) start()
      return () => { runners.delete(run); if (!runners.size) { stop.forEach((f) => f()); stop = [] } }
    },
    fire,
  }
}

export const browserEnv: RefreshEnv = {
  on: (target, type, fn) => {
    const el: EventTarget = target === 'window' ? window : document
    el.addEventListener(type, fn)
    return () => el.removeEventListener(type, fn)
  },
  visible: () => document.visibilityState === 'visible',
  online: () => navigator.onLine !== false,
  now: () => Date.now(),
  every: (fn, ms) => { const id = window.setInterval(fn, ms); return () => window.clearInterval(id) },
}

export const appRefresher = createRefresher(browserEnv)
