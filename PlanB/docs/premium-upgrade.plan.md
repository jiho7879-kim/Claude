# Plan: PlanB v8 — 프리미엄 기능 업그레이드

**작성일**: 2026-06-24  
**기반 분석**: `premium-competitive-analysis.md`  
**복잡도**: Large  
**예상 기간**: 약 3~4주

---

## 요약

경쟁사(Linear/Height/Asana/ClickUp) 프리미엄 기능 BM 결과, PlanB에 가장 임팩트 있는 추가 기능은  
**① 자동화 Rules** **② GitHub/GitLab 연동** **③ 커스텀 저장 뷰** **④ 고급 Analytics** **⑤ 프로젝트 템플릿** 순이다.  
PlanB만의 강점(Research Management, Daily Planner, AI)을 유지하면서 위 5가지 기능으로 유료 전환율을 높인다.

---

## 현재 상태 (v7 완료 기준)

| 기능 그룹 | 상태 |
|-----------|------|
| Dark Luxury 디자인 시스템 | ✅ |
| 칸반/리스트/타임라인 뷰 | ✅ |
| 스프린트/번다운 | ✅ |
| Command Palette (Cmd+K) | ✅ |
| Calendar (FullCalendar, 타임라인) | ✅ |
| Daily Planner + 습관 + 주간 회고 | ✅ |
| Research Management (노트/데이터셋/레퍼런스) | ✅ |
| AI 기능 (Gemini: NL 태스크, Epic 분해, 주간 요약) | ✅ |
| **커스텀 저장 뷰** | ⏳ Phase A |
| **자동화 Rules** | ⏳ Phase B |
| **GitHub/GitLab 연동** | ⏳ Phase C |
| **고급 Analytics** | ⏳ Phase D |
| **프로젝트 템플릿** | ⏳ Phase E |
| **타임 트래킹** | ⏳ Phase F |

---

## Phase 계획

### Phase A — 커스텀 저장 뷰 (P0, 2~3일)

**경쟁사 근거**: Linear Plus, Height Pro, Plane Pro, 전 경쟁사 공통  
**유저 임팩트**: 개인/팀별 필터 조합 저장 → 매일 같은 필터 반복 클릭 제거

#### 백엔드 변경 파일
```
apps/workspaces/models.py      ← SavedView 모델 추가
apps/workspaces/serializers.py ← SavedViewSerializer
apps/workspaces/views.py       ← SavedViewListCreateView, SavedViewDetailView
apps/workspaces/urls.py        ← /saved-views/, /saved-views/<id>/
```

**SavedView 모델**:
```python
class SavedView(models.Model):
    workspace = ForeignKey(Workspace)
    project   = ForeignKey(Project, null=True, blank=True)
    owner     = ForeignKey(User)
    name      = CharField(max_length=100)
    filters   = JSONField(default=dict)   # { status, priority, assignee, search, sprint }
    view_type = CharField(choices=['list','board'])
    is_shared = BooleanField(default=False)
    created_at = DateTimeField(auto_now_add=True)
```

#### 프론트엔드 변경 파일
```
src/lib/workspaceApi.js        ← getSavedViews, createSavedView, deleteSavedView
src/components/SavedViewBar.jsx ← 저장 뷰 탭 바 컴포넌트
src/pages/ProjectPage.jsx      ← SavedViewBar 통합, "💾 뷰 저장" 버튼
```

---

### Phase B — 자동화 Rules (P0, 4~5일)

**경쟁사 근거**: Asana Premium, Height Pro, ClickUp Business — 유료 전환 동인 #1  
**유저 임팩트**: 반복 수작업 완전 제거 ("태스크 Done → 담당자에게 알림")

#### 백엔드 변경 파일
```
apps/automation/               ← 신규 앱
  __init__.py
  apps.py
  models.py                    ← Rule, RuleLog 모델
  serializers.py
  views.py
  urls.py
  executor.py                  ← Rule 실행 엔진 (post_save signal 연결)
  migrations/0001_initial.py
config/settings/base.py        ← INSTALLED_APPS에 apps.automation 추가
config/urls.py                 ← /projects/<id>/rules/ 라우팅 추가
apps/tasks/apps.py             ← post_save signal 등록
```

**Rule 모델**:
```python
class Rule(models.Model):
    class Trigger(TextChoices):
        STATUS_CHANGED   = 'status_changed'
        PRIORITY_CHANGED = 'priority_changed'
        DUE_DATE_PASSED  = 'due_date_passed'
        TASK_CREATED     = 'task_created'
        ASSIGNED         = 'assigned'

    class Action(TextChoices):
        NOTIFY_ASSIGNEE = 'notify_assignee'
        CHANGE_STATUS   = 'change_status'
        CHANGE_PRIORITY = 'change_priority'
        ASSIGN_TO       = 'assign_to'

    project     = ForeignKey(Project, on_delete=CASCADE)
    name        = CharField(max_length=100)
    trigger     = CharField(choices=Trigger.choices)
    trigger_val = JSONField(default=dict)
    action      = CharField(choices=Action.choices)
    action_val  = JSONField(default=dict)
    is_active   = BooleanField(default=True)
```

