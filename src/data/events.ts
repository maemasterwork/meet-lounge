import type { Lang } from '../types'

export type CalKind = 'gregory' | 'persian'
export interface EventKind {
  id: string; icon: string; time: string; hours: number; capacity: number
  title: Record<Lang, string>; desc: Record<Lang, string>; place: Record<Lang, string>
}
export interface CafeEvent extends EventKind { key: string; date: Date }

export const KINDS: Record<string, EventKind> = {
  readers: { id: 'readers', icon: 'book', time: '17:00', hours: 2, capacity: 14, title: { en: "Little Readers' Circle", fa: 'حلقهٔ کتاب‌خوان‌ها' }, desc: { en: 'Bring a page you love, read it aloud, and swap books over tea.', fa: 'صفحه‌ای را که دوست دارید بیاورید، بلند بخوانید و کتاب‌ها را با چای عوض کنید.' }, place: { en: 'The reading nook', fa: 'گوشهٔ کتاب' } },
  acoustic: { id: 'acoustic', icon: 'music', time: '19:00', hours: 2, capacity: 24, title: { en: 'Acoustic Evening', fa: 'شب آکوستیک' }, desc: { en: 'Guitar, soft voices and warm cups. Request a song if you dare.', fa: 'گیتار، صداهای آرام و فنجان‌های گرم. اگر جرأت دارید آهنگ سفارش بدهید.' }, place: { en: 'By the window', fa: 'کنار پنجره' } },
  cake: { id: 'cake', icon: 'cake', time: '18:00', hours: 2, capacity: 10, title: { en: 'Cake Decorating Night', fa: 'شب تزئین کیک' }, desc: { en: 'Pipe, layer and crown your own little cake. Aprons on, sprinkles out.', fa: 'کیک کوچک خودتان را کرم بزنید، لایه کنید و تاج‌گذاری کنید. پیش‌بند بپوشید، خرده‌شکلات‌ها بیرون.' }, place: { en: 'Our pastry kitchen', fa: 'آشپزخانهٔ شیرینی‌پزی' } },
  cupping: { id: 'cupping', icon: 'bean', time: '10:00', hours: 1, capacity: 12, title: { en: 'Coffee Tasting Morning', fa: 'صبح قهوه‌چشی' }, desc: { en: 'Sip three roasts side by side and find the one that tastes like you.', fa: 'سه برشته را کنار هم بچشید و آن را که شبیه شماست پیدا کنید.' }, place: { en: 'The coffee bar', fa: 'بار قهوه' } },
  latte: { id: 'latte', icon: 'cup', time: '16:00', hours: 2, capacity: 8, title: { en: 'Latte Art for Beginners', fa: 'لاته‌آرت برای شروع‌کننده‌ها' }, desc: { en: 'Pour a heart and a leaf on the foam yourself. Spills are encouraged.', fa: 'قلب و برگ را با دست خودتان روی فوم بریزید. ریختن مجاز است.' }, place: { en: 'The coffee bar', fa: 'بار قهوه' } },
  lantern: { id: 'lantern', icon: 'lantern', time: '18:30', hours: 1, capacity: 20, title: { en: 'Lantern Walk & Cocoa', fa: 'پیاده‌روی فانوس و کاکائو' }, desc: { en: 'A slow walk round the block with lanterns, then hot cocoa back at the corner.', fa: 'یک پیاده‌روی آرام دور محله با فانوس و بعد کاکائوی داغ در کورنر.' }, place: { en: 'Meet at the door', fa: 'جلوی در' } },
  watercolour: { id: 'watercolour', icon: 'brush', time: '16:30', hours: 2, capacity: 10, title: { en: 'Watercolour & Tea', fa: 'آبرنگ و چای' }, desc: { en: 'Paint a cup, a window, a cloud. Paper and tea are on us.', fa: 'یک فنجان، یک پنجره، یک ابر بکشید. کاغذ و چای با ما.' }, place: { en: 'The long table', fa: 'میز بلند' } },
  jam: { id: 'jam', icon: 'jar', time: '17:30', hours: 2, capacity: 10, title: { en: 'Jam-Making Class', fa: 'کلاس مربا‌پزی' }, desc: { en: 'Stir, taste and jar your own small-batch jam to take home.', fa: 'مربای خودتان را بپزید، بچشید و در شیشه به خانه ببرید.' }, place: { en: 'Our pastry kitchen', fa: 'آشپزخانهٔ شیرینی‌پزی' } },
}

/** Recurring little gatherings: `${weekday 0=Sun}-${week of the month}` → event kind. */
const RULES: Record<string, string> = {
  '3-1': 'readers', '6-1': 'acoustic', '3-2': 'cake', '6-2': 'cupping', '0-3': 'latte',
  '6-3': 'lantern', '6-4': 'watercolour', '3-4': 'jam', '3-5': 'readers', '6-5': 'acoustic',
}

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const at = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)

export function eventOn(d: Date): CafeEvent | null {
  const kind = RULES[`${d.getDay()}-${Math.ceil(d.getDate() / 7)}`]
  return kind ? { ...KINDS[kind], key: `${kind}-${dayKey(d)}`, date: at(d) } : null
}

/** Seats already taken by other guests: stable per event, never full so the page always has room. */
export function seatsTaken(e: CafeEvent): number {
  let h = 0
  for (const c of e.key) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h % Math.max(1, Math.floor(e.capacity * 0.7))
}
export const seatsLeft = (e: CafeEvent, registered: boolean) => e.capacity - seatsTaken(e) - (registered ? 1 : 0)

export function nextEvent(from: Date, days = 62): CafeEvent | null {
  for (let i = 0; i < days; i++) { const e = eventOn(new Date(from.getFullYear(), from.getMonth(), from.getDate() + i)); if (e) return e }
  return null
}

/* ---- calendar math: Gregorian or Persian (Jalali) month grids ---- */
const partsFmt: Record<CalKind, Intl.DateTimeFormat> = {
  gregory: new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }),
  persian: new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }),
}
export function calParts(d: Date, cal: CalKind): { y: number; m: number; d: number } {
  const p = Object.fromEntries(partsFmt[cal].formatToParts(d).filter((x) => x.type !== 'literal' && x.type !== 'era').map((x) => [x.type, parseInt(x.value, 10)]))
  return { y: p.year, m: p.month, d: p.day }
}
const addDays = (d: Date, k: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + k, 12)

export interface MonthGrid { first: Date; len: number; y: number; m: number; cells: { date: Date; day: number; inMonth: boolean }[] }
export function monthOf(any: Date, cal: CalKind): MonthGrid {
  const p = calParts(any, cal)
  const first = addDays(any, 1 - p.d)
  let len = p.d
  while (calParts(addDays(first, len), cal).m === p.m) len++
  const weekStart = cal === 'persian' ? 6 : 1                          // Saturday for Iran, Monday for the reference
  const lead = (first.getDay() - weekStart + 7) % 7
  const cells = Array.from({ length: 42 }, (_, i) => {
    const date = addDays(first, i - lead), cp = calParts(date, cal)
    return { date, day: cp.d, inMonth: cp.m === p.m && cp.y === p.y }
  })
  return { first, len, y: p.y, m: p.m, cells }
}
export const shiftMonth = (g: MonthGrid, dir: 1 | -1, cal: CalKind) => monthOf(dir === 1 ? addDays(g.first, g.len) : addDays(g.first, -1), cal)
export const weekdayOrder = (cal: CalKind): number[] => (cal === 'persian' ? [6, 0, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 0])
