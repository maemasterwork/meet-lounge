import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { useAuth } from '../lib/auth'
import { Icon } from './icons'

/** Password sign-in and customer registration. Guest registration keeps the same user id and coins. */
export function AuthPanel({ mode, note, onClose }: { mode: 'customer' | 'staff'; note?: string; onClose: () => void }) {
  const { t } = useI18n()
  const a = useAuth()
  const staffMode = mode === 'staff'
  const dialog = useRef<HTMLDialogElement>(null)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const el = dialog.current
    if (el && !el.open) el.showModal()
    return () => { if (el?.open) el.close() }
  }, [])
  const run = async (fn: () => Promise<string | null>, okMsg = '') => {
    setBusy(true); setMsg('')
    const e = await fn()
    setMsg(e ? t('auth.error', { msg: e }) : okMsg)
    setBusy(false)
  }
  if (!a.configured) return null
  return (
    <dialog ref={dialog} className="auth-modal" aria-labelledby="auth-panel-title" onCancel={(e) => { e.preventDefault(); onClose() }}>
      <section className="auth-card">
        <header className="auth-head">
          <div>
            <h2 id="auth-panel-title">{t(staffMode ? 'auth.staffSignIn' : a.email ? 'auth.customerAccount' : 'auth.customerSignIn')}</h2>
            {note && <p className="muted sm">{note}</p>}
          </div>
          <button type="button" className="auth-close" aria-label={t('common.close')} onClick={onClose}><Icon name="x" /></button>
        </header>
        {a.email ? (
          <div className="auth-content">
            <p className="muted sm">{t('auth.signedInAs', { email: a.email })}</p>
            <button type="button" className="btn ghost sm" style={{ justifySelf: 'start' }} onClick={() => void a.signOut()}>{t('auth.signOut')}</button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={(e) => { e.preventDefault(); void run(() => a.signInPassword(email, pw)) }}>
            <label className="field">{t('auth.email')}
              <input type="email" dir="ltr" autoComplete="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="field">{t('auth.password')}
              <input type="password" dir="ltr" autoComplete="current-password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} />
            </label>
            {msg && <p className={msg === t('auth.accountCreated') ? 'muted sm' : 'err'} role="status">{msg}</p>}
            <div className="auth-actions">
              <button type="submit" className="btn sm" disabled={busy || pw.length < 8}>{t('auth.signIn')}</button>
              {!staffMode && <button type="button" className="btn ghost sm" disabled={busy || pw.length < 8 || !email} onClick={() => void run(() => a.signUpPassword(email, pw), t('auth.accountCreated'))}>{t('auth.signUp')}</button>}
            </div>
          </form>
        )}
      </section>
    </dialog>
  )
}
