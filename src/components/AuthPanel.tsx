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
  const [registering, setRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [seat, setSeat] = useState('')
  const [phone, setPhone] = useState('')
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
            <h2 id="auth-panel-title">{t(staffMode ? 'auth.staffSignIn' : a.email ? 'auth.customerAccount' : registering ? 'auth.customerRegister' : 'auth.customerSignIn')}</h2>
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
          <form className="auth-form" onSubmit={(e) => {
            e.preventDefault()
            if (registering && !staffMode) {
              void run(() => a.signUpPassword(email.trim().toLowerCase(), pw, {
                fullName: fullName.trim(), seat: seat.trim(), phone: phone.trim(),
              }), t('auth.accountCreated'))
            } else {
              void run(() => a.signInPassword(email.trim(), pw))
            }
          }}>
            {!staffMode && registering && <label className="field">{t('auth.fullName')}
              <input type="text" autoComplete="name" autoFocus maxLength={60} value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>}
            <label className="field">{t(!staffMode && registering ? 'auth.companyEmail' : 'auth.email')}
              <input
                type="email"
                dir="ltr"
                autoComplete="email"
                autoFocus={staffMode || !registering}
                required
                pattern={!staffMode && registering ? '[^@]+@namvaran[.]ir' : undefined}
                title={!staffMode && registering ? t('auth.companyEmailHint') : undefined}
                placeholder={!staffMode && registering ? 'example@namvaran.ir' : undefined}
                value={email}
                onChange={(e) => setEmail(!staffMode && registering ? e.target.value.toLowerCase() : e.target.value)}
              />
            </label>
            {!staffMode && registering && <>
              <label className="field">{t('auth.seat')}
                <input type="text" autoComplete="organization" maxLength={160} placeholder={t('auth.seatHint')} value={seat} onChange={(e) => setSeat(e.target.value)} />
              </label>
              <label className="field">{t('auth.phone')}
                <input type="tel" inputMode="tel" dir="ltr" autoComplete="tel" maxLength={20} pattern="[+]?[0-9 ()\\-]{6,20}" placeholder="09123456789" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
            </>}
            <label className="field">{t('auth.password')}
              <input type="password" dir="ltr" autoComplete={registering ? 'new-password' : 'current-password'} minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} />
            </label>
            {msg && <p className={msg === t('auth.accountCreated') ? 'muted sm' : 'err'} role="status">{msg}</p>}
            <div className="auth-actions">
              <button type="submit" className="btn sm" disabled={busy || pw.length < 8}>{t(registering && !staffMode ? 'auth.signUp' : 'auth.signIn')}</button>
              {!staffMode && (registering
                ? <button type="button" className="btn ghost sm" onClick={() => { setRegistering(false); setMsg('') }}>{t('auth.haveAccount')}</button>
                : <button type="button" className="btn ghost sm" onClick={() => { setRegistering(true); setMsg('') }}>{t('auth.signUp')}</button>)}
            </div>
          </form>
        )}
      </section>
    </dialog>
  )
}
