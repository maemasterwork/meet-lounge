import { useState } from 'react'
import { useI18n } from '../i18n'
import { useAuth } from '../lib/auth'

/** Email + password, or a magic link. A guest who creates an account keeps their coins (same user id). */
export function AuthPanel({ note }: { note?: string }) {
  const { t } = useI18n()
  const a = useAuth()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => Promise<string | null>, okMsg = '') => {
    setBusy(true); setMsg('')
    const e = await fn()
    setMsg(e ? t('auth.error', { msg: e }) : okMsg)
    setBusy(false)
  }
  if (!a.configured) return null
  if (a.email) return (
    <div className="list">
      <p className="muted sm">{t('auth.signedInAs', { email: a.email })}</p>
      <button type="button" className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => void a.signOut()}>{t('auth.signOut')}</button>
    </div>)
  return (
    <form className="list" onSubmit={(e) => { e.preventDefault(); void run(() => a.signInPassword(email, pw)) }}>
      {note && <p className="muted sm" style={{ margin: 0 }}>{note}</p>}
      <label className="field">{t('auth.email')}
        <input type="email" dir="ltr" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="field">{t('auth.password')}
        <input type="password" dir="ltr" autoComplete="current-password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} />
      </label>
      {msg && <p className={msg === t('auth.magicSent') ? 'muted sm' : 'err'} role="status">{msg}</p>}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {!a.isGuest && <button type="submit" className="btn sm" disabled={busy || pw.length < 8}>{t('auth.signIn')}</button>}
        <button type="button" className="btn ghost sm" disabled={busy || pw.length < 8 || !email} onClick={() => void run(() => a.signUpPassword(email, pw), t('auth.magicSent'))}>{t('auth.signUp')}</button>
        <button type="button" className="btn ghost sm" disabled={busy || !email} onClick={() => void run(() => a.sendMagicLink(email), t('auth.magicSent'))}>{t('auth.magic')}</button>
      </div>
    </form>)
}
