# Plan: Dashboard & Calendar 고도화

**Source**: 사용자 요청 (경쟁 서비스 BM 기반 최고 기능 설계)  
**Complexity**: Large  
**Status**: PENDING CONFIRMATION

---

## 1. 현재 상태 (As-Is)

| 영역 | 현재 상태 | 문제점 |
|------|-----------|--------|
| `DashboardPage.jsx` | 사실상 빈 placeholder (로그아웃만 존재) | 라우터에 연결조차 안 됨 |
| `WorkspacePage.jsx` | 프로젝트 카드 그리드 + 기본 통계 | 개인화 없음, 실시간 현황 없음 |
| `CalendarPage.jsx` | 월/주 뷰, 드래그, 빠른 생성, 태스크 마감일 오버레이 | 타임라인 없음, 반복 이벤트 없음, 설명 필드 미표시 |

---

## 2. 경쟁 서비스 BM 분석 (Best-of-Breed)

### Dashboard
| 서비스 | 핵심 기능 | 채택 여부 |
|--------|-----------|-----------|
| **Linear** | Personal Inbox, My Issues by sprint, 오늘의 포커스 | ✅ 전면 채택 |
| **Asana** | My Tasks (오늘/예정/나중), Portfolio Health | ✅ 태스크 그룹핑 채택 |
| **ClickUp** | 커스터마이징 가능한 위젯 대시보드 | ✅ 위젯 레이아웃 채택 |
| **Monday.com** | KPI 수치 카드, 팀 워크로드 히트맵 | ✅ 워크로드 섹션 채택 |
| **Notion** | Recent + Favorites | ❌ DB 구조 다름, 범위 외 |

### Calendar
| 서비스 | 핵심 기능 | 채택 여부 |
|--------|-----------|-----------|
| **Google Calendar** | 일 뷰 시간블록, 반복 이벤트, 이벤트 설명 | ✅ 전면 채택 |
| **Linear Roadmap** | 타임라인/Gantt, 스프린트 블록 시각화 | ✅ Phase 3에서 구현 |
| **Cron (Notion Calendar)** | 아젠다 뷰, 키보드 단축키, 사이드 패널 | ✅ 아젠다 뷰 채택 |
| **Notion Calendar** | 드래그로 날짜 범위 선택 | ✅ 드래그 범위 선택 채택 |
| **Asana Timeline** | Gantt 의존성 시각화 | ⚠️ 의존성 선은 v2에서 |

### Personal Planner & Diary (신규)
| 서비스 | 핵심 기능 | 채택 여부 |
|--------|-----------|-----------|
| **Sunsama** | 매일 아침 플래닝 의식, 타임블록, 프로젝트 태스크 임포트, 저녁 리뷰 | ✅ 핵심 플로우 전면 채택 |
| **Routine** | 아름다운 타임블록 UI, 오전 루틴 플로우, AI 제안 | ✅ 타임블록 UI 레이아웃 채택 |
| **Things 3** | Today 뷰, Evening Review, 미니멀 iOS-like 디자인 | ✅ Today 포커스 섹션 채택 |
| **TickTick** | 아이젠하워 매트릭스, 습관 트래커, 포모도로 | ✅ 습관 트래커 채택 |
| **Day One** | 일기 + 무드 체크인, 날씨, 리치 미디어 | ✅ 무드 체크인 + 일기 채택 |
| **Obsidian Daily Notes** | 날짜별 노트, 백링크, 주간 리뷰 템플릿 | ✅ 주간 리뷰 구조 채택 |
| **Reflect** | AI 기반 일일 노트, 과거 항목 회고 | ⚠️ AI 없이 수동 회고로 |
| **Capacities** | 오브젝트 기반 일일 캡슐, 이번 주 요약 | ✅ 주간 캡슐 뷰 채택 |

---

## 3. 설계 원칙

1. **Personal-first**: 대시보드는 '나'를 중심으로 — 내 태스크, 내 마감, 내 활동
2. **Zero-fluff**: 모든 위젯은 실제 행동 가능한 데이터만 표시
3. **Dark Luxury 유지**: 기존 CSS variables 디자인 시스템 100% 재사용
4. **Backend-minimal**: 가능한 한 기존 API 재조합, 새 엔드포인트 최소화

---

## 4. 구현 Phases

---

### Phase 1 — Personal Home Dashboard (Linear 스타일)

**라우트**: `/workspaces/:slug/home` (신규)  
**파일**: `pages/DashboardPage.jsx` (전면 재작성)

