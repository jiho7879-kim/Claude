# Phase E 완료 — 프로젝트 템플릿

**완료일**: 2026-06-24
**빌드**: ✅ 성공 (1.88s)

---

## 변경 파일

### 백엔드
- `apps/projects/models.py` — `ProjectTemplate` 모델 추가 (name, description, category, icon, tasks JSONField, order)
- `apps/projects/serializers.py` — `TemplateSerializer` 추가
- `apps/projects/views.py` — `TemplateListView`, `ProjectFromTemplateView` 추가
- `apps/workspaces/urls.py` — `<slug>/templates/`, `<slug>/templates/<id>/apply/` 라우트 추가
- `apps/projects/migrations/0004_projecttemplate.py` — ProjectTemplate 테이블 생성
- `apps/projects/migrations/0005_seed_templates.py` — 4개 기본 템플릿 시드

### 프론트엔드
- `src/lib/workspaceApi.js` — `getTemplates`, `createProjectFromTemplate` 추가
- `src/components/TemplateGallery.jsx` — 신규: 템플릿 선택 모달 갤러리
- `src/pages/WorkspacePage.jsx` — 📋 템플릿 버튼 + `TemplateGallery` 통합

---

## API

```
GET  /api/workspaces/<slug>/templates/
→ [{id, name, description, category, icon, tasks, order}]

POST /api/workspaces/<slug>/templates/<id>/apply/
body: {name: "프로젝트 이름"}
→ Project (with tasks pre-created)
```

## 시드 템플릿 4종

| 이름 | 카테고리 | 태스크 수 |
|------|----------|-----------|
| 소프트웨어 개발 💻 | development | 10 |
| 마케팅 캠페인 📣 | marketing | 8 |
| 연구 프로젝트 🔬 | research | 10 |
| 제품 런칭 🚀 | product | 9 |

## 동작 흐름

1. WorkspacePage 우측 상단 📋 템플릿 버튼 클릭
2. TemplateGallery 모달 → 템플릿 선택
3. 프로젝트 이름 입력 → 만들기
4. 백엔드: Project 생성 + template.tasks 일괄 Task 생성
5. 프론트엔드: setProjects 업데이트 → 모달 닫힘

## 다음: Phase F — 타임 트래킹
