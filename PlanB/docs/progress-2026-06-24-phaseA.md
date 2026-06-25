# Phase A 완료 — 커스텀 저장 뷰

**완료일**: 2026-06-24  
**빌드**: ✅ 성공

---

## 변경된 파일

### 백엔드
| 파일 | 변경 내용 |
|------|-----------|
| `apps/workspaces/models.py` | `SavedView` 모델 추가 |
| `apps/workspaces/serializers.py` | `SavedViewSerializer`, `SavedViewCreateSerializer` 추가 |
| `apps/workspaces/views.py` | `SavedViewListCreateView` (GET/POST), `SavedViewDetailView` (DELETE) |
| `apps/workspaces/urls.py` | `/saved-views/`, `/saved-views/<view_id>/` URL 등록 |
| `apps/workspaces/migrations/0003_savedview.py` | migration 생성 |

### 프론트엔드
| 파일 | 변경 내용 |
|------|-----------|
| `src/lib/workspaceApi.js` | `getSavedViews`, `createSavedView`, `deleteSavedView` 추가 |
| `src/components/SavedViewBar.jsx` | 신규 생성 |
| `src/pages/ProjectPage.jsx` | SavedViewBar 통합 |

---

## 구현된 기능

- 뷰 저장: 현재 필터 + 뷰타입(list/board/timeline)을 이름과 함께 저장
- 뷰 적용: 저장된 뷰 클릭 → 필터와 뷰타입 즉시 복원
- 뷰 삭제: 본인 소유 뷰만 삭제 가능

## API 엔드포인트
```
GET    /api/workspaces/<slug>/projects/<id>/saved-views/
POST   /api/workspaces/<slug>/projects/<id>/saved-views/
DELETE /api/workspaces/<slug>/projects/<id>/saved-views/<view_id>/
```

## 다음: Phase B — 자동화 Rules
