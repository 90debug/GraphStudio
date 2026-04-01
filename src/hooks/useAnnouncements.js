import { useState, useEffect } from 'react'
import { ref, onValue, push, serverTimestamp, update } from 'firebase/database'
import { db } from '../firebase'

/**
 * Returns { announcements, sendAnnouncement, dismissAnnouncement }
 * announcements: array of { id, title, body, createdAt, active }
 */
export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState([])

  useEffect(() => {
    const r = ref(db, 'announcements')
    const unsub = onValue(r, (snap) => {
      const raw = snap.val() ?? {}
      const arr = Object.entries(raw)
        .map(([id, val]) => ({ id, ...val }))
        .filter(a => a.active !== false)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      setAnnouncements(arr)
    })
    return unsub
  }, [])

  const sendAnnouncement = ({ title, body }) => {
    const r = ref(db, 'announcements')
    push(r, { title, body, createdAt: Date.now(), active: true })
  }

  const dismissAnnouncement = (id) => {
    update(ref(db, `announcements/${id}`), { active: false })
  }

  return { announcements, sendAnnouncement, dismissAnnouncement }
}
