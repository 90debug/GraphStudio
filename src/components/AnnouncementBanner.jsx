import { useState } from 'react'
import styles from './AnnouncementBanner.module.css'

export default function AnnouncementBanner({ announcements, onDismiss }) {
  const [idx, setIdx] = useState(0)
  if (!announcements?.length) return null

  const current = announcements[idx]
  if (!current) return null

  return (
    <div className={styles.wrap}>
      <div className={styles.dot} />
      <div className={styles.text}>
        <span className={styles.title}>[공지] {current.title}</span>
        {current.body && <><br />{current.body}</>}
      </div>
      {announcements.length > 1 && (
        <button
          className={styles.next}
          onClick={() => setIdx(i => (i + 1) % announcements.length)}
        >
          {idx + 1}/{announcements.length}
        </button>
      )}
      {onDismiss && (
        <button
          className={styles.close}
          onClick={() => onDismiss(current.id)}
          title="닫기"
        >
          ✕
        </button>
      )}
    </div>
  )
}
