from django.db import models
from django.contrib.auth.models import User
from django.contrib.postgres.fields import ArrayField  # Import ArrayField

class Journal(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='journals')
    title = models.CharField(max_length=100)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

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
    feeling_during = ArrayField(models.CharField(max_length=50), blank=True, default=list)
    additional_comments = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Entry for {self.journal.title} on {self.date}"