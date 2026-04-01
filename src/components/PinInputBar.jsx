import { useState, useEffect, useRef } from 'react'
import styles from './PinInputBar.module.css'

/**
 * Slides up from the bottom of the map when a pin is dropped.
 * Props:
 *   pin     – { x, y } percentage coords of the dropped pin
 *   onSave  – (label) => void
 *   onCancel– () => void
 */
export default function PinInputBar({ pin, onSave, onCancel }) {
  const [label, setLabel] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (pin) {
      setLabel('')
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [pin])

  if (!pin) return null

  const handleSave = () => {
    const trimmed = label.trim()
    if (!trimmed) { inputRef.current?.focus(); return }
    onSave(trimmed)
    setLabel('')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className={styles.bar}>
      <div className={styles.top}>
        <div className={styles.pinIcon}>📍</div>
        <div>
          <div className={styles.topLabel}>핀 위치에 이름을 붙여주세요</div>
          <div className={styles.coord}>
            x {pin.x.toFixed(1)}% · y {pin.y.toFixed(1)}%
          </div>
        </div>
      </div>
      <div className={styles.row}>
        <input
          ref={inputRef}
          className={styles.inp}
          type="text"
          placeholder="예 : 성산일출봉, 점심 식당"
          value={label}
          onChange={e => setLabel(e.target.value)}
          onKeyDown={handleKey}
          maxLength={30}
        />
        <button className={styles.btnSave} onClick={handleSave}>✓ 저장</button>
        <button className={styles.btnCancel} onClick={onCancel}>✗</button>
      </div>
    </div>
  )
}
