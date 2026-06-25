# Plan: PlanB 기능 고도화 & UI 리디자인 (v2 — BM 기반 업그레이드)

**작성일**: 2026-06-23  
**v2 업데이트**: 2026-06-23 (경쟁 서비스 BM 반영)  
**복잡도**: Large

---

## 경쟁 서비스 벤치마크 분석

### 분석 대상 및 포지셔닝 분류

| 서비스 | 티어 | 포지셔닝 | PlanB 와의 관련성 |
|--------|------|----------|-----------------|
| **Linear** | Aspirational | 개발팀 중심, 키보드 퍼스트, 미니멀리즘 | 가장 가깝게 목표할 UX 기준 |
| **Plane** | Direct | Linear 오픈소스 대안, 셀프호스트 | 동일 포지션 — 기능 격차 확인용 |
| **Height** | Direct | AI 기능 + 클린 디자인, 소규모 팀 | UI 방향 참조 |
| **Asana** | Adjacent | 기업용, My Tasks 개념 | Dashboard·Milestone 구조 차용 |
| **GitHub Projects** | Adjacent | 개발자 친화, 표 뷰 | GitHub OAuth 유저층과 동일 |
| **Notion** | Adjacent | 유연한 뷰·데이터베이스 | 멀티뷰 개념 참조 |
| **ClickUp** | Adjacent | 올인원, 뷰 15개 | 기능 과잉의 반면교사 |
| **Jira** | Aspirational | 엔터프라이즈, 스프린트 | Sprint 개념 차용, 복잡도는 피함 |

---

### 서비스별 핵심 패턴 분석

#### Linear — 가장 배울 것이 많은 서비스

**핵심 차별점:**
- **Command Palette (Cmd+K)** — 모든 기능에 키보드로 접근. 타이핑만으로 이슈 생성, 상태 변경, 페이지 이동
- **Triage Inbox** — 할당되지 않은 이슈가 모이는 수신함. 우선순위 결정 워크플로우
- **Cycles (스프린트)** — 2주 단위 타임박스. 번다운 차트 자동 생성
- **이슈 관계** — blocking / blocked by / duplicate / related 4가지 관계
- **Priority 아이콘** — 텍스트 뱃지 대신 아이콘(🔴🟠🟡⚪) → 눈에 빠르게 들어옴
- **Sub-issues** — 이슈 안에 이슈 (실제로는 2~3 depth 권장)
- **Project Updates** — 프로젝트 상태를 주기적으로 업데이트하는 "업데이트" 개념
- **이슈 행 밀도** — 한 행에 아이콘 + 제목 + 담당자 아바타 + 라벨만. 깔끔하게 정보 집약

**채용할 패턴:**
- Command Palette (Cmd+K)
- Priority 아이콘 (텍스트 → 아이콘)
- Cycles/Sprint 개념
- 이슈 관계 (blocking / blocked by)
- 컴팩트한 태스크 행 밀도

#### Asana — My Tasks와 Dashboard의 기준

**핵심 차별점:**
- **My Tasks** — "오늘 / 다가오는 일 / 나중에" 3구역으로 개인 태스크를 직접 분류
- **Milestone** — 프로젝트 내 마일스톤(날짜 기반 체크포인트). 다이아몬드(◆) 아이콘으로 구분
- **포트폴리오** — 여러 프로젝트의 진행률을 한 화면에서 조망
- **섹션(Section)** — 프로젝트 내 태스크를 그룹으로 묶는 경량 구조. 칸반 컬럼 = 섹션
- **Task Dependencies** — 선행 태스크 완료 전 현재 태스크 차단
- **규칙/자동화** — "status가 Done이 되면 담당자에게 알림" 등 no-code 자동화

**채용할 패턴:**
- My Tasks (오늘 / 예정 / 나중) 3구역
- Milestone 개념 (백엔드 모델 추가)
- Section 기반 칸반 (현재 status 컬럼 대신 사용자 정의 컬럼 가능)
- Task Dependencies

#### GitHub Projects — 개발자 친화 패턴

**핵심 차별점:**
- **Table View** — 스프레드시트처럼 셀 클릭 → 즉시 편집. 행 = 이슈, 열 = 필드
- **Iteration 필드** — 스프린트를 커스텀 필드로 구현 (단순함)
- **Insights** — 번다운, 번업, 속도 차트 자동 생성
- **GitHub 이슈 자동 연동** — PR 머지 → 이슈 자동 Done 전환

**채용할 패턴:**
- Table View (스프레드시트형 뷰 추가)
- 진행 인사이트 (차트)

