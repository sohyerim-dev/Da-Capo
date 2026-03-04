# Da Capo

클래식 공연 정보를 탐색하고, 관람 기록을 남기며, 경험을 공유할 수 있는 클래식 공연 중심 플랫폼.

기존 공연 정보 플랫폼이 날짜/지역 중심의 단순 분류에 머물러 있는 한계를 넘어, 작곡가, 출연진, 악기, 작품 형태 등 클래식 팬의 실제 탐색 방식에 맞춘 큐레이션을 제공한다.

---

## 기술 스택

| 영역          | 기술                                 | 버전 |
| ------------- | ------------------------------------ | ---- |
| UI 프레임워크 | React                                | 19   |
| 언어          | TypeScript                           | 5    |
| 라우팅        | React Router                         | 7    |
| 상태 관리     | Zustand                              | 5    |
| 스타일링      | SCSS (BEM)                           | -    |
| 번들러        | Vite                                 | 6    |
| 에디터        | TipTap                               | 3    |
| 백엔드        | Supabase (PostgreSQL, Auth, Storage) | -    |
| AI            | OpenAI GPT-4o                        | -    |
| 외부 API      | KOPIS (한국공연예술통합전산망)       | -    |
| 배포          | Vercel                               | -    |

---

## 주요 기능

### 공연 정보 탐색

- KOPIS API 연동으로 클래식 공연 데이터 자동 수집
- **카테고리 탐색**: 작곡가(시대별), 출연진(개인/단체/해외), 악기, 작품 형태별 분류
- **키워드 검색**: 표기 변형 자동 처리 (예: 베토벤 ↔ 루트비히 판 베토벤 ↔ Ludwig van Beethoven)
- **캘린더 뷰**: 날짜별 공연 일정 확인, 요일 패턴 및 구체적 날짜 파싱
- **필터**: 지역(17개 시도), 날짜 범위, 정렬(공연 임박순/찜 많은 순)

### AI 기반 공연 태깅

- OpenAI GPT-4o를 활용한 자동 태깅 파이프라인
- 작곡가, 출연진, 악기, 시대, 작품 형태 자동 분류 및 키워드 추출
- GPT-4 Vision으로 포스터 이미지 분석
- 웹 기반 검수 인터페이스로 태깅 결과 승인/수정

### 클래식 매거진

- TipTap 리치 텍스트 에디터 기반 콘텐츠 작성
- 카테고리별 분류 (공지, 큐레이터 픽, 클래식 읽기)
- 이미지 업로드 및 YouTube 임베드

### 나의 클래식 노트

- 캘린더 기반 관람 기록 관리
- 관심 공연 찜하기 (북마크)
- 공개/비공개 설정으로 다른 사용자와 공유

### 커뮤니티

- 카테고리별 게시판 (자유, 후기, 정보, 이벤트)
- 공연 연동 후기 작성
- 오늘의 클래식 노트 (다른 사용자의 공개 노트 캐러셀)

---

## 프로젝트 구조

