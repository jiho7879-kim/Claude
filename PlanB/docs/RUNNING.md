# PlanB 실행 가이드

## 사전 요구사항

- Docker / Docker Compose
- Python 3.12+
- Node.js 18+
- npm

---

## 1. DB (PostgreSQL)

루트 디렉터리(`PlanB/`)에서 실행합니다.

```bash
cd PlanB

# DB 컨테이너 시작 (백그라운드)
docker compose up -d db

# 실행 확인
docker compose ps
```

접속 정보:
| 항목 | 값 |
|------|-----|
| Host | `localhost` |
| Port | `5432` |
| DB   | `planb` |
| User | `planb_user` |
| PW   | `planb_password` |

---

## 2. 백엔드 (Django)

```bash
cd PlanB/backend

# 1) 가상환경 생성 (최초 1회)
python -m venv .venv

# 2) 가상환경 활성화
source .venv/bin/activate          # macOS / Linux
# .venv\Scripts\activate           # Windows

# 3) 패키지 설치 (최초 1회)
pip install -r requirements.txt

# 4) .env 파일 생성 (최초 1회)
cp .env.example .env
# .env 파일을 열어 SECRET_KEY, DB_PASSWORD 등 수정
```

`.env` 핵심 항목:
```
SECRET_KEY=임의의-긴-문자열
DB_NAME=planb
DB_USER=planb_user
DB_PASSWORD=planb_password
DB_HOST=localhost
DB_PORT=5432
```

```bash
# 5) 마이그레이션 (최초 1회 또는 모델 변경 시)
python manage.py migrate --settings=config.settings.development

# 6) 슈퍼유저 생성 (선택)
python manage.py createsuperuser --settings=config.settings.development

# 7) 개발 서버 실행
python manage.py runserver --settings=config.settings.development
```

백엔드 주소: `http://localhost:8000`  
Admin: `http://localhost:8000/admin`  
API: `http://localhost:8000/api/`

---

## 3. 프론트엔드 (React + Vite)

```bash
cd PlanB/frontend

# 1) 패키지 설치 (최초 1회)
npm install

# 2) 개발 서버 실행
npm run dev
```

프론트엔드 주소: `http://localhost:5173`

---

## 전체 순서 요약

```
1. docker compose up -d db          # DB 먼저
2. (백엔드) python manage.py runserver --settings=config.settings.development
3. (프론트) npm run dev
```

세 터미널을 각각 열어 동시에 실행하면 됩니다.

---

## GitHub 소셜 로그인 설정 (선택)

GitHub OAuth App을 만들어 `.env`에 추가합니다.

```
GITHUB_CLIENT_ID=발급받은-client-id
GITHUB_CLIENT_SECRET=발급받은-client-secret
```

GitHub OAuth App 설정:
- Homepage URL: `http://localhost:5173`
- Callback URL: `http://localhost:8000/accounts/github/login/callback/`

---

## Codespace 환경 주의사항

`development.py`의 CORS 및 리다이렉트 URL이 Codespace 도메인으로 하드코딩되어 있습니다.  
로컬 환경에서 실행할 경우 `backend/config/settings/development.py`의 아래 항목을 수정하세요.

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
]
LOGIN_REDIRECT_URL = "http://localhost:5173/"
FRONTEND_URL = "http://localhost:5173"
ACCOUNT_LOGOUT_REDIRECT_URL = "http://localhost:5173/login"
```

---

## DB 초기화 (데이터 전체 삭제)

```bash
docker compose down -v    # 볼륨까지 삭제
docker compose up -d db
python manage.py migrate --settings=config.settings.development
```
