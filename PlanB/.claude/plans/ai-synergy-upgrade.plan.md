# Plan: PlanB AI 시너지 업그레이드

**Source**: 자유 기획 요청 (2026-06-27)
**Complexity**: Large

---

## 현재 AI 현황 (As-Is)

| 기능 | 현재 상태 | 한계 |
|---|---|---|
| AI 채팅 (`/ai/chat`) | Gemini 2.0 Flash, 컨텍스트 인식 | 별도 페이지로 분리 — 워크플로우 중단 발생 |
| create_task/note/event/time_block | 자연어 → 액션 실행 | 노트 content 미생성 (이번 세션 수정 중) |
| 주간 요약 | 통계 기반 AI 요약 | 인사이트 없음, 수동 요청만 가능 |
| Epic 분해 | 에픽 → 태스크 5-8개 | 단발성, 컨텍스트 없음 |
| 노트 RAG | 채팅 내 노트 검색 | 채팅 밖에서 활용 불가 |

---

## 목표 (To-Be)

> **AI가 앱 안에 녹아들어 사용자가 의식하지 않아도 돕는 상태**
> — 별도 탭이 아닌, 각 화면에서 컨텍스트에 맞는 AI 기능 제공

---

## 업그레이드 로드맵

### Phase 1 — AI 노트 완성 (즉시 / 1-2일)
> 현재 진행 중인 작업 마무리

**1-A. 노트 초안 작성 개선** (진행 중)
- [x] `CHAT_SYSTEM` 프롬프트에 노트 content 생성 강제화
- [ ] `update_note` 액션 백엔드 핸들러 추가 (`apps/ai/views.py`)
- [ ] `AIChatPage.jsx`에서 `update_note` 배지 표시

**1-B. 노트 페이지 내 AI 버튼 추가** (`NotesPage.jsx`)
- 노트 선택 시 우측에 AI 버튼 패널 노출
  - "✨ AI로 구조화" → 기존 내용을 마크다운 헤딩+목록으로 정리
  - "📝 이어서 작성" → 기존 내용 기반으로 추가 내용 생성
  - "🏷️ 태그 추천" → 내용 분석 후 관련 태그 제안
- 새 노트 작성 시 "AI 초안 생성" 버튼

**백엔드:** `apps/ai/views.py`에 `note_ai_action` 엔드포인트 추가
```
POST /api/workspaces/{slug}/ai/notes/{note_id}/action/
body: { "action": "organize" | "expand" | "suggest_tags" }
```

---

### Phase 2 — 인라인 AI 어시스턴트 (1주)
> 별도 페이지 이동 없이 각 화면에서 AI 활용

**2-A. 플로팅 AI 버튼 (전역)**
- 모든 페이지 우하단에 `🤖` 버튼
- 클릭 시 현재 페이지 컨텍스트를 자동 주입한 채팅 슬라이드오버 오픈
- 현재 `AIChatPage`를 분리된 `AIChatDrawer` 컴포넌트로 리팩터

**파일 변경:**
| 파일 | 변경 | 이유 |
|---|---|---|
| `components/AIChatDrawer.jsx` | CREATE | 드로어 형태 채팅 UI |
| `components/Layout.jsx` | UPDATE | 플로팅 버튼 + 드로어 마운트 |
| `pages/AIChatPage.jsx` | UPDATE | AIChatDrawer 재사용 |

**2-B. 태스크 드로어 AI 보조**
- `TaskDrawer.jsx`에 AI 패널 탭 추가
  - "💡 서브태스크 제안" — 태스크 제목 기반으로 3-5개 서브태스크 생성
  - "📝 설명 초안" — 태스크 제목으로 상세 설명 작성
  - "⏱️ 예상 시간" — 태스크 복잡도 분석

**백엔드:**
```
POST /api/workspaces/{slug}/ai/tasks/{task_id}/suggest/
body: { "type": "subtasks" | "description" | "estimate" }
```

**2-C. 캘린더 자연어 일정 입력**
- `CalendarPage.jsx` 상단에 자연어 입력창 고정
- 예: "다음 주 화요일 오후 3시 팀 회의 2시간" → 자동 파싱 후 이벤트 생성
- 현재 AI 채팅의 `create_event` 로직 재사용

