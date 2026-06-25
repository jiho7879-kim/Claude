# 연구 관리 기능 Add-up 타당성 검토

**작성일**: 2026-06-23  
**최종 업데이트**: 2026-06-24 (v3 — 현재 구현 상태 반영)  
**검토 범위**: 현재 PlanB UI·기능 유지 + 연구 노트·연구 관리 기능 추가 가능성

---

## 1. 현재 PlanB 기반 분석

| 기존 기능 | 연구 관리 전용 용도로 재사용 가능 여부 |
|-----------|--------------------------------------|
| Workspace | 연구 그룹 / 랩 단위 구분 |
| Project | 연구 프로젝트 단위 |
| Epic | 실험 목표 / 연구 주제 |
| Task | 실험 task (프로토콜 단계, 데이터 수집 등) |
| Subtask | 세부 실험 단계 |
| Sprint | 실험 사이클 / 논문 제출 스프린트 |
| Comments | 연구 논의·피드백 (TaskDrawer에 구현됨) |
| Calendar | 실험 일정·마감·발표일 (FullCalendar v6) |
| Relations (blocks/blocked_by) | 실험 의존성 (TaskDrawer relations 탭) |
| Daily Planner | 실험 일지 (일간 journal + time block) |
| Weekly Review | 주간 연구 회고 + MIT 3가지 |
| Timeline View | 연구 로드맵 간트 뷰 (캘린더 이벤트 + 플래너 할 일 포함) |

**결론**: 골격 구조는 이미 연구 관리에 적합. 추가 기능은 "연구 특화 레이어"로 얹으면 됨.

---

## 2. 현재 구현 상태 (2026-06-24 기준)

### 파일 구조

```
frontend/src/
  pages/
    ProjectPage.jsx         ← view = 'list'|'board' (연구 탭 미구현)
    ProjectSettingsPage.jsx
    DailyPlannerPage.jsx    ← 연구 일지로 활용 가능 (오늘 마감 프로젝트 태스크 자동 표시)
    WeeklyPlannerPage.jsx   ← 주간 연구 회고 (주간 요약 섹션 포함)
  components/
    TaskDrawer.jsx          ← tab = 'comments'|'relations'|'activity'
    TimelineView.jsx        ← 연구 로드맵 뷰 (캘린더 이벤트 + 플래너 할 일 통합)
    ResearchNotePanel.jsx   ← 구현됨 (ProjectPage 탭 연결 미완료)

backend/apps/
  projects/                 ← Project 모델 (project_type, publication_status 필드 구현됨)
  tasks/                    ← Task, Sprint, Comments
  planner/                  ← DailyEntry, Habit, WeeklyReview
  research/                 ← ResearchNote, Dataset, Reference 모델 구현됨
                               (API endpoints 구현됨, UI 연결 미완료)
```

### 구현 완료 항목

| 항목 | 상태 |
|------|------|
| `apps/research/` — ResearchNote, Dataset, Reference 모델 | 완료 |
| `apps/research/` — serializer, views, urls | 완료 |
| `apps/projects/models.py` — project_type, publication_status 필드 | 완료 |
| `components/ResearchNotePanel.jsx` — 노트 UI 컴포넌트 | 완료 |
| `ProjectPage.jsx` — 연구 탭 (notes/datasets/refs/publication) | 미완료 |
| `ProjectSettingsPage.jsx` — research 토글 + publication UI | 미완료 |
| `WorkspacePage.jsx` — 논문 상태 배지 | 미완료 |
| `DatasetPanel.jsx` — 데이터셋 UI | 미완료 |
| `ReferencePanel.jsx` — 레퍼런스 + DOI 검색 UI | 미완료 |

---

## 3. 기능 추가 가능성 평가 (v3 — 현재 구현 기반)

### 3.1 연구 노트 (Lab Notebook) — P0 거의 완료

**현재 상태**: 백엔드 모델 + serializer + API + 프론트 컴포넌트 모두 구현됨.
**남은 작업**: `ProjectPage.jsx`에 `view='notes'` 탭 추가 + ResearchNotePanel 연결만 하면 됨.

**남은 파일**:
- `frontend/src/pages/ProjectPage.jsx` — view state에 `'notes'` 추가, tab 버튼 추가, ResearchNotePanel import 및 렌더링
- `frontend/src/lib/researchApi.js` — API 함수 (없으면 생성)

**예상 시간**: 1시간 (이미 80% 완료)

---

### 3.2 논문 상태 추적 (Publication Tracker) — P0 거의 완료

**현재 상태**: `Project` 모델에 `project_type`, `publication_status` 필드 구현됨.
**남은 작업**: UI 연결만 필요.

**남은 파일**:
- `frontend/src/pages/ProjectSettingsPage.jsx` — research 모드 토글 + publication 필드 UI
- `frontend/src/pages/ProjectPage.jsx` — project_type 기반 조건부 탭 표시
- `frontend/src/pages/WorkspacePage.jsx` — 논문 상태 배지

**예상 시간**: 1~2시간

---

