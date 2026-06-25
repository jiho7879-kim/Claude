from .base import *

DEBUG = True

ALLOWED_HOSTS = ["*"]

# Codespace 프록시 헤더 신뢰 — allauth/Django가 Codespace 공개 URL로 빌드
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# allauth: 로그인 후 프론트엔드로 리다이렉트 (adapter.py에서 동적으로 덮어씀)
LOGIN_REDIRECT_URL = "http://localhost:5173/"
FRONTEND_URL = "http://localhost:5173"
ACCOUNT_LOGOUT_REDIRECT_URL = "http://localhost:5173/login"

# allauth 추가 설정
ACCOUNT_EMAIL_VERIFICATION = "none"
SOCIALACCOUNT_LOGIN_ON_GET = True

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "loggers": {
        "allauth": {"handlers": ["console"], "level": "DEBUG"},
        "django.request": {"handlers": ["console"], "level": "DEBUG"},
    },
}
