# Phase B 완료 — 자동화 Rules

**완료일**: 2026-06-24  
**빌드**: ✅ 성공 (1.61s)

---

## 변경 파일

### 백엔드 (신규: apps/automation/)
- `apps.py` — AutomationConfig, ready()에서 signals 로드
- `models.py` — Rule(5트리거, 4액션), RuleLog
- `serializers.py` — RuleSerializer, RuleLogSerializer
- `executor.py` — Rule 실행 엔진 (depth≤3 무한루프 방지)
- `signals.py` — pre_save 스냅샷 + post_save → run_rules
- `views.py` — RuleListCreateView, RuleDetailView, RuleLogListView
- `urls.py` — /rules/, /rules/<id>/, /rules/<id>/logs/
- `migrations/0001_initial.py`
- `config/settings/base.py` — INSTALLED_APPS 추가
- `config/urls.py` — automation urls 등록

### 프론트엔드
- `src/lib/automationApi.js` — CRUD + logs API
- `src/pages/AutomationPage.jsx` — When/Then 빌더 UI
- `src/App.jsx` — /automation 라우트
- `src/components/Sidebar.jsx` — ⚡ 자동화 링크

---

## 트리거/액션

트리거: 상태변경, 우선순위변경, 태스크생성, 담당자배정, 마감일초과  
액션: 상태변경, 우선순위변경, 담당자변경, 담당자알림

## API
```
GET/POST  /api/workspaces/<slug>/projects/<id>/rules/
PATCH/DEL /api/workspaces/<slug>/projects/<id>/rules/<rule_id>/
GET       /api/workspaces/<slug>/projects/<id>/rules/<rule_id>/logs/
```

## 다음: Phase D — 고급 Analytics
(Phase C GitHub 연동은 사용자 요청으로 제외)
