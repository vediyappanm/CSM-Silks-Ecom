from __future__ import annotations

import base64
import json
import time
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product
from catalog.selectors import public_products
from catalog.serializers import ProductListSerializer

from .models import TryOnSession
from .serializers import TryOnSerializer, VoiceSearchSerializer


def _image_url_to_base64(url: str, timeout: int = 12) -> tuple[str, str] | None:
    if not url:
        return None
    try:
        with urlopen(url, timeout=timeout) as response:
            content_type = response.headers.get_content_type() or "image/jpeg"
            data = response.read()
    except (HTTPError, URLError, TimeoutError, ValueError):
        return None
    return content_type, base64.b64encode(data).decode("ascii")


def _extract_text_from_anthropic_message(message) -> str:
    parts = []
    for block in getattr(message, "content", []) or []:
        text = getattr(block, "text", "")
        if text:
            parts.append(text)
    return "\n".join(parts).strip()


def _parse_tryon_json(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.removeprefix("json").strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        cleaned = cleaned[start:end + 1]
    data = json.loads(cleaned)
    return {
        "draping_tip": str(data.get("draping_tip") or ""),
        "colour_analysis": str(data.get("colour_analysis") or ""),
        "blouse_suggestion": str(data.get("blouse_suggestion") or ""),
        "jewellery_pairing": str(data.get("jewellery_pairing") or ""),
        "footwear": str(data.get("footwear") or ""),
        "confidence_score": max(1, min(99, int(data.get("confidence_score") or 85))),
        "ai_verdict": str(data.get("ai_verdict") or ""),
        "alternative_colours": [str(item) for item in (data.get("alternative_colours") or [])][:5],
        "provider": "anthropic",
    }


def anthropic_tryon_result(*, product: Product | None, validated: dict) -> tuple[dict | None, str, int, int]:
    if not settings.ANTHROPIC_API_KEY:
        return None, settings.ANTHROPIC_MODEL, 0, 0
    user_photo = (validated.get("user_photo_base64") or "").strip()
    if not user_photo:
        return None, settings.ANTHROPIC_MODEL, 0, 0

    product_image_url = validated.get("product_image_url") or ""
    if product and not product_image_url:
        image = product.images.filter(is_primary=True).first() or product.images.first()
        product_image_url = image.image_url if image else ""
    product_image = _image_url_to_base64(product_image_url)

    try:
        from anthropic import Anthropic
    except ImportError:
        return None, settings.ANTHROPIC_MODEL, 0, 0

    content = [
        {
            "type": "text",
            "text": (
                "You are a senior Indian textile stylist for CSM Silks. Analyze the customer's uploaded photo "
                "and the saree/product image when present. Return ONLY compact JSON with keys: "
                "draping_tip, colour_analysis, blouse_suggestion, jewellery_pairing, footwear, "
                "confidence_score, ai_verdict, alternative_colours. "
                f"Customer details: skin tone={validated.get('skin_tone') or 'not specified'}, "
                f"body type={validated.get('body_type') or 'not specified'}, "
                f"drape style={validated.get('drape_style') or 'Nivi'}, "
                f"occasion={validated.get('occasion') or 'occasion wear'}. "
                f"Product: {product.name if product else 'selected silk product'}."
            ),
        },
        {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": validated.get("user_photo_media_type") or "image/jpeg",
                "data": user_photo,
            },
        },
    ]
    if product_image:
        content.append(
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": product_image[0],
                    "data": product_image[1],
                },
            }
        )

    started = time.perf_counter()
    message = Anthropic(api_key=settings.ANTHROPIC_API_KEY).messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=700,
        messages=[{"role": "user", "content": content}],
    )
    latency_ms = int((time.perf_counter() - started) * 1000)
    result = _parse_tryon_json(_extract_text_from_anthropic_message(message))
    tokens = getattr(getattr(message, "usage", None), "output_tokens", 0) or 0
    return result, settings.ANTHROPIC_MODEL, tokens, latency_ms


class TryOnView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TryOnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = None
        if serializer.validated_data.get("product_id"):
            product = get_object_or_404(Product, id=serializer.validated_data["product_id"])
        skin_tone = serializer.validated_data.get("skin_tone", "medium")
        body_type = serializer.validated_data.get("body_type", "regular")
        drape_style = serializer.validated_data.get("drape_style", "traditional")
        occasion = serializer.validated_data.get("occasion", "")
        model_used = settings.ANTHROPIC_MODEL
        tokens_used = 0
        latency_ms = 0
        if not settings.ANTHROPIC_API_KEY:
            return Response(
                {"detail": "Real AI try-on is not configured. Set ANTHROPIC_API_KEY before enabling this production feature."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if not serializer.validated_data.get("user_photo_base64"):
            return Response(
                {"detail": "Upload a customer photo to run real Claude Vision try-on."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            result, model_used, tokens_used, latency_ms = anthropic_tryon_result(product=product, validated=serializer.validated_data)
        except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
            logger.error("AI try-on failed: %s", exc)
            result = None
            model_used = settings.ANTHROPIC_MODEL
            latency_ms = 0
            tokens_used = 0
            ai_error = str(exc)[:240]
        else:
            ai_error = ""
        if not result:
            detail = "Real AI try-on failed. Check Anthropic configuration, uploaded image payload, and model access."
            if ai_error:
                detail = f"{detail} Provider error: {ai_error}"
            return Response({"detail": detail}, status=status.HTTP_502_BAD_GATEWAY)
        session = TryOnSession.objects.create(
            user=request.user if request.user.is_authenticated else None,
            product=product,
            skin_tone=skin_tone,
            body_type=body_type,
            drape_style=drape_style,
            occasion=occasion,
            ai_result=result,
            confidence_score=result["confidence_score"],
            model_used=model_used,
            tokens_used=tokens_used,
            latency_ms=latency_ms,
        )
        return Response({"session_id": session.id, **result})


class VoiceSearchView(APIView):
    def post(self, request):
        serializer = VoiceSearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        transcript = serializer.validated_data["transcript"]
        return Response({"intent": "search", "search_query": transcript, "response_text": f"Searching CSM Silks for {transcript}", "filters": {}})


class RecommendView(APIView):
    def get(self, request):
        products = public_products({"featured": "true"})[:6]
        return Response({"items": ProductListSerializer(products, many=True).data})

    def post(self, request):
        return self.get(request)
