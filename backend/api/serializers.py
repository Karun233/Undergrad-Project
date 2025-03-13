from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Journal, JournalEntry, EntryImage
import json

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
        fields = ["id", "title", "description", "owner", "created_at"]
        read_only_fields = ["owner"]

class EntryImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntryImage
        fields = ['id', 'image', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

class StringListField(serializers.Field):
    """
    Custom field for handling ArrayField of strings specifically designed 
    to work with feeling_during and similar array fields.
    """
    def to_representation(self, obj):
        return obj  # Simply return the list as is for serialization

    def to_internal_value(self, data):
        # Convert input to a list of strings no matter what format it comes in
        if isinstance(data, str):
            try:
                # Try to parse as JSON
                parsed_data = json.loads(data)
                if isinstance(parsed_data, list):
                    return [str(item) for item in parsed_data if item]
                else:
                    return [str(parsed_data)] if parsed_data else []
            except json.JSONDecodeError:
                # If not JSON, treat as a single string item
                return [data] if data.strip() else []
        elif isinstance(data, list):
            # If already a list, ensure all items are strings
            return [str(item) for item in data if item]
        else:
            # If some other type, convert to string and put in a list
            return [str(data)] if data else []

class JournalEntrySerializer(serializers.ModelSerializer):
    entry_images = EntryImageSerializer(many=True, read_only=True)
    feeling_during = StringListField(required=False)
    images = StringListField(required=False)
    
    class Meta:
        model = JournalEntry
        fields = [
            'id',
            'journal',
            'date',
            'instrument',
            'direction',
            'outcome',
            'risk_management',
            'feeling_during',
            'additional_comments',
            'created_at',
            'risk_reward_ratio',
            'profit_loss',
            'images',
            'entry_images',
        ]
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'journal': {'required': False},
            'risk_reward_ratio': {'required': False},
            'profit_loss': {'required': False},
        }