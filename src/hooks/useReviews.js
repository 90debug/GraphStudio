import { useState, useEffect } from 'react'
import { ref, onValue, push, remove, set } from 'firebase/database'
import { db } from '../firebase'

function toKey(label) {
  return encodeURIComponent(String(label)).replace(/%/g, '_').slice(0, 80)
}

export function useReviews(spotLabel) {
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    if (!spotLabel) { setReviews([]); return }
    const r = ref(db, `reviews/${toKey(spotLabel)}`)
    const unsub = onValue(r, snap => {
      const raw = snap.val() ?? {}
      const arr = Object.entries(raw)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
      setReviews(arr)
    }, err => { console.warn('[useReviews]', err.message); setReviews([]) })
    return unsub
  }, [spotLabel])

  const addReview = ({ spotLabel: sl, partName, author, authorUid, text }) => {
    if (!text?.trim()) return
    push(ref(db, `reviews/${toKey(sl)}`), {
      spotLabel: sl, partName, author, authorUid,
      text: text.trim(), likes: {}, timestamp: Date.now(),
    })
  }

  const deleteReview = (sl, id) => {
    remove(ref(db, `reviews/${toKey(sl)}/${id}`))
  }

  const toggleLike = (sl, id, uid, alreadyLiked) => {
    const likeRef = ref(db, `reviews/${toKey(sl)}/${id}/likes/${uid}`)
    alreadyLiked ? remove(likeRef) : set(likeRef, true)
  }

  return { reviews, addReview, deleteReview, toggleLike }
}
