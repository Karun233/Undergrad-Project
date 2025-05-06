from django.db import models
from django.contrib.auth.models import User
from django.contrib.postgres.fields import ArrayField  
from django.db.models.signals import post_save
from django.dispatch import receiver

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
   
    follow_strategy = models.BooleanField(default=True, help_text="Did you follow your trading strategy for this trade?")
    
    feeling_before = models.CharField(max_length=50, choices=FEELING_BEFORE_CHOICES, blank=True, null=True)
    confidence_before = models.IntegerField(null=True, blank=True, help_text="Confidence level before trade (1-10)")
    feeling_during = models.CharField(max_length=50, choices=FEELING_DURING_CHOICES, blank=True, null=True)
    confidence_during = models.IntegerField(null=True, blank=True, help_text="Confidence level during trade (1-10)")
    feeling_during_text = models.TextField(blank=True, null=True)
    review = models.TextField(blank=True, null=True)
    review_rating = models.IntegerField(null=True, blank=True, help_text="Rating for this trade (1-10)")
   
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
    score = models.IntegerField(default=0, help_text="User's score based on number of journal entries")
    
    def __str__(self):
        return f"{self.user.username}'s profile"

# Signal to create a UserProfile when a new User is created
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

# Signal to save the UserProfile when the User is saved
@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()

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

class CommunityEntry(models.Model):
    """Model for anonymously shared journal entries in the community section"""
    original_entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='shared_copies')
    original_journal = models.ForeignKey(Journal, on_delete=models.CASCADE, related_name='shared_entries')
    
    # trade info
    date = models.DateField()
    instrument = models.CharField(max_length=100)
    direction = models.CharField(max_length=50, choices=JournalEntry.DIRECTION_CHOICES)
    outcome = models.CharField(max_length=50, choices=JournalEntry.OUTCOME_CHOICES)
    
    # Trading metrics
    risk_reward_ratio = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    profit_loss = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    risk_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Emotional aspects
    feeling_before = models.CharField(max_length=50, choices=JournalEntry.FEELING_BEFORE_CHOICES, blank=True, null=True)
    confidence_before = models.IntegerField(null=True, blank=True)
    feeling_during = models.CharField(max_length=50, choices=JournalEntry.FEELING_DURING_CHOICES, blank=True, null=True)
    confidence_during = models.IntegerField(null=True, blank=True)
    
    # Trade analysis
    review = models.TextField(blank=True, null=True)
    review_rating = models.IntegerField(null=True, blank=True)
    
    # Images
    images = ArrayField(
        models.CharField(max_length=255), 
        blank=True, 
        null=True,
        default=list
    )
    
    # Timestamps
    shared_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Community Entry - {self.instrument} on {self.date}"
    
    def save(self, *args, **kwargs):
        # Ensure images is a list of strings before saving
        if self.images is None:
            self.images = []
        else:
            self.images = [str(item) for item in self.images if item]
        super().save(*args, **kwargs)

class Comment(models.Model):
    """Model for comments on community entries"""
    community_entry = models.ForeignKey(CommunityEntry, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Comment by {self.user.username} on {self.community_entry}"