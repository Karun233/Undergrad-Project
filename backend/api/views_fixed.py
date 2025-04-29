"""
Fixed version of the EntryImageUploadView to ensure images are properly saved.
Copy the contents of this file to replace the corresponding section in views.py
"""

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
        
        images = request.FILES.getlist('images')
        image_data = []
        
        # Initialize images list if it doesn't exist
        if entry.images is None:
            entry.images = []
            
        for image in images:
            image_instance = EntryImage.objects.create(entry=entry, image=image)
            image_url = image_instance.image.url
            image_data.append({
                'id': image_instance.id,
                'image': image_url
            })
            
            # Add image path to entry.images list if not already there
            if image_url not in entry.images:
                entry.images.append(image_url)
        
        # Make sure to save the entry to persist the images array
        entry.save(update_fields=['images'])
        
        return Response(image_data, status=status.HTTP_201_CREATED)
