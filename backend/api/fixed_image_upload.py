"""
Fixed version of the EntryImageUploadView to ensure images are properly saved.
Copy this implementation to replace the EntryImageUploadView in views.py
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .models import JournalEntry, EntryImage
import json

class EntryImageUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, journal_id, entry_id):
        try:
            entry = JournalEntry.objects.get(
                id=entry_id,
                journal_id=journal_id,
                journal__owner=request.user
            )
        except JournalEntry.DoesNotExist:
            return Response({"error": "Entry not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Initialize images list if it doesn't exist
        if entry.images is None:
            entry.images = []
            
        # Process new image uploads (image0, image1, etc.)
        image_data = []
        for key, image in request.FILES.items():
            if key.startswith('image'):
                image_instance = EntryImage.objects.create(entry=entry, image=image)
                image_url = image_instance.image.url
                image_data.append({
                    'id': image_instance.id,
                    'image': image_url
                })
                
                # Add image path to entry.images list if not already there
                if image_url not in entry.images:
                    entry.images.append(image_url)
        
        # Handle existing images if provided
        if 'existing_images' in request.data:
            try:
                existing_images = json.loads(request.data['existing_images'])
                # Ensure entry.images contains all existing images
                for url in existing_images:
                    if url not in entry.images:
                        entry.images.append(url)
            except json.JSONDecodeError:
                pass  # Ignore if JSON parsing fails
        
        # Make sure to save the entry to persist the images array
        entry.save(update_fields=['images'])
        
        return Response(image_data, status=status.HTTP_201_CREATED)