#### 프론트엔드 변경 파일
```
src/lib/automationApi.js        ← getRules, createRule, updateRule, deleteRule
src/pages/AutomationPage.jsx    ← Rule CRUD UI (When/Then 빌더)
src/App.jsx                     ← /projects/:projectId/automation 라우트
src/components/Sidebar.jsx      ← ⚡ 자동화 서브링크
```

---

### Phase C — GitHub/GitLab 연동 (P0, 4~5일)

**경쟁사 근거**: Linear Plus, Height Pro — 개발팀 유료 전환 킬러 피처  
**유저 임팩트**: PR 머지 → 태스크 자동 Done 전환, TaskDrawer에 PR 목록 표시

#### 백엔드 변경 파일
```
apps/integrations/             ← 신규 앱
  __init__.py
  apps.py
  models.py                    ← GitIntegration 모델
  views.py                     ← WebhookView, IntegrationView
  urls.py
  github.py                    ← GitHub Webhook 파싱 + 서명 검증
  migrations/0001_initial.py
config/urls.py                 ← /api/webhooks/github/, /integrations/ 추가
apps/tasks/models.py           ← Task.git_links JSONField 추가
apps/tasks/migrations/         ← migration 추가
```

**GitIntegration 모델**:
```python
class GitIntegration(models.Model):
    workspace      = ForeignKey(Workspace, on_delete=CASCADE)
    provider       = CharField(choices=[('github','GitHub'),('gitlab','GitLab')])
    repo_url       = URLField()
    webhook_secret = CharField(max_length=200)
    is_active      = BooleanField(default=True)
    created_at     = DateTimeField(auto_now_add=True)
```

#### 프론트엔드 변경 파일
```
src/pages/IntegrationPage.jsx     ← GitHub/GitLab 연동 설정
src/components/TaskDrawer.jsx     ← 🔗 Git 탭 추가 (연결된 PR 목록)
src/lib/integrationApi.js         ← getIntegrations, createIntegration
src/App.jsx                       ← /workspaces/:slug/integrations 라우트
src/components/Sidebar.jsx        ← 🔌 통합 링크
```

---

### Phase D — 고급 Analytics (P1, 3~4일)

**경쟁사 근거**: Linear Plus, Height Pro, Plane Pro, Asana Premium  
**유저 임팩트**: 팀 속도/번업/리드타임 시각화 → 관리자/PM 설득 포인트

#### 백엔드 변경 파일
```
apps/tasks/analytics.py       ← 집계 로직 (속도, 번업, 리드타임, 처리량)
apps/tasks/views.py           ← AnalyticsView 추가
apps/tasks/urls.py            ← /analytics/ 엔드포인트
```

**API 응답 구조**:
```json
{
  "velocity": [{ "sprint_id": "", "planned": 10, "completed": 8, "date": "2026-06-01" }],
  "burnup": [{ "date": "2026-06-01", "total": 20, "done": 5 }],
  "lead_time": { "avg_days": 3.2, "p50": 2, "p90": 7 },
  "throughput": [{ "week": "2026-W24", "count": 12 }],
  "status_distribution": { "todo": 5, "in_progress": 3, "done": 20, "cancelled": 1 },
  "overdue_trend": [{ "date": "2026-06-01", "count": 2 }]
}
```

#### 프론트엔드 변경 파일
```
src/pages/AnalyticsPage.jsx       ← 종합 Analytics 대시보드
src/components/BurnupChart.jsx    ← 번업 차트 (recharts LineChart)
src/components/LeadTimeChart.jsx  ← 리드타임 히스토그램 (recharts BarChart)
src/App.jsx                       ← /projects/:projectId/analytics 라우트
src/components/Sidebar.jsx        ← 📊 애널리틱스 서브링크
src/lib/workspaceApi.js           ← getAnalytics 함수 추가
```

---

### Phase E — 프로젝트 템플릿 (P1, 2~3일)

**경쟁사 근거**: Height Pro, Asana Premium, ClickUp Unlimited  
**유저 임팩트**: 새 프로젝트 생성 시 템플릿 선택 → 즉시 Epic + Task 구조 자동 생성

