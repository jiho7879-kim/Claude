# PlanB 경쟁사 유료 기능 BM 분석

**작성일**: 2026-06-24  
**분석 목적**: 경쟁사 프리미엄 플랜 기능을 벤치마킹하여 PlanB v8 업그레이드 방향 도출  
**후속 문서**: `premium-upgrade.plan.md`

---

## 1. PlanB 포지셔닝 브리프

| 항목 | 내용 |
|------|------|
| **Identity** | Dark Luxury 디자인, 키보드 퍼스트, 개발자/연구자 친화 |
| **Offer** | 프로젝트 관리 + 개인 플래너 + 연구 관리 통합 툴 |
| **Target** | 개발팀, 연구자, 소규모 팀 |
| **Differentiator** | Linear 수준 UX + Research Lab + Daily Planner 일체형 |
| **Strategic Tension** | 단순함 × 기능 풍부함 (ClickUp 실패 패턴 회피) |
| **Scoping Consequence** | 단순함을 해치지 않는 프리미엄 기능 우선 — 개발팀/연구팀 생산성 직결 기능만 |

---

## 2. 경쟁사 티어 분류

| 서비스 | 티어 | 이유 |
|--------|------|------|
| **Linear** | Direct (Aspirational) | 동일 포지션. UX 기준점. 유료 기능이 PlanB 방향과 가장 일치 |
| **Height** | Direct | AI 기능 + 미니멀 UX. 소규모 팀 타겟 동일 |
| **Plane** | Direct | 오픈소스 Linear 대안. 동일 포지션 |
| **Notion** | Adjacent | 유연한 뷰/DB. 연구 관리 유저층 겹침 |
| **Asana** | Adjacent | My Tasks + Milestone 구조 참조 |
| **ClickUp** | Aspirational (반면교사) | 기능 과잉 실패 패턴. 확장 시 주의 기준 |
| **Monday.com** | Aspirational | 팀 워크로드/자동화 성숙도 기준 |

---

## 3. 경쟁사 유료 기능 심층 분석

### 3.1 Linear (Plus $8/user/mo · Enterprise)

| 카테고리 | 유료 기능 | 차별점 |
|----------|-----------|--------|
| **Roadmaps** | 커스텀 로드맵 뷰 (다중 프로젝트 타임라인) | 프리에는 단일 프로젝트 타임라인만 |
| **Integrations** | GitHub/GitLab 이슈 양방향 동기화 | PR 머지 → 이슈 자동 Done 전환 |
| **Analytics** | 사이클 번다운, 팀 속도 차트, 예측 완료일 | 스프린트 성과 데이터 |
| **Views** | 커스텀 뷰 무제한, 공유 가능한 필터 저장 | 팀 전체 공유 가능한 뷰 |
| **API** | GraphQL API 완전 접근 + Webhook | 서드파티 통합 |
| **Enterprise** | SAML SSO, SCIM, 감사 로그, SLA 99.9% | B2B 필수 |

**핵심 인사이트**: Linear 유료의 핵심은 **팀 속도/예측 Analytics** + **GitHub 동기화**. 개발팀이 돈을 내는 이유.

---

### 3.2 Height (Team $8.50/user/mo)

| 카테고리 | 유료 기능 | 차별점 |
|----------|-----------|--------|
| **AI Suite** | 태스크 자동 요약, 담당자 AI 추천, 우선순위 AI 제안 | 업무 컨텍스트 이해 기반 AI |
| **Templates** | 프로젝트/태스크 템플릿 라이브러리 | 반복 워크플로우 재사용 |
| **Git Sync** | GitHub/GitLab PR ↔ 태스크 연결 | 브랜치명 → 이슈 자동 연결 |
| **Reporting** | 커스텀 차트, CSV 내보내기, 팀 활동 리포트 | 관리자용 인사이트 |
| **Automations** | 트리거 기반 자동화 (상태 변경 → 알림/담당자 변경) | 반복 수작업 제거 |
| **Custom Integrations** | Slack, Zapier, Figma 심층 연동 | 기존 워크플로우 통합 |

**핵심 인사이트**: Height 유료는 **AI 기능**이 핵심 세일즈 포인트. 무료에 없는 AI → 유료 전환 동인.

---

### 3.3 Asana (Premium $10.99 · Business $24.99/user/mo)