### 3.3 데이터셋 추적 (Dataset Tracker) — P1

**현재 상태**: 백엔드 모델 구현됨.
**남은 작업**: 프론트 UI 전체.

**남은 파일**:
- `frontend/src/components/DatasetPanel.jsx` — 테이블 목록 + 추가 폼
- `frontend/src/pages/ProjectPage.jsx` — view='datasets' 탭 추가 (research 타입만)

**예상 시간**: 2시간

---

### 3.4 레퍼런스 관리 (Literature Reference) — P1

**현재 상태**: 백엔드 모델 구현됨. Crossref proxy 구현 여부 확인 필요.
**남은 작업**: DOI 검색 프록시 + 프론트 UI.

**남은 파일**:
- `frontend/src/components/ReferencePanel.jsx` — DOI 입력 + 목록 UI
- `frontend/src/pages/ProjectPage.jsx` — view='refs' 탭 추가 (research 타입만)
- `apps/research/views.py` — Crossref proxy view (확인 필요)

**예상 시간**: 2~3시간

---

### 3.5 실험 프로토콜 (SOP/Protocol) — P2

**상태**: 보류

---

### 3.6 가설-결과 추적 — P2

**상태**: 보류

---

### 3.7 그랜트/펀딩 관리 — P3

**상태**: 보류

---

## 4. 구현 우선순위 매트릭스 (v3)

| 기능 | 연구 가치 | 구현 난이도 | 우선순위 | 상태 |
|------|----------|------------|---------|------|
| 연구 노트 (Lab Notebook) | 높음 | 매우 낮음 | P0 | UI 연결만 남음 |
| 논문 상태 추적 + project_type | 높음 | 낮음 | P0 | UI 연결만 남음 |
| 데이터셋 추적 | 중간 | 낮음 | P1 | 프론트 UI 필요 |
| 레퍼런스 관리 (DOI) | 중간 | 중간 | P1 | 프론트 UI + DOI proxy 필요 |
| 실험 프로토콜 (SOP) | 중간 | 중간 | P2 | 보류 |
| 가설-결과 추적 | 중간 | 중간 | P2 | 보류 |
| 그랜트/펀딩 관리 | 낮음 | 낮음 | P3 | 보류 |

---

## 5. 아키텍처 접근 방식

### 현재 구조 (구현 완료)

```
apps/
  projects/    ← project_type (standard|research), publication 필드 5개
  research/    ← ResearchNote, Dataset, Reference (신규 앱) 모두 구현됨
```

### UI 탭 구조 (ProjectPage.jsx — 구현 목표)

```
Standard 프로젝트: [리스트] [보드]
Research 프로젝트: [리스트] [보드] [노트] [데이터셋] [레퍼런스] [논문]
```

### research API 확인 필요

```
GET/POST   /api/workspaces/<slug>/projects/<id>/notes/
GET/POST   /api/workspaces/<slug>/projects/<id>/datasets/
GET/POST   /api/workspaces/<slug>/references/
POST       /api/workspaces/<slug>/references/doi-lookup/   (Crossref proxy)
```

---

## 6. 추가 필요 패키지

| 용도 | 패키지 | 상태 |
|------|--------|------|
| Markdown 렌더링 | `react-markdown` + `remark-gfm` | 설치 여부 확인 필요 |
| DOI 메타데이터 | Crossref REST API 프록시 | Django `requests` (이미 설치됨) |

---

## 7. 남은 구현 Phase 계획

### Phase R1 — ProjectPage 연구 탭 연결 (P0, 약 2시간)

| 파일 | 작업 |
|------|------|
| `frontend/src/pages/ProjectPage.jsx` | research 탭 (notes/datasets/refs/publication) 조건부 표시 |
| `frontend/src/pages/ProjectSettingsPage.jsx` | research 토글 + publication UI |
| `frontend/src/pages/WorkspacePage.jsx` | 논문 상태 배지 추가 |
| `frontend/src/lib/researchApi.js` | API 함수 레이어 (없으면 생성) |

### Phase R2 — Dataset + Reference 프론트 UI (P1, 약 4시간)

| 파일 | 작업 |
|------|------|
| `frontend/src/components/DatasetPanel.jsx` | 데이터셋 UI 구현 |
| `frontend/src/components/ReferencePanel.jsx` | DOI 검색 + 목록 UI |
| `apps/research/views.py` | Crossref proxy 뷰 추가 (미구현 시) |
| `frontend/src/pages/ProjectPage.jsx` | datasets/refs 탭 추가 |

---

## 8. 결론 및 권고 (v3)

현재 PlanB는 연구 관리 백엔드(ResearchNote, Dataset, Reference 모델)와 핵심 컴포넌트(ResearchNotePanel)까지 구현된 상태로, **UI 연결만으로 바로 사용 가능한 단계**.

**총 남은 구현 시간**: Phase R1 = 2시간, R2 = 4시간  
**권고**: Phase R1(ProjectPage 탭 연결)을 즉시 시작하면 연구 노트 + 논문 추적 기능 즉시 활성화 가능.
