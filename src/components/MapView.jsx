import { useState, useCallback } from 'react'
import { ref, set, push, remove } from 'firebase/database'
import { db } from '../firebase'
import { encodeKey, saveSession, loadSession } from '../utils'
import { usePartsData }     from '../hooks/usePartsData'
import { useAnnouncements } from '../hooks/useAnnouncements'
import JejuMap            from './JejuMap'
import AnnouncementBanner from './AnnouncementBanner'
import PartStatusPanel    from './PartStatusPanel'
import ReviewPopup        from './ReviewPopup'
import styles             from './MapView.module.css'

export default function MapView({ user, onGoAdmin, onLogout, onGoHome }) {
  const { parts, loading }                     = usePartsData()
  const { announcements, dismissAnnouncement } = useAnnouncements()
  const [pendingPin,   setPendingPin]   = useState(null)
  const [reviewSpot,   setReviewSpot]   = useState(null)
  const [mapExpanded,  setMapExpanded]  = useState(false)
  const [saveError,    setSaveError]    = useState('')

  const canPin  = user?.role === 'leader' || user?.role === 'admin'
  const partKey = user?.partName ? encodeKey(user.partName) : null

  /* ── 체크인 ── */
  const handleMapClick = useCallback((x, y) => {
    setSaveError('')
    setPendingPin({ x, y })
  }, [])

  const handlePinSave = useCallback(async (label) => {
    if (!partKey || !pendingPin) return
    const entry = {
      partName: user.partName, label,
      x: pendingPin.x, y: pendingPin.y,
      timestamp: Date.now(), updatedBy: user.name,
    }
    try {
      await set(ref(db,  `parts/${partKey}/partName`), user.partName)
      await set(ref(db,  `parts/${partKey}/current`),  entry)
      await push(ref(db, `parts/${partKey}/history`),  entry)
      const session = loadSession()
      if (session) saveSession({ ...session, lastLabel: label })
      setPendingPin(null)
      setMapExpanded(false)  // 확대 모드에서 저장하면 닫기
    } catch (e) {
      console.error('[핀 저장 오류]', e)
      setSaveError('저장 실패: ' + (e.message ?? '네트워크를 확인해 주세요'))
    }
  }, [partKey, pendingPin, user])

  const handlePinCancel = useCallback(() => {
    setPendingPin(null)
    setSaveError('')
  }, [])

  /* ── 내 핀 삭제 ── */
  const handleDeleteMyPin = useCallback(async () => {
    if (!window.confirm(`${user.partName}의 현재 위치를 삭제할까요?`)) return
    try {
      await set(ref(db,    `parts/${partKey}/current`), null)
      await remove(ref(db, `parts/${partKey}/history`))
    } catch (e) {
      console.error('[핀 삭제 오류]', e)
    }
  }, [partKey, user])

  /* ── 파트 리셋 ── */
  const handleReset = useCallback(async (key) => {
    if (!window.confirm('이 파트의 이동 기록을 초기화할까요?')) return
    try {
      await set(ref(db,    `parts/${key}/current`), null)
      await remove(ref(db, `parts/${key}/history`))
    } catch (e) {
      console.error('[리셋 오류]', e)
    }
  }, [])

  /* ── 마커 클릭 → 후기 팝업 ── */
  const handleMarkerClick = useCallback((partName, label) => {
    if (label) setReviewSpot(label)
  }, [])

  const roleLabel = user?.role === 'leader' ? '기록자'
                  : user?.role === 'admin'  ? '관리자' : '팀원'

  const mapProps = {
    parts, myPartName: user?.partName, canPin,
    pendingPin,
    onMapClick: handleMapClick,
    onPinSave:  handlePinSave,
    onPinCancel: handlePinCancel,
    onMarkerClick: handleMarkerClick,
    onDeleteMyPin: handleDeleteMyPin,
  }

  return (
    <div className="app-shell">
      {/* ── 헤더 ── */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>🗺️ 실시간 위치</div>
        <div className={styles.headerRight}>
          <div className={styles.whoChip}>{roleLabel} · {user?.name}</div>
          {user?.role === 'admin' && (
            <button className={styles.adminBtn} onClick={onGoAdmin}>관리자</button>
          )}
          <button className={styles.homeBtn} onClick={onGoHome} title="홈으로">🏠</button>
        </div>
      </div>

      {/* ── 공지 ── */}
      <AnnouncementBanner
        announcements={announcements}
        onDismiss={user?.role === 'admin' ? dismissAnnouncement : undefined}
      />

      {/* ── 저장 에러 알림 ── */}
      {saveError && (
        <div className={styles.errorBanner}>
          ⚠️ {saveError}
          <button onClick={() => setSaveError('')}>✕</button>
        </div>
      )}

      {/* ── 일반 지도 ── */}
      {loading ? (
        <div className={styles.mapPlaceholder}><div className="spinner" /></div>
      ) : (
        <JejuMap
          {...mapProps}
          onExpand={() => setMapExpanded(true)}
        />
      )}

      {/* ── 파트 현황 ── */}
      <div className={styles.statusWrap}>
        <PartStatusPanel
          parts={parts}
          myPartName={user?.partName}
          canReset={canPin}
          onReset={handleReset}
          onNameClick={(label) => setReviewSpot(label)}
        />
      </div>

      {/* ── 확대 지도 오버레이 ── */}
      {mapExpanded && (
        <div className={styles.expandOverlay}>
          <div className={styles.expandHeader}>
            <span className={styles.expandTitle}>📍 위치 기록</span>
            <span className={styles.expandHint}>기기를 가로로 돌리면 더 편해요</span>
            <button className={styles.expandClose} onClick={() => { setMapExpanded(false); setPendingPin(null) }}>✕</button>
          </div>
          <div className={styles.expandMapWrap}>
            <JejuMap {...mapProps} expanded />
          </div>
        </div>
      )}

      {/* ── 후기 팝업 ── */}
      {reviewSpot && (
        <ReviewPopup
          spotLabel={reviewSpot}
          user={user}
          onClose={() => setReviewSpot(null)}
        />
      )}
    </div>
  )
}