#### Height — UI 방향 참조

**핵심 차별점:**
- **Task Chat** — 태스크 안에 채팅형 댓글 (Slack 스레드 같은 UX)
- **AI 기능** — 태스크 요약, 자동 담당자 추천
- **미니멀 컬러 팔레트** — 다크 배경 + 단일 액센트 컬러 (보라/남색 계열)
- **태스크 행** — 체크박스 + 제목만. 클릭하면 우측 드로어로 상세 오픈

**채용할 패턴:**
- 태스크 내 댓글 (Chat 형태)
- 체크박스 완료 처리 (status 변경 단축)
- 미니멀 컬러 접근법

#### Plane — 직접 경쟁 서비스로서의 시사점

**핵심 차별점:**
- **Cycles** — Linear의 Sprint와 동일한 개념 (오픈소스 구현 참조 가능)
- **Modules** — Epic의 다른 이름. 여러 이슈를 묶는 컨테이너
- **Pages** — 팀 위키/문서 기능 내장
- **Inbox** — 미분류 이슈 수신함

**채용할 패턴:**
- Cycles/Sprint 구조 (Plane 구현 방식 참조)
- Inbox/Triage 개념

---

### BM 기반 기능 우선순위 매트릭스

| 기능 | 임팩트 | 구현 난이도 | 출처 | 우선순위 |
|------|--------|------------|------|---------|
| 태스크 상세 드로어 | ★★★★★ | MEDIUM | 전체 | **P0** |
| Kanban 보드 뷰 | ★★★★★ | MEDIUM | 전체 | **P0** |
| 디자인 시스템 | ★★★★★ | MEDIUM | — | **P0** |
| Priority 아이콘 | ★★★★☆ | LOW | Linear | **P0** |
| 태스크 완료 체크박스 | ★★★★☆ | LOW | Height | **P0** |
| My Tasks Dashboard | ★★★★★ | MEDIUM | Asana / Linear | **P1** |
| 태스크 댓글 | ★★★★☆ | MEDIUM | Height / Linear | **P1** |
| Command Palette | ★★★★☆ | MEDIUM | Linear | **P1** |
| Sprint / Cycle | ★★★★☆ | MEDIUM | Linear / Plane | **P1** |
| 검색 & 필터 | ★★★★☆ | LOW | 전체 | **P1** |
| Task Dependencies | ★★★☆☆ | MEDIUM | Asana / Linear | **P2** |
| Milestone | ★★★☆☆ | MEDIUM | Asana / GitHub | **P2** |
| 활동 로그 | ★★★☆☆ | MEDIUM | Linear | **P2** |
| Table View | ★★★☆☆ | HIGH | GitHub / Notion | **P2** |
| 진행 인사이트 차트 | ★★☆☆☆ | HIGH | GitHub | **P3** |
| Timeline/Gantt | ★★☆☆☆ | HIGH | Asana / GitHub | **P3** |
| 자동화 Rules | ★★☆☆☆ | HIGH | Asana / ClickUp | **P3** |

---

## PlanB 포지셔닝 정의 (BM 이후 확정)

```
정체성: 개발팀을 위한 GitHub-native PM 도구
제공 가치: Linear의 UX + GitHub OAuth 통합 + 한국어 팀 최적화
목표 사용자: 5~30인 개발 중심 스타트업 / 사이드 프로젝트 팀
차별점: 복잡도 없는 계층 구조 (Epic > Task > Subtask) + 공개 캘린더
피해야 할 함정: ClickUp식 기능 과잉, Jira식 설정 복잡도
```

---

## 현재 상태 분석

### 구현 완료 기능

| 페이지 | 라우트 | 상태 |
|--------|--------|------|
| 로그인 (GitHub OAuth) | `/login` | ✅ |
| 워크스페이스 목록 | `/` | ✅ |
| 워크스페이스 (프로젝트 목록) | `/workspaces/:slug` | ✅ |
| 프로젝트 (Task 트리) | `/workspaces/:slug/projects/:projectId` | ✅ |
| 캘린더 | `/workspaces/:slug/calendar` | ✅ |
| 멤버 관리 | `/workspaces/:slug/members` | ✅ |
| 공개 프레젠테이션 뷰 | `/present/:slug` | ✅ (읽기 전용 캘린더) |
| Dashboard | — | ❌ 파일 존재, 라우트 미연결 |

### BM으로 추가 식별된 문제점

