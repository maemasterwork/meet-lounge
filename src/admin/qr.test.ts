import { describe, expect, it } from 'vitest'
import jsQR from 'jsqr'
import { qrMatrix, qrSvg, tableUrl } from './qr'

describe('table QR codes', () => {
  it('builds the table address without stale query or hash', () => {
    expect(tableUrl('https://x.github.io/meet-lounge/?table=3#bag', 7)).toBe('https://x.github.io/meet-lounge/?table=7#menu')
  })
  it('renders an SVG', () => { expect(qrSvg('https://a.b/?table=1')).toMatch(/^<svg/) })
  it('decodes back to the same address for every table up to 200', () => {
    for (const t of [1, 9, 12, 99, 200]) {
      const url = tableUrl('https://namvaran.github.io/meet-lounge/', t)
      const m = qrMatrix(url), scale = 6, quiet = 4, size = (m.length + quiet * 2) * scale
      const px = new Uint8ClampedArray(size * size * 4).fill(255)
      m.forEach((row, r) => row.forEach((dark, c) => { if (!dark) return
        for (let y = 0; y < scale; y++) for (let x = 0; x < scale; x++) { const i = (((r + quiet) * scale + y) * size + (c + quiet) * scale + x) * 4; px[i] = px[i + 1] = px[i + 2] = 0 } }))
      expect(jsQR(px, size, size)?.data).toBe(url)
    }
  })
})