| 카테고리 | 유료 기능 | 플랜 |
|----------|-----------|------|
| **Timeline (Gantt)** | 프로젝트 타임라인, 의존성 시각화, 크리티컬 패스 | Premium |
| **Custom Fields** | 드롭다운/숫자/날짜/텍스트 커스텀 필드 | Premium |
| **Rules/Automation** | "If-then" 자동화 규칙 (25개/프로젝트) | Premium |
| **Dashboards** | 무제한 대시보드, 실시간 차트 | Premium |
| **Portfolios** | 여러 프로젝트를 상위 포트폴리오로 묶어 진행률 조망 | Business |
| **Workload** | 멤버별 업무량 시각화, 과부하 경고 | Business |
| **Goals/OKR** | 팀 목표 설정 + 태스크 ↔ 목표 연결 | Business |

**핵심 인사이트**: **Custom Fields + 자동화 Rules**가 Premium 전환 킬러 피처.

---

### 3.4 ClickUp (Unlimited $7 · Business $12/user/mo)

| 카테고리 | 유료 기능 | 플랜 |
|----------|-----------|------|
| **Custom Fields** | 20+ 필드 타입 (공식, 관계, 평가 등) | Unlimited |
| **Automations** | 무제한 자동화 (조건+액션 조합) | Business |
| **Time Tracking** | 내장 타임 트래커 + 청구 시간 관리 | Business |
| **Workload** | 타임라인 기반 팀 용량 관리 | Business |
| **AI (ClickUp AI)** | 태스크 설명 생성, 요약, 액션 아이템 추출 | Add-on $5/user |

**핵심 인사이트**: AI를 별도 유료 Add-on으로 분리한 가격 전략 참조. 기능 과잉은 반면교사.

---

### 3.5 Notion (Plus $10 · Business $15/user/mo)

| 카테고리 | 유료 기능 | 플랜 |
|----------|-----------|------|
| **Unlimited File Upload** | 파일 첨부 무제한 (Free: 5MB 제한) | Plus |
| **Version History** | 30일(Plus) / 무제한(Business) 버전 기록 | Plus/Business |
| **DB Automations** | DB 속성 변경 → 자동화 트리거 | Business |
| **Notion AI** | 작성 도움, 요약, 번역, Q&A | Add-on $8/user |

**핵심 인사이트**: **버전 히스토리**가 의외의 강력한 유료 전환 동인. AI도 별도 과금.

---

### 3.6 Monday.com (Pro $16/user/mo)

| 카테고리 | 유료 기능 | 비고 |
|----------|-----------|------|
| **Time Tracking** | 내장 타임 트래커, 보고서 | 청구 관리 포함 |
| **Formula Column** | 스프레드시트형 수식 컬럼 | 데이터 계산 자동화 |
| **Chart View** | 막대/원형/선 차트 대시보드 | 시각적 리포팅 |
| **Workload** | 팀원 용량 관리 | 배정 최적화 |
| **Automations** | 무제한 자동화 | 워크플로우 자동화 |

---

### 3.7 Plane (Pro $7/user/mo)

| 카테고리 | 유료 기능 | 비고 |
|----------|-----------|------|
| **Custom Views** | 저장 가능한 필터/뷰 무제한 | 팀 공유 가능 |
| **Custom States** | 프로젝트별 커스텀 상태 | 기본 외 추가 |
| **Analytics** | 번다운, 속도, 흐름 차트 | 이슈 흐름 분석 |
| **Import/Export** | GitHub, Jira, CSV 가져오기/내보내기 | 마이그레이션 |

---

## 4. 유료 기능 카테고리 매트릭스