#### 4개 섹션 레이아웃

```
┌─────────────────────────────────────────────────────────────┐
│  좌 패널 (340px)                   │  우 패널 (flex-1)        │
│                                    │                          │
│  ① 나의 태스크 (Linear My Issues)  │  ③ 진행 중인 스프린트    │
│    · 오늘 마감  [빨간 뱃지]        │    · 스프린트 카드 per P  │
│    · 지연      [경고 배경]         │    · 원형 진행률 + D-day  │
│    · 이번 주                       │    · 번다운 미니 바       │
│    · 나중                          │                          │
│                                    │  ④ 최근 활동 피드        │
│  ② 오늘 캘린더 이벤트             │    · 태스크 상태 변경    │
│    · 시간순 리스트                 │    · 댓글 추가           │
│    · 클릭 → 캘린더 이동           │    · 태스크 생성         │
└─────────────────────────────────────────────────────────────┘
```

#### 사용 API (기존 엔드포인트 재사용)

```js
// 내 태스크: 모든 프로젝트에서 assignee=me 병렬 fetch
getProjects(slug)
getTasks(slug, pid, { tree: false })  // per project → 클라이언트 필터: assignee.id === me.id

// 오늘 이벤트
getEvents(slug)  // 클라이언트에서 today 필터링

// 활성 스프린트
getSprints(slug, pid)        // status='active' 필터
getSprintStats(slug, pid, sprintId)
```

#### 신규 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| `MyTasksPanel` | 마감일 기준 그룹핑 (오늘/지연/이번주/나중), 상태 인라인 토글 |
| `TodayEventsPanel` | 오늘 이벤트 시간순 리스트, 클릭 → 캘린더 |
| `SprintStatusPanel` | 활성 스프린트 per 프로젝트, 원형 진행률 + D-day 뱃지 |
| `ActivityFeedPanel` | ActivityLog 재사용, 아이콘 + 텍스트 + 상대시간 |

#### 사이드바 연결

- `Sidebar.jsx` — `🏠 홈` NavItem 추가 (`/workspaces/${slug}/home`)
- `App.jsx` — 신규 라우트 추가

---

### Phase 2 — Workspace Overview 위젯 고도화

**파일**: `pages/WorkspacePage.jsx` (개선)

#### 기존 4-stat 카드 → 확장 위젯 레이아웃

```
┌──────────┬──────────┬──────────┬──────────┐
│ 전체 태스│ 오늘 마감│ 지연됨   │ 완료율   │
│ 크: 142  │ 8개 ⚠   │ 3개 🔴  │ 67% ↑   │
└──────────┴──────────┴──────────┴──────────┘

┌──────────────────────────────────────────────┐
│ 프로젝트 건강도                               │
│ Alpha  ████████░░░░ 65%  [활성 ●]            │
│ Beta   ██████████░░ 83%  [활성 ●]            │
│ Gamma  ██░░░░░░░░░░ 18%  [지연 🔴]           │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ 팀 워크로드 (멤버별 할당 태스크 수)           │
│ 김 ● ● ● ● ●  5개                           │
│ 이 ● ● ●      3개                           │
│ 박 ● ● ● ● ● ● ● 7개  ← 과부하 경고        │
└──────────────────────────────────────────────┘
```

#### 추가 로직 (기존 API 재사용)

```js
// 지연 태스크 감지: due_date < today && status !== 'done'
// 워크로드: tasks per assignee 집계 (클라이언트)
getWorkspaceMembers(slug)
```

---

### Phase 3 — Calendar: 타임라인/Gantt 뷰 (신규)

**파일**: `components/TimelineView.jsx` (CREATE, ~280줄)  
**파일**: `pages/CalendarPage.jsx` (뷰 탭 연결)

#### 뷰 전환 헤더

```
[월 뷰] [주 뷰] [일 뷰] [타임라인]   ← 기존 3개 + 타임라인 신규
```

#### 타임라인 레이아웃 (Custom SVG/DIV)

```
         Jun 1   Jun 8   Jun 15  Jun 22  Jun 30
Sprint1  ████████████████████████████
  Epic A          ●──────────────●
  Task 1                  ●──────●
  Task 2    ●──────────●
─────────────────────────────────────────────
Project B
  Sprint2                   ██████████████████
  Epic B                        ●────────●
```

