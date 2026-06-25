# PlanB 업그레이드 플랜 v1.0

**작성일**: 2026-06-24  
**리서치 기반**: Linear, Notion, Height, Jira Rovo, ClickUp Brain, Framer Motion 2025-2026 트렌드  
**범위**: 현재 구현 대비 10% 아쉬운 부분 → 업계 최고 수준 UI/기능으로 업그레이드

---

## 현재 상태 진단

| 영역 | 현재 수준 | 부족한 점 |
|------|----------|----------|
| 대시보드 | MyTasks + 오늘이벤트 + Sprint 위젯 | 활동 히트맵, 프로젝트 헬스 RAG, 팀 워크로드 없음 |
| 태스크 리스트 | Epic/Task/Subtask 트리 | 인라인 편집, 벌크 액션, 플로팅 툴바 없음 |
| 칸반 | 컬럼 드래그 카드 기본 | WIP 제한, 스윔레인, 사이클 타임 표시 없음 |
| 타임라인 | Gantt 바 + 캘린더/플래너 통합 | 의존성 화살표, 줌 컨트롤, 용량 오버레이 없음 |
| 스프린트 | 번다운 차트 1개 | 속도 트렌드, CFD, 처리량 차트 없음 |
| 알림 | 기본 드롭다운 | Linear 스타일 해결형 인박스 없음 |
| CommandPalette | 존재하나 제한적 | 퍼지 검색, 액션 체이닝, 단축키 오버레이 없음 |
| 애니메이션 | CSS transition만 | Framer Motion 없음, 스켈레톤 없음, 숫자 카운트업 없음 |
| AI 기능 | 없음 | NL 태스크 생성, 자동 분해, 주간 요약 없음 |
| 캘린더 | FullCalendar v6 기본 | 이벤트→태스크 변환, 반복 일정 없음 |

---

## 업그레이드 Phase 계획

### Phase U1 — 대시보드 파워업 (P0, 약 4시간)

**목표**: "지금 뭘 해야 하는지" + "팀/프로젝트 상태"를 한눈에 보여주는 컨트롤 타워

#### U1-1: Today Focus Hero Card
```
┌──────────────────────────────────────────┐
│  🎯 오늘의 집중                           │
│  ████████████░░░░ 3/5 완료 (60%)          │
│                                          │
│  ┌ 가장 중요한 태스크 (히어로 카드) ────┐  │
│  │  API 인증 버그 수정   🔴 긴급  D-0  │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```
- 오늘 마감 중 최우선 1개를 히어로 카드로 강조
- 진행률 바 spring 애니메이션

#### U1-2: 프로젝트 헬스 RAG 위젯
```
● 양호   ⚠ 주의   🔴 위험

Frontend v2.0   ████████░░  80%  ● 양호
Backend API     ████░░░░░░  40%  ⚠ 지연 3건
Research Paper  ██░░░░░░░░  20%  🔴 마감 D-2
```
- 완료율 + 지연 태스크 수 + 마감 임박 여부로 자동 계산
- RAG 분류 로직: 완료율 <30% OR 지연 >2건 = RED

#### U1-3: 활동 히트맵 (GitHub 스타일)
```
월 ░░▒░░░▒▒▒░░▒▒▒▓▓▒░░▒▒▒░░░▒▒▒░░░░▒▒▒░░░▒▒▒░░
화 ░░░░▒▒▒░░░▒▒▒░░░░▓▓▒░░░▒▒░░░░▒░░░░░▒▒▒░░░░░
수 ▒▒▒░░░░░▒▒░░░▒▒▒▒░░░▒▒░░▒▒▒░░░░░░▒▒▒░░░░▒▒░░
   1월        2월        3월        4월
```
- 최근 12주 태스크 완료 밀도 시각화
- 셀 hover → "5월 12일: 5개 완료" 툴팁

#### U1-4: 팀 워크로드 게이지
```
김지호  ████████░░  8태스크   ⚠ 거의 가득
이수진  ████░░░░░░  4태스크   ✓ 여유
박준혁  ██████████  10태스크  🔴 초과
```
- 미완료 태스크 수 기준 WIP 계산
- 임계값(기본 8) 초과 시 경고 색상

#### U1-5: 스프린트 속도 트렌드
- 최근 5스프린트 속도 바 차트 + 3스프린트 평균선
- "지난 스프린트 대비 +12%" 델타 배지
- Recharts CartesianGrid: stroke rgba(255,255,255,0.06) 적용

**수정 파일**: `DashboardPage.jsx`

---

### Phase U2 — 태스크 리스트 UX 혁신 (P0, 약 3시간)