| 기능 카테고리 | Linear | Height | Asana | ClickUp | Notion | Monday | Plane | **PlanB 현재** |
|--------------|:------:|:------:|:-----:|:-------:|:------:|:------:|:-----:|:-------------:|
| **AI 기능** | ✗ | ✅ Pro | ✗ | ✅ Add-on | ✅ Add-on | ✗ | ✗ | 🟡 기초 |
| **자동화/Rules** | ✗ | ✅ Pro | ✅ Prem | ✅ Biz | ✅ Biz | ✅ Pro | ✗ | ✗ |
| **커스텀 필드** | ✗ | ✗ | ✅ Prem | ✅ Unltd | ✅ Plus | ✅ Pro | 🟡 | ✗ |
| **GitHub 연동** | ✅ Plus | ✅ Pro | ✗ | ✅ Biz | ✗ | ✗ | ✗ | ✗ |
| **팀 워크로드** | ✗ | ✗ | ✅ Biz | ✅ Biz | ✗ | ✅ Pro | ✗ | 🟡 기초 |
| **타임 트래킹** | ✗ | ✗ | ✗ | ✅ Biz | ✗ | ✅ Pro | ✗ | ✗ |
| **Portfolio/OKR** | 🟡 | ✗ | ✅ Biz | ✅ Biz | ✗ | ✗ | ✗ | ✗ |
| **커스텀 저장 뷰** | ✅ Plus | ✅ Pro | ✅ Prem | ✅ Unltd | ✅ Plus | ✅ Pro | ✅ Pro | ✗ |
| **속도/Analytics** | ✅ Plus | ✅ Pro | ✅ Prem | ✅ Biz | ✗ | ✅ Pro | ✅ Pro | 🟡 기초 |
| **프로젝트 템플릿** | ✗ | ✅ Pro | ✅ Prem | ✅ Unltd | ✅ Plus | ✅ Pro | ✗ | ✗ |
| **SSO/SAML** | ✅ Ent | ✗ | ✅ Ent | ✅ Ent | ✅ Ent | ✅ Ent | ✅ Ent | ✗ |

---

## 5. 유료 전환 동인 Top 5 (공통 패턴)

| 순위 | 전환 이유 | 관련 기능 | 근거 |
|------|----------|-----------|------|
| 1 | **반복 작업 자동화** | 자동화 Rules | 모든 경쟁사 Premium 공통, 이탈률 최저 기능 |
| 2 | **AI로 생산성 향상** | AI 태스크/요약/분해 | Height/ClickUp/Notion 유료 전환 1위 |
| 3 | **GitHub 연동 필요** | Git Sync | 개발팀 필수. Linear/Height Pro 킬러 피처 |
| 4 | **관리자 리포팅** | Analytics, 속도 차트 | 팀장/PM 설득 포인트. 예산 결정권자 타겟 |
| 5 | **팀 맞춤 데이터** | 커스텀 필드/뷰 저장 | 팀별 워크플로우 적용 → 이탈률 감소 |

---

## 6. PlanB 현재 vs 경쟁사 갭 요약

### PlanB만의 독보적 기능 (강점 — 유지/강화)
| 기능 | PlanB 현재 | 경쟁사 현황 |
|------|-----------|------------|
| **Research Management** | 완전 구현 (노트/데이터셋/레퍼런스/DOI) | 없음 |
| **Daily Planner + 습관 트래커** | 완전 구현 | 없음 |
| **Weekly Review** | 구현됨 | 없음 |
| **AI Epic 분해** | 구현됨 (Gemini) | Height만 유사 (유료) |
| **캘린더 타임라인 통합** | 구현됨 | 별도 앱 |

### 즉시 채워야 할 갭 (약점)
| 갭 | 경쟁사 | PlanB 영향 | 구현 난이도 |
|----|--------|-----------|------------|
| **자동화 Rules** | 전 경쟁사 Pro | 유료 전환 동인 #1 부재 | 중간 |
| **GitHub 연동** | Linear/Height Pro | 개발팀 유입 막힘 | 중간 |
| **커스텀 저장 뷰** | 전 경쟁사 Pro | 팀 맞춤화 불가 | 낮음 |
| **프로젝트 템플릿** | 대부분 Pro | 온보딩 마찰 높음 | 낮음 |
| **고급 Analytics** | Linear/Height/Plane Pro | 관리자 설득 어려움 | 낮음 |

---

## 7. 유료화 전략 시사점

| 전략 | 내용 | PlanB 적용 방안 |
|------|------|----------------|
| **AI Gating** | Height/ClickUp/Notion: AI를 유료 차별점으로 | Gemini AI 기능을 Pro 전용으로 이동 |
| **Automation Gating** | Asana/Height: 자동화는 유료에서만 | 자동화 Rules를 핵심 Pro 기능으로 |
| **Power User Hook** | Plane/Linear: 커스텀 뷰/필드로 고착 유도 | 저장 뷰 + 커스텀 필드로 이탈 방지 |
| **Integration Hook** | Linear/Height: GitHub 연동으로 개발팀 고착 | Git Sync 연동 → 개발팀 락인 |

---

*후속 계획: `premium-upgrade.plan.md` 참고*
