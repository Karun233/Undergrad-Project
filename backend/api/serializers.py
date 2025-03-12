from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Journal, JournalEntry

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "password"]
        extra_kwargs = {"password:": {"write_only": True}}


    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
    

class JournalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Journal
        fields = ["id", "title", "description", "owner", "created_at"]  # Correct fields
        read_only_fields = ["owner"]  # Make owner and created_at read-only



class JournalEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalEntry
        fields = [
            'id',
            'journal',  # Include journal field
            'date',
            'instrument',
            'direction',
            'outcome',
            'risk_management',
            'feeling_during',
            'additional_comments',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'journal': {'required': False},  # Make journal optional in serializer
            'feeling_during': {'required': False, 'default': list}  # Make feeling_during optional
        } 
    