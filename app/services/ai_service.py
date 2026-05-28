"""
CSM Silks AI Service — All Claude integrations.
Model: claude-sonnet-4-20250514 (primary) | claude-haiku-4-5-20251001 (fast)
Read skills/*.md before modifying any prompt.
"""
import json
import time
from typing import AsyncIterator
import anthropic
from app.config import settings


class AIService:
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.primary = settings.AI_PRIMARY_MODEL
        self.fast = settings.AI_FAST_MODEL

    # ── VIRTUAL TRY-ON ───────────────────────────────────────────────────────
    async def virtual_try_on(
        self,
        skin_tone: str,
        body_type: str,
        drape_style: str,
        occasion: str,
        product_name: str,
        category: str,
        colour: str,
        zari_type: str,
        fabric_weight: str = "medium",
    ) -> dict:
        """
        Skill: skills/virtual-tryon.md
        Returns structured JSON styling advice.
        """
        system = (
            "You are CSM Silks virtual styling AI — warm, knowledgeable, and concise. "
            "You specialise in Indian silk sarees, draping techniques, and colour theory "
            "for Indian skin tones. Always respond with valid JSON only. No markdown, no extra text."
        )
        prompt = f"""Customer profile:
- Skin tone: {skin_tone}
- Body type: {body_type}
- Preferred draping style: {drape_style}
- Occasion: {occasion}

Saree being tried:
- Name: {product_name}
- Category: {category}
- Primary colour: {colour}
- Zari type: {zari_type}
- Fabric weight: {fabric_weight}

Provide personalised styling advice. Respond ONLY as JSON:
{{
  "draping_tip": "Specific draping tip for their body type and this saree",
  "colour_analysis": "How this colour complements their skin tone",
  "blouse_suggestion": "Specific blouse colour, neckline, sleeve recommendation",
  "jewellery_pairing": "Temple jewellery / oxidised / polki / kundan suggestion",
  "footwear": "Kolhapuri / heels / wedges suggestion",
  "confidence_score": 0,
  "ai_verdict": "One warm sentence verdict about this combination",
  "alternative_colours": ["colour1", "colour2"]
}}"""

        t0 = time.time()
        response = await self.client.messages.create(
            model=self.primary,
            max_tokens=700,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        latency_ms = int((time.time() - t0) * 1000)
        result = json.loads(response.content[0].text)
        result["_meta"] = {
            "model": self.primary,
            "tokens": response.usage.input_tokens + response.usage.output_tokens,
            "latency_ms": latency_ms,
        }
        return result

    # ── DAILY REPORT SUMMARY ─────────────────────────────────────────────────
    async def generate_report_summary(self, report_data: dict) -> str:
        """
        Skill: skills/daily-report.md
        Generates executive summary for daily report.
        """
        prompt = f"""Write a 3-4 sentence executive summary for CSM Silks daily report.

Today's data:
- Revenue: ₹{report_data.get('revenue', 0):,.0f}
- Orders: {report_data.get('orders', 0)} (Delivered: {report_data.get('delivered', 0)})
- Returns: {report_data.get('returns', 0)} ({report_data.get('return_rate', 0):.1f}%)
- Top product: {report_data.get('top_product', 'N/A')} ({report_data.get('top_units', 0)} units)
- Try-on sessions: {report_data.get('tryon_sessions', 0)}
- Unsold alerts: {report_data.get('unsold_count', 0)} items
- Total unsold capital blocked: ₹{report_data.get('capital_blocked', 0):,.0f}

Tone: Professional, data-driven, action-oriented.
Highlight what's notable. Flag what needs attention.
End with one recommended action for today."""

        response = await self.client.messages.create(
            model=self.primary,
            max_tokens=250,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text

    # ── PRODUCT RECOMMENDATIONS ──────────────────────────────────────────────
    async def get_recommendations(self, user_data: dict, product_slugs: list[str]) -> list[dict]:
        """
        Skill: skills/product-recommender.md
        Returns top 6 personalised product recommendations.
        """
        system = (
            "You are CSM Silks recommendation engine. "
            "Analyse customer data and recommend sarees. "
            "Respond with valid JSON array only."
        )
        prompt = f"""Customer data:
- Past purchases: {user_data.get('purchase_history', [])}
- Wishlist categories: {user_data.get('wishlist_categories', [])}
- Skin tone: {user_data.get('skin_tone', 'unknown')}
- Average order value: ₹{user_data.get('avg_order_value', 5000)}
- Upcoming occasions: {user_data.get('occasions', [])}

Available product slugs: {product_slugs[:30]}

Recommend top 6 products. Respond as JSON array:
[{{"slug": "product-slug", "reason": "Why this suits them", "confidence": 0}}]"""

        response = await self.client.messages.create(
            model=self.primary,
            max_tokens=500,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        return json.loads(response.content[0].text)

    # ── UNSOLD ALERT ANALYSIS ────────────────────────────────────────────────
    async def analyse_unsold_items(self, items: list[dict]) -> dict:
        """
        Skill: skills/unsold-alert.md
        Recommends discount strategy for unsold items.
        """
        items_text = "\n".join([
            f"- {i['name']} (SKU: {i['sku']}, {i['days']} days, {i['qty']} units, ₹{i['capital']:,.0f} blocked)"
            for i in items
        ])
        prompt = f"""CSM Silks has the following unsold items (20+ days without a sale):

{items_text}

For each item, recommend:
1. Discount percentage (5-20%)
2. Promotion strategy (flash sale / wishlist notification / bundle offer)
3. Target customer segment

Respond as JSON:
{{"recommendations": [{{"sku": "...", "discount_pct": 10, "strategy": "...", "target_segment": "..."}}]}}"""

        response = await self.client.messages.create(
            model=self.primary,
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        return json.loads(response.content[0].text)

    # ── ADMIN CHAT (streaming) ───────────────────────────────────────────────
    async def admin_chat_stream(
        self, messages: list[dict], live_data: dict
    ) -> AsyncIterator[str]:
        """
        Skill: skills/admin-chat.md
        Streams response to admin chat queries.
        """
        system = f"""You are the CSM Silks Business Intelligence AI.

Real-time business data:
- Today's revenue: ₹{live_data.get('revenue', 0):,.0f}
- Orders today: {live_data.get('orders', 0)}
- Pending orders: {live_data.get('pending', 0)}
- Try-on sessions: {live_data.get('tryon_sessions', 0)}
- Unsold alerts: {live_data.get('unsold_alerts', 0)}
- WhatsApp sent: {live_data.get('wa_sent', 0)}

Context: Premium silk saree brand, Kanchipuram, India.
Products: Kanjivaram, Banarasi, Patola, Chanderi, Mysore, Tussar.
GST: 5% on silk sarees (HSN 5007).
Always be concise, data-first, and action-oriented. Use ₹ for Indian Rupees."""

        async with self.client.messages.stream(
            model=self.primary,
            max_tokens=800,
            system=system,
            messages=messages,
        ) as stream:
            async for text in stream.text_stream:
                yield text

    # ── VOICE ASSISTANT ──────────────────────────────────────────────────────
    async def voice_search(self, transcript: str, context: str = "") -> dict:
        """
        Skill: skills/voice-assistant.md
        Interprets voice query and returns search/action intent.
        """
        prompt = f"""Customer voice query: "{transcript}"
Context: {context or 'browsing CSM Silks website'}

Interpret the intent and return JSON:
{{
  "intent": "search|product_detail|add_to_cart|navigate|support",
  "search_query": "extracted search terms if intent is search",
  "product_slug": "slug if specific product mentioned",
  "page": "page to navigate to if navigation intent",
  "response_text": "Friendly response to speak back to the customer",
  "filters": {{"category": "", "price_max": 0, "occasion": ""}}
}}"""

        response = await self.client.messages.create(
            model=self.fast,
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        return json.loads(response.content[0].text)

    # ── INVOICE AI ASSIST ────────────────────────────────────────────────────
    async def generate_invoice_notes(self, order_data: dict) -> str:
        """
        Skill: skills/invoice-generator.md
        Generates professional invoice notes.
        """
        prompt = f"""Write professional invoice notes for:
Order: {order_data.get('order_number')}
Products: {', '.join(order_data.get('products', []))}
Customer: {order_data.get('customer_name')}
GI Tagged: Yes | HSN Code: 5007 | Pure Silk Guaranteed

Keep to 2 sentences. Professional, authentic tone."""

        response = await self.client.messages.create(
            model=self.fast,
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text


# Singleton
ai_service = AIService()