- **x축**: 날짜 눈금 (월, px/day 계산, 3개월 기본 범위)
- **y축**: 프로젝트 → 스프린트 → 태스크 (들여쓰기)
- **태스크 바**: `start_date`~`due_date` (없으면 `due_date` 점 마커)
- **스프린트 블록**: 반투명 배경색 영역
- **오늘 선**: 빨간 수직 점선
- **클릭**: 태스크 → `?task=<id>` 딥링크 오픈

#### 사용 API (기존 재사용)

```js
getProjects(slug)
getSprints(slug, projectId)          // per project
getTasks(slug, projectId, { tree: true })   // per project (모든 태스크)
```

#### 컴포넌트 분리

```
TimelineView.jsx
  ├── TimelineHeader    날짜 눈금 (주/월 단위 레이블)
  ├── TimelineRow       프로젝트/스프린트/태스크 행
  │     ├── SprintBlock 배경 영역 바
  │     └── TaskBar     기간 바 (hover tooltip)
  └── TodayMarker       오늘 수직선
```

---

### Phase 4 — Calendar: 고급 인터랙션

**파일**: `pages/CalendarPage.jsx`

#### 4-1. 일 뷰 (Day View) — 0.5h

FullCalendar `timeGridDay` 플러그인 이미 설치됨 (`timeGridPlugin`에 포함).  
`headerToolbar` right에 `timeGridDay` 추가:

```js
headerToolbar={{ left:'prev,next today', center:'title', right:'dayGridMonth,timeGridWeek,timeGridDay,timeline' }}
```

#### 4-2. 드래그 날짜 범위 → 이벤트 생성 — 1h

FullCalendar `selectable: true` + `select` 콜백 추가:

```js
selectable: true,
select: (info) => {
  setQuickCreate({
    date: info.start,
    endDate: info.end,    // QuickCreatePopover에 end 추가
    pos: { x: info.jsEvent?.clientX || 400, y: info.jsEvent?.clientY || 300 }
  })
  calRef.current?.getApi()?.unselect()
},
```

QuickCreatePopover에 `endDate` prop 전달 → form 기본값 자동 입력.

#### 4-3. 이벤트 설명(description) 추가 — 1h

- `EventFormPanel`에 `<textarea>` 추가 (description 필드)
- `EventViewPopover`에 description 표시
- `CalendarEvent.description` 필드 이미 모델에 존재 ✅
- Serializer에 `description` 포함 여부 확인 후 추가

#### 4-4. 반복 이벤트 (Recurring Events) — 4~6h

**백엔드 변경:**

```python
# apps/calendars/models.py
recurrence_rule = models.CharField(max_length=200, blank=True, default='')
# RRULE 예시: "FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10"
```

```bash
# migration 생성
python manage.py makemigrations calendars  # → 0003_calendarevent_recurrence_rule
```

**프론트엔드:**

```bash
npm install @fullcalendar/rrule rrule
```

EventFormPanel 반복 선택 UI:

```
반복: [없음 ▼]
      없음
      매일
      매주 (요일 선택: 월 화 수 목 금 토 일)
      매월
      매년
```

→ RRULE string 생성 후 저장. FullCalendar `rrulePlugin` 추가.

---

### Phase 5 — Calendar: 아젠다 뷰 & UX 폴리싱

**파일**: `pages/CalendarPage.jsx`

#### 5-1. 아젠다 뷰 (향후 7일 이벤트 리스트)

MiniCalendar 하단 섹션 추가:

```
─────────────────────
다가오는 일정

오늘 (6/23)
  09:00  팀 회의         ●
  14:00  코드 리뷰       ●

내일 (6/24)
  11:00  클라이언트 미팅  ●

6/26
  ◆ Task Alpha 마감
─────────────────────
```

클라이언트에서 `events` 배열 필터링 (today~today+7), 날짜 그룹핑.

#### 5-2. 키보드 단축키

`useEffect` + `keydown` 이벤트:

| 키 | 동작 |
|----|------|
| `J` | 다음 날/주/월 이동 |
| `K` | 이전 날/주/월 이동 |
| `T` | 오늘로 이동 |
| `M` | 월 뷰 전환 |
| `W` | 주 뷰 전환 |
| `D` | 일 뷰 전환 |
| `N` | 새 이벤트 생성 폼 오픈 |

#### 5-3. 이벤트 지속시간 표시

FullCalendar `eventContent` 커스터마이징:

```js
eventContent: (info) => ({
  html: `<div class="fc-event-custom">
    <span>${info.event.title}</span>
    ${info.event.allDay ? '' : `<span class="fc-event-duration">${calcDuration(info.event)}</span>`}
  </div>`
})
```

