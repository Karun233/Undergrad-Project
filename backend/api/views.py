from django.shortcuts import render
from django.contrib.auth.models import User
from rest_framework import generics
from .serializers import UserSerializer, JournalSerializer, JournalEntrySerializer, EntryImageSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Journal, JournalEntry, EntryImage
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
import os
from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework.parsers import MultiPartParser, FormParser
from .models import UserProfile
from .serializers import UserProfileSerializer, UserProfileDetailSerializer

# User creation view
class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

# Journal views
class CreateJournalView(generics.ListCreateAPIView):
    serializer_class = JournalSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        return Journal.objects.filter(owner=user)
    
    def perform_create(self, serializer):
        if serializer.is_valid():
            serializer.save(owner=self.request.user)
        else:
            print(serializer.errors)
    
class DeleteJournal(generics.DestroyAPIView):
    serializer_class = JournalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Journal.objects.filter(owner=user)
    
class JournalDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, journal_id):
        try:
            journal = Journal.objects.get(id=journal_id, owner=request.user)
            serializer = JournalSerializer(journal)
            return Response(serializer.data)
        except Journal.DoesNotExist:
            return Response({"error": "Journal not found"}, status=404)

class JournalEntryCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def post(self, request, journal_id):
        try:
            journal = Journal.objects.get(id=journal_id, owner=request.user)
        except Journal.DoesNotExist:
            return Response({"error": "Journal not found"}, status=status.HTTP_404_NOT_FOUND)

        # Debug logging
        print("Request data:", request.data)
        print("Request FILES:", request.FILES)
        
        # We'll let the serializer handle feeling_during conversion now
        # Create a mutable copy of request.data
        data = request.data.copy()
        
        # Remove the images field from data since we'll handle it separately
        if 'images' in data:
            del data['images']
        
        # Handle JSON data
        serializer = JournalEntrySerializer(data=data)
        if serializer.is_valid():
            entry = serializer.save(journal=journal)
            
            # Initialize empty images list for this entry
            entry.images = []
            
            # Handle image files if present
            images = request.FILES.getlist('images')
            print(f"Processing {len(images)} uploaded images")
            
            for image in images:
                try:
                    image_instance = EntryImage.objects.create(entry=entry, image=image)
                    # Make sure we're getting the correct URL with domain
                    image_url = request.build_absolute_uri(image_instance.image.url)
                    # Add valid image URL to the entry's images list
                    entry.images.append(image_url)
                    print(f"Added image URL: {image_url}")
                except Exception as e:
                    print(f"Error saving image: {str(e)}")
            
            # Save the updated entry with image URLs
            entry.save()
            
            # Return updated entry
            updated_serializer = JournalEntrySerializer(entry)
            return Response(updated_serializer.data, status=status.HTTP_201_CREATED)
        
        print("Serializer errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class JournalEntryListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, journal_id):
        try:
            entries = JournalEntry.objects.filter(
                journal_id=journal_id,
                journal__owner=request.user
            )
            serializer = JournalEntrySerializer(entries, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

class JournalEntryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, journal_id, entry_id):
        try:
            entry = JournalEntry.objects.get(
                id=entry_id,
                journal_id=journal_id,
                journal__owner=request.user
            )
            serializer = JournalEntrySerializer(entry)
            return Response(serializer.data)
        except JournalEntry.DoesNotExist:
            return Response({"error": "Entry not found"}, status=status.HTTP_404_NOT_FOUND)

class JournalEntryUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def put(self, request, journal_id, entry_id):
        try:
            entry = JournalEntry.objects.get(
                id=entry_id,
                journal_id=journal_id,
                journal__owner=request.user
            )
        except JournalEntry.DoesNotExist:
            return Response({"error": "Entry not found"}, status=status.HTTP_404_NOT_FOUND)

        # Debug logging
        print("Update request data:", request.data)
        print("Update request FILES:", request.FILES)
        
        # Process existing_images if provided
        existing_images_data = request.data.get('existing_images', '[]')
        try:
            if isinstance(existing_images_data, str):
                import json
                existing_images = json.loads(existing_images_data)
                if not isinstance(existing_images, list):
                    existing_images = [str(existing_images)] if existing_images else []
            else:
                existing_images = existing_images_data if isinstance(existing_images_data, list) else [str(existing_images_data)] if existing_images_data else []
            
            # Validate existing image URLs
            existing_images = [str(img) for img in existing_images if img and isinstance(img, (str, int, float))]
            print(f"Valid existing images: {existing_images}")
            
        except Exception as e:
            print(f"Error processing existing_images: {str(e)}")
            existing_images = []
            
        # Create a mutable copy of request.data
        data = request.data.copy()
        
        # Remove the images field from data since we'll handle it separately
        if 'images' in data:
            del data['images']
        
        # Handle JSON data
        serializer = JournalEntrySerializer(entry, data=data, partial=True)
        if serializer.is_valid():
            # Save but don't override the existing images yet
            updated_entry = serializer.save()
            
            # Reset images list with existing images that were kept
            updated_entry.images = existing_images if existing_images else []
            
            # Handle new image files if present
            images = request.FILES.getlist('images')
            print(f"Processing {len(images)} new uploaded images")
            
            for image in images:
                try:
                    image_instance = EntryImage.objects.create(entry=updated_entry, image=image)
                    # Make sure we're getting the correct URL with domain
                    image_url = request.build_absolute_uri(image_instance.image.url)
                    # Add valid image URL to the entry's images list
                    updated_entry.images.append(image_url)
                    print(f"Added new image URL: {image_url}")
                except Exception as e:
                    print(f"Error saving new image: {str(e)}")
            
            # Print final image list for debugging
            print("Final images after update:", updated_entry.images)
            print("Number of images after update:", len(updated_entry.images))
            
            # Save the updated entry with the combined image URLs
            updated_entry.save()
            
            # Return updated entry
            updated_serializer = JournalEntrySerializer(updated_entry)
            return Response(updated_serializer.data)
        
        print("Update serializer errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Image handling views
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
        
        for image in images:
            image_instance = EntryImage.objects.create(entry=entry, image=image)
            image_data.append({
                'id': image_instance.id,
                'image': image_instance.image.url
            })
            
            # Add image path to entry.images list
            if image_instance.image.url not in entry.images:
                entry.images.append(image_instance.image.url)
        
        entry.save()
        
        return Response(image_data, status=status.HTTP_201_CREATED)
    
class JournalEntryDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, journal_id, entry_id):
        try:
            entry = JournalEntry.objects.get(
                id=entry_id,
                journal_id=journal_id,
                journal__owner=request.user
            )
        except JournalEntry.DoesNotExist:
            return Response({"error": "Entry not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Delete associated images from storage
        for image_path in entry.images:
            try:
                # Convert URL to file path
                file_path = os.path.join(settings.MEDIA_ROOT, image_path.replace('/media/', ''))
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"Error deleting image {image_path}: {e}")
        
        # Delete the entry (this will also delete related EntryImage objects due to CASCADE)
        entry.delete()
        return Response({"message": "Entry deleted successfully"}, status=status.HTTP_204_NO_CONTENT)

class EntryImageDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, journal_id, entry_id, image_id):
        try:
            entry = JournalEntry.objects.get(
                id=entry_id,
                journal_id=journal_id,
                journal__owner=request.user
            )
        except JournalEntry.DoesNotExist:
            return Response({"error": "Entry not found"}, status=status.HTTP_404_NOT_FOUND)
            
        try:
            image = EntryImage.objects.get(id=image_id, entry=entry)
            
            # Remove image path from entry.images list
            if image.image.url in entry.images:
                entry.images.remove(image.image.url)
                entry.save()
            
            # Delete the image file
            if os.path.exists(image.image.path):
                os.remove(image.image.path)
            
            # Delete the image record
            image.delete()
            
            return Response({"message": "Image deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
        except EntryImage.DoesNotExist:
            return Response({"error": "Image not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        


# profile views


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get the user's profile data"""
        try:
            # Get or create the user's profile
            profile, created = UserProfile.objects.get_or_create(user=request.user)
            
            serializer = UserProfileDetailSerializer(profile, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UpdateUsernameView(APIView):
    permission_classes = [IsAuthenticated]
    
    def put(self, request):
        """Update the user's username"""
        try:
            # Get form data
            username = request.data.get('username')
            password = request.data.get('password')
            
            if not username or not password:
                return Response({"detail": "Username and password are required."}, 
                                status=status.HTTP_400_BAD_REQUEST)
            
            # Verify the password
            user = authenticate(username=request.user.username, password=password)
            if not user:
                return Response({"detail": "Incorrect password."}, 
                                status=status.HTTP_400_BAD_REQUEST)
            
            # Check if username is already taken
            if User.objects.filter(username=username).exclude(id=request.user.id).exists():
                return Response({"detail": "This username is already taken."}, 
                                status=status.HTTP_400_BAD_REQUEST)
            
            # Update username
            request.user.username = username
            request.user.save()
            
            return Response({"detail": "Username updated successfully."})
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UpdatePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    
    def put(self, request):
        """Update the user's password"""
        try:
            # Get form data
            current_password = request.data.get('current_password')
            new_password = request.data.get('new_password')
            
            if not current_password or not new_password:
                return Response({"detail": "Current password and new password are required."}, 
                                status=status.HTTP_400_BAD_REQUEST)
            
            # Verify current password
            user = authenticate(username=request.user.username, password=current_password)
            if not user:
                return Response({"detail": "Incorrect current password."}, 
                                status=status.HTTP_400_BAD_REQUEST)
            
            # Update password
            user.set_password(new_password)
            user.save()
            
            return Response({"detail": "Password updated successfully."})
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UpdateProfilePictureView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def put(self, request):
        """Update the user's profile picture"""
        try:
            # Get or create the user's profile
            profile, created = UserProfile.objects.get_or_create(user=request.user)
            
            # Check if a file was uploaded
            if 'profile_picture' not in request.FILES:
                return Response({"detail": "No image file provided."}, 
                                status=status.HTTP_400_BAD_REQUEST)
            
            # Update profile picture
            profile.profile_picture = request.FILES['profile_picture']
            profile.save()
            
            serializer = UserProfileSerializer(profile, context={'request': request})
            return Response({
                "detail": "Profile picture updated successfully.",
                "profile_picture": request.build_absolute_uri(profile.profile_picture.url)
            })
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request):
        """Delete the user's account"""
        try:
            # Get form data
            password = request.data.get('password')
            
            if not password:
                return Response({"detail": "Password is required."}, 
                                status=status.HTTP_400_BAD_REQUEST)
            
            # Verify password
            user = authenticate(username=request.user.username, password=password)
            if not user:
                return Response({"detail": "Incorrect password."}, 
                                status=status.HTTP_400_BAD_REQUEST)
            
            # Delete the user (and all related data due to CASCADE)
            user_id = request.user.id
            request.user.delete()
            
            return Response({"detail": "Account deleted successfully."})
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)