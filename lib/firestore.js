import {
  doc, collection, getDoc, setDoc, updateDoc, deleteDoc,
  addDoc, onSnapshot, increment, serverTimestamp,
  arrayUnion, arrayRemove, query, orderBy, getDocs,
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
    ...post, likes: 0, likedBy: [], comments: [], createdAt: serverTimestamp(),
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

export async function addComment1(code, postId, text) {
  await updateDoc(doc(db, 'rooms', code, 'step1Posts', postId), { comments: arrayUnion(text) })
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

export async function addComment4(code, postId, text) {
  await updateDoc(doc(db, 'rooms', code, 'step4Posts', postId), { comments: arrayUnion(text) })
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

// ── Update survey topic when selectedPost changes ─────────────────────────
export async function updateSurveyTopic(code, topic, question, items) {
  try {
    await updateDoc(doc(db, 'surveys', code), { topic, question, items })
  } catch {}
}
