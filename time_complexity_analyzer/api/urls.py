from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CodeViewSet,
    UserViewSet,
    analyse_code,
    analyse_code_async_cancel,
    analyse_code_async_start,
    analyse_code_async_status,
    get_code_history,
)

router = DefaultRouter()
router.register('codes', CodeViewSet, basename='codes')
router.register('users', UserViewSet, basename='users')
urlpatterns = router.urls + [
    path('login/', UserViewSet.as_view({'post': 'login'}), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/analyse-code/', analyse_code, name='analyse-code'),
    path('api/analyse-code/async/start/', analyse_code_async_start, name='analyse-code-async-start'),
    path('api/analyse-code/async/<uuid:job_id>/', analyse_code_async_status, name='analyse-code-async-status'),
    path('api/analyse-code/async/<uuid:job_id>/cancel/', analyse_code_async_cancel, name='analyse-code-async-cancel'),
    path('code-history/<str:username>/', get_code_history, name='code_history'),
]