| 문제 | 출처 비교 |
|------|----------|
| 태스크 클릭 시 상세 뷰 없음 | Linear/Height: 클릭하면 즉시 드로어 |
| Kanban 없음 | 모든 PM 도구의 기본 뷰 |
| 우선순위가 텍스트 뱃지 | Linear: 아이콘으로 한눈에 인식 |
| 완료 처리가 status 변경뿐 | Height: 체크박스 한 번 클릭으로 Done |
| 댓글 없음 | 협업의 핵심 기능, 전 서비스 공통 |
| Sprint 개념 없음 | Linear/Plane/Jira: 시간 박스 관리 |
| 사이드바 없음 | 모든 서비스: 좌측 고정 네비게이션 |
| Dashboard 미동작 | Asana/Linear: My Tasks가 앱 시작점 |
| 검색 없음 | 모든 서비스: 상단 글로벌 검색 |
| 타임라인/마감일 뷰 없음 | Asana/GitHub: 날짜 기반 프로젝트 뷰 |

---

## 위험 요소

| 위험 | 수준 | 대응 |
|------|------|------|
| 드래그앤드롭 라이브러리 | MEDIUM | `@dnd-kit/core` (React 전용, 접근성 지원) |
| Task 상세 수정 API 미존재 | HIGH | backend PATCH 먼저 추가 |
| 댓글 모델 신규 추가 | MEDIUM | `TaskComment` 마이그레이션 추가 |
| Sprint 모델 신규 추가 | MEDIUM | `Sprint` 마이그레이션 추가 |
| 인라인 스타일 → CSS 전환 | MEDIUM | 파일 단위 단계적 교체 |
| 기능 과잉 위험 | HIGH | ClickUp 실패 사례 — 항상 "이게 필요한가?" 물을 것 |

---

## 구현 페이즈 (BM 기반 재정의)

---

### Phase 1 — 디자인 시스템 & 레이아웃 재설계 *(P0)*

**기간**: 1~2일 | **의존성**: 없음  
**BM 출처**: Linear 사이드바 구조, Height 컬러 팔레트

**변경 파일:**
```
frontend/src/index.css                  ← CSS 토큰 + Inter 폰트
frontend/src/components/Layout.jsx      ← 좌측 사이드바 + 헤더 구조
frontend/src/components/Sidebar.jsx     ← 신규: 워크스페이스 네비게이션
frontend/src/components/ui/Button.jsx   ← 신규: variant primary/ghost/danger
frontend/src/components/ui/Badge.jsx    ← 신규: 상태/우선순위 뱃지
frontend/src/components/ui/PriorityIcon.jsx  ← 신규: Linear 방식 우선순위 아이콘
frontend/src/components/ui/Avatar.jsx   ← 신규: 유저 아바타
frontend/src/components/ui/Toast.jsx    ← 신규: 알림 토스트
frontend/src/components/ui/EmptyState.jsx ← 신규: 빈 상태 + CTA
frontend/src/components/ui/Spinner.jsx  ← 신규: 스켈레톤 shimmer
```

**디자인 토큰 — Dark Luxury (Height/Linear 참조):**
```css
:root {
  /* Backgrounds */
  --bg-base:      #0a0d14;   /* 최하단 배경 */
  --bg-surface:   #111827;   /* 카드 / 패널 */
  --bg-elevated:  #1a2232;   /* hover, 드롭다운 */
  --bg-overlay:   rgba(0,0,0,0.6);  /* 모달 오버레이 */

  /* Borders */
  --border:       #1f2937;
  --border-focus: #6366f1;

  /* Accent — Indigo (차별화, Linear 대비) */
  --accent:       #6366f1;
  --accent-hover: #4f46e5;
  --accent-muted: rgba(99,102,241,0.12);

  /* Text */
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted:   #64748b;

  /* Semantic */
  --success:      #10b981;
  --danger:       #ef4444;
  --warning:      #f59e0b;
  --info:         #3b82f6;

  /* Priority Colors (Linear 방식) */
  --priority-urgent: #ef4444;  /* 🔴 */
  --priority-high:   #f59e0b;  /* 🟠 */
  --priority-medium: #6366f1;  /* 🟣 */
  --priority-low:    #64748b;  /* ⚪ */

  /* Status Colors */
  --status-todo:        #64748b;
  --status-in-progress: #6366f1;
  --status-done:        #10b981;
  --status-cancelled:   #374151;

  /* Spacing */
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;
  --space-4: 16px;  --space-6: 24px;  --space-8: 32px;

  /* Radius */
  --radius-sm: 4px;   --radius-md: 8px;
  --radius-lg: 12px;  --radius-full: 9999px;

  /* Transitions */
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 120ms;
  --duration-normal: 200ms;
}
```

