from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Journal, JournalEntry, EntryImage, Milestone, CommunityPost, Comment, PostRating
import json
from .models import UserProfile

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "password"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
    
class JournalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Journal
        fields = ["id", "title", "description", "owner", "created_at", "max_risk", "account_size"]
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
    images = StringListField(required=False)
    feeling_during = StringListField(required=False)
    
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
            'follow_strategy',
            'feeling_before',
            'confidence_before',
            'feeling_during',
            'confidence_during',
            'feeling_during_text',
            'review',
            'review_rating',
            'risk_percent',
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
            'risk_percent': {'required': False},
            'confidence_before': {'required': False},
            'confidence_during': {'required': False},
            'review_rating': {'required': False},
        }


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['profile_picture']

class UserProfileDetailSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    profile_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProfile
        fields = ['username', 'email', 'profile_picture']
    
    def get_profile_picture(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None

class MilestoneSerializer(serializers.ModelSerializer):
    progress_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = Milestone
        fields = ['id', 'journal', 'name', 'description', 'type', 'target', 
                  'current_progress', 'completed', 'created_at', 'progress_percentage']
        read_only_fields = ['id', 'created_at', 'progress_percentage']
    
    def get_progress_percentage(self, obj):
        if obj.target == 0:
            return 0
        return min(100, int((obj.current_progress / obj.target) * 100))

# Community serializers
class CommentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Comment
        fields = ['id', 'post', 'user', 'username', 'content', 'created_at']
        read_only_fields = ['id', 'created_at', 'username']
        extra_kwargs = {'user': {'write_only': True}}

class PostRatingSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = PostRating
        fields = ['id', 'post', 'user', 'username', 'rating', 'created_at']
        read_only_fields = ['id', 'created_at', 'username']
        extra_kwargs = {'user': {'write_only': True}}

class CommunityPostListSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    instrument = serializers.CharField(source='journal_entry.instrument', read_only=True)
    direction = serializers.CharField(source='journal_entry.direction', read_only=True)
    outcome = serializers.CharField(source='journal_entry.outcome', read_only=True)
    date = serializers.DateField(source='journal_entry.date', read_only=True)
    
    class Meta:
        model = CommunityPost
        fields = [
            'id', 'username', 'title', 'description', 'created_at', 
            'average_rating', 'rating_count', 'comment_count',
            'instrument', 'direction', 'outcome', 'date'
        ]
        read_only_fields = ['id', 'created_at', 'average_rating', 'rating_count', 'comment_count']

class CommunityPostDetailSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    comments = serializers.SerializerMethodField()
    entry_data = serializers.SerializerMethodField()
    entry_images = serializers.SerializerMethodField()
    
    class Meta:
        model = CommunityPost
        fields = [
            'id', 'username', 'title', 'description', 'created_at', 
            'average_rating', 'rating_count', 'comment_count',
            'comments', 'entry_data', 'entry_images'
        ]
        read_only_fields = ['id', 'created_at', 'average_rating', 'rating_count', 'comment_count']
    
    def get_comments(self, obj):
        """Get all comments for this post"""
        comments = Comment.objects.filter(post=obj).order_by('-created_at')
        return CommentSerializer(comments, many=True).data
        
    def get_entry_data(self, obj):
        """Return selected fields from the journal entry for display"""
        entry = obj.journal_entry
        # Format the date to include the day name as per user preference
        date_str = entry.date.strftime("%A, %d %B %Y") if entry and entry.date else ""
        
        if not entry:
            return {}
            
        entry_data = {
            'date': date_str,
            'instrument': entry.instrument,
            'direction': entry.direction,
            'outcome': entry.outcome,
            'risk_management': entry.risk_management,
            'feeling_before': entry.feeling_before,
            'feeling_during': entry.feeling_during,
            'follow_strategy': entry.follow_strategy,
            'risk_reward_ratio': entry.risk_reward_ratio,
            'profit_loss': entry.profit_loss,
            'review': entry.review,
            'review_rating': entry.review_rating
        }
        return entry_data
    
    def get_entry_images(self, obj):
        """Return all images associated with the journal entry"""
        entry = obj.journal_entry
        if not entry:
            return []
            
        images = EntryImage.objects.filter(journal_entry=entry)
        
        # Create a list of image URLs
        image_urls = []
        for image in images:
            try:
                request = self.context.get('request')
                if request and image.image:
                    image_url = request.build_absolute_uri(image.image.url)
                    image_urls.append({
                        'id': image.id,
                        'url': image_url,
                        'description': image.description or ''
                    })
            except Exception as e:
                print(f"Error processing image {image.id}: {str(e)}")
        
        return image_urls

class CommunityPostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityPost
        fields = ['id', 'journal_entry', 'title', 'description']
        read_only_fields = ['id']
        
    def create(self, validated_data):
        # Set the user from the request context
        user = self.context['request'].user
        validated_data['user'] = user
        return super().create(validated_data)