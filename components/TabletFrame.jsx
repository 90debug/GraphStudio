'use client'
import { useEffect, useState } from 'react'
import { DeviceContext } from '../lib/DeviceContext'

function detectDevice() {
  if (typeof window === 'undefined') return 'pc'
  const ua = navigator.userAgent
  if (/iPhone|Android.*Mobile|Mobile.*Android|Windows Phone/i.test(ua)) return 'mobile'
  if (/iPad|Android(?!.*Mobile)|Tablet|Kindle|Silk/i.test(ua)) return 'tablet'
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 1
  const w = Math.min(window.screen.width, window.screen.height)
  if (hasTouch && w < 768) return 'mobile'
  if (hasTouch) return 'tablet'
  return 'pc'
}

export default function TabletFrame({ children }) {
  const [device, setDevice] = useState('pc')
  const [ready,  setReady]  = useState(false)

  useEffect(() => {
    setDevice(detectDevice())
    setReady(true)
  }, [])

  if (!ready) return null

  return (
    <DeviceContext.Provider value={device}>
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
        {children}
      </div>
    </DeviceContext.Provider>
  )
}
