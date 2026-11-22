import type { MenuItem, SizeOption, Syrup } from '../types'

export const DRINK_SIZES: SizeOption[] = [
  { key: 'small', mult: 1, scale: 0.9 },
  { key: 'medium', mult: 1.15, scale: 1 },
  { key: 'large', mult: 1.3, scale: 1.08 },
]
export const normalizeSizes = (sizes: SizeOption[] | null | undefined): SizeOption[] => {
  const first = sizes?.[0]
  if (sizes?.length === 1 && first && typeof first === 'object' && Object.keys(first).length === 0) return []
  return sizes ?? []
}
const ONE: SizeOption[] = [{ key: 'piece1', mult: 1, scale: 1 }]
const PAIR: SizeOption[] = [{ key: 'piece1', mult: 1, scale: 1 }, { key: 'piece2', mult: 1.9, scale: 1.06 }]

export const MILKS = [
  { key: 'milk.whole', add: 0 },
  { key: 'milk.lactoseFree', add: 5000 },
  // { key: 'milk.oat', add: 20000 },
] as const
export const MAX_SYRUP_PUMPS = 2
export const DEMO_SYRUPS: Syrup[] = [
  { id: 'vanilla', name: { fa: 'وانیل', en: 'Vanilla' }, pricePerPump: 30000, active: true },
  { id: 'caramel', name: { fa: 'کارامل', en: 'Caramel' }, pricePerPump: 30000, active: true },
  { id: 'hazelnut', name: { fa: 'فندق', en: 'Hazelnut' }, pricePerPump: 30000, active: true },
]

export const DELIVERY_FEE = 30000
export const DEFAULT_REWARD_EVERY = 6

type Seed = Omit<MenuItem, 'available' | 'sizes' | 'coinsEarned' | 'rewardCost' | 'stock' | 'syrupOptions'> & { sizes?: SizeOption[] }
const seeds: Seed[] = [
  { id: 'espresso', cat: 'hot', price: 95000, art: 'espresso', milk: false, rewardEligible: false, tags: ['freshRoast', 'singleOrigin'] },
  { id: 'latte', cat: 'hot', price: 135000, art: 'latte', milk: true, rewardEligible: true, tags: ['silkyFoam', 'doubleShot'] },
  { id: 'cappuccino', cat: 'hot', price: 130000, art: 'cappuccino', milk: true, rewardEligible: true, tags: ['firmFoam', 'cocoa'] },
  { id: 'mocha', cat: 'hot', price: 150000, art: 'mocha', milk: true, rewardEligible: false, tags: ['darkChocolate', 'cream'] },
  { id: 'icedlatte', cat: 'cold', price: 145000, art: 'icedlatte', milk: true, rewardEligible: true, tags: ['layered', 'clearIce'] },
  { id: 'iceamer', cat: 'cold', price: 120000, art: 'iceamer', milk: false, rewardEligible: false, tags: ['noMilk', 'light'] },
  { id: 'coldbrew', cat: 'cold', price: 160000, art: 'coldbrew', milk: false, rewardEligible: false, tags: ['brew18', 'orange'] },
  { id: 'shake', cat: 'cold', price: 180000, art: 'shake', milk: false, rewardEligible: false, tags: ['cream', 'chocolatey'] },
  {
    id: 'cheesecake', cat: 'sweet', price: 175000, art: 'cheesecake', milk: false, rewardEligible: true, tags: ['bakedToday', 'freshCream', 'seasonalBerries'],
    sizes: [{ key: 'slice1', mult: 1, scale: 1 }, { key: 'slice2', mult: 1.9, scale: 1.06 }, { key: 'wholeCake', mult: 7, scale: 1.12 }],
  },
  { id: 'croissant', cat: 'sweet', price: 90000, art: 'croissant', milk: false, rewardEligible: true, tags: ['realButter', 'crisp'], sizes: PAIR },
  { id: 'brownie', cat: 'sweet', price: 110000, art: 'brownie', milk: false, rewardEligible: false, tags: ['walnut', 'soft'], sizes: PAIR },
  {
    id: 'cookie', cat: 'sweet', price: 65000, art: 'cookie', milk: false, rewardEligible: false, tags: ['ovenFresh', 'chocChips'],
    sizes: [{ key: 'piece1', mult: 1, scale: 1 }, { key: 'piece3', mult: 2.7, scale: 1.08 }],
  },
  { id: 'g-mug', cat: 'goods', price: 320000, art: 'mug', milk: false, rewardEligible: false, tags: [], sizes: ONE },
  { id: 'g-tote', cat: 'goods', price: 280000, art: 'tote', milk: false, rewardEligible: false, tags: [], sizes: ONE },
  { id: 'g-beans', cat: 'goods', price: 390000, art: 'beans', milk: false, rewardEligible: false, tags: [], sizes: ONE },
  { id: 'g-note', cat: 'goods', price: 150000, art: 'note', milk: false, rewardEligible: false, tags: [], sizes: ONE },
]

export const initialMenu = (): MenuItem[] =>
  seeds.map((s) => ({ ...s, syrupOptions: isDrinkCategory(s.cat), available: true, coinsEarned: 1, rewardCost: DEFAULT_REWARD_EVERY, stock: null, sizes: s.sizes ?? DRINK_SIZES }))

export const isDrinkCategory = (cat: MenuItem['cat']) => cat === 'hot' || cat === 'cold' || cat === 'tea'
export const isDrink = (i: Pick<MenuItem, 'cat'>) => isDrinkCategory(i.cat)

export interface EventInfo { id: string; daysAhead: number; time: string; seats: number }
export const EVENTS: EventInfo[] = [
  { id: 'e1', daysAhead: 2, time: '18:00', seats: 12 },
  { id: 'e2', daysAhead: 5, time: '16:30', seats: 8 },
  { id: 'e3', daysAhead: 9, time: '20:00', seats: 20 },
]
export const EVENT_COPY: Record<string, { fa: [string, string]; en: [string, string] }> = {
  e1: { fa: ['قرار قهوه‌نوشی', 'یک عصر دوستانه با قهوهٔ فیلتر و آشنایی با چند نفر تازه.'], en: ['Coffee meetup', 'A friendly evening with filter coffee and a few new faces.'] },
  e2: { fa: ['کارگاه لاته‌آرت', 'طرح قلب و برگ را با دست خودتان روی فوم بکشید.'], en: ['Latte art workshop', 'Pour a heart and a leaf on the foam yourself.'] },
  e3: { fa: ['شب شعر و قهوه', 'شعر بخوانید یا فقط گوش بدهید، قهوه با ماست.'], en: ['Poetry and coffee night', 'Read a poem or just listen. The coffee is on us.'] },
}
export const REC: Record<string, string[]> = {
  morning: ['latte', 'croissant'], day: ['icedlatte', 'cookie'], evening: ['cappuccino', 'brownie'], night: ['cheesecake', 'mocha'],
}
export type TimeKey = 'morning' | 'day' | 'evening' | 'night'
export function timeKey(d = new Date()): TimeKey {
  const h = d.getHours()
  return h >= 5 && h < 11 ? 'morning' : h >= 11 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'evening' : 'night'
}
