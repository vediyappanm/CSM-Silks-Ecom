from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from accounts.views import AddressDetailView, AddressListCreateView


def health(_request):
    return JsonResponse(
        {
            "status": "healthy",
            "service": "CSM Silks Django API",
            "env": settings.APP_ENV,
        }
    )


urlpatterns = [
    path("admin/django/", admin.site.urls),
    path("health", health),
    path("api/health", health),
    path("api/schema", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/auth/", include("accounts.urls")),
    path("api/addresses", AddressListCreateView.as_view()),
    path("api/addresses/<int:address_id>", AddressDetailView.as_view()),
    path("api/", include("catalog.urls")),
    path("api/", include("cart.urls")),
    path("api/", include("orders.urls")),
    path("api/", include("payments.urls")),
    path("api/", include("inventory.urls")),
    path("api/", include("loyalty.urls")),
    path("api/", include("notifications.urls")),
    path("api/", include("analytics.urls")),
    path("api/", include("shipping.urls")),
    path("api/", include("reviews.urls")),
    path("api/", include("ai.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
