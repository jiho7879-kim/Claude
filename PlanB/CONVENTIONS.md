# PlanB Project Conventions

> 이 파일은 PlanB 프로젝트에서 반복된 시행착오를 방지하기 위해 발견된 패턴과 규칙을 문서화합니다.
> 새 작업을 시작하기 전에 반드시 참고하세요.

## 1. Django 모델 Manager Mocking

### ❌ 잘못된 방식
```python
# Django의 Manager는 descriptor이므로 access할 때마다 새 인스턴스가 생성됨
# patch.object(instance)는 해당 인스턴스만 패치 → view에서 새로 생성된 Manager는 패치 안 됨
patch.object(CalendarEvent.objects, "create", return_value=...)  # 동작 안 함
```

### ✅ 올바른 방식
```python
# class-level에서 objects 자체를 패치
# 그러면 Model.objects 접근 시 항상 Mock이 반환됨
with patch.object(CalendarEvent, "objects") as mock_objects:
    mock_objects.create.return_value = CalendarEvent(...)
```

**이유**: Django의 `Model.objects`는 `ManagerDescriptor`를 통해 접근되며, access할 때마다 Manager 인스턴스가 새로 생성됩니다. 따라서 `patch.object(CalendarEvent.objects, "create")`는 특정 Manager 인스턴스만 패치하지만, view 코드에서 `CalendarEvent.objects.create(...)`를 호출하면 **새로운** Manager 인스턴스가 사용되어 패치가 적용되지 않습니다.

**적용 대상**: `CalendarEvent`, `Task`, `TimeBlock`, `Note` 등 모든 Django Model

## 2. Timezone-aware DateTime 처리

### 문제 상황
`USE_TZ=True`인 Django 프로젝트에서 ISO 형식 문자열(`"2026-07-01T09:00:00"`)을 `DateTimeField`에 직접 전달하면 naive datetime으로 파싱되어 `DateTimeField received a naive datetime` 에러 발생.

### ✅ 해결 방법
```python
import datetime
from django.utils import timezone

def _parse_dt(val):
    if isinstance(val, datetime.datetime):
        dt = val
    else:
        dt = datetime.datetime.fromisoformat(str(val))
    return dt if timezone.is_aware(dt) else timezone.make_aware(dt)
```

**적용 대상**: AI action에서 `CalendarEvent` 등 DateTimeField가 포함된 모델을 생성할 때

## 3. 테스트 작성 규칙

### DB를 실제로 사용하는 테스트 (Mock 불필요)
```python
def test_create_time_block(self, api_client, workspace, mock_gemini):
    with mock_gemini([{"type": "create_time_block", ...}]):
        resp = api_client.post(...)
    assert len(data["actions"]) == 1
```

`create_time_block`, `create_note`, `create_event` 등 DB 생성이 필요한 테스트는 가능하면 real DB create 사용 (테스트 DB이므로 안전함).

### 테스트 fixture 패턴
- `api_client`: `rest_framework.test.APIClient`, 인증된 사용자
- `workspace`: 테스트용 Workspace fixture
- `mock_gemini`: Gemini API 응답을 Mocking하는 fixture (action JSON 배열 반환)

### action 테스트 검증 포인트
```python
data = resp.json()
assert len(data["actions"]) == 1          # 액션이 정확히 1개 실행됨
assert data["actions"][0]["type"] == "create_event"  # 올바른 타입
```

## 4. Silent Exception Handling

### ❌ 절대 해서는 안 되는 패턴
```python
except Exception:
    pass
```

### ✅ 권장 패턴
```python
except Exception as exc:
    logger.warning("[%s] action %s failed: %s", req_id, action.get("type"), exc)
```

Silent `except Exception: pass`는 디버깅을 극도로 어렵게 만듭니다. 최소한 warning 로그는 남겨야 합니다.

## 5. AI Action Type 목록

현재 구현된 action types:
- `create_task` — 프로젝트 태스크 생성 (project_id 필요)
- `create_note` — 노트 생성
- `create_time_block` — 플래너 시간 블록 생성
- `create_event` — 캘린더 일정 생성 (DateTime은 timezone-aware 필요)
- `update_note` — 노트 수정 (note_id 필요, 없으면 무시)

## 6. 테스트 실행 명령어

```bash
# 전체 AI 테스트
pytest apps/ai/tests.py -v --reuse-db

# 단일 테스트
pytest apps/ai/tests.py::TestChatActions::test_create_event -v --reuse-db

# 특정 실패 테스트만 (자세한 출력)
pytest apps/ai/tests.py -k "test_create_event" -v --reuse-db -s --tb=long
```

## 7. 패키징/가져오기 규칙

- 모든 Django app import는 `apps.<app_name>.*` 형식 사용 (예: `from apps.calendars.models import CalendarEvent`)
- pip install 후에는 devcontainer/linter 재시작 필요
- `ruff`를 linter로 사용, `.venv` 내부 패키지 사용
