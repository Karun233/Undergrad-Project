from django.urls import path
from . import views

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # User endpoints
    path("journal/", views.CreateJournalView.as_view(), name="journal-list"),
    path("journal/delete/<int:pk>/", views.DeleteJournal.as_view(), name="delete-journal"),
    path("journal/<int:journal_id>/", views.JournalDetailView.as_view(), name="journal-detail"),
    
    # Journal entry endpoints
    path("journal/<int:journal_id>/entries/", views.JournalEntryListView.as_view(), name="journal-entry-list"),
    path("journal/<int:journal_id>/entries/create/", views.JournalEntryCreateView.as_view(), name="journal-entry-create"),
    path("journal/<int:journal_id>/entries/<int:entry_id>/", views.JournalEntryDetailView.as_view(), name="journal-entry-detail"),
    path("journal/<int:journal_id>/entries/<int:entry_id>/update/", views.JournalEntryUpdateView.as_view(), name="journal-entry-update"),
    path("journal/<int:journal_id>/entries/<int:entry_id>/delete/", views.JournalEntryDeleteView.as_view(), name="journal-entry-delete"),
    
    # Image handling endpoints
    path("journal/<int:journal_id>/entries/<int:entry_id>/images/upload/", views.EntryImageUploadView.as_view(), name="entry-image-upload"),
    path("journal/<int:journal_id>/entries/<int:entry_id>/images/<int:image_id>/delete/", views.EntryImageDeleteView.as_view(), name="entry-image-delete"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)