---

### Phase 6 — Personal Daily Planner (Sunsama + Routine 스타일)

**라우트**: `/workspaces/:slug/planner` (신규)  
**파일**: `pages/DailyPlannerPage.jsx` (CREATE, ~380줄)  
**백엔드**: `apps/planner/` 신규 앱

#### UI 레이아웃

```
┌─────────────────────────────────────────────────────────────────────┐
│  헤더: 2026년 6월 23일 (월)     [← 어제] [오늘] [내일 →]   [무드 ●]  │
├───────────────────────┬─────────────────────┬───────────────────────┤
│  ① 오늘의 포커스      │  ② 타임블록 타임라인 │  ③ 일일 저널          │
│  (Things 3 Today)     │  (Sunsama 스타일)    │  (Day One 스타일)     │
│                       │                      │                       │
│  MIT 1: _____________ │  06:00 │             │  ✍️ 오늘 어땠나요?    │
│  MIT 2: _____________ │  07:00 │  🌅 기상    │  ─────────────────    │
│  MIT 3: _____________ │  08:00 │             │  [마크다운 에디터]     │
│                       │  09:00 │████ 팀 미팅 │                       │
│  ─────────────────    │  10:00 │             │  태그: #업무 #개인    │
│  오늘 완료: 3/8       │  11:00 │████ 코드리뷰│                       │
│  프로젝트 태스크:     │  12:00 │  🍱 점심   │  무드:                │
│  · [ ] Task Alpha     │  ...   │             │  😊 😐 😔 😤 🔥      │
│  · [x] Task Beta      │  22:00 │             │                       │
│  + 태스크 가져오기    │  23:00 │             │  에너지: ████░░ 4/6  │
└───────────────────────┴─────────────────────┴───────────────────────┘
```

#### 서브 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| `TodayFocusPanel` | MIT(Most Important Tasks) 3개 + 프로젝트 태스크 임포트 |
| `TimeBlockTimeline` | 06:00~23:00 슬롯, 드래그로 블록 생성/이동/삭제 |
| `TimeBlock` | 제목, 색상, 연결 태스크(optional), 더블클릭 편집 |
| `DailyJournal` | 마크다운 textarea (자동저장 500ms debounce) |
| `MoodSelector` | 이모지 5단계 선택 |
| `EnergySlider` | 1~6 슬라이더 |

#### 백엔드 모델 (신규 앱 `apps/planner/`)

```python
# apps/planner/models.py

class DailyEntry(models.Model):
    user      = models.ForeignKey(User, on_delete=models.CASCADE)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE)
    date      = models.DateField()
    journal   = models.TextField(blank=True, default='')  # markdown
    mood      = models.IntegerField(null=True, blank=True)    # 1~5
    energy    = models.IntegerField(null=True, blank=True)    # 1~6
    mit_1     = models.CharField(max_length=200, blank=True)
    mit_2     = models.CharField(max_length=200, blank=True)
    mit_3     = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'workspace', 'date')

class TimeBlock(models.Model):
    entry      = models.ForeignKey(DailyEntry, on_delete=models.CASCADE, related_name='time_blocks')
    title      = models.CharField(max_length=200)
    start_time = models.TimeField()   # "09:00"
    end_time   = models.TimeField()   # "10:30"
    color      = models.CharField(max_length=7, default='#6366f1')
    task       = models.ForeignKey('tasks.Task', null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
```

#### API 엔드포인트

```
GET/PATCH  /api/workspaces/<slug>/planner/<date>/        DailyEntry upsert
GET/POST   /api/workspaces/<slug>/planner/<date>/blocks/ TimeBlock CRUD
PATCH/DEL  /api/workspaces/<slug>/planner/<date>/blocks/<id>/
```

#### UI 디자인 방향 (Sunsama + Dark Luxury 혼합)

- 타임블록: 좌측 시간 눈금(32px 폭) + 우측 블록 영역 (1시간 = 60px)
- 블록 생성: 빈 영역 클릭-드래그 → 인라인 제목 입력
- 블록 색상: 프로젝트 색상 연동 or 수동 선택 (8색)
- 저널 영역: `font-family: 'Merriweather', Georgia, serif` — 일기 느낌의 serif 폰트
- 무드 선택: 큰 이모지 클릭 → 선택 시 soft glow 효과
- 날짜 네비: `← 어제 | 오늘 | 내일 →` 스와이프/클릭

---

