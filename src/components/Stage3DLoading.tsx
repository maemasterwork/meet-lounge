import { useI18n } from '../i18n'

export function Stage3DLoading() {
  const { t } = useI18n()
  return (
    <div className="stage3d-loading" role="status" aria-label={t('loading')}>
      <span className="loading-spinner" aria-hidden="true" />
    </div>
  )
}
