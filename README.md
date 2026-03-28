# 오늘 뭐 먹지?

직장 팀이 점심 메뉴를 **제안 → 투표 → 자동 확정**으로 빠르고 공평하게 정하는 서비스.

## 기술 스택

| 영역 | 선택 |
|------|------|
| 프레임워크 | Next.js (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS |
| DB / 인증 | Supabase |

## 주요 기능

- **메뉴 제안** — 라운드가 열리면 팀원이 자유롭게 먹고 싶은 메뉴를 제안
- **1인 1표 투표** — 마감 전까지 후보 메뉴에 투표 (변경 가능)
- **자동 확정** — 마감 시점에 최다 득표 메뉴를 오늘의 메뉴로 자동 결정
- **결과 공유** — 확정된 메뉴를 팀 전체가 동일하게 확인
- **이력 조회** — 최근 확정 메뉴를 이력 페이지에서 확인
- **다크 모드** — 라이트/다크 테마 전환 지원
- **Supabase 인증** — OAuth 기반 로그인/로그아웃

## 페이지 구조

| 경로 | 설명 |
|------|------|
| `/` | 메인 — 현재 라운드 투표 또는 라운드 생성 |
| `/login` | 로그인 |
| `/history` | 최근 확정 메뉴 이력 |
| `/auth/callback` | OAuth 콜백 처리 |

## 프로젝트 구조

```
frontend/
├── app/            # App Router 페이지 및 라우트
│   ├── actions/    # Server Actions (라운드 생성 등)
│   ├── auth/       # OAuth 콜백
│   ├── history/    # 이력 페이지
│   └── login/      # 로그인 페이지 및 액션
├── components/     # UI 컴포넌트 (Header, VotingRound 등)
├── contexts/       # React Context (AppState, Theme)
├── lib/            # Supabase 클라이언트·서버·쿼리, 로거
└── types/          # TypeScript 타입 정의
```

## 시작하기

```bash
npm install
cp .env.local.example .env.local   # Supabase 키 설정
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인.

## Changelog

- **2026-03-28** — 보안 감사(OWASP) 및 성능 감사 수행, Supabase 쿼리 보안 강화, 에러 로깅 구조화(logger), Server Actions 분리, 다크 모드 아이콘 컴포넌트화, AppState Context 개선, next.config 보안 헤더 추가