### Phase 7 — Weekly Review & Planner (Obsidian + Sunsama 스타일)

**라우트**: `/workspaces/:slug/planner/week` (신규)  
**파일**: `pages/WeeklyPlannerPage.jsx` (CREATE, ~280줄)

#### UI 레이아웃

```
┌─────────────────────────────────────────────────────────────────────┐
│  2026년 6월 3주 (6/16 ~ 6/22)    [← 이전주] [이번주] [다음주 →]    │
├──────────────────────────────────────────────────────────────────────┤
│                         7일 미니 그리드                              │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐               │
│  │  월  │  화  │  수  │  목  │  금  │  토  │  일  │               │
│  │ 6/16 │ 6/17 │ 6/18 │ 6/19 │ 6/20 │ 6/21 │ 6/22 │               │
│  │ 😊   │ 😐   │ 🔥   │ 😊   │ 😔   │  -   │  -   │               │
│  │ 5/8  │ 3/6  │ 8/10 │ 4/7  │ 2/9  │      │      │               │
│  │ ●●●  │ ●●   │ ●●●● │ ●●●  │ ●    │      │      │               │
│  └──────┴──────┴──────┴──────┴──────┴──────┴──────┘               │
├──────────────────────────┬───────────────────────────────────────────┤
│  ① 주간 하이라이트       │  ② 다음 주 의도                          │
│  잘 된 것:               │  다음 주 집중할 것:                      │
│  [textarea]              │  [textarea]                               │
│                          │                                           │
│  아쉬운 것:              │  다음 주 MIT 3개:                        │
│  [textarea]              │  1. _______________                       │
│                          │  2. _______________                       │
│  배운 것:                │  3. _______________                       │
│  [textarea]              │                                           │
└──────────────────────────┴───────────────────────────────────────────┘
│  ③ 이번 주 완료 태스크 요약                                          │
│  · ✅ Task Alpha (Alpha 프로젝트) — 월요일                           │
│  · ✅ Task Beta  (Beta 프로젝트)  — 수요일                           │
│  · ↩️ 3개 태스크 다음 주로 이월                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 백엔드 모델

```python
class WeeklyReview(models.Model):
    user           = models.ForeignKey(User, on_delete=models.CASCADE)
    workspace      = models.ForeignKey(Workspace, on_delete=models.CASCADE)
    week_start     = models.DateField()   # 해당 주 월요일
    highlights     = models.TextField(blank=True, default='')   # 잘 된 것
    lowlights      = models.TextField(blank=True, default='')   # 아쉬운 것
    learnings      = models.TextField(blank=True, default='')   # 배운 것
    next_week_focus = models.TextField(blank=True, default='')  # 다음 주 의도
    next_mit_1     = models.CharField(max_length=200, blank=True)
    next_mit_2     = models.CharField(max_length=200, blank=True)
    next_mit_3     = models.CharField(max_length=200, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'workspace', 'week_start')
```

#### 7일 미니 그리드 데이터

- 각 날짜 셀: `DailyEntry`에서 mood, 완료 태스크 수(`●`), 일기 유무 표시
- 셀 클릭 → 해당 날의 `DailyPlannerPage`로 이동
- 빈 날(미래): 회색 처리

---

### Phase 8 — Habit Tracker (TickTick + Streaks 스타일)

**파일**: `components/HabitTracker.jsx` (CREATE, ~200줄)  
DailyPlannerPage 우하단 패널 또는 별도 `/planner/habits` 라우트

#### UI 레이아웃

```
┌─────────────────────────────────────────────────────┐
│  습관 트래커                              + 새 습관  │
├─────────────────────────────────────────────────────┤
│  💧 물 8잔     🔥 14일 연속              ● ● ● ● ● ● ● │
│                                          월 화 수 목 금 토 일 │
│  📚 독서 30분  🔥 7일 연속               ● ● ● ○ ● ● ○ │
│                                                      │
│  🏃 운동       최고: 21일                ○ ● ● ● ○ ○ ● │
│                                                      │
│  🧘 명상       🔥 3일 연속               ○ ○ ○ ● ● ● ● │
├─────────────────────────────────────────────────────┤
│  이번 달 완주율: 67%  ████████░░░░                   │
└─────────────────────────────────────────────────────┘
```

#### 백엔드 모델

```python
class Habit(models.Model):
    user      = models.ForeignKey(User, on_delete=models.CASCADE)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE)
    name      = models.CharField(max_length=100)
    icon      = models.CharField(max_length=10, default='⭐')   # 이모지
    color     = models.CharField(max_length=7, default='#6366f1')
    frequency = models.CharField(max_length=20, default='daily')  # daily/weekdays
    order     = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

