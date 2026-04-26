import {
  doc, collection, getDoc, setDoc, updateDoc, deleteDoc,
  addDoc, onSnapshot, increment, serverTimestamp,
  arrayUnion, arrayRemove, query, orderBy, getDocs, runTransaction,
} from 'firebase/firestore'
import { db } from './firebase'

// ── Room ──────────────────────────────────────────────────────────────────

export async function getOrCreateRoom(code, groupName) {
  const ref = doc(db, 'rooms', code)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      groupName, currentStep: 1, syncLeader: null, selectedPost: null,
      dataTable: [], chartConfig: { type: 'bar', title: '' },
      currentDrawer: null, surveyActive: false,
      canvasSnapshot: null, createdAt: serverTimestamp(),
    })
  }
  return ref
}

export function subscribeRoom(code, cb) {
  return onSnapshot(doc(db, 'rooms', code), snap => {
    if (snap.exists()) cb({ id: snap.id, ...snap.data() })
  })
}

export async function updateRoomStep(code, step) {
  await updateDoc(doc(db, 'rooms', code), { currentStep: step })
}

export async function setSyncLeader(code, name, step) {
  await updateDoc(doc(db, 'rooms', code), { syncLeader: name, currentStep: step })
}

export async function clearSyncLeader(code) {
  await updateDoc(doc(db, 'rooms', code), { syncLeader: null })
}

export async function updateDataTable(code, dataTable) {
  await updateDoc(doc(db, 'rooms', code), { dataTable })
}

export async function updateChartConfig(code, chartConfig) {
  await updateDoc(doc(db, 'rooms', code), { chartConfig })
}

export async function setSelectedPost(code, postData) {
  await updateDoc(doc(db, 'rooms', code), { selectedPost: postData })
}

// ── Canvas snapshot ────────────────────────────────────────────────────────

export async function saveCanvasSnapshot(code, imageData) {
  await updateDoc(doc(db, 'rooms', code), {
    canvasSnapshot: imageData,
    canvasSnapshotAt: serverTimestamp(),
  })
}

export async function loadCanvasSnapshot(code) {
  const snap = await getDoc(doc(db, 'rooms', code))
  return snap.exists() ? (snap.data()?.canvasSnapshot || null) : null
}

// ── Presence ──────────────────────────────────────────────────────────────

function presenceId(name) {
  return (name || '').replace(/[^a-zA-Z0-9가-힣]/g, '_').slice(0, 20) || 'user'
}

export async function updatePresence(code, name) {
  await setDoc(
    doc(db, 'rooms', code, 'presence', presenceId(name)),
    { name, ts: Date.now() }, { merge: true }
  )
}

export function subscribePresence(code, cb) {
  return onSnapshot(collection(db, 'rooms', code, 'presence'), snap => {
    const now = Date.now()
    cb(snap.docs.map(d => d.data()).filter(d => now - d.ts < 90_000))
  })
}

export async function removePresence(code, name) {
  await deleteDoc(doc(db, 'rooms', code, 'presence', presenceId(name)))
}

// ── Step 1 Posts ──────────────────────────────────────────────────────────

export async function addStep1Post(code, post) {
  const ref = await addDoc(collection(db, 'rooms', code, 'step1Posts'), {
    ...post, likes: 0, likedBy: [], comments: [], createdAt: Date.now(),
  })
  return ref.id
}