---

### Phase 3 — 능동적 AI 인사이트 (2주)
> 사용자가 묻기 전에 AI가 먼저 알려주는 기능

**3-A. 대시보드 AI 브리핑 카드**
- `DashboardPage.jsx` 최상단에 "오늘의 AI 인사이트" 카드 추가
- 매일 첫 방문 시 (또는 새로고침 시) 자동 생성
- 내용 예시:
  - "🚨 마감 3일 내 태스크 4개 — 기한 초과 위험 프로젝트: OOO"
  - "📈 이번 주 완료율 72% — 지난 주 대비 +15%"
  - "💡 추천: 오늘 'OOO 태스크'를 먼저 처리하면 OOO 프로젝트 리스크 해소"

**백엔드:**
```python
# apps/ai/views.py에 추가
@api_view(["GET"])
def daily_insight(request, workspace_slug):
    # 워크스페이스 컨텍스트 수집 후 AI 인사이트 3-4개 생성
    # 캐시: 같은 날 같은 워크스페이스는 1회만 AI 호출 (Django 캐시 or DB 저장)
```

**3-B. 프로젝트 건강도 AI 해설**
- `DashboardPage.jsx`의 `ProjectHealthPanel`에 AI 해설 추가
- 빨간 프로젝트 클릭 시 → "이 프로젝트가 위험한 이유와 해결 방법" 팝오버

**3-C. 스프린트 회고 AI 생성**
- `SprintPage.jsx`에 "AI 회고 생성" 버튼
- 완료된 스프린트 데이터(완료율, 기간, 태스크 목록) → 자동 회고 문서 작성
- 생성된 회고는 노트로 저장

---

### Phase 4 — AI 자동화 고도화 (3주)
> 규칙 기반 자동화를 AI 의도 분석으로 업그레이드

**4-A. 자연어 자동화 규칙 생성**
- `AutomationPage.jsx`의 규칙 생성 폼에 AI 입력 추가
- 예: "태스크 마감이 2일 남으면 담당자에게 알림 보내줘"
  → AI가 Rule 객체 JSON으로 파싱 → 미리보기 후 저장

**백엔드:**
```
POST /api/workspaces/{slug}/ai/automation/parse/
body: { "description": "자연어 규칙 설명" }
→ { "trigger": "due_date_passed", "trigger_val": {...}, "action": "notify_assignee", ... }
```

**4-B. AI 스마트 알림 필터링**
- `NotificationCenter.jsx`에 AI 요약 추가
- 알림이 5개 이상 쌓이면 → "AI 요약: 중요 알림 2개, 확인 필요 없는 알림 3개"
- 중요도 자동 분류

---

### Phase 5 — AI 지식 허브 (4주)
> 노트 + 리서치 + 태스크를 AI가 연결하는 두뇌

**5-A. 노트 관계 자동 발견**
- `NotesPage.jsx`에 "연관 노트" 사이드패널 추가
- 현재 열린 노트의 내용과 유사한 노트 자동 탐색 (벡터 유사도 or AI)
- Obsidian의 백링크와 유사한 UX

**5-B. 리서치 → 태스크 자동 연결**
- `ResearchNotePanel.jsx`에 "이 리서치에서 태스크 추출" 버튼
- 리서치 내용에서 실행 가능한 액션 아이템을 태스크로 자동 생성

**5-C. AI 주간 보고서 자동 생성**
- 매주 금요일 (혹은 수동 트리거) 주간 보고서 생성
- 내용: 완료 태스크, 진행 중인 작업, 다음 주 목표, 리스크
- 노트로 저장 + (추후) 이메일 발송 가능 구조

---

## 구현 패턴 (코드 컨벤션)

### 백엔드 패턴 (현행 코드 기반)
```python
# apps/ai/views.py 패턴 — 기존 _gemini() 재사용
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def note_ai_action(request, workspace_slug, note_id):
    workspace = Workspace.objects.get(slug=workspace_slug, members__user=request.user)
    note = Note.objects.get(id=note_id, workspace=workspace)
    action = request.data.get("action")
    # action별 system prompt 분기
    raw = _gemini(prompt, system)
    return Response({"result": raw})
```

