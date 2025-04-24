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


    path('user/profile/', views.UserProfileView.as_view(), name='user-profile'),
    path('user/update-username/', views.UpdateUsernameView.as_view(), name='update-username'),
    path('user/update-password/', views.UpdatePasswordView.as_view(), name='update-password'),
    path('user/update-profile-picture/', views.UpdateProfilePictureView.as_view(), name='update-profile-picture'),
    path('user/delete-account/', views.DeleteAccountView.as_view(), name='delete-account'),

    # AI trading feedback
    path('journal/<int:journal_id>/generate-feedback/', views.TradingFeedbackView.as_view(), name='generate-trading-feedback'),
    # Weekly report
    path('journal/<int:journal_id>/weekly-report/', views.WeeklyReportView.as_view(), name='weekly-report'),
    
    # Milestone endpoints
    path('journal/<int:journal_id>/milestones/', views.MilestoneListView.as_view(), name='milestone-list'),
    path('journal/<int:journal_id>/milestones/create/', views.MilestoneCreateView.as_view(), name='milestone-create'),
    path('journal/<int:journal_id>/milestones/<int:milestone_id>/update/', views.MilestoneUpdateView.as_view(), name='milestone-update'),
    path('journal/<int:journal_id>/milestones/<int:milestone_id>/delete/', views.MilestoneDeleteView.as_view(), name='milestone-delete'),
    path('journal/<int:journal_id>/milestones/recalculate/', views.MilestoneRecalculateView.as_view(), name='milestone-recalculate'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)