from django.urls import path
from . import views

urlpatterns = [
    path("journal/", views.CreateJournalView.as_view(), name="journal-list"),
    path("journal/delete/<int:pk>/", views.DeleteJournal.as_view(), name="delete-journal"),
    path("journal/<int:journal_id>/", views.JournalDetailView.as_view(), name="journal-detail"),

    
    # Add this new path for fetching journal entries
    path("journal/<int:journal_id>/entries/", views.JournalEntryListView.as_view(), name="journal-entry-list"),

    # Add this new path for creating journal entries
    path("journal/<int:journal_id>/entries/create/", views.JournalEntryCreateView.as_view(), name="journal-entry-create"),

]