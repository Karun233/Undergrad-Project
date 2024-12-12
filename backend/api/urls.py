from django.urls import path
from . import views

urlpatterns = [
    path("journal/", views.CreateJournalView.as_view(), name="journal-list"),
    path("journal/delete/<int:pk>/", views.DeleteJournal.as_view(), name="delete-journal"),
]
