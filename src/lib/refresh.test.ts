import { describe, expect, it } from 'vitest'
import { createRefresher, type RefreshEnv } from './refresh'

function fakeEnv() {
  const handlers: Record<string, Array<() => void>> = {}
  let ticks: Array<() => void> = []
  const st = { visible: true, online: true, now: 100_000 }
  const env: RefreshEnv = {
    on: (t, type, fn) => { (handlers[`${t}:${type}`] ||= []).push(fn); return () => { handlers[`${t}:${type}`] = handlers[`${t}:${type}`].filter((f) => f !== fn) } },
    visible: () => st.visible, online: () => st.online, now: () => st.now,
    every: (fn) => { ticks.push(fn); return () => { ticks = ticks.filter((f) => f !== fn) } },
  }
  return { env, st, emit: (k: string) => (handlers[k] ?? []).forEach((f) => f()), tick: () => ticks.forEach((f) => f()), listeners: () => ticks.length + Object.values(handlers).flat().length }
}

describe('refresher', () => {
  it('reloads everything on return to the app, focus, regained network and every interval', () => {
    const f = fakeEnv(); const r = createRefresher(f.env); let a = 0, b = 0
    r.add(() => a++); r.add(() => b++)
    f.st.now += 5000; f.emit('document:visibilitychange'); expect([a, b]).toEqual([1, 1])
    f.st.now += 5000; f.emit('window:focus'); expect(a).toBe(2)
    f.st.now += 5000; f.emit('window:online'); expect(a).toBe(3)
    f.st.now += 20_000; f.tick(); expect([a, b]).toEqual([4, 4])
  })
  it('ignores hiding the tab, does nothing offline, and does not fire twice within the minimum gap', () => {
    const f = fakeEnv(); const r = createRefresher(f.env); let a = 0
    r.add(() => a++)
    f.st.visible = false; f.emit('document:visibilitychange'); expect(a).toBe(0)
    f.st.visible = true; f.st.online = false; f.emit('window:focus'); f.tick(); expect(a).toBe(0)
    f.st.online = true; f.emit('window:focus'); f.emit('document:visibilitychange'); f.emit('window:pageshow'); expect(a).toBe(1)
  })
  it('keeps the interval and listeners only while something is registered', () => {
    const f = fakeEnv(); const r = createRefresher(f.env)
    expect(f.listeners()).toBe(0)
    const off1 = r.add(() => {}), off2 = r.add(() => {})
    const n = f.listeners(); expect(n).toBeGreaterThan(0)
    off1(); expect(f.listeners()).toBe(n)
    off2(); expect(f.listeners()).toBe(0)
  })
})
