from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import CodeViewSet, UserViewSet, analyse_code, get_code_history

router = DefaultRouter()
router.register('codes', CodeViewSet, basename='codes')
router.register('users', UserViewSet, basename='users')
urlpatterns = router.urls + [
    path('login/', UserViewSet.as_view({'post': 'login'}), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/analyse-code/', analyse_code, name='analyse-code'),
    path('code-history/<str:username>/', get_code_history, name='code_history'),
]