# PlanB - 결정 사항 문서

> 마지막 업데이트: 2026-06-23

---

## 1. 프로젝트 개요

- **서비스 유형:** 웹 기반 프로젝트 관리 서비스
- **목적:** 일반적인 프로젝트 관리 + 연구실 환경에서도 유연하게 활용 가능
- **개발 언어:** Python (백엔드)
- **접근 방식:** MVP 우선 개발 후 점진적 확장

---

## 2. 인증 & 멤버 관리

- **인증 방식:** GitHub OAuth 로그인
- **멤버 관리 단위:** Workspace 기반
  - Workspace마다 독립적인 멤버 구성 및 권한 설정
  - Project 단위 권한 관리도 지원

---

## 3. 권한 구조

| 단위 | 설명 |
|------|------|
| Workspace | 전체 멤버 관리, 초대/추방 |
| Project | 프로젝트별 접근 권한 설정 |
| Calendar | 개인 일정 포함, 이벤트별 공개/비공개 설정 |

---

## 4. 주요 기능

### 4.1 캘린더
- 개인 일정 + 팀 일정 통합 관리
- 이벤트별 공개(public) / 비공개(private) 권한 설정 가능

### 4.2 프레젠테이션 모드 (방향 C)
- 로그인 없이 public 데이터만 노출하는 전용 뷰 제공
- 미팅 자료로 활용 가능
- 캘린더 포함, 권한 필터링 자동 적용

---

## 5. Task 계층 구조

- **기본 깊이:** 3단계
- **설정 가능 여부:** 추후 설정값으로 변경 가능하도록 구현
- **DB 구조:** 자기참조(parent_id) 방식 → 깊이 변경 시 스키마 수정 불필요

```
Level 1
└── Level 2
    └── Level 3
```

### `max_task_depth` 설정 방식
- Workspace에서 기본값 설정
- Project에서 오버라이드 가능 (설정 없으면 Workspace 기본값 사용)

### 레벨 이름
- MVP: Epic / Task / Subtask 고정
- 추후: Workspace/Project별 커스터마이징 기능 추가 예정

---

## 6. 백엔드 프레임워크

- **프레임워크:** Django + Django REST Framework (DRF)
- **이유:** 복잡한 관계형 모델, 내장 어드민 패널, GitHub OAuth 연동 용이
- **GitHub OAuth:** `django-allauth` 사용

---

## 7. 데이터베이스

- **DB:** PostgreSQL
- **이유:** Django 궁합 최적, 재귀 CTE(Task 계층), JSONB(커스텀 필드 확장), Full-text 검색 내장

---

## 8. 프론트엔드

- **프레임워크:** React + Vite
- **이유:** 풍부한 생태계 (캘린더, 칸반, DnD), Django REST API와 명확한 역할 분리

---

## 9. 배포 환경

| 역할 | 플랫폼 | 비용 |
|------|--------|------|
| 백엔드 (Django) | Fly.io | 무료 (슬립 없음, Docker 기반) |
| DB (PostgreSQL) | Supabase | 무료 (500MB) |
| 프론트 (React) | Vercel | 무료 |