class HabitLog(models.Model):
    habit      = models.ForeignKey(Habit, on_delete=models.CASCADE, related_name='logs')
    date       = models.DateField()
    completed  = models.BooleanField(default=True)

    class Meta:
        unique_together = ('habit', 'date')
```

#### 스트릭 계산 로직 (클라이언트)

```js
// 연속 일수 계산: logs를 날짜 내림차순으로 정렬 후 연속성 체크
const calcStreak = (logs) => {
  const sorted = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date))
  let streak = 0, prev = new Date()
  for (const log of sorted) {
    const d = new Date(log.date)
    const diff = Math.round((prev - d) / 86400000)
    if (diff > 1) break
    streak++; prev = d
  }
  return streak
}
```

#### API 엔드포인트

```
GET/POST   /api/workspaces/<slug>/habits/
PATCH/DEL  /api/workspaces/<slug>/habits/<id>/
GET/POST   /api/workspaces/<slug>/habits/<id>/logs/?month=2026-06
POST       /api/workspaces/<slug>/habits/<id>/logs/<date>/toggle/
```

---

### Phase 9 — Planner UI 폴리싱 (Dark Luxury 완성도)

**핵심 UI 규칙** (Sunsama + Craft 혼합):

#### 타임블록 스타일

```css
/* 타임블록 */
.time-block {
  border-left: 3px solid var(--block-color);
  background: color-mix(in oklch, var(--block-color) 12%, var(--bg-surface));
  border-radius: var(--r-md);
  padding: 6px 10px;
  cursor: grab;
  transition: transform 0.12s var(--ease), box-shadow 0.12s var(--ease);
}
.time-block:hover {
  transform: translateX(2px);
  box-shadow: -3px 0 12px color-mix(in oklch, var(--block-color) 30%, transparent);
}
```

#### 저널 영역

```css
.daily-journal textarea {
  font-family: 'Merriweather', Georgia, serif;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-primary);
  background: transparent;
  border: none; outline: none; resize: none;
  width: 100%; min-height: 200px;
}
```

#### 무드 이모지 애니메이션

```css
.mood-btn {
  font-size: 28px;
  transition: transform 0.2s var(--ease), filter 0.2s;
  filter: grayscale(0.5) opacity(0.6);
}
.mood-btn.selected {
  transform: scale(1.3);
  filter: grayscale(0) opacity(1);
}
.mood-btn:hover {
  transform: scale(1.15);
  filter: grayscale(0) opacity(0.9);
}
```

#### 주간 그리드 셀 스타일

- 기록 있는 날: 가벼운 glow border (`border: 1px solid var(--accent-muted)`)
- 완료 태스크 수: 작은 점 `●` (최대 5개, 초과는 `+N`)
- 오늘: `background: var(--accent-muted)`, 볼드 날짜
- 미래: `opacity: 0.35`, 점선 border

#### 사이드바 연결

- `Sidebar.jsx`에 `📓 플래너` NavItem 추가
- 하위: `오늘` + `이번 주` 링크 (accordion)

---

## 5. 구현 우선순위 및 순서

| 순서 | Phase | 내용 | 우선순위 | 예상 시간 | 의존성 |
|------|-------|------|----------|-----------|--------|
| 1 | 1 | Personal Home Dashboard | 🔴 HIGH | 5~7h | 없음 |
| 2 | 3 | Timeline/Gantt 뷰 | 🔴 HIGH | 8~12h | 없음 |
| 3 | 6 | Daily Planner (타임블록+저널+무드) | 🔴 HIGH | 8~12h | 백엔드 planner 앱 |
| 4 | 4-1 | 일 뷰 (Day View) | 🟡 MED | 0.5h | 없음 |
| 5 | 4-2 | 드래그 범위 선택 | 🟡 MED | 1h | 없음 |
| 6 | 4-3 | 이벤트 설명 | 🟡 MED | 1h | 없음 |
| 7 | 2 | Workspace 위젯 고도화 | 🟡 MED | 2~3h | Phase 1 |
| 8 | 7 | Weekly Review & Planner | 🟡 MED | 4~6h | Phase 6 |
| 9 | 8 | Habit Tracker | 🟡 MED | 4~5h | Phase 6 |
| 10 | 4-4 | 반복 이벤트 | 🟡 MED | 4~6h | 백엔드 migration |
| 11 | 5 | 아젠다 뷰 + UX 폴리싱 | 🟢 LOW | 2~3h | 없음 |
| 12 | 9 | Planner UI 폴리싱 | 🟢 LOW | 2~3h | Phase 6~8 |

**총 예상 작업량**: 41~59h (대형 작업, 단계별 분리 구현 강력 권장)

---

## 6. 파일 변경 목록

### 프론트엔드 (Frontend)

| 파일 | Action | 내용 |
|------|--------|------|
| `pages/DashboardPage.jsx` | UPDATE (전면 재작성) | Personal Home Dashboard 4섹션 |
| `pages/CalendarPage.jsx` | UPDATE | 일 뷰, 드래그 범위, 설명, 아젠다, 단축키 |
| `pages/WorkspacePage.jsx` | UPDATE | 워크로드 섹션, 건강도 바 |
| `components/TimelineView.jsx` | CREATE | Gantt/타임라인 뷰 (~280줄) |
| `components/Sidebar.jsx` | UPDATE | `🏠 홈` NavItem 추가 |
| `App.jsx` | UPDATE | `/workspaces/:slug/home` 라우트 추가 |
| `lib/workspaceApi.js` | UPDATE | 필요 시 신규 함수 (현재 모두 기존 재사용 가능) |

### 백엔드 (Calendar Phase 4-4)

| 파일 | Action | 내용 |
|------|--------|------|
| `apps/calendars/models.py` | UPDATE | `recurrence_rule = CharField(200)` 추가 |
| `apps/calendars/migrations/0003_*.py` | CREATE | migration |
| `apps/calendars/serializers.py` | UPDATE | `recurrence_rule` 필드 추가 |

### 백엔드 (Planner Phase 6~8 — 신규 앱)

| 파일 | Action | 내용 |
|------|--------|------|
| `apps/planner/__init__.py` | CREATE | 신규 Django 앱 |
| `apps/planner/models.py` | CREATE | `DailyEntry`, `TimeBlock`, `WeeklyReview`, `Habit`, `HabitLog` |
| `apps/planner/serializers.py` | CREATE | 각 모델 serializer |
| `apps/planner/views.py` | CREATE | DailyEntry upsert, TimeBlock CRUD, WeeklyReview, Habit, HabitLog toggle |
| `apps/planner/urls.py` | CREATE | `/planner/<date>/`, `/planner/week/<date>/`, `/habits/` |
| `apps/planner/migrations/0001_initial.py` | CREATE | 초기 migration |
| `config/settings/base.py` | UPDATE | `INSTALLED_APPS`에 `apps.planner` 추가 |
| `config/urls.py` | UPDATE | `/api/workspaces/<slug>/` 하위에 planner URL 연결 |

### 프론트엔드 API (신규 함수)

| 파일 | Action | 내용 |
|------|--------|------|
| `lib/workspaceApi.js` | UPDATE | `getDailyEntry`, `upsertDailyEntry`, `getTimeBlocks`, `createTimeBlock`, `updateTimeBlock`, `deleteTimeBlock`, `getWeeklyReview`, `upsertWeeklyReview`, `getHabits`, `createHabit`, `updateHabit`, `deleteHabit`, `toggleHabitLog` |

### 패키지 설치

```bash
cd /workspaces/Claude/PlanB/frontend
# Phase 4-4 반복 이벤트
npm install @fullcalendar/rrule rrule
# Phase 6 타임블록 드래그 (react-dnd 이미 없으면 @dnd-kit 재사용)
# 추가 패키지 없음 — @dnd-kit/core 이미 설치됨
```

---

## 7. 패턴 참조

| 카테고리 | 참조 파일:라인 | 패턴 |
|---------|----------------|------|
| 페이지 레이아웃 | `WorkspacePage.jsx:25` | CSS var 기반 dark luxury 스타일 |
| API 병렬 fetch | `CalendarPage.jsx:279` | `Promise.all(projects.map(...))` |
| 스프린트 통계 | `SprintPage.jsx` | `getSprintStats` + 번다운 |
| 활동 피드 | `TaskDrawer.jsx` | `getTaskActivity` → ActivityLog |
| 태스크 드로어 딥링크 | `ProjectPage.jsx` | `?task=<id>` URL 쿼리 파라미터 |
| FullCalendar 커스텀 CSS | `CalendarPage.jsx:367` | `.fc` 선택자 인라인 `<style>` |
| 스프린트 카드 | `SprintPage.jsx` | D-day 계산, 진행률 바 |

---

## 8. 리스크

| 리스크 | 가능성 | 대응 |
|--------|--------|------|
| Timeline SVG 렌더링 성능 (태스크 100+개) | 중 | 날짜 범위 3개월 제한, 뷰포트 밖 행 가상화 |
| 반복 이벤트 UI 복잡도 (수정 시 "이것만/전체") | 중 | MVP: daily/weekly/monthly 3종만, 시리즈 전체 수정만 지원 |
| 대시보드 첫 로딩 API 폭발 (N 프로젝트 × 태스크 fetch) | 중 | `Promise.all` 병렬 + 빈 상태 UX로 점진 로딩 |
| FullCalendar v6 + rrule plugin 호환 | 낮 | v6.1.x 공식 지원 확인됨 |
| 타임블록 드래그 충돌 (겹치는 블록) | 중 | 드롭 시 겹침 감지 → 경고 toast, 강제 이동 허용 |
| 자동저장 debounce 중 새로고침 시 저널 손실 | 중 | localStorage 임시 저장 → 서버 응답 후 제거 |
| 신규 Django 앱 `apps.planner` URL 충돌 | 낮 | 워크스페이스 하위 `/planner/` 네임스페이스 격리 |
| 습관 스트릭 계산 타임존 오류 | 중 | 백엔드에서 유저 타임존 기준 날짜 처리 (현재 UTC 고정 → 설정 추가 필요) |

---

## 9. 완료 기준 (Acceptance Criteria)

### Dashboard

- [ ] `/workspaces/:slug/home` 접속 시 개인화 대시보드 로드
- [ ] 내 태스크 그룹핑: 오늘/지연/이번주/나중
- [ ] 태스크 상태 변경이 대시보드에서 즉시 반영 (낙관적 업데이트)
- [ ] 활성 스프린트 진행률 및 D-day 표시
- [ ] 오늘 캘린더 이벤트 리스트 표시
- [ ] 최근 활동 피드 표시
- [ ] 사이드바 `🏠 홈` 링크 동작

### Calendar

- [ ] 타임라인 탭 전환 및 Gantt 뷰 렌더링
- [ ] 태스크 `start_date`~`due_date` 막대 표시
- [ ] 스프린트 블록 배경 표시
- [ ] 일 뷰(Day View) 전환 동작
- [ ] 드래그 날짜 범위 선택 → 폼 자동 입력
- [ ] 이벤트 설명 저장/표시
- [ ] 아젠다 뷰 (향후 7일) MiniCalendar 하단 표시
- [ ] J/K/T/M/W/D/N 키보드 단축키 동작

---

### Daily Planner

- [ ] `/workspaces/:slug/planner` 접속 시 오늘 날짜 일일 플래너 로드
- [ ] 날짜 네비(`← 어제 | 오늘 | 내일 →`) 동작
- [ ] MIT 3개 입력 및 자동저장
- [ ] 타임블록 드래그 생성/이동/삭제
- [ ] 타임블록에 프로젝트 태스크 연결
- [ ] 저널 마크다운 자동저장 (500ms debounce + localStorage 백업)
- [ ] 무드 5단계 선택 및 저장
- [ ] 에너지 슬라이더 저장
- [ ] 사이드바 `📓 플래너` 링크 동작

### Weekly Review

- [ ] `/workspaces/:slug/planner/week` 접속 시 이번 주 리뷰 로드
- [ ] 7일 미니 그리드에 무드/태스크수 표시
- [ ] 셀 클릭 → 해당 날 Daily Planner로 이동
- [ ] 하이라이트/아쉬운점/배운점 자동저장
- [ ] 다음 주 MIT 3개 설정
- [ ] 이번 주 완료 태스크 자동 집계

### Habit Tracker

- [ ] 습관 생성 (이름, 이모지, 색상)
- [ ] 오늘 습관 체크/언체크 (토글)
- [ ] 연속 스트릭 일수 정확히 계산
- [ ] 이번 주 7일 체크 도트 표시
- [ ] 이번 달 완주율 진행 바 표시

---

**Plan 파일 경로**: `.claude/plans/dashboard-calendar-upgrade.plan.md`

**WAITING FOR CONFIRMATION**: 위 plan (Dashboard + Calendar + Personal Planner/Diary) 전체 내용으로 구현을 시작할까요?  
우선순위 조정, 특정 Phase 제외, 또는 추가 기능이 있으면 알려주세요.
