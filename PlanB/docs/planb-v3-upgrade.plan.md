# PlanB v3 업그레이드 플랜

**작성일:** 2026-06-23  
**기준 BM:** Linear, Height, Flow, Notion, Asana  
**현재 완성도:** v2 (Phase 1-10 완료)

---

## Executive Summary

v2에서 핵심 기능 구조는 완성됐다. v3의 목표는 세 가지다:
1. **달력 UX 전면 개선** — 가장 많이 쓰는 화면인데 가장 촌스럽다
2. **프로젝트 관리 완성** — 설정(이름/상태/설명 수정), 삭제, 멤버 권한이 없다
3. **관계형 태스크** — 블로킹/마일스톤으로 실전 PM 도구다운 깊이를 더한다

---

## 벤치마크 핵심 인사이트

### Linear
- **이슈 드로어**: 좌측 메타, 우측 본문 2-column 레이아웃 → 정보 밀도↑
- **상태 순환**: 클릭 한 번으로 상태 변경 (드롭다운 없이 아이콘 클릭)
- **블로킹 관계**: "Blocked by #123" 배지가 이슈 목록에서 바로 보임

### Height
- **캘린더**: 왼쪽 미니 달력(날짜 네비게이터) + 태스크 due-date 점으로 표시
- **이벤트 팝오버**: 모달 대신 슬라이드업 팝오버로 빠른 편집
- **드래그 리사이즈**: 이벤트 끝을 드래그해 기간 조절

### Flow
- **프로젝트 설정**: 별도 설정 페이지 (이름/색상/상태/멤버 한 곳에서)
- **아카이브**: 프로젝트 보관 처리 (삭제와 다름)
- **미리보기 카드**: 태스크 목록 hover 시 상세 팝오버

### Notion
- **캘린더 날짜 클릭**: 클릭 → 인라인 이벤트 생성 (모달 없이)
- **데이터베이스 뷰**: 같은 데이터를 표/보드/캘린더/타임라인으로 전환

### Asana
- **타임라인**: Gantt 스타일 막대 차트 (Phase 뒤로 미룸)
- **마일스톤**: ◆ 아이콘, 날짜만 있는 체크포인트
- **프로젝트 아카이브/삭제**: 설정 페이지 내 위험 구역

---

## v3 Phase 계획

### Phase 11 — 프로젝트 설정 & 삭제 [즉시]

**목표:** 프로젝트 이름/설명/상태 수정 + 아카이브 + 삭제

**백엔드:**
- `ProjectDetailView.patch` — 이름/설명/상태 수정
- `ProjectDetailView.delete` — 프로젝트 삭제 (확인 필요)
- `GET /api/workspaces/<slug>/projects/<id>/` — 단건 조회 (이미 있음)

**프론트엔드:**
- `ProjectSettingsPage.jsx` — 설정 전용 페이지
  - General: 이름/설명 수정 폼
  - Status: 상태 변경 (planning/active/archived)
  - Danger zone: 아카이브 / 삭제 버튼 (삭제 시 프로젝트 이름 재입력 확인)
- `Sidebar.jsx` — 프로젝트 링크에 ⚙ 설정 아이콘 추가
- `App.jsx` — `/workspaces/:slug/projects/:projectId/settings` 라우트

---

### Phase 12 — 캘린더 UX 전면 개선 [최우선]

**목표:** Flow/Height 수준의 캘린더 UX

**개선 항목:**

#### 12-1. 미니 달력 사이드바
- FullCalendar 왼쪽에 월 미니 달력 (직접 구현, 240px 고정)
- 날짜 클릭 → 메인 캘린더 해당 날로 점프
- 오늘/이번 주 빠른 이동 버튼
- 이벤트 있는 날짜에 점(dot) 표시