### 프론트엔드 패턴 (현행 코드 기반)
```javascript
// lib/aiApi.js에 함수 추가 — 기존 aiChat 패턴 재사용
export const noteAiAction = (slug, noteId, action) =>
  api.post(`/workspaces/${slug}/ai/notes/${noteId}/action/`, { action })
    .then(r => r.data)
```

### AI 응답 캐싱 전략
- 일일 인사이트: Django 캐시 (`cache.set(key, val, timeout=86400)`)
- 주간 보고서: DB 저장 (Note 모델 재활용)
- 실시간 요청 (노트 정리, 태스크 제안): 캐시 없음

---

## 파일 변경 전체 목록

| 파일 | Action | Phase |
|---|---|---|
| `backend/apps/ai/views.py` | UPDATE (update_note 핸들러, note_ai_action, daily_insight, sprint_retrospective) | 1-3 |
| `backend/apps/ai/urls.py` | UPDATE (새 엔드포인트 등록) | 1-3 |
| `frontend/src/lib/aiApi.js` | UPDATE (새 API 함수 추가) | 1-3 |
| `frontend/src/pages/NotesPage.jsx` | UPDATE (AI 버튼 패널) | 1 |
| `frontend/src/pages/AIChatPage.jsx` | UPDATE (AIChatDrawer 재사용) | 2 |
| `frontend/src/components/AIChatDrawer.jsx` | CREATE | 2 |
| `frontend/src/components/Layout.jsx` | UPDATE (플로팅 버튼) | 2 |
| `frontend/src/components/TaskDrawer.jsx` | UPDATE (AI 탭) | 2 |
| `frontend/src/pages/CalendarPage.jsx` | UPDATE (자연어 입력창) | 2 |
| `frontend/src/pages/DashboardPage.jsx` | UPDATE (AI 브리핑 카드, 프로젝트 AI 해설) | 3 |
| `frontend/src/pages/SprintPage.jsx` | UPDATE (AI 회고) | 3 |
| `frontend/src/pages/AutomationPage.jsx` | UPDATE (자연어 규칙 생성) | 4 |
| `frontend/src/components/NotificationCenter.jsx` | UPDATE (AI 요약) | 4 |

---

## 리스크

| 리스크 | 가능성 | 대응 |
|---|---|---|
| Gemini API 무료 쿼터 초과 | HIGH (Phase 3 이후 호출 급증) | 일일 인사이트 캐싱, Groq 폴백 유지 |
| AI 응답 지연으로 UX 저하 | MEDIUM | 스켈레톤 로딩 + 비동기 처리, 타임아웃 5초 설정 |
| AI 응답 품질 불일치 | MEDIUM | 각 기능별 system prompt 정밀화, 결과 미리보기 후 적용 UX |
| 토큰 비용 증가 (유료 전환 시) | LOW (현재 무료) | 캐싱 레이어로 API 호출 최소화 |

---

## 검증 기준

- [ ] Phase 1: "카레만들기 초안 작성해줘" → 300자 이상 내용 있는 노트 생성
- [ ] Phase 1: "카레 노트 정리해줘" → 마크다운 구조로 기존 노트 업데이트
- [ ] Phase 2: 모든 페이지에서 `🤖` 버튼 클릭 시 채팅 드로어 오픈
- [ ] Phase 2: TaskDrawer에서 "서브태스크 제안" 버튼 동작
- [ ] Phase 3: 대시보드 첫 방문 시 AI 브리핑 카드 자동 표시
- [ ] Phase 4: 자연어 입력으로 자동화 규칙 생성 가능
- [ ] Phase 5: 노트 페이지에서 연관 노트 추천 표시

---

## 우선순위 결정 기준

```
즉시 가치  ×  구현 난이도
────────────────────────────
Phase 1: 즉시 가치 HIGH, 난이도 LOW  → 먼저 완료
Phase 2: 즉시 가치 HIGH, 난이도 MEDIUM → 다음
Phase 3: 즉시 가치 MEDIUM, 난이도 LOW → 빠르게 가능
Phase 4: 즉시 가치 MEDIUM, 난이도 MEDIUM → 여유 있을 때
Phase 5: 즉시 가치 HIGH (장기), 난이도 HIGH → 마지막
```
