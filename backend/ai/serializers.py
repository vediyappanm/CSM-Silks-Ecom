from rest_framework import serializers


class TryOnSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=False)
    skin_tone = serializers.CharField(required=False, allow_blank=True)
    body_type = serializers.CharField(required=False, allow_blank=True)
    drape_style = serializers.CharField(required=False, allow_blank=True)
    occasion = serializers.CharField(required=False, allow_blank=True)


class VoiceSearchSerializer(serializers.Serializer):
    transcript = serializers.CharField()
    context = serializers.CharField(required=False, allow_blank=True)
