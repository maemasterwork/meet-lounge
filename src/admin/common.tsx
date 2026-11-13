import { useCallback, useState } from 'react'
import { useI18n } from '../i18n'
import { OrderError } from '../repos'

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif'

/** Runs a dashboard action with a busy flag and a short saved / error message. */
export function useAct() {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const run = useCallback(async <T,>(fn: () => Promise<T>, okText?: string): Promise<T | undefined> => {
    setBusy(true); setMsg(null)
    try {
      const r = await fn()
      setMsg({ ok: true, text: okText ?? t('a2.saved') })
      return r
    } catch (e) {
      const m = e instanceof OrderError && e.code === 'not-allowed' ? 'a2.ownerOnly'
        : e instanceof Error && e.message === 'image-type' ? 'a2.imageType'
        : e instanceof Error && e.message === 'image-too-big' ? 'err.imageTooBig'
        : 'a2.saveFailed'
      setMsg({ ok: false, text: t(m) })
      return undefined
    } finally { setBusy(false) }
  }, [t])
  return { busy, msg, run }
}

export function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  return msg ? <p className={msg.ok ? 'muted sm' : 'err'} role="status" style={{ margin: 0 }}>{msg.text}</p> : null
}

export function Switch({ on, label, onChange, disabled }: { on: boolean; label: string; onChange: (v: boolean) => void; disabled?: boolean }) {
  return <button type="button" className="sw" aria-pressed={on} aria-label={label} title={label} disabled={disabled} onClick={() => onChange(!on)} />
}

/** WCAG contrast ratio of two #rrggbb colors. */
export function contrast(a: string, b: string): number {
  const lum = (h: string) => {
    const v = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
  }
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
