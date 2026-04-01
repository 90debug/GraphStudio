import { useState, useRef, useEffect } from 'react'
import { useReviews } from '../hooks/useReviews'
import { getPartColor, fmtTime } from '../utils'
import styles from './ReviewPopup.module.css'

export default function ReviewPopup({ spotLabel, user, onClose }) {
  const { reviews, addReview, deleteReview, toggleLike } = useReviews(spotLabel)
  const [text, setText]   = useState('')
  const [sending, setSend] = useState(false)
  const bottomRef         = useRef(null)
  const inputRef          = useRef(null)

  // 새 후기 오면 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [reviews.length])

  const handleSend = async () => {
    if (!text.trim()) return
    setSend(true)
    addReview({
      spotLabel,
      partName:  user.partName,
      author:    user.name,
      authorUid: user.uid,
      text,
    })
    setText('')
    setSend(false)
  }

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }

  return (
    <div className={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.sheet}>
        {/* ── 핸들 + 헤더 ── */}
        <div className={styles.handle} />
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.spotIcon}>📍</span>
            <div>
              <div className={styles.spotName}>{spotLabel}</div>
              <div className={styles.reviewCount}>후기 {reviews.length}개</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ── 후기 목록 ── */}
        <div className={styles.list}>
          {reviews.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>💬</div>
              <div>첫 번째 후기를 남겨보세요</div>
            </div>
          )}
          {reviews.map(rv => {
            const color      = getPartColor(rv.partName)
            const isMe       = rv.authorUid === user.uid
            const likeCount  = rv.likes ? Object.keys(rv.likes).length : 0
            const iLiked     = rv.likes?.[user.uid] === true

            return (
              <div key={rv.id} className={`${styles.card} ${isMe ? styles.cardMe : ''}`}>
                <div className={styles.cardTop}>
                  <span className={styles.partBadge} style={{ background: color + '22', color }}>
                    {rv.partName}
                  </span>
                  <span className={styles.author}>{rv.author}</span>
                  <span className={styles.time}>{fmtTime(rv.timestamp)}</span>
                  {/* 내 글 삭제 */}
                  {isMe && (
                    <button
                      className={styles.delBtn}
                      onClick={() => window.confirm('이 후기를 삭제할까요?') && deleteReview(spotLabel, rv.id)}
                      title="삭제"
                    >
                      🗑
                    </button>
                  )}
                </div>
                <div className={styles.cardText}>{rv.text}</div>
                <div className={styles.cardBottom}>
                  <button
                    className={`${styles.likeBtn} ${iLiked ? styles.likeBtnOn : ''}`}
                    onClick={() => toggleLike(spotLabel, rv.id, user.uid, iLiked)}
                  >
                    {iLiked ? '❤️' : '🤍'} {likeCount > 0 ? likeCount : ''}
                  </button>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* ── 입력창 ── */}
        <div className={styles.inputWrap}>
          <div className={styles.inputRow}>
            <div className={styles.inputAvatar} style={{ background: getPartColor(user.partName) }}>
              {user.name[0]}
            </div>
            <textarea
              ref={inputRef}
              className={styles.textarea}
              placeholder={`${spotLabel} 후기를 남겨보세요...`}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              maxLength={200}
              rows={2}
            />
            <button
              className={styles.sendBtn}
              onClick={handleSend}
              disabled={!text.trim() || sending}
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