**Priority 아이콘 컴포넌트 (Linear 방식):**
```jsx
// ⚡ 텍스트 뱃지 대신 아이콘으로 — 한눈에 파악
const PRIORITY_ICONS = {
  urgent: { icon: '⚡', color: 'var(--priority-urgent)' },
  high:   { icon: '↑',  color: 'var(--priority-high)' },
  medium: { icon: '→',  color: 'var(--priority-medium)' },
  low:    { icon: '↓',  color: 'var(--priority-low)' },
}
```

**사이드바 구조 (Linear 스타일):**
```
┌─ 사이드바 (240px) ────────────┐
│ [PlanB] [워크스페이스명 ▼]    │  ← 워크스페이스 전환
│                               │
│ ⊞  내 태스크 (My Tasks)      │  ← 글로벌 개인 뷰
│ ⌂  Dashboard                 │
│ 🔍 검색 (Cmd+K)              │
│ ────────────────────────────  │
│ 📁 프로젝트                  │
│   ├─ ProjectA                 │  ← 프로젝트별 접기/펼치기
│   └─ ProjectB                 │
│ ────────────────────────────  │
│ 🔄 스프린트                  │
│ 📅 캘린더                    │
│ 👥 멤버                      │
│ ────────────────────────────  │
│ [아바타] 김지호               │  ← 유저 메뉴 (하단 고정)
└───────────────────────────────┘
```

---

### Phase 2 — Dashboard & My Tasks *(P1)*

**기간**: 1~1.5일 | **의존성**: Phase 1  
**BM 출처**: Asana My Tasks 3구역, Linear My Issues, GitHub Projects Insights

**변경 파일:**
```
frontend/src/pages/DashboardPage.jsx    ← 전면 재작성
frontend/src/App.jsx                    ← 라우트 추가 (/dashboard, /my-tasks)
backend/apps/accounts/views.py          ← GET /api/me/tasks/ 추가
backend/apps/accounts/urls.py           ← me/tasks 라우트
backend/apps/workspaces/views.py        ← GET /api/workspaces/:slug/stats/ 추가
```

**My Tasks 뷰 (Asana 방식 채용):**
```
My Tasks
────────────────────────────────────────
📌 오늘 (Today)
  ☐ ⚡ API 인증 구현            ProjectA   내일 마감
  ☐ ↑  테스트 코드 작성          ProjectA   오늘 마감 ⚠

📆 예정 (Upcoming)
  ☐ →  UI 리뷰                  ProjectB   금 마감
  ☐ ↓  문서 업데이트             ProjectA   다음 주

📋 나중에 (Later)
  ☐ →  성능 최적화               ProjectB   미정
```

**Dashboard 구성:**
```
┌─ 완료율 ──────────────────┐  ┌─ 우선순위 태스크 ──────────┐
│ ProjectA  ████████░░  80% │  │ ⚡ API 오류 수정     [오늘] │
│ ProjectB  ████░░░░░░  40% │  │ ↑  배포 파이프라인  [내일]  │
│ ProjectC  ██░░░░░░░░  20% │  │ ↑  코드 리뷰        [금]   │
└───────────────────────────┘  └────────────────────────────┘

┌─ 활동 피드 ───────────────────────────────────────────────┐
│ 🟢 김지호 — "API 인증 구현" 완료       10분 전             │
│ 💬 이민준 — "DB 스키마" 에 댓글 추가   32분 전             │
│ 📌 박서연 — "배포 파이프라인" 생성     1시간 전            │
└────────────────────────────────────────────────────────────┘
```

**백엔드 API:**
```
GET /api/me/tasks/
  ?section=today|upcoming|later
  → 나에게 할당된 태스크 목록 (전체 워크스페이스)

GET /api/workspaces/:slug/stats/
  → { projects: [{ id, name, total, completed, percentage }] }

GET /api/me/activity/
  → 최근 30개 활동 로그 (TaskComment 생성, Task 상태 변경 등)
```

---

### Phase 3 — Task 상세 드로어 + 댓글 *(P0)*

**기간**: 2~2.5일 | **의존성**: Phase 1 + 백엔드 PATCH + 댓글 모델  
**BM 출처**: Linear 이슈 상세, Height Task Chat, Asana 태스크 패널

**가장 중요한 기능. 모든 PM 도구의 핵심.**

