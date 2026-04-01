import { useState, useEffect } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../firebase'

const DEFAULTS = {
  adminCode:     '0000',
  workshopTitle: '대시보드',
}

export function useConfig() {
  const [config,  setConfig]  = useState(DEFAULTS)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const r = ref(db, 'config')
    let settled = false
    const unsub = onValue(r,
      (snap) => {
        settled = true
        setConfig(snap.exists() ? { ...DEFAULTS, ...snap.val() } : DEFAULTS)
        setLoading(false)
      },
      (error) => {
        settled = true
        console.warn('[useConfig] 기본값 사용:', error.message)
        setLoading(false)
      }
    )
    const timer = setTimeout(() => { if (!settled) setLoading(false) }, 5000)
    return () => { unsub(); clearTimeout(timer) }
  }, [])

  return { config, loading }
}
