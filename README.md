# PlanB — 개인 생산성 올인원 플랫폼

일정·작업·노트·AI 비서를 하나로 통합한 웹 기반 개인 생산성 도구입니다.

## Tech Stack

| 영역 | 기술 |
|------|------|
| **Backend** | Python 3.12 / Django 6.0 / DRF 3.17 |
| **Frontend** | React 19 / Vite 8 / Zustand / Framer Motion |
| **Database** | PostgreSQL 16 (via Docker) |
| **AI** | Gemini 2.5 Pro / DeepSeek V4 Flash / Groq (Llama) |
| **Auth** | django-allauth (GitHub OAuth) + SimpleJWT |
| **Infra** | Fly.io (backend) / Vercel (frontend) |

## Project Structure

```
PlanB/
├── backend/
│   ├── apps/
│   │   ├── accounts/       # 회원가입/로그인 (GitHub OAuth)
│   │   ├── ai/             # AI 채팅 + sub-agent 라우터
│   │   ├── automation/     # 자동화 규칙 엔진
│   │   ├── calendars/      # 캘린더 / 일정 관리
│   │   ├── notes/          # 노트 (Obsidian 스타일, 폴더 트리, WikiLink)
│   │   ├── planner/        # 주간/일간 플래너
│   │   ├── projects/       # 프로젝트 관리
│   │   ├── research/       # 리서치 기록
│   │   ├── tasks/          # 태스크 관리 (칸반, 스프린트)
│   │   └── workspaces/     # 워크스페이스
│   ├── config/
│   │   └── settings/       # base / development / production / test
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/     # 공통 UI 컴포넌트
│   │   ├── pages/          # 페이지별 컴포넌트
│   │   └── lib/            # API 클라이언트, 유틸
│   ├── package.json
│   └── vite.config.js
├── docs/                   # 기획/설계 문서
├── docker-compose.yml
└── fly.toml
```

## 주요 기능

- **노트 (Notes)** — Obsidian 스타일 마크다운 편집기, 폴더 트리 네비게이션, WikiLink(`[[문서]]`) 및 Backlinks
- **플래너 (Planner)** — 주간/일간 뷰, 타임블로킹, 드래그 앤 드롭
- **태스크 (Tasks)** — 칸반 보드, 스프린트 관리, 우선순위 및 진행률 추적
- **AI 비서** — Gemini / DeepSeek / Groq 멀티모델 채팅, 컨텍스트 기반 태스크/일정/노트 생성
- **캘린더 (Calendars)** — FullCalendar 기반 일정 관리, 타임블록 연동
- **자동화 (Automation)** — 조건 기반 규칙 엔진

## 빠른 시작

### 1. PostgreSQL 실행

```bash
cd PlanB
docker compose up -d db
```

### 2. 백엔드

```bash
cd PlanB/backend
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
cp .env.example .env        # .env 파일 수정 (SECRET_KEY, DB_PASSWORD 등)
python manage.py migrate --settings=config.settings.development
python manage.py runserver --settings=config.settings.development
```

### 3. 프론트엔드

```bash
cd PlanB/frontend
npm install
npm run dev
```

백엔드: http://localhost:8000 | 프론트엔드: http://localhost:5173

자세한 실행 가이드는 [`docs/RUNNING.md`](docs/RUNNING.md)를 참고하세요.