**백엔드 추가 (먼저 구현):**
```python
# apps/tasks/models.py 추가
class TaskComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

# apps/tasks/models.py 추가
class ActivityLog(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='activity')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50)  # 'status_changed', 'comment_added' 등
    detail = models.JSONField(default=dict)   # { from: 'todo', to: 'done' }
    created_at = models.DateTimeField(auto_now_add=True)
```

```
PATCH /api/workspaces/:slug/projects/:pid/tasks/:tid/
  body: { title?, description?, status?, priority?, assignee_id?, due_date? }

GET /api/workspaces/:slug/projects/:pid/tasks/:tid/comments/
POST /api/workspaces/:slug/projects/:pid/tasks/:tid/comments/

GET /api/workspaces/:slug/projects/:pid/tasks/:tid/activity/
```

**변경 파일:**
```
frontend/src/components/TaskDrawer.jsx   ← 신규: 우측 슬라이드 패널
frontend/src/components/TaskDetail.jsx   ← 신규: 드로어 내부 콘텐츠
frontend/src/components/TaskComments.jsx ← 신규: 댓글 영역
frontend/src/components/ActivityLog.jsx  ← 신규: 활동 로그
frontend/src/pages/ProjectPage.jsx       ← 클릭 핸들러 + URL 파라미터
backend/apps/tasks/models.py             ← TaskComment, ActivityLog 추가
backend/apps/tasks/views.py              ← PATCH, DELETE, 댓글 CRUD
backend/apps/tasks/urls.py               ← detail + comments 엔드포인트
backend/apps/tasks/migrations/           ← 새 마이그레이션
```

**드로어 레이아웃 (Linear 방식):**
```
┌─ Task Detail Drawer (480px, 우측 슬라이드인) ──────────────────┐
│  [← 닫기]                              [삭제] [공유]           │
│                                                                  │
│  [체크박스] API 인증 구현                                        │
│  ──────────────────────────────────────                         │
│  상태     [● In Progress ▼]                                     │
│  우선순위  [⚡ Urgent ▼]                                        │
│  담당자   [@김지호 ▼]                                           │
│  마감일   [2026-07-01 📅]                                       │
│  스프린트 [Sprint 3 ▼]                  ← Phase 5 이후 추가     │
│  ──────────────────────────────────────                         │
│  설명                                                            │
│  ┌───────────────────────────────────┐                          │
│  │ GitHub OAuth 토큰 검증 로직 구현  │  ← 마크다운 textarea     │
│  │ - JWT 발급                        │                          │
│  └───────────────────────────────────┘                          │
│  ──────────────────────────────────────                         │
│  💬 댓글                                                        │
│  ┌──────────────────────────────────┐                           │
│  │ [아바타] 이민준                  │                           │
│  │ "JWT 만료 시간을 24h로 늘리면?"  │                           │
│  │ 2시간 전                         │                           │
│  └──────────────────────────────────┘                           │
│  [댓글 입력...]              [전송]                              │
│  ──────────────────────────────────────                         │
│  📋 활동 로그                                                   │
│  김지호가 상태를 In Progress로 변경  1시간 전                   │
│  이민준이 태스크를 생성              3시간 전                   │
└──────────────────────────────────────────────────────────────────┘
```

**태스크 행 UI 변경 (체크박스 + Priority 아이콘):**
```
현재: [▼] [Epic] API 인증 구현  [in_progress]  [high]  [+ 하위]
변경: [ ] ⚡  API 인증 구현     ● In Progress  @김지호  7/1  [+ 하위]
```

---

### Phase 4 — Kanban 보드 뷰 *(P0)*

**기간**: 2일 | **의존성**: Phase 3  
**BM 출처**: Linear Board View, Asana Section 기반 칸반, GitHub Projects Board

**변경 파일:**
```
frontend/src/pages/ProjectPage.jsx       ← 뷰 토글 버튼 + 조건부 렌더링
frontend/src/components/KanbanBoard.jsx  ← 신규: 컬럼 컨테이너
frontend/src/components/KanbanColumn.jsx ← 신규: 상태별 컬럼
frontend/src/components/KanbanCard.jsx   ← 신규: 카드 아이템
```

**추가 패키지:** `@dnd-kit/core` `@dnd-kit/sortable` `@dnd-kit/utilities`