#### 백엔드 변경 파일
```
apps/projects/models.py       ← ProjectTemplate 모델 추가
apps/projects/serializers.py  ← ProjectTemplateSerializer
apps/projects/views.py        ← TemplateListView, ProjectFromTemplateView
apps/projects/urls.py         ← /templates/, /from-template/
apps/projects/migrations/     ← migration + 초기 데이터 fixture
```

**내장 템플릿 5종**:
1. 🚀 스프린트 기반 개발
2. 📄 논문 작성 (research 타입)
3. 📱 모바일 앱 출시
4. 🎨 디자인 프로젝트
5. 📋 일반 프로젝트

#### 프론트엔드 변경 파일
```
src/components/TemplateGallery.jsx ← 템플릿 카드 그리드
src/pages/WorkspacePage.jsx        ← 프로젝트 생성 모달에 템플릿 탭 추가
src/lib/workspaceApi.js            ← getTemplates, createFromTemplate
```

---

### Phase F — 타임 트래킹 (P1, 2~3일)

**경쟁사 근거**: ClickUp Business, Monday.com Pro  
**PlanB 차별화**: Daily Planner 타임블록과 자동 연동

#### 백엔드 변경 파일
```
apps/tasks/models.py          ← TimeEntry 모델 추가
apps/tasks/serializers.py     ← TimeEntrySerializer
apps/tasks/views.py           ← TimeEntryListCreateView, TimeEntryDetailView
apps/tasks/urls.py            ← /tasks/<id>/time-entries/
apps/tasks/migrations/        ← migration
apps/planner/views.py         ← 타임블록 완료 시 TimeEntry 자동 생성 연동
```

#### 프론트엔드 변경 파일
```
src/components/TaskDrawer.jsx    ← ⏱ 타임 트래킹 탭 (타이머 + 기록 목록)
src/pages/DailyPlannerPage.jsx   ← 타임블록 완료 → 연결된 태스크 TimeEntry 자동 생성
src/lib/workspaceApi.js          ← getTimeEntries, createTimeEntry, deleteTimeEntry
```

---

## 구현 순서 및 일정

| Phase | 기능 | 기간 | 우선순위 | 유료 전환 임팩트 |
|-------|------|------|---------|----------------|
| A | 커스텀 저장 뷰 | 2~3일 | P0 | 중 |
| B | 자동화 Rules | 4~5일 | P0 | 최고 |
| C | GitHub 연동 | 4~5일 | P0 | 높음 |
| D | 고급 Analytics | 3~4일 | P1 | 높음 |
| E | 프로젝트 템플릿 | 2~3일 | P1 | 중 |
| F | 타임 트래킹 | 2~3일 | P1 | 중 |

**총 예상**: 17~23일  
**P0만 (A+B+C)**: 10~13일 → 즉시 핵심 유료 전환 동인 확보

---

## Phase별 완료 기준 (Acceptance)

- [ ] **Phase A**: 저장 뷰 생성/적용/삭제, 팀 공유 가능, 빌드 통과
- [ ] **Phase B**: 5가지 트리거 + 4가지 액션, 실행 로그 기록, 빌드 통과
- [ ] **Phase C**: GitHub PR 생성 → TaskDrawer 표시, PR Merged → Done 자동 전환, 빌드 통과
- [ ] **Phase D**: 번업/속도/리드타임 차트 정확한 데이터, 빌드 통과
- [ ] **Phase E**: 5종 내장 템플릿 적용 시 태스크 자동 생성, 빌드 통과
- [ ] **Phase F**: TaskDrawer 타이머, Planner 타임블록 자동 연동, 빌드 통과

---

## 위험 요소

| 위험 | 가능성 | 완화 방안 |
|------|--------|----------|
| GitHub Webhook 보안 검증 누락 | 중간 | `hmac.compare_digest` 서명 검증 필수 |
| 자동화 Rule 무한루프 | 낮음 | 실행 깊이 제한 (max depth 3) |
| URL prefix 충돌 (research/ai/automation) | 낮음 | Django include() 순서 확인 |
| 번들 크기 증가 | 낮음 | recharts 기설치, 신규 패키지 최소화 |

---

## Progress 문서 규칙

각 Phase 완료 후 아래 경로에 날짜가 포함된 progress 문서를 생성한다:
```
PlanB/docs/progress-{YYYY-MM-DD}-phase{X}.md
```

예시:
- `PlanB/docs/progress-2026-06-24-phaseA.md`
- `PlanB/docs/progress-2026-06-25-phaseB.md`

---

## 신규 패키지

| 패키지 | 용도 | Phase |
|--------|------|-------|
| (없음 추가 불필요) | recharts 기설치, requests 기설치 | — |

---

*참조: `premium-competitive-analysis.md` | 이전 계획: `planb-upgrade.plan.md`*
