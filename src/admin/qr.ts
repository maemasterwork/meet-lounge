import qrcode from 'qrcode-generator'

/** The address a table's QR code opens: the shop, already set to "at the table" for that table. */
export const tableUrl = (base: string, table: number) => `${base.split(/[?#]/)[0]}?table=${table}#menu`

/** A scalable SVG string for a QR code (error correction M: survives a coffee ring). */
export function qrSvg(text: string): string {
  const q = qrcode(0, 'M')
  q.addData(text)
  q.make()
  return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true })
}

/** The raw module grid (true = dark), used to check codes decode back to the right address. */
export function qrMatrix(text: string): boolean[][] {
  const q = qrcode(0, 'M')
  q.addData(text); q.make()
  const n = q.getModuleCount()
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => q.isDark(r, c)))
}