export function subscribeStep1Posts(code, cb) {
  const q = query(collection(db, 'rooms', code, 'step1Posts'), orderBy('createdAt', 'asc'))
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export async function toggleLike1(code, postId, userName, nowLiking) {
  const ref = doc(db, 'rooms', code, 'step1Posts', postId)
  if (nowLiking) {
    await updateDoc(ref, { likes: increment(1), likedBy: arrayUnion(userName) })
  } else {
    await updateDoc(ref, { likes: increment(-1), likedBy: arrayRemove(userName) })
  }
}

export async function addComment1(code, postId, comment) {
  // comment: { author, text } - _id 추가로 삭제 시 정확한 매칭 보장
  const stored = (typeof comment === 'object' && comment !== null)
    ? { _id: Math.random().toString(36).slice(2) + Date.now().toString(36), ...comment }
    : comment
  await updateDoc(doc(db, 'rooms', code, 'step1Posts', postId), { comments: arrayUnion(stored) })
}

export async function deleteComment1(code, postId, comment) {
  // arrayRemove: 읽기 권한 불필요, 쓰기 권한만으로 동작
  // comment는 onSnapshot에서 온 객체이므로 저장된 값과 완전 일치 보장
  const ref = doc(db, 'rooms', code, 'step1Posts', postId)
  await updateDoc(ref, { comments: arrayRemove(comment) })
}

export async function deleteStep1Post(code, postId) {
  await deleteDoc(doc(db, 'rooms', code, 'step1Posts', postId))
}

// ── Selection voting ───────────────────────────────────────────────────────

export async function setSelectionVote(code, voteData) {
  // voteData: { postId, postData, requestedBy, voters:[...], agreed:[...] } | null
  await updateDoc(doc(db, 'rooms', code), { selectionVote: voteData })
}

export async function agreeSelectionVote(code, name) {
  await updateDoc(doc(db, 'rooms', code), { 'selectionVote.agreed': arrayUnion(name) })
}

// ── Step 4 Posts ──────────────────────────────────────────────────────────

export async function addStep4Post(code, post) {
  const ref = await addDoc(collection(db, 'rooms', code, 'step4Posts'), {
    ...post, likes: 0, likedBy: [], comments: [], createdAt: serverTimestamp(),
  })
  return ref.id
}

export function subscribeStep4Posts(code, cb) {
  const q = query(collection(db, 'rooms', code, 'step4Posts'), orderBy('createdAt', 'asc'))
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export async function toggleLike4(code, postId, userName, nowLiking) {
  const ref = doc(db, 'rooms', code, 'step4Posts', postId)
  if (nowLiking) {
    await updateDoc(ref, { likes: increment(1), likedBy: arrayUnion(userName) })
  } else {
    await updateDoc(ref, { likes: increment(-1), likedBy: arrayRemove(userName) })
  }
}

export async function addComment4(code, postId, comment) {
  const stored = (typeof comment === 'object' && comment !== null)
    ? { _id: Math.random().toString(36).slice(2) + Date.now().toString(36), ...comment }
    : comment
  await updateDoc(doc(db, 'rooms', code, 'step4Posts', postId), { comments: arrayUnion(stored) })
}

export async function deleteComment4(code, postId, comment) {
  const ref = doc(db, 'rooms', code, 'step4Posts', postId)
  await updateDoc(ref, { comments: arrayRemove(comment) })
}

export async function deleteStep4Post(code, postId) {
  await deleteDoc(doc(db, 'rooms', code, 'step4Posts', postId))
}

// ── Survey ────────────────────────────────────────────────────────────────

export async function createSurvey(code, surveyData) {
  await setDoc(doc(db, 'surveys', code), { ...surveyData, active: true, createdAt: serverTimestamp() })
  await updateDoc(doc(db, 'rooms', code), { surveyActive: true })
}

export async function getSurvey(code) {
  const snap = await getDoc(doc(db, 'surveys', code))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export function subscribeSurvey(code, cb) {
  return onSnapshot(doc(db, 'surveys', code), snap => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  })
}

export function subscribeSurveyResponses(code, cb) {
  const q = query(collection(db, 'surveys', code, 'responses'), orderBy('createdAt', 'asc'))
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export async function addSurveyResponse(code, responderName, selectedItem) {
  await addDoc(collection(db, 'surveys', code, 'responses'), {
    responderName, selectedItem, createdAt: serverTimestamp(),
  })
}

// ── Drawing ───────────────────────────────────────────────────────────────

export async function addStroke(code, stroke) {
  await addDoc(collection(db, 'rooms', code, 'strokes'), {
    ...stroke, createdAt: serverTimestamp(),
  })
}

export function subscribeStrokes(code, cb) {
  const q = query(collection(db, 'rooms', code, 'strokes'), orderBy('createdAt', 'asc'))
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export async function deleteMyStrokes(code, userName) {
  const snap = await getDocs(collection(db, 'rooms', code, 'strokes'))
  const mine = snap.docs.filter(d => d.data().drawer === userName)
  await Promise.all(mine.map(d => deleteDoc(d.ref)))
}

export async function clearStrokes(code) {
  const snap = await getDocs(collection(db, 'rooms', code, 'strokes'))
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
}

export async function setCurrentDrawer(code, name) {
  await updateDoc(doc(db, 'rooms', code), { currentDrawer: name || null })
}

// ── Generic room meta update ───────────────────────────────────────────────
export async function updateRoomMeta(code, fields) {
  await updateDoc(doc(db, 'rooms', code), fields)
}

// ── Live preview (자/컴퍼스 실시간 공유) ──────────────────────────────────
// preview: { type:'ruler'|'compass', drawer, color, width, p1, p2 } | null
export async function setLivePreview(code, preview) {
  await updateDoc(doc(db, 'rooms', code), { livePreview: preview })
}

// ── Update survey topic when selectedPost changes ─────────────────────────
export async function updateSurveyTopic(code, topic, question, items) {
  try {
    await updateDoc(doc(db, 'surveys', code), { topic, question, items })
  } catch {}
}

// ── Reset survey: delete all responses and the survey doc ─────────────────
export async function resetSurvey(code) {
  try {
    const respSnap = await getDocs(collection(db, 'surveys', code, 'responses'))
    await Promise.all(respSnap.docs.map(d => deleteDoc(d.ref)))
    await deleteDoc(doc(db, 'surveys', code))
  } catch {}
}

// ── Cursor positions (실시간 커서 공유) ────────────────────────────────────
const _sanitize = (name) => (name || '').replace(/[^a-zA-Z0-9가-힣]/g, '_').slice(0, 20) || 'user'

export async function updateCursorPos(code, userName, pos) {
  // pos: { x, y } (canvas 좌표, 800x480 기준) 또는 null (제거)
  const key = 'cursors.' + _sanitize(userName)
  const value = pos ? { x: pos.x, y: pos.y, n: userName } : null
  try { await updateDoc(doc(db, 'rooms', code), { [key]: value }) } catch {}
}

// ── Sessions ──────────────────────────────────────────────────────────────

function genCode() {
  return Array.from({ length: 6 }, () =>
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
  ).join('')
}

async function uniqueSessionCode() {
  for (let i = 0; i < 10; i++) {
    const code = genCode()
    const snap = await getDoc(doc(db, 'sessions', code))
    if (!snap.exists()) return code
  }
  throw new Error('세션 코드 생성 실패')
}

async function uniqueRoomCodeInSession(sessionCode) {
  for (let i = 0; i < 10; i++) {
    const code = genCode()
    // Check for room with this code AND sessionCode
    const snap = await getDoc(doc(db, 'rooms', code))
    if (!snap.exists()) return code
  }
  throw new Error('모둠 코드 생성 실패')
}

export async function createSession({ teacherName = '', school = '', grade = '', classNum = '' }) {
  const sessionCode = await uniqueSessionCode()
  await setDoc(doc(db, 'sessions', sessionCode), {
    sessionCode,
    teacherName,
    school,
    grade,
    classNum,
    createdAt: serverTimestamp(),
    active: true,
  })
  return sessionCode
}

export async function getSession(sessionCode) {
  const snap = await getDoc(doc(db, 'sessions', sessionCode))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export function subscribeSession(sessionCode, cb) {
  return onSnapshot(doc(db, 'sessions', sessionCode), snap => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  })
}

export async function closeSession(sessionCode) {
  await updateDoc(doc(db, 'sessions', sessionCode), { active: false })
}

export function subscribeSessionRooms(sessionCode, cb) {
  const q = query(collection(db, 'rooms'), orderBy('createdAt', 'asc'))
  return onSnapshot(q, snap => {
    const rooms = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(r => r.sessionCode === sessionCode)
    cb(rooms)
  })
}

export async function resetRoomData(code) {
  // 하위 컬렉션 삭제
  const subs = ['step1Posts', 'step4Posts', 'strokes', 'presence']
  for (const sub of subs) {
    const snap = await getDocs(collection(db, 'rooms', code, sub))
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
  }
  // surveys 삭제
  try {
    const respSnap = await getDocs(collection(db, 'surveys', code, 'responses'))
    await Promise.all(respSnap.docs.map(d => deleteDoc(d.ref)))
    await deleteDoc(doc(db, 'surveys', code))
  } catch {}
  // room 필드 초기화
  await updateDoc(doc(db, 'rooms', code), {
    currentStep: 1,
    syncLeader: null,
    selectedPost: null,
    dataTable: [],
    chartConfig: { type: 'bar', title: '' },
    currentDrawer: null,
    surveyActive: false,
    canvasSnapshot: null,
    selectionVote: null,
    step4State: null,
    livePreview: null,
  })
}

export async function resetAllRoomsInSession(sessionCode) {
  const q = query(collection(db, 'rooms'), orderBy('createdAt', 'asc'))
  const snap = await getDocs(q)
  const rooms = snap.docs.filter(d => d.data().sessionCode === sessionCode)
  await Promise.all(rooms.map(d => resetRoomData(d.id)))
}

export async function createRoomInSession(sessionCode, teamName, leaderName) {
  // 세션 유효성 확인
  const session = await getSession(sessionCode)
  if (!session) throw new Error('존재하지 않는 세션 코드입니다')
  if (!session.active) throw new Error('종료된 세션입니다')

  const code = await uniqueRoomCodeInSession(sessionCode)
  await setDoc(doc(db, 'rooms', code), {
    groupName: teamName,
    teamName,
    sessionCode,
    currentStep: 1,
    syncLeader: null,
    selectedPost: null,
    dataTable: [],
    chartConfig: { type: 'bar', title: '' },
    currentDrawer: null,
    surveyActive: false,
    canvasSnapshot: null,
    createdAt: serverTimestamp(),
  })
  return code
}