**보드 UI (Linear Board 스타일):**
```
[📋 리스트]  [🗂️ 보드]  [표 ▿]   ← 뷰 전환 탭

┌─ Todo (4) ────────┐  ┌─ In Progress (2) ─┐  ┌─ Done (8) ────────┐  ┌─ Cancelled ───────┐
│ ⚡ API 인증 구현   │  │ ↑ DB 스키마 설계   │  │ ✓ Docker 설정     │  │                   │
│ @김지호  7/1 ◷    │  │ @이민준  진행 중   │  │ ✓ CI/CD 파이프라인│  │                   │
│─────────────────── │  │─────────────────── │  │ ✓ 환경변수 정리   │  │                   │
│ → 문서 작성        │  │                   │  │                   │  │                   │
│ @박서연  7/5 ◷    │  │                   │  │                   │  │                   │
│─────────────────── │  │                   │  │                   │  │                   │
│ + 태스크 추가      │  │ + 태스크 추가     │  │                   │  │ + 태스크 추가     │
└───────────────────┘  └───────────────────┘  └───────────────────┘  └───────────────────┘
```

**드래그 기능:**
- 카드 → 다른 컬럼 이동 = `status` 업데이트 (PATCH 즉시 호출)
- 컬럼 내 순서 변경 = `order` 업데이트
- 드래그 중 반투명 ghost 카드 표시

---

### Phase 5 — Sprint / Cycle *(P1)*

**기간**: 1.5일 | **의존성**: Phase 3  
**BM 출처**: Linear Cycles, Plane Sprints, Jira 스프린트 (복잡도 없이)

**목표:** 2주 단위 스프린트를 만들고, 태스크를 스프린트에 넣어 진행 추적

**백엔드:**
```python
# apps/tasks/models.py 추가
class Sprint(models.Model):
    class Status(models.TextChoices):
        PLANNED   = 'planned',    'Planned'
        ACTIVE    = 'active',     'Active'
        COMPLETED = 'completed',  'Completed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='sprints')
    name = models.CharField(max_length=100)      # "Sprint 1", "2026-Q2-W1"
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PLANNED)
    start_date = models.DateField()
    end_date = models.DateField()
    goal = models.TextField(blank=True)           # 스프린트 목표

# Task 모델에 sprint FK 추가
# Task.sprint = models.ForeignKey(Sprint, null=True, blank=True, related_name='tasks')
```

```
GET/POST   /api/workspaces/:slug/projects/:pid/sprints/
PATCH      /api/workspaces/:slug/projects/:pid/sprints/:sid/
GET        /api/workspaces/:slug/projects/:pid/sprints/:sid/stats/
  → { total, completed, remaining, burndown: [...] }
```

**변경 파일:**
```
frontend/src/pages/SprintPage.jsx        ← 신규: 스프린트 목록 + 현재 스프린트
frontend/src/components/SprintCard.jsx   ← 신규: 스프린트 카드 + 진행률 바
frontend/src/components/BurndownChart.jsx ← 신규: 번다운 차트 (recharts 사용)
backend/apps/tasks/models.py             ← Sprint 모델 추가
backend/apps/tasks/migrations/
backend/apps/tasks/views.py              ← Sprint CRUD + stats
backend/apps/tasks/urls.py
frontend/src/App.jsx                     ← /workspaces/:slug/sprints 라우트 추가
```

**추가 패키지:** `recharts` (번다운 차트)

**Sprint 뷰:**
```
스프린트 3  ●  Active          2026-06-16 ~ 2026-06-29   (D-6)
목표: "인증 시스템 완성 + 핵심 API 구축"

진행률  ████████░░░░░░░  53%  (8/15 완료)
                               [스프린트 완료]

[📋 리스트로 보기]  [🗂️ 보드로 보기]
─────────────────────────────────────
```

---

### Phase 6 — Command Palette *(P1)*

**기간**: 1일 | **의존성**: Phase 1~4 완료 후  
**BM 출처**: Linear (Cmd+K) — 가장 강력한 UX 차별화 요소

**변경 파일:**
```
frontend/src/components/CommandPalette.jsx  ← 신규
frontend/src/hooks/useCommandPalette.js     ← 신규: Cmd+K 트리거 훅
frontend/src/App.jsx                        ← 전역 키 리스너 추가
```

**Command Palette 기능:**
```
Cmd+K   →  ┌────────────────────────────────────┐
            │ 🔍 무엇이든 검색하거나 입력하세요  │
            ├────────────────────────────────────┤
            │  최근 방문                         │
            │  › ProjectA — API 인증 구현         │
            │  › Dashboard                        │
            │                                     │
            │  빠른 액션                          │
            │  + 새 태스크      N                 │
            │  + 새 프로젝트    Shift+P            │
            │  ⚙ 설정                             │
            │                                     │
            │  태스크 (입력 기반 필터링)           │
            │  › [검색 결과 실시간 표시]           │
            └────────────────────────────────────┘
```

