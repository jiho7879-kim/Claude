# Phase D 완료 — 고급 Analytics

**완료일**: 2026-06-24
**빌드**: ✅ 성공 (1.87s)

---

## 변경 파일

### 백엔드
- `apps/tasks/analytics.py` — 신규: velocity, burnup, lead_time, throughput, summary 집계 함수
- `apps/tasks/views.py` — AnalyticsView 추가 (analytics_module import)
- `apps/tasks/urls.py` — `analytics/` 엔드포인트 추가

### 프론트엔드
- `src/lib/workspaceApi.js` — `getAnalytics(slug, projectId)` 추가
- `src/components/BurnupChart.jsx` — 신규: recharts LineChart (전체 vs 완료)
- `src/components/LeadTimeChart.jsx` — 신규: recharts BarChart (리드타임 분포)
- `src/pages/AnalyticsPage.jsx` — 신규: 종합 Analytics 대시보드
- `src/App.jsx` — `/analytics` 라우트 추가
- `src/components/Sidebar.jsx` — 📊 애널리틱스 서브링크 추가

---

## API

```
GET /api/workspaces/<slug>/projects/<id>/analytics/
→ {
    summary:    { total, by_status, by_priority }
    burnup:     [ { date, total, done } ]          # 30일
    velocity:   [ { week, done } ]                 # 8주
    lead_time:  [ { days, count } ]                # 히스토그램
    throughput: [ { date, done } ]                 # 30일
  }
```

## 집계 방식

- **번업**: TruncDate + annotate로 일별 생성/완료 집계 → Python에서 누적합
- **속도**: TruncWeek + annotate → 주별 완료 태스크 수
- **리드타임**: created_at→updated_at 기간(일) 히스토그램
- **처리량**: TruncDate + annotate → 일별 완료 수

## 대시보드 구성

1. 상태별 요약 카드 (전체 / 할 일 / 진행 중 / 완료 / 취소)
2. 우선순위별 요약 카드 (긴급 / 높음 / 보통 / 낮음)
3. 번업 차트 (30일 LineChart)
4. 주간 완료 속도 (8주 BarChart)
5. 일별 처리량 (30일 BarChart)
6. 리드 타임 분포 (BarChart 히스토그램)

## 다음: Phase E — 프로젝트 템플릿
