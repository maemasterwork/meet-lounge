import type { Lang } from '../types'

export const locale = (lang: Lang) => (lang === 'fa' ? 'fa-IR' : 'en-US')
/** Numbers in the language's own digits. */
export const num = (lang: Lang, n: number) => Number(n).toLocaleString(locale(lang))
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
