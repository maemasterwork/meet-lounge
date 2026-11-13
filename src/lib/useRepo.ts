import { useCallback, useEffect, useRef, useState } from 'react'
import type { Subscribable } from '../repos/types'

export interface RepoState<T> { data: T | null; error: boolean; loading: boolean; reload: () => void }

/** Loads data through a repository call and reloads it whenever any of the given repos notifies a change. */
export function useRepo<T>(load: () => Promise<T>, subs: Subscribable[]): RepoState<T> {
  const [state, setState] = useState<{ data: T | null; error: boolean; loading: boolean }>({ data: null, error: false, loading: true })
  const loadRef = useRef(load)
  loadRef.current = load
  const run = useCallback(() => {
    loadRef.current().then(
      (data) => setState({ data, error: false, loading: false }),
      () => setState((s) => ({ ...s, error: true, loading: false })),
    )
  }, [])
  useEffect(() => {
    run()
    const offs = subs.map((s) => s.subscribe(run))
    return () => offs.forEach((o) => o())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run])
  return { ...state, reload: () => { setState((s) => ({ ...s, loading: true, error: false })); run() } }
}
