// Pure rules for push messages. No Deno or network calls here, so they run under vitest too.
export type Lang = 'fa' | 'en'
export type Audience = 'all' | 'repeat' | 'near_reward'

export interface Msg { title: string; body: string; url: string; tag: string; lang: Lang; dir: 'rtl' | 'ltr' }

const BRAND = { fa: 'میت لانژ', en: 'Meet Lounge' }
const digits = (n: number, lang: Lang) => n.toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-US', { useGrouping: false })

export function offerMessage(o: { id: number; title_fa: string; title_en: string; body_fa: string; body_en: string }, lang: Lang): Msg {
  const fa = lang === 'fa'
  return {
    title: (fa ? o.title_fa : o.title_en || o.title_fa) || BRAND[lang],
    body: (fa ? o.body_fa : o.body_en || o.body_fa) || '',
    url: './#menu', tag: `offer-${o.id}`, lang, dir: fa ? 'rtl' : 'ltr',
  }
}

/** Only the steps a customer cares about while waiting: ready, on the way, done. */
export function orderMessage(status: string, number: number, lang: Lang): Msg | null {
  const n = digits(number, lang)
  const t: Record<string, Record<Lang, [string, string]>> = {
    ready: { fa: [`سفارش ${n} آماده است ☕`, 'می‌توانید تحویل بگیرید.'], en: [`Order ${n} is ready ☕`, 'Come and get it.'] },
    out: { fa: [`سفارش ${n} در راه است 🛵`, 'پیک از کافه راه افتاد.'], en: [`Order ${n} is on the way 🛵`, 'Your courier has left the cafe.'] },
    done: { fa: [`نوش جان! سفارش ${n} تحویل شد`, 'یک سکه به حساب شما اضافه شد.'], en: [`Enjoy! Order ${n} is complete`, 'One coin was added to your balance.'] },
  }
  const m = t[status]?.[lang]
  return m ? { title: m[0], body: m[1], url: './#me', tag: `order-${number}`, lang, dir: lang === 'fa' ? 'rtl' : 'ltr' } : null
}

/** Who an offer is for. `balance` is the customer's coins, `orders` their completed or open orders. */
export function matchesAudience(a: Audience, balance: number, orders: number, rewardEvery: number): boolean {
  if (a === 'repeat') return orders >= 3
  if (a === 'near_reward') { const r = balance % rewardEvery; return r !== 0 && rewardEvery - r <= 2 }
  return true
}

export const asLang = (v: unknown): Lang => (v === 'en' ? 'en' : 'fa')
