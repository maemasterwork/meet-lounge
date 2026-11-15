import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import fa from './fa.json'
import en from './en.json'
import type { Lang } from '../types'
import { num as fmtNum } from '../lib/format'
import { useUi } from '../store/ui'

const dict: Record<Lang, Record<string, string>> = { fa, en }
export type CopyKey = keyof typeof fa

/** Text set in the dashboard (item names, descriptions, brand name) overrides the built-in copy for the same key. */
const overrides: Record<Lang, Record<string, string>> = { fa: {}, en: {} }
export function setCopyOverrides(next: Record<Lang, Record<string, string>>) { overrides.fa = next.fa; overrides.en = next.en }

export interface I18n {
  lang: Lang
  /** Translate a key; {name} placeholders are replaced from vars. Missing keys return the key itself. */
  t: (key: string, vars?: Record<string, string | number>) => string
  /** Digits in the current language. */
  n: (v: number) => string
  /** "135,000 Toman" in the current language. */
  price: (v: number) => string
}

const Ctx = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const lang = useUi((s) => s.lang)
  useEffect(() => {
    const r = document.documentElement
    r.lang = lang
    r.dir = lang === 'fa' ? 'rtl' : 'ltr'
    document.title = lang === 'fa' ? 'میت لانژ | Meet Lounge' : 'Meet Lounge | میت لانژ'
  }, [lang])
  const value = useMemo<I18n>(() => {
    const d = dict[lang]
    const t = (key: string, vars?: Record<string, string | number>) => {
      const raw = overrides[lang][key] || d[key] || dict.en[key] || key
      return vars ? raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : raw
    }
    const n = (v: number) => fmtNum(lang, v)
    return { lang, t, n, price: (v) => `${n(v)} ${t('common.currency')}` }
  }, [lang])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n(): I18n {
  const v = useContext(Ctx)
  if (!v) throw new Error('useI18n outside I18nProvider')
  return v
}
