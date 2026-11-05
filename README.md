# HOTEL OPERA PMS TRAINING ACADEMY

GRAND ACADEMY HOTEL(가상 5성급, 200실) 객실부 신입사원용 OPERA PMS **실습 시뮬레이터**.
Next.js 15 · React 19 · TypeScript · Tailwind v4 · React Three Fiber · Framer Motion · Zustand.

```bash
npm install
npm run dev        # http://localhost:3000
npx -y tsx scripts/flow-test.ts   # 10개 미션 전체 흐름 헤드리스 테스트
npm run build && npm start
```

## 구현 범위
- OPERA Cloud / OPERA 5 교육 모드 (메뉴·스타일만 구분한 **교육용 재구성 화면** — 공식 화면 아님)
- 예약 생성·수정·취소·조회, 고객 프로필(중복 검증), 체크인·객실 배정(Dirty/OOO/유형 검증), 객실 이동·OOO, Folio·부대요금·가상 결제(카드 거절 시나리오), 체크아웃, 나이트 오딧·ADR/RevPAR 보고서
- 미션 10개(Level 1~5), 단계별 클릭 위치 강조, 단계적 힌트, 4개 항목 자동 채점(40/30/15/15), 수료증, 관리자 대시보드(CSV)
- 3D 호텔: 200실 상태 색상, 층 필터, 객실 클릭/내부 보기, 체크인·체크아웃 애니메이션 (PMS와 같은 store 사용)
- AI 튜터: `ANTHROPIC_API_KEY` 설정 시 LLM, 미설정 시 규칙 기반 도우미 (`.env.example`)

## 한계 (정직한 고지)
- 모든 OPERA 화면/메뉴는 공식 자료로 검증하지 않은 교육용 재구성입니다. 공식 화면 자료가 있으면 `components/opera/Opera.tsx`의 메뉴와 화면에 반영하세요.
- 데이터는 브라우저 localStorage 저장(기기별 독립). Supabase/PostgreSQL, 실제 인증, 여러 기기 학습기록 집계는 미구현.
- 관리자 화면의 ‘가상’ 학습자는 시연용 샘플입니다. 로그인은 비밀번호 없는 데모 방식입니다.
- 체크아웃 취소, 조기 체크인, 객실 유형 업그레이드 승인 등은 미구현(확인되지 않은 조작법을 만들지 않음).
- 객실료는 체크인 시 전 숙박일분을 한꺼번에 Post(실제는 Night Audit에서 일자별 Post).
