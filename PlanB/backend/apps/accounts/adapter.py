from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken


class AccountAdapter(DefaultAccountAdapter):
    def _frontend_url(self, request):
        """요청 host를 보고 올바른 프론트엔드 URL을 자동 결정."""
        host = request.get_host()  # USE_X_FORWARDED_HOST=True 이면 Codespace 공개 host 반환

        if ".app.github.dev" in host:
            # Codespace 환경: 백엔드 포트(-8000)를 프론트 포트(-5173)로 교체
            frontend_host = host.replace("-8000.app.github.dev", "-5173.app.github.dev")
            return f"https://{frontend_host}"

        # 로컬 환경 fallback
        return getattr(settings, "FRONTEND_URL", "http://localhost:5173")

    def get_login_redirect_url(self, request):
        if request.user.is_authenticated:
            refresh = RefreshToken.for_user(request.user)
            access = str(refresh.access_token)
            frontend_url = self._frontend_url(request)
            return f"{frontend_url}/?token={access}&refresh={str(refresh)}"
        return super().get_login_redirect_url(request)