#### U2-1: 인라인 편집
- 태스크 제목 더블클릭 → 즉시 `<input>` 전환, blur 시 PATCH 저장
- 상태/우선순위 셀 클릭 → `<select>` in-place 드롭다운

#### U2-2: 멀티셀렉트 + 플로팅 툴바
```
체크박스 hover 시 표시 → 3개 선택 →

┌ 하단 플로팅 바 ─────────────────────────────────┐
│ ✓ 3개 선택됨  │ 상태 ▾ │ 우선순위 ▾ │ 담당자 ▾ │ 🗑 삭제 │
└─────────────────────────────────────────────────┘
```
- `position: fixed` 하단 중앙 고정
- 선택 해제 시 사라짐

#### U2-3: Drag-and-Drop 개선
- 드래그 중 ghost 카드 프리뷰 (반투명 원본)
- 드롭 가능 영역 파란 하이라이트 라인
- 리스트 ↔ 칸반 간 태스크 이동 지원

**수정 파일**: `ProjectPage.jsx`, `TaskRow` 컴포넌트

---

### Phase U3 — 타임라인 Gantt 업그레이드 (P1, 약 4시간)

#### U3-1: 인터랙티브 줌 컨트롤
```
상단 토글: [일 뷰] [주 뷰] [월 뷰] [분기 뷰]

일 뷰:   DAY_PX = 28  (현재)
주 뷰:   DAY_PX = 8
월 뷰:   DAY_PX = 3
분기 뷰: DAY_PX = 1
```
- 스크롤 휠로도 줌 인/아웃
- 줌 변경 시 오늘 날짜 중심으로 리포커스

#### U3-2: 의존성 화살표 (SVG 오버레이)
- 기존 `blocks/blocked_by` relation 데이터 → SVG 곡선 화살표
- Task A 끝점 → Task B 시작점으로 베지어 곡선
- hover 시 화살표 하이라이트

#### U3-3: 용량 오버레이 행
- 각 사람(담당자)별 별도 행: 어느 날 몇 개 태스크 겹치는지 밀도 바
- 초과 구간 빨간색 표시

**수정 파일**: `TimelineView.jsx`

---

### Phase U4 — 칸반 보드 업그레이드 (P1, 약 3시간)

#### U4-1: WIP 제한 표시
```
[ 진행 중  4 / 5 ]   ← 한도 초과 시 → [ 진행 중  6 / 5 🔴 ]
```
- 컬럼 헤더에 현재수/한도 표시
- 한도 초과 시 컬럼 헤더 빨간색 + 경고

#### U4-2: 스윔레인 (그룹 기준 선택)
```
그룹 기준: [없음] [담당자] [Epic] [우선순위]

── 담당자: 김지호 ──────────────────────────────
  [Todo]     [진행 중]    [완료]
  ...        ...          ...

── 담당자: 이수진 ──────────────────────────────
  [Todo]     [진행 중]    [완료]
```

#### U4-3: 카드 미니 메타데이터
```
┌─────────────────────────────┐
│ API 인증 버그 수정            │
│ 🔴 긴급                      │
├─────────────────────────────┤
│ 💬 3  📎 2  ✓ 2/5  D-2일   │
└─────────────────────────────┘
```
- 댓글 수, 첨부 수, 서브태스크 완료율, 마감 표시

**수정 파일**: `KanbanBoard.jsx`, `KanbanColumn.jsx`, `KanbanCard.jsx`

---

### Phase U5 — 알림 인박스 (Linear 스타일) (P1, 약 2시간)

#### U5-1: 해결형 인박스
```
┌ 알림 ─────────────────────────────────────────────┐
│ ● 멘션  [API 버그] @김지호 님이 멘션했습니다   [완료] [나중에] │
│ ● 할당  [sprint-3] 새 태스크가 할당됨           [열기]  [완료] │
│ ○ 활동  [Frontend] 이수진 님이 코멘트 추가       [열기]        │
│ ○ 만료  [주간리뷰] 이번 주 회고 미완성          [바로 작성]    │
└───────────────────────────────────────────────────┘
```

#### U5-2: 3-티어 알림 분류
- **긴급 (Mention/Assigned)**: 즉시 액션 필요
- **정보 (Activity)**: 내가 관련된 변경
- **FYI (Watching)**: 팔로우 중인 항목 업데이트

**수정 파일**: `NotificationCenter.jsx`

---

### Phase U6 — Command Palette 강화 (P1, 약 2시간)

#### U6-1: 퍼지 검색 + 범주 분리 (fuse.js 활용)
```
⌘K  무엇이든 검색 또는 실행...

최근 항목 ───────────────────────
  📋 API 인증 버그 수정          → 열기
  📁 Frontend v2.0              → 프로젝트

검색 결과 ───────────────────────
  태스크 (3)   이벤트 (1)   프로젝트 (2)
```

