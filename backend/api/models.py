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
    journal = models.ForeignKey(Journal, on_delete=models.CASCADE, related_name='entries')
    date = models.DateField()
    instrument = models.CharField(max_length=100)
    direction = models.CharField(max_length=50)  # e.g., Buy, Sell
    outcome = models.CharField(max_length=50)   # e.g., Win, Loss
    risk_management = models.TextField()
    feeling_during = ArrayField(models.CharField(max_length=50), blank=True, default=list)  # Array of feelings
    additional_comments = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Entry for {self.journal.title} on {self.date}"