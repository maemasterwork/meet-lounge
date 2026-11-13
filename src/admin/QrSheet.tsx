import { useMemo } from 'react'
import { useI18n } from '../i18n'
import { qrSvg, tableUrl } from './qr'

/** One printable card per table. Printing hides everything else on the page (see admin.css). */
export function QrSheet({ tables }: { tables: number }) {
  const { t, n } = useI18n()
  const base = `${window.location.origin}${window.location.pathname}`
  const cards = useMemo(() => Array.from({ length: Math.min(tables, 200) }, (_, i) => ({ n: i + 1, svg: qrSvg(tableUrl(base, i + 1)) })), [tables, base])
  return (
    <div className="panel qrwrap">
      <div className="row qrhead" style={{ gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>{t('admin.qrSheet')}</h3>
        <button type="button" className="btn sm" style={{ marginInlineStart: 'auto' }} onClick={() => { document.body.classList.add('print-qr'); window.print(); setTimeout(() => document.body.classList.remove('print-qr'), 500) }}>{t('a2.qrPrint')}</button>
      </div>
      <p className="muted sm qrhead" style={{ margin: 0 }}>{t('a2.qrHelp')}</p>
      <div className="qrgrid">
        {cards.map((c) => (
          <figure key={c.n} className="qrcard">
            <div className="qrimg" role="img" aria-label={t('a2.qrTable', { n: n(c.n) })} dangerouslySetInnerHTML={{ __html: c.svg }} />
            <figcaption><b>{t('a2.qrTable', { n: n(c.n) })}</b><br /><span>{t('a2.qrScan')}</span></figcaption>
          </figure>))}
      </div>
    </div>)
}
