from django.db import models
from django.contrib.auth.models import User

# Create your models here.

class Journal(models.Model):
    owner = models.ForeignKey(User , on_delete=models.CASCADE, related_name='journals')
    title = models.CharField(max_length=100)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

