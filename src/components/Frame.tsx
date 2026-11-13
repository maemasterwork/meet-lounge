import type { ReactNode } from 'react'
import { useI18n } from '../i18n'
import { go } from '../lib/route'
import { Icon } from './icons'
import { SceneArt } from '../art/ItemArt'
import { timeKey } from '../data/catalog'

/** Inner-page frame: title and mini scene on the left, one big card on the right (as on the reference Menu page). */
export function Frame({ title, caps, here, children }: { title: string; caps: string; here?: boolean; children: ReactNode }) {
  const { t } = useI18n()
  return (
    <div className="menuv ltr">
      <div className="ml">
        <button type="button" className="back ltr" onClick={() => go('home')}><Icon name="arrowL" size={16} /><span>{t('nav.back')}</span></button>
        <h1 className="script">{title}</h1>
        <p className="caps">{caps}</p>
        {here && (
          <div className="here"><span>{t('menu.here')}</span>
            <svg viewBox="0 0 44 36" aria-hidden="true"><path d="M6 4 C26 2 38 12 36 28 M36 28 l-7 -7 M36 28 l4 -9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </div>
        )}
        <div className="mini" aria-hidden="true"><SceneArt kind="mini" time={timeKey()} /></div>
      </div>
      <article className="card big">{children}</article>
    </div>
  )
}

export function LoadState({ error, onRetry }: { error: boolean; onRetry: () => void }) {
  const { t } = useI18n()
  return (
    <div className="body" role="status">
      <p className="muted">{error ? t('err.loadFailed') : t('loading')}</p>
      {error && <button type="button" className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={onRetry}>{t('retry')}</button>}
    </div>
  )
}