```
src/
├── pages/
│   ├── Home.tsx                     # 홈
│   ├── About.tsx                    # 소개
│   ├── concerts-info/               # 공연 정보
│   │   ├── ConcertInfoList.tsx          # 공연 목록 (검색 + 탐색 + 캘린더)
│   │   ├── ConcertInfoDetail.tsx        # 공연 상세
│   │   ├── ConcertBrowse.tsx            # 탭 기반 카테고리 탐색
│   │   ├── ConcertSearchResults.tsx     # 키워드 검색 결과
│   │   └── ConcertCalendarView.tsx      # 캘린더 뷰
│   ├── Magazine/                    # 매거진 (CRUD)
│   ├── community/                   # 커뮤니티 (CRUD)
│   ├── classic-note/                # 클래식 노트
│   ├── mypage/                      # 마이페이지
│   ├── support/                     # 고객 지원
│   ├── user/                        # 인증 (로그인, 회원가입, 비밀번호)
│   └── admin/                       # 관리자 (공연 등록/수정)
├── components/
│   ├── layout/                      # Header, Footer
│   ├── ui/                          # 홈 섹션, 슬라이더, 라이트박스
│   ├── common/                      # Button, Input, PolicyModal
│   ├── editor/                      # TipTap 에디터 툴바
│   ├── ProtectedRoute.tsx           # 로그인 필수 라우트
│   └── AdminRoute.tsx               # 관리자 전용 라우트
├── zustand/
│   └── userStore.ts                 # 사용자 상태 관리
├── lib/
│   ├── supabase.ts                  # Supabase 클라이언트
│   ├── toHttps.ts                   # HTTP → HTTPS 변환
│   └── getCutoffDot.ts              # 공연 노출 기준 날짜 계산
├── data/
│   └── concertTabData.ts            # 공연 필터링 탭 분류 데이터
├── types/
│   ├── supabase.ts                  # Supabase 자동 생성 타입
│   └── user.ts
├── route.tsx                        # 라우트 정의
└── App.tsx                          # 루트 (인증 상태 감지)

scripts/                             # 데이터 수집 및 AI 태깅 자동화
├── kopis-sync.mjs                   # KOPIS API 공연 정보 동기화
├── tag-concerts.mjs                 # OpenAI 기반 공연 자동 태깅
├── auto-review.mjs                  # GPT-4 Vision 기반 이미지 분석
├── review-viewer.mjs                # 태깅 검수 웹 인터페이스
├── extract-schedule.mjs             # 이미지에서 공연 날짜 추출
├── review-new.mjs                   # 신규 공연 검수
└── review-foreign.mjs               # 해외 연주자/단체 검수
```

---

## 기술적 구현

### 공연 데이터 파이프라인

```
KOPIS API  →  kopis-sync.mjs  →  Supabase DB
                                       ↓
                               tag-concerts.mjs (OpenAI GPT-4o)
                                       ↓
                               review-viewer.mjs (수동 검수)
```

1. **데이터 수집**: KOPIS API에서 클래식(서양음악) 공연 정보를 31일 단위 윈도우로 동기화
2. **AI 태깅**: 공연 정보를 GPT-4o에 전달하여 작곡가, 악기, 시대, 작품 형태, 키워드 자동 분류
3. **이미지 분석**: GPT-4 Vision으로 공연 첨부 이미지를 분석하여 태그 보완 (Sharp로 이미지 정규화)
4. **검수**: 로컬 웹 서버(localhost:3456) 검수 UI에서 카드별 승인/수정, DB에 직접 반영

**GitHub Actions 자동화**: 매일 밤 10시(KST)에 KOPIS 동기화 → AI 태깅 파이프라인이 자동 실행 (`.github/workflows/kopis-sync.yml`). 수동 실행(`workflow_dispatch`)도 지원.

### 공연 탐색 필터링 시스템

`concertTabData.ts`에 정의된 분류 체계로 다단계 탐색:

| 탭         | 분류 방식                         | DB 매칭                                              |
| ---------- | --------------------------------- | ---------------------------------------------------- |
| 작곡가     | 바로크~현대 시대별 70여 명        | `tags` 배열 포함 검사                                |
| 출연진     | 개인/단체/해외, 초성 아코디언     | `title`, `performers`, `tags`, `ai_keywords` OR 검색 |
| 악기       | 피아노, 바이올린, 첼로 등         | `tags` 배열 포함 검사                                |
| 작품 형태  | 관현악, 교향곡, 협주곡, 오페라 등 | `tags` 배열 포함 검사                                |
| 박스오피스 | KOPIS 예매 랭킹                   | `rank` 정렬                                          |

### 검색 표기 변형 처리

`SPELLING_VARIANTS` 맵으로 동일 인물/작품의 다양한 표기를 자동 확장:

```
"베토벤" → ["루트비히 판 베토벤", "Ludwig van Beethoven"]
"차이코프스키" → ["차이콥스키", "Tchaikovsky"]
```

