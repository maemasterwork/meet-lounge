import { isConfigured, supabase } from './supabase'

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export const pushSupported = () =>
  isConfigured && Boolean(VAPID) && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

const key = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}
const b64 = (buf: ArrayBuffer | null) => (buf ? btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : '')

export type PushResult = 'ok' | 'denied' | 'unavailable' | 'error'

/** Asks for permission (must be called from a tap), subscribes this browser and registers it for the signed-in user. */
export async function enablePush(): Promise<PushResult> {
  if (!pushSupported()) return 'unavailable'
  try {
    const perm = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
    if (perm !== 'granted') return 'denied'
    const reg = await navigator.serviceWorker.ready
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key(VAPID as string) }))
    const { error } = await supabase().rpc('register_push', { p_endpoint: sub.endpoint, p_p256dh: b64(sub.getKey('p256dh')), p_auth: b64(sub.getKey('auth')) })
    return error ? 'error' : 'ok'
  } catch { return 'error' }
}

export async function disablePush() {
  if (!pushSupported()) return
  try {
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription()
    if (!sub) return
    await supabase().from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  } catch { /* nothing to undo */ }
}