---

### Phase 7 — 검색 & 필터 *(P1)*

**기간**: 1일 | **의존성**: Phase 3  
**BM 출처**: Linear 필터 시스템, GitHub Projects 필터

**변경 파일:**
```
frontend/src/components/TaskFilters.jsx     ← 신규
frontend/src/pages/ProjectPage.jsx          ← 필터 연동
backend/apps/tasks/views.py                 ← 쿼리 파라미터 지원
```

**필터 UI:**
```
[ 🔍 태스크 검색... ]  [상태 ▼] [우선순위 ▼] [담당자 ▼] [스프린트 ▼]  [정렬: 우선순위 ▼]

적용된 필터: [● In Progress ×] [⚡ Urgent ×]  [전체 초기화]
```

**백엔드 쿼리 파라미터:**
```
GET /api/workspaces/:slug/projects/:pid/tasks/
  ?status=todo,in_progress
  &priority=urgent,high
  &assignee=<user_id>
  &sprint=<sprint_id>
  &search=인증
  &ordering=-priority,due_date
```

---

### Phase 8 — 캘린더 업그레이드 *(P1)*

**기간**: 1일 | **의존성**: Phase 1  
**BM 출처**: Asana Timeline, Google Calendar 주간 뷰

**변경 파일:**
```
frontend/src/pages/CalendarPage.jsx         ← 주간 뷰 + 이벤트 수정 모달
backend/apps/calendars/views.py             ← PATCH 이벤트 보강
```

**추가 FullCalendar 플러그인:** `@fullcalendar/timegrid`

**업그레이드:**
- 주간 뷰 (`timeGridWeek`) 추가
- 태스크 마감일을 캘린더에 표시 (별도 색상)
- 이벤트 클릭 → 수정 모달 (현재는 visibility 토글만)
- 이벤트 드래그 → 날짜/시간 변경 (백엔드 PATCH)
- 이벤트 종류별 색상 구분 (미팅 / 마일스톤 / 마감일)

---

### Phase 9 — Task Dependencies & Milestone *(P2)*

**기간**: 1.5일 | **의존성**: Phase 3  
**BM 출처**: Asana Dependencies, GitHub Projects Milestone

**백엔드:**
```python
# apps/tasks/models.py 추가
class TaskRelation(models.Model):
    class Type(models.TextChoices):
        BLOCKS       = 'blocks',       'Blocks'
        BLOCKED_BY   = 'blocked_by',   'Blocked By'
        RELATED      = 'related',      'Related'
        DUPLICATE_OF = 'duplicate_of', 'Duplicate Of'

    from_task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='outgoing_relations')
    to_task   = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='incoming_relations')
    relation_type = models.CharField(max_length=15, choices=Type.choices)

class Milestone(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='milestones')
    name = models.CharField(max_length=200)
    due_date = models.DateField()
    description = models.TextField(blank=True)
    is_completed = models.BooleanField(default=False)
```

**UI:**
- 태스크 드로어에서 "관계 추가" → blocking/blocked by 선택 + 태스크 검색
- 마일스톤은 프로젝트 뷰에서 다이아몬드(◆) 행으로 표시

---

### Phase 10 — UX 폴리싱 *(P2)*

**기간**: 1일 | **의존성**: 전체 페이즈 완료 후

- **토스트 알림** — 저장 성공/실패, 멘션 알림
- **로딩 스켈레톤** — shimmer animation (카드 깜빡임 완전 제거)
- **키보드 단축키** — `N` 새 태스크, `Esc` 닫기, `Cmd+K` 팔레트, `?` 단축키 모달
- **Optimistic Update** — 상태/우선순위 변경 즉시 UI 반영, 실패 시 롤백
- **빈 상태** — 빈 프로젝트/스프린트 일러스트 + CTA
- **모바일 반응형** — 최소 태블릿 대응 (320px~768px)
- **접근성** — aria-label, keyboard focus ring, 색상 대비 AA 준수

---

## 전체 일정 (재정의)

| 순서 | 페이즈 | 기간 | 우선순위 | 핵심 의존성 |
|------|--------|------|---------|------------|
| 1 | 디자인 시스템 + 사이드바 | 1~2일 | P0 | 없음 |
| 2 | Dashboard & My Tasks | 1~1.5일 | P1 | Phase 1 |
| 3 | Task 상세 드로어 + 댓글 | 2~2.5일 | P0 | Phase 1 + 백엔드 |
| 4 | Kanban 보드 | 2일 | P0 | Phase 3 |
| 5 | Sprint / Cycle | 1.5일 | P1 | Phase 3 |
| 6 | Command Palette | 1일 | P1 | Phase 1~4 |
| 7 | 검색 & 필터 | 1일 | P1 | Phase 3 |
| 8 | 캘린더 업그레이드 | 1일 | P1 | Phase 1 |
| 9 | Task Dependencies & Milestone | 1.5일 | P2 | Phase 3 |
| 10 | UX 폴리싱 | 1일 | P2 | 전체 |