#### 12-2. 이벤트 팝오버 (모달 → 팝오버)
- 현재: 이벤트 클릭 → 모달 오버레이
- 개선: 클릭 위치 기준 팝오버 (280px, 애니메이션)
- 팝오버 내 인라인 편집 (contentEditable 타이틀)
- 삭제/편집 액션 버튼

#### 12-3. 날짜 클릭 → 빠른 이벤트 추가
- 현재: 별도 버튼 클릭 후 모달
- 개선: 빈 날짜 클릭 → 팝오버로 제목만 입력 후 즉시 생성

#### 12-4. 태스크 due-date 점 표시
- 캘린더에 이벤트와 별도로 태스크 마감일 점 렌더링
- 클릭 시 TaskDrawer 열기

#### 12-5. 이벤트 색상 구분
- 공개/비공개 대신 **프로젝트별 색상** 적용
- CSS 변수로 프로젝트 색상 팔레트 정의

#### 12-6. 드래그 리사이즈
- FullCalendar `eventResizableFromStart` + `eventResize` 콜백
- 리사이즈 후 PATCH 요청

---

### Phase 13 — 태스크 관계 & 마일스톤 [기능 깊이]

**목표:** Linear/Asana 수준 관계형 태스크

#### 13-1. 블로킹 관계
- **백엔드:** `TaskRelation` 모델 (from_task, to_task, type: blocks/blocked_by)
- **API:** `POST /tasks/<id>/relations/`, `DELETE /tasks/<id>/relations/<rid>/`
- **프론트:** TaskDrawer에 "Blocked by / Blocking" 섹션
- 태스크 목록에서 블록된 태스크에 🔴 뱃지

#### 13-2. 마일스톤
- **백엔드:** `Task.is_milestone` Boolean 필드 + 마이그레이션
- **프론트:** ProjectPage 리스트에서 ◆ 아이콘으로 표시
- 마일스톤은 하위 태스크 없음, 날짜만 있음

---

### Phase 14 — UI 폴리싱 [마무리]

**목표:** Height/Linear 수준의 시각적 완성도

#### 14-1. 뱃지/버튼 모서리 통일
- 현재 Status 뱃지: `var(--r-md)` (6px)
- 개선: pill 스타일 `var(--r-full)` (9999px)

#### 14-2. 태스크 리스트 스태거 애니메이션
- 태스크 행이 로딩 후 순차적으로 fade-in (0.05s 간격)
- CSS `animation-delay` + `@keyframes fadeIn`

#### 14-3. 칸반 카드 드롭 피드백
- 드래그 완료 시 목표 컬럼 카드가 flash 효과
- `@keyframes cardDrop { 0%{background: var(--accent-muted)} 100%{background: transparent} }`

#### 14-4. 사이드바 폴드
- 사이드바 토글 버튼 (240px ↔ 56px 아이콘 모드)
- `localStorage`로 상태 저장

---

## 기술 부채 & 버그 수정

| 항목 | 원인 | 수정 |
|------|------|------|
| ✅ 스프린트 생성 안 됨 | URL `/projects/<id>/sprints/` 누락 | `config/urls.py`에 sprint_urls 추가 |
| ⬜ 프로젝트 설정 없음 | 미구현 | Phase 11 |
| ⬜ 프로젝트 삭제 없음 | 미구현 | Phase 11 |
| ⬜ 캘린더 UI 촌스러움 | 모달/레이아웃 단순 | Phase 12 |

---

## 우선순위 매트릭스

| Phase | 영향도 | 구현 난이도 | 우선순위 |
|-------|--------|-------------|----------|
| 11 — 프로젝트 설정/삭제 | ⭐⭐⭐⭐⭐ | 낮음 | 🔴 즉시 |
| 12 — 캘린더 UX | ⭐⭐⭐⭐⭐ | 중간 | 🔴 즉시 |
| 13 — 태스크 관계 | ⭐⭐⭐⭐ | 중간 | 🟡 다음 |
| 14 — UI 폴리싱 | ⭐⭐⭐ | 낮음 | 🟢 순차 |