#### U6-2: 액션 체이닝 (마우스 없이)
```
"새 태스크" 선택 →
  제목: [___________________]
  프로젝트: [Frontend v2.0 ▾]
  우선순위: [긴급 ▾]
  → Enter 로 생성
```

#### U6-3: 단축키 오버레이 (`?` 키)
```
┌ 키보드 단축키 ──────────────────────────┐
│ 전역                    뷰 전환          │
│ ⌘K   커맨드 팔레트     G+D  대시보드    │
│ ⌘/   검색             G+C  캘린더      │
│ N    새 태스크         G+P  플래너      │
│                                        │
│ 태스크 리스트          칸반             │
│ E    인라인 편집        ←→  컬럼 이동   │
│ Space 완료 토글        C    새 카드     │
└────────────────────────────────────────┘
```

**수정 파일**: `CommandPalette.jsx`, `useCommandPalette.js`

---

### Phase U7 — 애니메이션 & 마이크로인터랙션 (P2, 약 3시간)

**패키지 추가**: `npm install framer-motion`

#### U7-1: 스켈레톤 로딩 (현재: 스피너 → 업그레이드: 컨텐츠 형태 스켈레톤)
```jsx
// 신규 components/ui/Skeleton.jsx
function Skeleton({ width, height, rounded }) {
  return (
    <div style={{
      width, height,
      background: 'linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-hover) 50%, var(--bg-elevated) 75%)',
      backgroundSize: '200%',
      animation: 'skeleton-sweep 1.5s infinite',
      borderRadius: rounded ? 'var(--r-full)' : 'var(--r-md)'
    }} />
  )
}
```

#### U7-2: 숫자 카운트업 (대시보드 StatCard)
```jsx
// hooks/useCountUp.js
export function useCountUp(target, duration = 1000) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const tick = () => {
      const progress = Math.min((Date.now() - start) / duration, 1)
      setValue(Math.round(target * easeOut(progress)))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target])
  return value
}
```

#### U7-3: 리스트 스태거 진입
```jsx
// 프로젝트 카드 그리드, 태스크 목록에 적용
const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.18 } } }
```

#### U7-4: 완료 체크 Spring 애니메이션
- 태스크 완료 시 체크마크 scale 0→1 spring
- 텍스트 strikethrough 슬라이드 인

**신규 파일**: `hooks/useCountUp.js`, `components/ui/Skeleton.jsx`

---

### Phase U8 — AI 어시스턴트 기능 (P2, 약 6시간)

**백엔드**: Claude Haiku API 연동 (`pip install anthropic`)

#### U8-1: 자연어 태스크 생성 (CommandPalette 내)
```
사용자: "내일까지 API 문서 작성 해야해"

→ AI 파싱:
  { title: "API 문서 작성", due_date: "2026-06-25", priority: "medium" }

→ 확인 카드:
  ┌──────────────────────────────────┐
  │ 📋 API 문서 작성                 │
  │ 마감: 내일  우선순위: 보통        │
  │ 프로젝트: [선택 ▾]               │
  │  [생성]  [수정]  [취소]          │
  └──────────────────────────────────┘
```

#### U8-2: Epic AI 분해 (TaskDrawer 내)
```
"AI로 서브태스크 분해" 버튼 →
Epic: "사용자 인증 시스템 구축"

AI 제안:
  ☑ OAuth 2.0 플로우 설계
  ☑ JWT 토큰 발급/검증 구현
  ☑ 리프레시 토큰 로직
  ☑ 소셜 로그인 (GitHub/Google)
  ☐ 2FA 구현 (선택)

  [5개 생성]  [수정 후 생성]
```

#### U8-3: 주간 AI 회고 초안 (WeeklyPlannerPage)
```
"AI 요약 생성" →
이번 주 완료: 12개 태스크, 8개 타임블록
→ 자동 생성된 회고문 텍스트에어리어에 삽입
```

#### U8-4: 연구 노트 Q&A (ResearchNotePanel)
- 현재 노트 내용을 컨텍스트로 Claude에게 질문
- 오른쪽 사이드바 패널로 구현

**신규 파일**: `backend/apps/ai/views.py`, `backend/apps/ai/urls.py`, `frontend/src/lib/aiApi.js`

---

### Phase U9 — 캘린더 UX 업그레이드 (P2, 약 2시간)

#### U9-1: 이벤트 → 태스크 1클릭 변환
```
이벤트 팝업 내 버튼:
[→ 태스크로 변환]

→ 이벤트 제목, 날짜 → 선택한 프로젝트의 태스크로 자동 이관
```

