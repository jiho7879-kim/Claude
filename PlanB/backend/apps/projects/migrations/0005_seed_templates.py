from django.db import migrations

TEMPLATES = [
    {
        "name": "소프트웨어 개발",
        "description": "기능 개발, 버그 수정, 코드 리뷰 등 일반적인 소프트웨어 개발 워크플로우",
        "category": "development",
        "icon": "💻",
        "order": 0,
        "tasks": [
            {"title": "요구사항 분석", "priority": "high", "status": "todo"},
            {"title": "기술 스택 선정", "priority": "high", "status": "todo"},
            {"title": "아키텍처 설계", "priority": "high", "status": "todo"},
            {"title": "개발 환경 구성", "priority": "medium", "status": "todo"},
            {"title": "핵심 기능 구현", "priority": "urgent", "status": "todo"},
            {"title": "단위 테스트 작성", "priority": "medium", "status": "todo"},
            {"title": "코드 리뷰", "priority": "medium", "status": "todo"},
            {"title": "QA 테스트", "priority": "high", "status": "todo"},
            {"title": "배포 준비", "priority": "medium", "status": "todo"},
            {"title": "프로덕션 배포", "priority": "high", "status": "todo"},
        ],
    },
    {
        "name": "마케팅 캠페인",
        "description": "제품 출시, 이벤트, 콘텐츠 마케팅 등 마케팅 캠페인 관리",
        "category": "marketing",
        "icon": "📣",
        "order": 1,
        "tasks": [
            {"title": "목표 설정 및 KPI 정의", "priority": "high", "status": "todo"},
            {"title": "타겟 오디언스 분석", "priority": "high", "status": "todo"},
            {"title": "메시지 및 카피라이팅", "priority": "medium", "status": "todo"},
            {"title": "디자인 에셋 제작", "priority": "medium", "status": "todo"},
            {"title": "소셜 미디어 콘텐츠 준비", "priority": "medium", "status": "todo"},
            {"title": "이메일 캠페인 설정", "priority": "medium", "status": "todo"},
            {"title": "캠페인 런칭", "priority": "urgent", "status": "todo"},
            {"title": "성과 분석 및 리포팅", "priority": "high", "status": "todo"},
        ],
    },
    {
        "name": "연구 프로젝트",
        "description": "학술 연구, 논문 작성, 데이터 수집 및 분석을 위한 연구 워크플로우",
        "category": "research",
        "icon": "🔬",
        "order": 2,
        "tasks": [
            {"title": "연구 주제 정의", "priority": "high", "status": "todo"},
            {"title": "문헌 조사", "priority": "high", "status": "todo"},
            {"title": "연구 방법론 설계", "priority": "high", "status": "todo"},
            {"title": "데이터 수집", "priority": "urgent", "status": "todo"},
            {"title": "데이터 전처리", "priority": "medium", "status": "todo"},
            {"title": "데이터 분석", "priority": "urgent", "status": "todo"},
            {"title": "결과 해석", "priority": "high", "status": "todo"},
            {"title": "논문 초안 작성", "priority": "high", "status": "todo"},
            {"title": "내부 검토", "priority": "medium", "status": "todo"},
            {"title": "저널 제출", "priority": "urgent", "status": "todo"},
        ],
    },
    {
        "name": "제품 런칭",
        "description": "신제품 출시를 위한 사전 준비부터 런칭 후 모니터링까지",
        "category": "product",
        "icon": "🚀",
        "order": 3,
        "tasks": [
            {"title": "제품 로드맵 확정", "priority": "urgent", "status": "todo"},
            {"title": "베타 테스트 진행", "priority": "high", "status": "todo"},
            {"title": "피드백 수집 및 반영", "priority": "high", "status": "todo"},
            {"title": "가격 정책 결정", "priority": "high", "status": "todo"},
            {"title": "마케팅 자료 준비", "priority": "medium", "status": "todo"},
            {"title": "런칭 이벤트 기획", "priority": "medium", "status": "todo"},
            {"title": "제품 정식 런칭", "priority": "urgent", "status": "todo"},
            {"title": "고객 지원 체계 구축", "priority": "high", "status": "todo"},
            {"title": "런칭 후 지표 모니터링", "priority": "high", "status": "todo"},
        ],
    },
]


def seed(apps, schema_editor):
    ProjectTemplate = apps.get_model("projects", "ProjectTemplate")
    for t in TEMPLATES:
        ProjectTemplate.objects.get_or_create(name=t["name"], defaults=t)


def unseed(apps, schema_editor):
    ProjectTemplate = apps.get_model("projects", "ProjectTemplate")
    ProjectTemplate.objects.filter(name__in=[t["name"] for t in TEMPLATES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0004_projecttemplate"),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
