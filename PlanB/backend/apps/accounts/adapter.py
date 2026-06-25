from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken


def _get_frontend_url(request):
    host = request.get_host()
    if ".app.github.dev" in host:
        frontend_host = host.replace("-8000.app.github.dev", "-5173.app.github.dev")
        return f"https://{frontend_host}"
    return getattr(settings, "FRONTEND_URL", "http://localhost:5173")


def _jwt_redirect_url(request):
    if request.user.is_authenticated:
        refresh = RefreshToken.for_user(request.user)
        access = str(refresh.access_token)
        frontend_url = _get_frontend_url(request)
        return f"{frontend_url}/?token={access}&refresh={str(refresh)}"
    return _get_frontend_url(request)


class AccountAdapter(DefaultAccountAdapter):
    def get_login_redirect_url(self, request):
        return _jwt_redirect_url(request)


class SocialAccountAdapter(DefaultSocialAccountAdapter):
    def get_login_redirect_url(self, request):
        return _jwt_redirect_url(request)
