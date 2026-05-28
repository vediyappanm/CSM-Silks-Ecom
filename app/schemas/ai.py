from __future__ import annotations
import uuid
from pydantic import BaseModel


class TryOnRequest(BaseModel):
    product_id: uuid.UUID
    skin_tone: str
    body_type: str
    drape_style: str
    occasion: str = "festive"


class TryOnResponse(BaseModel):
    draping_tip: str
    colour_analysis: str
    blouse_suggestion: str
    jewellery_pairing: str
    footwear: str
    confidence_score: int
    ai_verdict: str
    alternative_colours: list[str]
    session_id: uuid.UUID


class RecommendationRequest(BaseModel):
    limit: int = 6


class RecommendationResponse(BaseModel):
    recommendations: list[dict]


class VoiceSearchRequest(BaseModel):
    transcript: str
    context: str = ""


class VoiceSearchResponse(BaseModel):
    intent: str
    search_query: str | None
    page: str | None
    response_text: str
    filters: dict


class AdminChatRequest(BaseModel):
    messages: list[dict]  # [{role: user|assistant, content: str}]
