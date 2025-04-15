from django.db import models
from django.contrib.auth.models import User
from django.contrib.postgres.fields import ArrayField  # Import ArrayField

class Journal(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='journals')
    title = models.CharField(max_length=100)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    max_risk = models.DecimalField(max_digits=5, decimal_places=2, default=1.0, help_text="Maximum risk percentage allowed per trade")

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
    
    journal = models.ForeignKey(Journal, on_delete=models.CASCADE, related_name='entries')
    date = models.DateField()
    instrument = models.CharField(max_length=100)
    direction = models.CharField(max_length=50, choices=DIRECTION_CHOICES)
    outcome = models.CharField(max_length=50, choices=OUTCOME_CHOICES)
    risk_management = models.TextField()
    # Whether trader followed their strategy
    follow_strategy = models.BooleanField(default=True, help_text="Did you follow your trading strategy for this trade?")
    # New fields for emotion tracking and review
    feeling_before = models.TextField(blank=True, null=True)
    feeling_during_text = models.TextField(blank=True, null=True)
    review = models.TextField(blank=True, null=True)
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