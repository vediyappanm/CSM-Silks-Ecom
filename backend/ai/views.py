from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product
from catalog.selectors import public_products
from catalog.serializers import ProductListSerializer

from .models import TryOnSession
from .serializers import TryOnSerializer, VoiceSearchSerializer


class TryOnView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def post(self, request):
        serializer = TryOnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = None
        if serializer.validated_data.get("product_id"):
            product = get_object_or_404(Product, id=serializer.validated_data["product_id"])
        result = {
            "draping_tip": "Choose a neat pleat fall and keep the pallu structured for a premium silk look.",
            "colour_analysis": "Warm gold and jewel tones suit festive and bridal occasions beautifully.",
            "blouse_suggestion": "Pair with a contrast blouse and simple zari border to keep the weave prominent.",
            "jewellery_pairing": "Temple jewellery or kundan works best with this silk profile.",
            "footwear": "Block heels or embellished flats will balance comfort with occasion wear.",
            "confidence_score": 88,
            "ai_verdict": "This is a strong occasion-ready choice from the CSM Silks collection.",
            "alternative_colours": ["Gold", "Maroon", "Bottle green"],
        }
        session = TryOnSession.objects.create(
            user=request.user if request.user.is_authenticated else None,
            product=product,
            skin_tone=serializer.validated_data.get("skin_tone", "medium"),
            body_type=serializer.validated_data.get("body_type", "regular"),
            drape_style=serializer.validated_data.get("drape_style", "traditional"),
            occasion=serializer.validated_data.get("occasion", ""),
            ai_result=result,
            confidence_score=result["confidence_score"],
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