각 검색어를 `title`, `performers`, `synopsis`, `tags`, `ai_keywords`에 대해 OR 조건으로 매칭, 여러 단어 검색 시 단어 간 AND 처리.

### 캘린더 뷰 공연 일정 매칭

날짜 클릭 시 해당 날짜에 공연이 있는지 단계적 판별:

1. `start_date` ~ `end_date` 범위 확인
2. `schedule`에 구체적 날짜(`YYYY년 M월 D일`)가 있으면 해당 날짜만 매칭
3. KOPIS 요일 패턴(월, 화, 수...)이 있으면 해당 요일만 매칭
4. 패턴 없으면 기간 내 모든 날짜를 공연일로 간주

### 공연 노출 기준 날짜

`getCutoffDot()` 유틸 함수로 19시 이후에는 기준 날짜를 내일로 전환, 이미 시작된 당일 공연을 목록에서 제외.

### 인증 및 권한

- **Supabase Auth**: 이메일/비밀번호 인증, 비밀번호 재설정(이메일 링크)
- **Zustand + localStorage**: 로그인 상태 유지 및 자동 로그인
- **ProtectedRoute**: 로그인 필수 보호 (미로그인 시 `/login` 리다이렉트)
- **AdminRoute**: `role === "admin"` 검증 (공연 등록/수정, 매거진 작성)

### 상태 관리

- **전역**: Zustand — 로그인 사용자 정보(`userStore`)만 전역 관리
- **로컬**: 각 컴포넌트 `useState`
- **세션 복원**: `sessionStorage`로 뒤로 가기 시 스크롤 위치, 필터/탭 상태, 선택 날짜 등 복원
- **정렬**: `useMemo`로 클라이언트 사이드 정렬 (서버 재요청 없이 정렬 전환)

### 스타일링

- SCSS + BEM 네이밍, 컴포넌트별 `.scss` 파일 분리
- 반응형: 1200px / 700px / 640px 브레이크포인트
- 웹폰트: IBM Plex Sans KR, tway_sky
- Mixed Content 방지: KOPIS 포스터 HTTP → HTTPS 자동 변환

### SEO

- `react-helmet-async`: 페이지별 동적 메타 태그 (title, description, OG, Twitter Card)
- JSON-LD 구조화 데이터
- Google Analytics 4 연동

---

## 라우팅

```
# 공개
/                           홈
/about                      소개
/concert-info               공연 정보 목록
/concert-info/:id           공연 상세
/magazine                   매거진 목록
/magazine/:id               매거진 상세
/community                  커뮤니티
/community/:id              게시글 상세
/classic-note/:username     다른 사용자 클래식 노트
/support                    고객 지원

# 로그인 필수 (ProtectedRoute)
/mypage                     마이페이지
/classic-note               나의 클래식 노트
/community/new              게시글 작성
/community/:id/edit         게시글 수정

# 관리자 전용 (AdminRoute)
/admin/concert/new          공연 정보 등록
/admin/concert/:id/edit     공연 정보 수정
/magazine/new               매거진 작성
/magazine/:id/edit          매거진 수정
```

---

## 개발 환경

### 환경 변수

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # scripts 전용
SUPABASE_URL=                  # scripts 전용
KOPIS_API_KEY=                 # kopis-sync.mjs
OPENAI_API_KEY=                # tag-concerts.mjs, auto-review.mjs
```

### 명령어

```bash
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드 (tsc + vite build)
npm run preview    # 빌드 결과 미리보기
npm run format     # Prettier 포매팅
```

### 데이터 관리

```bash
# KOPIS 공연 정보 동기화
node --env-file=.env scripts/kopis-sync.mjs

# AI 기반 공연 태깅
node --env-file=.env scripts/tag-concerts.mjs

# 태깅 검수 (localhost:3456)
node --env-file=.env scripts/review-viewer.mjs
```