**총 예상: 13~15일**  
**P0만 완료 시 MVP 달성: 5~6일**

---

## 영향 파일 전체 목록

### Frontend (신규 생성)
```
src/components/Sidebar.jsx
src/components/TaskDrawer.jsx
src/components/TaskDetail.jsx
src/components/TaskComments.jsx
src/components/ActivityLog.jsx
src/components/KanbanBoard.jsx
src/components/KanbanColumn.jsx
src/components/KanbanCard.jsx
src/components/TaskFilters.jsx
src/components/SprintCard.jsx
src/components/BurndownChart.jsx
src/components/CommandPalette.jsx
src/components/ui/Button.jsx
src/components/ui/Badge.jsx
src/components/ui/PriorityIcon.jsx
src/components/ui/Avatar.jsx
src/components/ui/Toast.jsx
src/components/ui/EmptyState.jsx
src/components/ui/Spinner.jsx
src/hooks/useCommandPalette.js
src/pages/SprintPage.jsx
```

### Frontend (수정)
```
src/index.css
src/App.jsx
src/components/Layout.jsx
src/pages/DashboardPage.jsx
src/pages/ProjectPage.jsx
src/pages/CalendarPage.jsx
```

### Backend (신규 모델/마이그레이션)
```
apps/tasks/models.py          ← TaskComment, ActivityLog, Sprint, TaskRelation, Milestone
apps/tasks/migrations/        ← 새 마이그레이션 파일들
```

### Backend (수정)
```
apps/tasks/views.py           ← PATCH, DELETE, 댓글 CRUD, Sprint CRUD, 관계
apps/tasks/urls.py            ← detail + comments + sprints 엔드포인트
apps/tasks/serializers.py     ← 새 모델 시리얼라이저
apps/accounts/views.py        ← /api/me/tasks/, /api/me/activity/
apps/accounts/urls.py
apps/workspaces/views.py      ← /api/workspaces/:slug/stats/
apps/calendars/views.py       ← 이벤트 PATCH 보강
```

### 추가 패키지
```
Frontend:
  @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
  recharts

Backend:
  (추가 없음 — 기존 Django/DRF로 구현 가능)
```

---

## Acceptance Criteria

### P0 (MVP)
- [ ] Phase 1: 사이드바 네비게이션 동작, CSS 토큰 전체 적용, Priority 아이콘 표시
- [ ] Phase 3: 태스크 클릭 → 드로어 열림, 모든 필드 인라인 편집, 댓글 작성/조회
- [ ] Phase 4: List ↔ Board 뷰 토글, 드래그로 상태 변경

### P1
- [ ] Phase 2: My Tasks (오늘/예정/나중) 구조, Dashboard 진행률 표시
- [ ] Phase 5: Sprint 생성/편집, 태스크 스프린트 배정, 번다운 차트
- [ ] Phase 6: Cmd+K 팔레트, 빠른 태스크 생성, 페이지 이동
- [ ] Phase 7: 상태/우선순위/텍스트 검색 필터 동작
- [ ] Phase 8: 주간 뷰, 이벤트 드래그 리스케줄

### P2
- [ ] Phase 9: blocking/blocked-by 관계, Milestone 다이아몬드 표시
- [ ] Phase 10: 모든 액션 토스트 알림, 스켈레톤 로딩, 키보드 단축키 완성

---

## 의도적으로 제외한 기능 (ClickUp 실패 방지)

| 기능 | 제외 이유 |
|------|----------|
| Timeline/Gantt 뷰 | 구현 복잡도 대비 소규모 팀 실사용률 낮음 |
| 자동화 Rules | 설정 복잡도 증가, Phase 3에서 재검토 |
| 커스텀 필드 | 스키마 복잡도 급상승, 핵심 기능 완성 후 재검토 |
| AI 기능 | 현재 인프라에서 비용 발생, 추후 검토 |
| 시간 추적 | 사용자 행동 연구 없이 추가 금지 |
| 다중 워크스페이스 동시 뷰 | Notion/ClickUp의 흔한 UX 실패 패턴 |
