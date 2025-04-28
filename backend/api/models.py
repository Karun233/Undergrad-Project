from django.db import models
from django.contrib.auth.models import User
from django.contrib.postgres.fields import ArrayField  # Import ArrayField

class Journal(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='journals')
    title = models.CharField(max_length=100)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    max_risk = models.DecimalField(max_digits=5, decimal_places=2, default=1.0, help_text="Maximum risk percentage allowed per trade")
    account_size = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Initial account size for calculating position sizes")

    def __str__(self):
        return self.title

# Custom field validator for ArrayField to ensure it only contains strings
def validate_string_array(value):
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if item]

class JournalEntry(models.Model):
    DIRECTION_CHOICES = [
        ('Buy', 'Buy'),
        ('Sell', 'Sell'),
    ]
    OUTCOME_CHOICES = [
        ('Win', 'Win'),
        ('Loss', 'Loss'),
        ('Breakeven', 'Breakeven'),
    ]
    EMOTION_CHOICES = [
        ('Not worried', 'Not worried'),
        ('Not really bothered', 'Not really bothered'),
        ('Neutral', 'Neutral'),
        ('A little worried', 'A little worried'),
        ('Very uneasy', 'Very uneasy'),
    ]
    FEELING_BEFORE_CHOICES = [
        ('Hesitant', 'Hesitant'),
        ('Slightly hesitant', 'Slightly hesitant'),
        ('Neutral', 'Neutral'),
        ('Slightly confident', 'Slightly confident'),
        ('Very confident', 'Very confident'),
    ]
    FEELING_DURING_CHOICES = [
        ('Very worried', 'Very worried'),
        ('Worried', 'Worried'),
        ('Slightly worried', 'Slightly worried'),
        ('Neutral', 'Neutral'),
        ('Slightly confident', 'Slightly confident'),
        ('Very confident', 'Very confident'),
    ]
    
    journal = models.ForeignKey(Journal, on_delete=models.CASCADE, related_name='entries')
    date = models.DateField()
    instrument = models.CharField(max_length=100)
    direction = models.CharField(max_length=50, choices=DIRECTION_CHOICES)
    outcome = models.CharField(max_length=50, choices=OUTCOME_CHOICES)
    risk_management = models.TextField()
    # Whether trader followed their strategy
    follow_strategy = models.BooleanField(default=True, help_text="Did you follow your trading strategy for this trade?")
    # Updated fields for emotion tracking with structured options
    feeling_before = models.CharField(max_length=50, choices=FEELING_BEFORE_CHOICES, blank=True, null=True)
    confidence_before = models.IntegerField(null=True, blank=True, help_text="Confidence level before trade (1-10)")
    feeling_during = models.CharField(max_length=50, choices=FEELING_DURING_CHOICES, blank=True, null=True)
    confidence_during = models.IntegerField(null=True, blank=True, help_text="Confidence level during trade (1-10)")
    feeling_during_text = models.TextField(blank=True, null=True)
    review = models.TextField(blank=True, null=True)
    review_rating = models.IntegerField(null=True, blank=True, help_text="Rating for this trade (1-10)")
    # Amount risked as a percentage
    risk_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Percentage of account risked on this trade")
    additional_comments = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    risk_reward_ratio = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    profit_loss = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    images = ArrayField(
        models.CharField(max_length=255), 
        blank=True, 
        null=True,
        default=list
    )

    def __str__(self):
        return f"Entry for {self.journal.title} on {self.date}"
    
    def save(self, *args, **kwargs):
        # Ensure images is a list of strings before saving
        if self.images is None:
            self.images = []
        else:
            self.images = [str(item) for item in self.images if item]
        super().save(*args, **kwargs)

class EntryImage(models.Model):
    entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='entry_images')
    image = models.ImageField(upload_to='journal_images/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Image for {self.entry}"
    
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    
    def __str__(self):
        return f"Profile for {self.user.username}"

class Milestone(models.Model):
    MILESTONE_TYPES = [
        ('followed_plan', 'Followed Plan'),
        ('journal_trade', 'Journal Trade'),
        ('high_rating', 'High Rating'),
        ('profitable_day', 'Profitable Day'),
    ]
    
    journal = models.ForeignKey(Journal, on_delete=models.CASCADE, related_name='milestones')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    type = models.CharField(max_length=50, choices=MILESTONE_TYPES)
    target = models.IntegerField(default=5)
    current_progress = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.current_progress}/{self.target})"
    
    def update_progress(self):
        """Update the completed status based on current progress"""
        old_completed = self.completed
        if self.current_progress >= self.target:
            self.completed = True
        else:
            self.completed = False
            
        # Only save if there's an actual change
        if old_completed != self.completed or self._state.adding:
            self.save()

# Community Feature Models
class CommunityPost(models.Model):
    RATING_CHOICES = [
        (1, '1 - Poor'),
        (2, '2 - Fair'),
        (3, '3 - Good'),
        (4, '4 - Very Good'),
        (5, '5 - Excellent'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='community_posts')
    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='community_posts')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    rating_count = models.IntegerField(default=0)
    comment_count = models.IntegerField(default=0)
    
    class Meta:
        # Ensure a user can only share a specific journal entry once
        unique_together = ('user', 'journal_entry')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Post by {self.user.username} - {self.title}"
    
    def update_average_rating(self):
        """Calculate and update the average rating for this post"""
        ratings = PostRating.objects.filter(post=self)
        if ratings.exists():
            avg = ratings.aggregate(avg=models.Avg('rating'))['avg']
            self.average_rating = round(avg, 2)
            self.rating_count = ratings.count()
        else:
            self.average_rating = 0
            self.rating_count = 0
        self.save(update_fields=['average_rating', 'rating_count'])

class Comment(models.Model):
    post = models.ForeignKey(CommunityPost, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='community_comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.user.username} on {self.post.title}"
        
class PostRating(models.Model):
    post = models.ForeignKey(CommunityPost, on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='community_ratings')
    rating = models.IntegerField(choices=CommunityPost.RATING_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # Ensure a user can only rate a specific post once
        unique_together = ('user', 'post')
    
    def __str__(self):
        return f"Rating of {self.rating} by {self.user.username} on {self.post.title}"