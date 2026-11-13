// Node has no localStorage; a tiny in-memory stand-in keeps the zustand persist middleware quiet in tests.
const mem = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, String(v)), removeItem: (k) => void mem.delete(k),
  clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size },
}
