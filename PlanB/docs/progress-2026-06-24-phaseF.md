# Phase F 완료 — 타임 트래킹

**완료일**: 2026-06-24
**빌드**: ✅ 성공 (2.08s)

---

## 변경 파일

### 백엔드
- `apps/tasks/models.py` — `TimeEntry` 모델 추가 (id UUID, task FK, user FK, started_at, ended_at nullable, duration_seconds, note, created_at)
- `apps/tasks/serializers.py` — `TimeEntry` import + `TimeEntrySerializer` 추가
- `apps/tasks/views.py` — `TimeEntryListCreateView`, `TimeEntryDetailView` 추가
- `apps/tasks/urls.py` — `time-entries/`, `time-entries/<entry_id>/` 라우트 추가
- `apps/tasks/migrations/0006_timeentry.py` — TimeEntry 테이블 생성

### 프론트엔드
- `src/lib/workspaceApi.js` — `getTimeEntries`, `createTimeEntry`, `deleteTimeEntry` 추가
- `src/components/TaskDrawer.jsx` — `TimeTrackingTab` 컴포넌트 추가 + ⏱ 시간 탭 통합

---

## API

```
GET    /api/workspaces/<slug>/projects/<pid>/tasks/<tid>/time-entries/
POST   /api/workspaces/<slug>/projects/<pid>/tasks/<tid>/time-entries/
       body: {started_at, ended_at, duration_seconds, note}
DELETE /api/workspaces/<slug>/projects/<pid>/tasks/<tid>/time-entries/<entry_id>/
```

## 타이머 동작

1. TaskDrawer → ⏱ 시간 탭 클릭
2. ▶ 타이머 시작 → setInterval로 elapsed 카운트업
3. 메모 입력 가능 (선택)
4. ⏹ 중지 → `createTimeEntry(started_at, ended_at, duration_seconds)` 호출
5. 기록 목록에 즉시 반영, 총 시간 합계 표시
6. 각 기록 옆 ✕ 버튼으로 삭제 가능

---

## 전체 구현 완료 요약

| Phase | 기능 | 상태 |
|-------|------|------|
| v7 | AI 기능 (Gemini) | ✅ |
| 계획 | BM 분석 + 업그레이드 계획 | ✅ |
| A | 커스텀 저장 뷰 | ✅ |
| B | 자동화 Rules | ✅ |
| C | GitHub 연동 | ❌ 사용자 제외 |
| D | 고급 Analytics | ✅ |
| E | 프로젝트 템플릿 | ✅ |
| F | 타임 트래킹 | ✅ |
