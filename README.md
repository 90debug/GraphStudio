# 🍊 Jeju Workshop Tracker

파트별 실시간 위치 공유 앱 — Firebase + Vite + Vercel

---

## 빠른 시작

### 1. 의존성 설치

```bash
npm install
```

### 2. Firebase 프로젝트 설정

1. [Firebase 콘솔](https://console.firebase.google.com) → 새 프로젝트 생성
2. **Realtime Database** 생성 (테스트 모드로 시작)
3. **Authentication** → 로그인 방법 → **익명** 활성화
4. 프로젝트 설정 → 웹 앱 등록 → config 값 복사

### 3. 환경변수 설정

```bash
cp .env.example .env
```

`.env`에 Firebase config 값 입력:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 4. Firebase 보안 규칙 적용

Firebase 콘솔 → Realtime Database → 규칙 탭:

```json
{
  "rules": {
    "config": {
      ".read": "auth != null",
      ".write": false
    },
    "parts": {
      ".read": "auth != null",
      "$partKey": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "announcements": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

### 5. 관리자 코드 설정 (Firebase 콘솔에서 직접)

Firebase 콘솔 → Realtime Database → 데이터 탭 → 우측 상단 **+** 버튼:

```
/config
  adminCode:     "원하는코드"      ← 관리자 접속 코드
  workshopTitle: "2025 하반기 본부 워크숍"
```

> config를 추가하지 않으면 기본값 adminCode = `"0000"` 이 사용돼요.

### 6. 로컬 실행

```bash
npm run dev
```

---

## 배포 (Vercel)

```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/your/repo.git
git push -u origin main
```

Vercel에서 Import → Environment Variables에 `.env` 내용 입력 → Deploy

---

## 역할별 기능

| 역할     | 코드 필요 | 기능 |
|----------|-----------|------|
| 팀원     | 없음      | 지도 열람, 공지 확인 |
| 리더     | 없음      | 팀원 기능 + 지도 탭하여 체크인 |
| 관리자   | adminCode | 리더 기능 + 공지 발송, 파트 리셋, 이력 조회 |

**재접속**: 브라우저 localStorage에 저장 → 다음 방문 시 원터치 진입

---

## Firebase 데이터 구조

```
/config
  adminCode:     "0000"
  workshopTitle: "2025 하반기 본부 워크숍"

/parts
  {partKey}:
    partName: "전략기획파트"
    current:
      label:     "성산일출봉"
      x:         52.3
      y:         38.7
      timestamp: 1700000000
      updatedBy: "홍길동"
    history:
      {pushId}: { label, x, y, timestamp, updatedBy }

/announcements
  {pushId}:
    title:     "점심 장소 변경"
    body:      "..."
    createdAt: 1700001000
    active:    true
```