#### U9-2: 반복 일정 지원
```
이벤트 생성 모달:
반복: [없음 ▾]
     없음 / 매일 / 매주 / 매월 / 매년 / 사용자 정의
```
- 백엔드 `Calendar` 모델에 `recurrence` 필드 추가
- 프론트엔드 FullCalendar `rrule` 플러그인 활용

#### U9-3: 미니 캘린더 사이드 네비게이터
- 좌측 패널에 월간 미니 캘린더
- 날짜 클릭 → 메인 캘린더 해당 날짜로 이동
- 이벤트 있는 날 점(dot) 표시

**수정 파일**: `CalendarPage.jsx`, `backend/apps/calendars/models.py`

---

## 구현 우선순위 매트릭스

| Phase | 기능 | 사용자 임팩트 | 구현 난이도 | 우선순위 | 예상 시간 |
|-------|------|-------------|------------|---------|---------|
| U1 | 대시보드 히트맵 + RAG + 워크로드 | 최고 | 중 | **P0** | 4h |
| U2 | 인라인 편집 + 벌크 액션 | 최고 | 중 | **P0** | 3h |
| U6 | CommandPalette 퍼지검색 + 체이닝 | 높음 | 낮음 | **P1** | 2h |
| U3 | 타임라인 줌 + 의존성 화살표 | 높음 | 높음 | **P1** | 4h |
| U4 | 칸반 WIP + 스윔레인 | 높음 | 중 | **P1** | 3h |
| U5 | 알림 인박스 (해결형) | 중간 | 중 | **P1** | 2h |
| U7 | Framer Motion 애니메이션 | 중간 | 낮음 | **P2** | 3h |
| U9 | 캘린더 UX (반복/변환) | 중간 | 중 | **P2** | 2h |
| U8 | AI 어시스턴트 | 장기 가치 | 높음 | **P2** | 6h |

**총 예상**: 29시간

---

## 추천 구현 순서

```
Week 1 (핵심 임팩트)
  Day 1: U1 대시보드 — 히트맵 + RAG 헬스 + 워크로드 + 속도 트렌드
  Day 2: U2 태스크 인라인 편집 + 멀티셀렉트 플로팅 툴바
  Day 3: U7 스켈레톤 + 카운트업 + Framer Motion 스태거

Week 2 (파워 기능)
  Day 4: U6 CommandPalette 강화 + 단축키 오버레이
  Day 5: U3 타임라인 줌 컨트롤 + 의존성 화살표
  Day 6: U4 칸반 WIP + 스윔레인 + 카드 메타

Week 3 (마무리 + AI)
  Day 7: U5 알림 인박스 + U9 캘린더 반복일정
  Day 8-9: U8 AI 자연어 태스크 생성 + Epic 분해
```

---

## 추가 패키지

| 패키지 | 용도 | Phase |
|--------|------|-------|
| `framer-motion` | 마이크로 애니메이션 | U7 |
| `fuse.js` | 퍼지 검색 | U6 |
| `date-fns` | 날짜 유틸리티 | U9 |
| `anthropic` (Python) | Claude Haiku API | U8 |

---

## 디자인 시스템 추가 토큰

```css
:root {
  /* 차트 토큰 (Recharts 전용) */
  --chart-1: #6366f1;
  --chart-2: #10b981;
  --chart-3: #f59e0b;
  --chart-4: #ef4444;
  --chart-5: #8b5cf6;

  /* RAG 토큰 */
  --rag-green: #10b981;
  --rag-amber: #f59e0b;
  --rag-red:   #ef4444;

  /* 히트맵 밀도 */
  --heatmap-0: rgba(99,102,241,0.06);
  --heatmap-1: rgba(99,102,241,0.25);
  --heatmap-2: rgba(99,102,241,0.50);
  --heatmap-3: rgba(99,102,241,0.75);
  --heatmap-4: rgba(99,102,241,1.00);
}
```

```jsx
// Recharts 글로벌 공통 설정
export const CHART_DEFAULTS = {
  grid: { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.06)' },
  tooltip: {
    contentStyle: {
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      fontSize: 12,
    }
  },
  tick: { fill: 'var(--text-muted)', fontSize: 11 },
}
```

---

## 결론

현재 PlanB는 기능적 완성도가 높지만 **시각적 임팩트와 인터랙션 퀄리티**에서 체감 격차 발생.

**즉시 체감 효과 TOP 3:**
1. **U1 대시보드 히트맵 + RAG** — 앱이 "살아있다"는 느낌, 매일 열고 싶어지는 동기부여
2. **U2 인라인 편집 + 벌크 액션** — 태스크 조작 속도 3배, 가장 빈번히 사용하는 기능
3. **U7 스켈레톤 + Framer Motion** — 로딩 경험만 바꿔도 "프리미엄 앱" 체감 즉시 상승
