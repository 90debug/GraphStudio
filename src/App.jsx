import { useState, useEffect, useRef } from 'react'
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import { loadSession, saveSession, clearSession } from './utils'
import EntryScreen    from './components/EntryScreen'
import MapView        from './components/MapView'
import AdminDashboard from './components/AdminDashboard'

export default function App() {
  const [screen, setScreen] = useState('loading')
  const [user,   setUser]   = useState(null)
  const enteredRef = useRef(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        try { await signInAnonymously(auth) }
        catch (e) { console.error('익명 로그인 실패:', e.message); setScreen('entry') }
        return
      }
      if (enteredRef.current) return
      const saved = loadSession()
      if (saved?.name && saved?.partName && saved?.role) {
        setUser({ ...saved, uid: fbUser.uid })
        setScreen('re_entry')
      } else {
        setUser({ uid: fbUser.uid })
        setScreen('entry')
      }
    })
    return unsub
  }, [])

  const handleEnter = (userData) => {
    enteredRef.current = true
    setUser({ ...userData, uid: auth.currentUser?.uid })
    saveSession({ name: userData.name, partName: userData.partName, role: userData.role })
    setScreen(userData.role === 'admin' ? 'admin' : 'map')
  }

  // 홈: 세션 유지하면서 진입 화면으로
  const goHome = () => {
    enteredRef.current = false
    const saved = loadSession()
    if (saved?.name) {
      setUser(prev => ({ ...prev, ...saved }))
      setScreen('re_entry')
    } else {
      setScreen('entry')
    }
  }

  // 로그아웃: 세션 삭제 후 새로 입력
  const handleLogout = () => {
    enteredRef.current = false
    clearSession()
    setUser({ uid: auth.currentUser?.uid })
    setScreen('entry')
  }

  const goAdmin = () => setScreen('admin')
  const goMap   = () => setScreen('map')

  if (screen === 'loading') {
    return (
      <div className="app-shell">
        <div className="spinner-wrap">
          <div className="spinner" />
          <span>연결 중...</span>
        </div>
      </div>
    )
  }

  if (screen === 'entry' || screen === 're_entry') {
    return (
      <EntryScreen
        isReEntry={screen === 're_entry'}
        savedUser={user}
        onEnter={handleEnter}
        onNewEntry={() => { enteredRef.current = false; setScreen('entry') }}
      />
    )
  }

  if (screen === 'admin') {
    return <AdminDashboard user={user} onGoMap={goMap} onLogout={handleLogout} onGoHome={goHome} />
  }

  return <MapView user={user} onGoAdmin={goAdmin} onLogout={handleLogout} onGoHome={goHome} />
}
