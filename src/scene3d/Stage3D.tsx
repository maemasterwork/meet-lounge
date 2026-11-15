import { useEffect, useRef, useState } from 'react'
import { useShop } from '../data/context'
import { useUi } from '../store/ui'
import type { Diorama } from './diorama'
import { createDiorama } from './diorama'

/** True when the product is in its dark look: an explicit choice wins, otherwise the system setting. */
function useDark(): boolean {
  const theme = useUi((s) => s.theme)
  const [sys, setSys] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => setSys(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return theme ? theme === 'dark' : sys
}

/**
 * The 3D cafe as the page background (fixed, behind everything). Day/night follows the product's light/dark look,
 * the season is the owner's setting, the camera view comes from the footer buttons.
 * If WebGL is missing, Data Saver is on, or localStorage `ml-flat` is `1` (debug switch) nothing is added and the flat artwork stays.
 */
export default function Stage3D() {
  const host = useRef<HTMLDivElement>(null)
  const dio = useRef<Diorama | null>(null)
  const dark = useDark()
  const settings = useShop().data?.settings
  const season = settings?.season ?? 'fall'
  const event = settings?.sceneEvent ?? 'none'
  const view = useUi((s) => s.view3d)
  const setReady = useUi((s) => s.setReady3d)
  const setView = useUi((s) => s.setView3d)
  const goals = useRef({ dark, season, event, view })
  goals.current = { dark, season, event, view }

  useEffect(() => {
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
    let flat = false
    try { flat = localStorage.getItem('ml-flat') === '1' } catch { /* storage unavailable */ }
    const d = host.current && !saveData && !flat ? createDiorama(host.current) : null
    if (!d) { setReady(false); return }
    dio.current = d
    d.setNight(goals.current.dark); d.setSeason(goals.current.season); d.setEvent(goals.current.event); d.snap()
    if (goals.current.view && goals.current.view !== 'corner') d.setView(goals.current.view)
    d.onUserMove(() => setView(null))
    document.documentElement.classList.add('has3d')
    setReady(true)
    return () => {
      document.documentElement.classList.remove('has3d')
      setReady(false); dio.current = null; d.dispose()
    }
  }, [setReady, setView])

  useEffect(() => { dio.current?.setNight(dark) }, [dark])
  useEffect(() => { dio.current?.setSeason(season) }, [season])
  useEffect(() => { dio.current?.setEvent(event) }, [event])
  useEffect(() => { if (view) dio.current?.setView(view) }, [view])

  return (
    <div className="stage3d" data-mode={dark ? 'night' : 'day'} data-season={season} aria-hidden="true">
      <div className="sky day" /><div className="sky fall" /><div className="sky winter" /><div className="sky spring" /><div className="sky night" />
      <div className="stage3d-host" ref={host} />
    </div>
  )
}
