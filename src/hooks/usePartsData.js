import { useState, useEffect } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../firebase'

export function usePartsData() {
  const [parts,   setParts]   = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const r = ref(db, 'parts')
    let settled = false

    const unsub = onValue(
      r,
      (snap) => {
        settled = true
        setParts(snap.val() ?? {})
        setLoading(false)
      },
      (error) => {
        settled = true
        console.warn('[usePartsData] Firebase 읽기 실패:', error.message)
        setLoading(false)
      }
    )

    // 5초 타임아웃 — DB URL 누락 등으로 응답이 없을 때 지도라도 표시
    const timer = setTimeout(() => {
      if (!settled) {
        console.warn('[usePartsData] 타임아웃 — 빈 지도로 진행')
        setLoading(false)
      }
    }, 5000)

    return () => { unsub(); clearTimeout(timer) }
  }, [])

  return { parts, loading }
}
