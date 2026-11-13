import { useEffect, useState } from 'react'

/** Registers the service worker in production builds only (a cached shell would confuse `npm run dev`). */
export function registerSW() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { /* offline mode is optional */ }) })
}

interface InstallEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: InstallEvent | null = null
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallEvent; listeners.forEach((f) => f()) })
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach((f) => f()) })
}

/** `canInstall` is true when the browser offered "install"; `install()` shows its prompt. */
export function useInstall() {
  const [, tick] = useState(0)
  useEffect(() => { const f = () => tick((n) => n + 1); listeners.add(f); return () => { listeners.delete(f) } }, [])
  return { canInstall: deferred !== null, install: async () => { const d = deferred; if (!d) return; await d.prompt(); await d.userChoice; deferred = null; listeners.forEach((f) => f()) } }
}
