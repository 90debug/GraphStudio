# 📊 그래프 탐구 스튜디오

초등 수학 5단원 「여러 가지 그래프」 모둠 활동 협업 플랫폼  
Firebase Firestore 기반 실시간 다기기 동기화

---

## 🚀 배포 방법 (총 소요 시간: 약 20분)

### STEP 1 — Firebase 프로젝트 만들기 (10분)

1. **https://firebase.google.com** 접속 → Google 계정으로 로그인
2. "프로젝트 만들기" 클릭 → 이름 입력 (예: graph-studio) → 생성
3. 좌측 메뉴 빌드 → Firestore Database → "데이터베이스 만들기"
   - 테스트 모드로 시작 선택
   - 위치: asia-northeast3 (Seoul) 선택 → 완료
4. 프로젝트 설정(⚙️) → 내 앱 → 웹 앱 추가(</>) → 앱 등록
   - 표시되는 firebaseConfig 값을 전부 복사해 두세요

---

### STEP 2 — GitHub에 코드 올리기 (5분)

1. https://github.com 로그인 → New repository → 저장소 생성
2. ZIP 해제 후 graph-explorer 폴더 안 파일 전체를 업로드
3. Commit changes 클릭

---

### STEP 3 — Vercel 배포 + 환경 변수 입력 (5분)

1. https://vercel.com → GitHub으로 로그인
2. New Project → 위 저장소 선택 → Import
3. Environment Variables 섹션에 아래 6개 변수 추가

| 변수명 | Firebase 설정의 어느 값? |
|--------|------------------------|
| NEXT_PUBLIC_FIREBASE_API_KEY | apiKey |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | authDomain |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | projectId |
| NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET | storageBucket |
| NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | messagingSenderId |
| NEXT_PUBLIC_FIREBASE_APP_ID | appId |

4. Deploy 클릭 → 1~2분 후 URL 생성!

---

### STEP 4 — Firestore 보안 규칙 (30일 이내 설정 권장)

Firebase 콘솔 → Firestore → 규칙 탭에 붙여넣기:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomId} {
      allow read, write: if true;
      match /posts/{postId} {
        allow read, write: if true;
      }
    }
  }
}
```

---

## 💻 로컬 테스트

```bash
cp .env.local.example .env.local
# .env.local 파일에 Firebase 설정값 입력
npm install
npm run dev
```

---

## 📁 파일 구조

```
graph-explorer/
├── app/
│   ├── layout.jsx
│   ├── globals.css
│   ├── page.jsx            # 입장 화면
│   └── activity/
│       └── page.jsx        # 메인 활동 화면
├── lib/
│   ├── firebase.js         # Firebase 초기화
│   └── firestore.js        # Firestore 헬퍼
├── .env.local.example
├── package.json
└── next.config.mjs
```

---

## 🔧 Firestore 데이터 구조

```
rooms/{code}
  groupName, currentStep, step1, dataTable, chartConfig, createdAt

rooms/{code}/posts/{postId}
  name, step, content, likes, comments, time, createdAt
```
