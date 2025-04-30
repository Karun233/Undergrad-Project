from django.shortcuts import render
from django.contrib.auth.models import User
from rest_framework import generics
from .serializers import UserSerializer, JournalSerializer, JournalEntrySerializer, EntryImageSerializer, UserProfileSerializer, UserProfileDetailSerializer, MilestoneSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Journal, JournalEntry, EntryImage, UserProfile, Milestone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
import os
from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework.parsers import MultiPartParser, FormParser
import openai
from django.conf import settings
import statistics
from collections import Counter
from datetime import datetime
from datetime import timedelta
import json

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

class UpdateJournalView(generics.UpdateAPIView):
    serializer_class = JournalSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'
    
    def get_queryset(self):
        user = self.request.user
        return Journal.objects.filter(owner=user)
    
    def update(self, request, *args, **kwargs):
        try:
            journal = self.get_object()
            serializer = self.get_serializer(journal, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Journal.DoesNotExist:
            return Response({"error": "Journal not found"}, status=status.HTTP_404_NOT_FOUND)

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
            
            # Update milestones
            self.update_milestones(journal, entry)
            
            # Return updated entry
            updated_serializer = JournalEntrySerializer(entry)
            return Response(updated_serializer.data, status=status.HTTP_201_CREATED)
        
        print("Serializer errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def update_milestones(self, journal, entry):
        try:
            # Update "Journal Trade" milestone
            journal_trade_milestones = Milestone.objects.filter(journal=journal, type='journal_trade')
            for milestone in journal_trade_milestones:
                milestone.current_progress += 1
                milestone.update_progress()
            
            # Update "Followed Plan" milestone if the trade followed the plan
            if entry.follow_strategy:
                followed_plan_milestones = Milestone.objects.filter(journal=journal, type='followed_plan')
                for milestone in followed_plan_milestones:
                    milestone.current_progress += 1
                    milestone.update_progress()
            
            # Update "High Rating" milestone if review rating is 8 or above
            if entry.review_rating is not None and entry.review_rating >= 8:
                high_rating_milestones = Milestone.objects.filter(journal=journal, type='high_rating')
                for milestone in high_rating_milestones:
                    milestone.current_progress += 1
                    milestone.update_progress()
            
            # Update "Profitable Day" milestone if profit_loss is positive
            if entry.profit_loss is not None and entry.profit_loss > 0:
                profitable_day_milestones = Milestone.objects.filter(journal=journal, type='profitable_day')
                for milestone in profitable_day_milestones:
                    milestone.current_progress += 1
                    milestone.update_progress()
        except Exception as e:
            print(f"Error updating milestones: {str(e)}")
            # Don't let milestone updates stop the entry creation
            pass

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

class JournalEntryDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, journal_id, entry_id):
        try:
            journal = Journal.objects.get(id=journal_id, owner=request.user)
            entry = JournalEntry.objects.get(id=entry_id, journal=journal)
        except Journal.DoesNotExist:
            return Response({"error": "Journal not found"}, status=status.HTTP_404_NOT_FOUND)
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
        
        # Recalculate milestone progress
        self.recalculate_milestones(journal)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    def recalculate_milestones(self, journal):
        """Recalculate all milestone progress for a journal based on existing entries"""
        try:
            # Get all entries for this journal
            entries = JournalEntry.objects.filter(journal=journal)
            
            # Get all milestones for this journal
            milestones = Milestone.objects.filter(journal=journal)
            
            # Reset all milestone progress
            for milestone in milestones:
                milestone.current_progress = 0
                milestone.completed = False
            
            # For each entry, update appropriate milestones
            for entry in entries:
                # Update Journal Trade milestone
                journal_trade_milestones = milestones.filter(type='journal_trade')
                for milestone in journal_trade_milestones:
                    milestone.current_progress += 1
                
                # Update Followed Plan milestone
                if entry.follow_strategy:
                    followed_plan_milestones = milestones.filter(type='followed_plan')
                    for milestone in followed_plan_milestones:
                        milestone.current_progress += 1
                
                # Update High Rating milestone
                if entry.review_rating is not None and entry.review_rating >= 8:
                    high_rating_milestones = milestones.filter(type='high_rating')
                    for milestone in high_rating_milestones:
                        milestone.current_progress += 1
                
                # Update Profitable Day milestone
                if entry.profit_loss is not None and entry.profit_loss > 0:
                    profitable_day_milestones = milestones.filter(type='profitable_day')
                    for milestone in profitable_day_milestones:
                        milestone.current_progress += 1
            
            # Update completed status and save all milestones
            for milestone in milestones:
                milestone.update_progress()
                
        except Exception as e:
            print(f"Error recalculating milestones: {str(e)}")
            # Error handling but don't let this break deletion

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


class TradingFeedbackView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, journal_id):
        """Generate trading feedback using AI analysis"""
        try:
            # Get the journal
            journal = Journal.objects.get(id=journal_id, owner=request.user)
            
            # Get all entries for this journal
            entries = JournalEntry.objects.filter(journal=journal).order_by('date')
            
            # Check if there are enough entries for analysis
            if entries.count() < 5:
                return Response({
                    "feedback": "Not enough trading data. Add more trades for a detailed analysis.",
                    "has_enough_data": False
                })
                
            # Extract data for analysis
            trades_data = self._prepare_trades_data(entries, journal)
            
            # Generate AI feedback
            feedback = self._generate_ai_feedback(trades_data)
            
            return Response({
                "feedback": feedback,
                "has_enough_data": True,
                "trades_analyzed": entries.count(),
                "summary": trades_data["summary"]
            })
            
        except Journal.DoesNotExist:
            return Response({"error": "Journal not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"Error generating feedback: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _prepare_trades_data(self, entries, journal):
        """Prepare trading data for analysis"""
        trades = []
        win_count = 0
        loss_count = 0
        break_even_count = 0
        total_profit = 0
        total_loss = 0
        risk_exceeded_count = 0
        common_instruments = Counter()
        emotions_before = Counter()
        emotions_during = Counter()
        daily_trade_counts = Counter()
        risk_percentages = []
        risk_reward_ratios = []  # New list to track risk-to-reward ratios
        
        for entry in entries:
            # Count trade outcomes
            if entry.outcome == 'Win':
                win_count += 1
                if entry.profit_loss:
                    total_profit += float(entry.profit_loss)
            elif entry.outcome == 'Loss':
                loss_count += 1
                if entry.profit_loss:
                    total_loss += abs(float(entry.profit_loss))
            else:
                break_even_count += 1
                
            # Check risk percentage against max_risk
            if entry.risk_percent and float(entry.risk_percent) > float(journal.max_risk):
                risk_exceeded_count += 1
            
            # Track risk reward ratios
            if entry.risk_reward_ratio and entry.risk_reward_ratio != '' and not isinstance(entry.risk_reward_ratio, type(None)):
                try:
                    risk_reward_ratios.append(float(entry.risk_reward_ratio))
                except (ValueError, TypeError):
                    pass
                
            # Collect trade date for daily trade count
            if entry.date:
                daily_trade_counts[entry.date] += 1
                
            # Track commonly traded instruments
            if entry.instrument:
                common_instruments[entry.instrument] += 1
                
            # Track emotions
            if entry.feeling_before:
                emotions_before[entry.feeling_before] += 1
                
            if hasattr(entry, 'feeling_during') and entry.feeling_during:
                for emotion in entry.feeling_during:
                    emotions_during[emotion] += 1
                    
            # Track risk percentages
            if entry.risk_percent:
                risk_percentages.append(float(entry.risk_percent))
                
            # Add trade info to the list
            trades.append({
                'date': entry.date,
                'instrument': entry.instrument,
                'direction': entry.direction,
                'outcome': entry.outcome,
                'profit_loss': entry.profit_loss,
                'risk_percent': entry.risk_percent,
                'feeling_before': entry.feeling_before,
                'feeling_during': entry.feeling_during if hasattr(entry, 'feeling_during') else None,
                'risk_management': entry.risk_management,
                'review': entry.review,
                'follow_strategy': getattr(entry, 'follow_strategy', True),
                'risk_reward_ratio': entry.risk_reward_ratio
            })
        
        # Calculate metrics
        total_trades = len(trades)
        win_rate = (win_count / total_trades * 100) if total_trades > 0 else 0
        
        # Calculate average risk
        avg_risk = statistics.mean(risk_percentages) if risk_percentages else 0
        
        # Calculate average risk-reward ratio
        avg_risk_reward_ratio = statistics.mean(risk_reward_ratios) if risk_reward_ratios else 0
        
        # Calculate profit factor
        profit_factor = total_profit / total_loss if total_loss > 0 else total_profit if total_profit > 0 else 0
        
        # Calculate percentage return on account
        account_size = journal.account_size if hasattr(journal, 'account_size') and journal.account_size else 10000.0
        account_return_percentage = ((total_profit - total_loss) / float(account_size)) * 100 if account_size else 0
        
        # Find days with multiple trades
        overtrading_days = [date for date, count in daily_trade_counts.items() if count > 2]
        
        # Most common instruments
        most_common_instruments = common_instruments.most_common(3)
        
        # Most common emotions
        most_common_emotions_before = emotions_before.most_common(3)
        most_common_emotions_during = emotions_during.most_common(3)
        
        # Check if they're trading unusual instruments
        unusual_instruments = []
        if len(trades) >= 20:
            common_instruments_set = {item[0] for item in common_instruments.most_common(5)}
            recent_trades = trades[-5:]
            for trade in recent_trades:
                if trade['instrument'] and trade['instrument'] not in common_instruments_set:
                    unusual_instruments.append(trade['instrument'])
        
        # Count strategy compliance
        strategy_followed_count = sum(1 for trade in trades if trade.get('follow_strategy', True))
        strategy_followed_percentage = (strategy_followed_count / total_trades * 100) if total_trades > 0 else 0
        
        # Analyze emotion correlations with outcomes
        emotion_outcomes = {}
        for emotion in emotions_before:
            winning_trades = sum(1 for trade in trades if trade.get('feeling_before') == emotion and trade.get('outcome') == 'Win')
            total_with_emotion = emotions_before[emotion]
            win_rate_with_emotion = (winning_trades / total_with_emotion * 100) if total_with_emotion > 0 else 0
            emotion_outcomes[emotion] = {
                'win_rate': round(win_rate_with_emotion, 2),
                'count': total_with_emotion,
                'difference': round(win_rate_with_emotion - win_rate, 2)
            }
        
        summary = {
            'total_trades': total_trades,
            'win_count': win_count,
            'loss_count': loss_count,
            'break_even_count': break_even_count,
            'win_rate': round(win_rate, 2),
            'total_profit': round(float(total_profit), 2),
            'total_loss': round(float(total_loss), 2),
            'net_pnl': round(float(total_profit - total_loss), 2),
            'risk_exceeded_count': risk_exceeded_count,
            'avg_risk': round(avg_risk, 2),
            'avg_risk_reward_ratio': round(avg_risk_reward_ratio, 2),
            'profit_factor': round(profit_factor, 2),
            'account_size': float(account_size),
            'account_return_percentage': round(account_return_percentage, 2),
            'overtrading_days': len(overtrading_days),
            'most_common_instruments': most_common_instruments,
            'most_common_emotions_before': [item[0] for item in most_common_emotions_before] if most_common_emotions_before else [],
            'most_common_emotions_during': [item[0] for item in most_common_emotions_during] if most_common_emotions_during else [],
            'max_risk': float(journal.max_risk),
            'unusual_instruments': unusual_instruments,
            'strategy_followed_count': strategy_followed_count,
            'strategy_followed_percentage': round(strategy_followed_percentage, 2),
            'emotion_outcomes': emotion_outcomes
        }
        
        return {
            'trades': trades,
            'summary': summary
        }
    
    def _generate_ai_feedback(self, trades_data):
        """Generate AI feedback based on trading data"""
        summary = trades_data["summary"]
        trades = trades_data["trades"]
        
        # Create prompt for OpenAI with enhanced analysis criteria
        prompt = f"""
As a professional trading coach, analyze this trading data and provide DETAILED feedback in a well-structured format. Focus on specific relationships between metrics and provide actionable advice.

TRADING STATISTICS:
- Win rate: {summary['win_rate']}%
- Total trades: {summary['total_trades']}
- Net P&L: {summary['net_pnl']}
- Avg. Risk/Reward: {summary['avg_risk_reward_ratio']}
- Profit Factor: {summary['profit_factor']}
- Account Size: ${summary['account_size']}
- Account Return: {summary['account_return_percentage']}%
- Max Risk Setting: {summary['max_risk']}%
- Strategy Adherence: {summary['strategy_followed_percentage']}%

EMOTIONAL PATTERNS:
{', '.join([f"'{emotion}'" for emotion in summary['most_common_emotions_before']])}

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

## Performance Analysis

[Provide an overall assessment of the trading performance, with specific focus on the relationships between win rate, risk-reward ratio, and account growth. Address any imbalances in these metrics.]

## Strengths

- [List 2-3 specific strengths based on the metrics]

## Areas for Improvement

- [List 2-3 specific areas that need improvement]

## Emotional Analysis

[Analyze how emotions are impacting trading performance. Identify patterns between emotions and outcomes. For example, if trader feels 'hesitant' but followed their strategy, explain what this means for their development. If trader feels 'confident' but has mixed results, explain what this suggests about their self-assessment.]

SPECIFIC GUIDANCE:
- If win rate is high (>60%) but risk-reward is low (<1.5), suggest increasing risk-reward targets while maintaining strategy.
- If win rate is low (<40%) but risk-reward is high (>2.0) and account is profitable, acknowledge this is a valid approach but suggest minor refinements.
- Address emotional impacts directly - explain how specific emotions are affecting trading outcomes.
- Keep the analysis focused and actionable.
"""
        try:
            feedback = _call_openai_chat(
                messages=[{"role": "user", "content": prompt}],
                model="gpt-4o-mini" if hasattr(__import__('openai'), 'OpenAI') else "gpt-4-0125-preview",
                max_tokens=1200,
                temperature=0.7,
            )
            return feedback
        except Exception as e:
            print(f"OpenAI API error: {str(e)}")
            # Fallback response if API fails
            return (
                f"We couldn't generate AI feedback at this time. Here's a summary of your trading: "
                f"Win rate: {summary['win_rate']}%, Total trades: {summary['total_trades']}, Net P&L: {summary['net_pnl']}. "
                "Please try again later."
            )

class WeeklyReportView(APIView):
    """Generate a condensed weekly trading report with AI performance review"""
    permission_classes = [IsAuthenticated]

    def get(self, request, journal_id):
        try:
            journal = Journal.objects.get(id=journal_id, owner=request.user)
        except Journal.DoesNotExist:
            return Response({"error": "Journal not found"}, status=status.HTTP_404_NOT_FOUND)

        # Determine the week to analyse – default to current calendar week starting Monday.
        start_param = request.query_params.get("start")  # ISO date e.g. 2025-04-14
        try:
            if start_param:
                start_of_week = datetime.fromisoformat(start_param).replace(hour=0, minute=0, second=0, microsecond=0)
            else:
                today = datetime.utcnow()
                # Monday is weekday 0 in Python – adjust to get previous Monday (or today if Monday)
                start_of_week = today - timedelta(days=today.weekday())
                start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        except Exception:
            return Response({"error": "Invalid start date"}, status=status.HTTP_400_BAD_REQUEST)

        end_of_week = start_of_week + timedelta(days=7)

        # Fetch entries within this week
        entries = JournalEntry.objects.filter(
            journal=journal,
            date__gte=start_of_week,
            date__lt=end_of_week
        ).order_by('date')

        if entries.count() == 0:
            return Response({"message": "No trades found for the selected week."}, status=status.HTTP_200_OK)

        # Re‑use helper from TradingFeedbackView for stats
        trading_helper = TradingFeedbackView()
        trades_data = trading_helper._prepare_trades_data(entries, journal)
        feedback = self._generate_weekly_ai_feedback(trades_data)

        return Response({
            "start_date": start_of_week.date().isoformat(),
            "end_date": (end_of_week - timedelta(days=1)).date().isoformat(),
            "summary": trades_data["summary"],
            "ai_feedback": feedback,
            "trades_analyzed": entries.count()
        })

    def _generate_weekly_ai_feedback(self, trades_data):
        """Call OpenAI to create a concise weekly performance review"""
        summary = trades_data["summary"]
        prompt = f"""
You are a seasoned trading performance coach. Provide a concise ONE‑PAGE weekly report covering the following sections. Use bullet points where appropriate and keep the overall length short (≈450 words max).

1. Weekly Statistics (already calculated – just restate):
   • Win rate: {summary['win_rate']}%
   • Total trades: {summary['total_trades']}
   • Net P&L: {summary['net_pnl']}
   • Avg. risk‑to‑reward: {summary['avg_risk_reward_ratio']}

2. Performance Assessment:
   • Risk Management – Did the trader respect the max risk of {summary['max_risk']}%? Indicate any risk breaches ({summary['risk_exceeded_count']} times).
   • Emotional Control – Based on the most common emotions before/during trades {summary['most_common_emotions_before']} / {summary['most_common_emotions_during']}.
   • Trade Plan Adherence – Use strategy_followed_count if present (assume 100% if missing).

3. Actionable Suggestions: Give 3 specific focus points for the upcoming week.

Return the report in plain text Markdown without extra commentary."""
        try:
            report = _call_openai_chat(
                messages=[{"role": "user", "content": prompt}],
                model="gpt-3.5-turbo",
                max_tokens=700,
                temperature=0.7,
            )
            return report
        except Exception as e:
            print(f"OpenAI weekly report error: {e}")
            return "AI feedback unavailable at this time."


# Milestone Views
class MilestoneListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, journal_id):
        try:
            journal = Journal.objects.get(id=journal_id, owner=request.user)
            milestones = Milestone.objects.filter(journal=journal)
            serializer = MilestoneSerializer(milestones, many=True)
            return Response(serializer.data)
        except Journal.DoesNotExist:
            return Response({"error": "Journal not found"}, status=status.HTTP_404_NOT_FOUND)

class MilestoneCreateView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, journal_id):
        try:
            journal = Journal.objects.get(id=journal_id, owner=request.user)
        except Journal.DoesNotExist:
            return Response({"error": "Journal not found"}, status=status.HTTP_404_NOT_FOUND)
        
        data = request.data.copy()
        data['journal'] = journal.id
        
        # Check if milestone of same type already exists for this journal
        milestone_type = data.get('type')
        if milestone_type and Milestone.objects.filter(journal=journal, type=milestone_type).exists():
            return Response(
                {"error": f"A milestone of type '{milestone_type}' already exists for this journal"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = MilestoneSerializer(data=data)
        
        if serializer.is_valid():
            milestone = serializer.save()
            
            # Initialize milestone progress based on existing entries
            self.initialize_milestone_progress(milestone, journal)
            
            # Get updated milestone data
            updated_serializer = MilestoneSerializer(milestone)
            return Response(updated_serializer.data, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def initialize_milestone_progress(self, milestone, journal):
        """Initialize milestone progress based on existing entries"""
        try:
            # Get all entries for this journal
            entries = JournalEntry.objects.filter(journal=journal)
            
            # Initialize progress counter
            progress_count = 0
            
            # Count entries based on milestone type
            if milestone.type == 'journal_trade':
                # Simply count all journal entries
                progress_count = entries.count()
                
            elif milestone.type == 'followed_plan':
                # Count entries where follow_strategy is True
                progress_count = entries.filter(follow_strategy=True).count()
                
            elif milestone.type == 'high_rating':
                # Count entries with review_rating >= 8
                progress_count = entries.filter(review_rating__gte=8).count()
                
            elif milestone.type == 'profitable_day':
                # Count entries with positive profit_loss
                progress_count = entries.filter(profit_loss__gt=0).count()
            
            # Update milestone progress
            milestone.current_progress = progress_count
            milestone.update_progress()
            
        except Exception as e:
            print(f"Error initializing milestone progress: {str(e)}")
            # Don't let this break milestone creation

class MilestoneUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    
    def put(self, request, journal_id, milestone_id):
        try:
            journal = Journal.objects.get(id=journal_id, owner=request.user)
            milestone = Milestone.objects.get(id=milestone_id, journal=journal)
        except Journal.DoesNotExist:
            return Response({"error": "Journal not found"}, status=status.HTTP_404_NOT_FOUND)
        except Milestone.DoesNotExist:
            return Response({"error": "Milestone not found"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = MilestoneSerializer(milestone, data=request.data, partial=True)
        if serializer.is_valid():
            updated_milestone = serializer.save()
            # Check if we need to update completed status
            updated_milestone.update_progress()
            
            # Refresh serializer with updated instance
            updated_serializer = MilestoneSerializer(updated_milestone)
            return Response(updated_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MilestoneDeleteView(APIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, journal_id, milestone_id):
        try:
            journal = Journal.objects.get(id=journal_id, owner=request.user)
            milestone = Milestone.objects.get(id=milestone_id, journal=journal)
        except Journal.DoesNotExist:
            return Response({"error": "Journal not found"}, status=status.HTTP_404_NOT_FOUND)
        except Milestone.DoesNotExist:
            return Response({"error": "Milestone not found"}, status=status.HTTP_404_NOT_FOUND)
        
        milestone.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class MilestoneRecalculateView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, journal_id):
        """Recalculate all milestone progress for an existing journal"""
        try:
            journal = Journal.objects.get(id=journal_id, owner=request.user)
            print(f"Recalculating milestones for journal ID {journal_id} owned by {request.user.username}")
        except Journal.DoesNotExist:
            return Response({"error": "Journal not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get all entries for this journal
        entries = JournalEntry.objects.filter(journal=journal)
        print(f"Found {entries.count()} journal entries")
        
        # Get all milestones for this journal
        milestones = Milestone.objects.filter(journal=journal)
        print(f"Found {milestones.count()} milestones to update")
        
        if not milestones.exists():
            return Response({"error": "No milestones found for this journal"}, status=status.HTTP_404_NOT_FOUND)
        
        # Create dictionaries to store counts by milestone type
        counts = {
            'journal_trade': 0,
            'followed_plan': 0,
            'high_rating': 0,
            'profitable_day': 0
        }
        
        # Count entries for each milestone type
        for entry in entries:
            print(f"Processing entry ID {entry.id} from {entry.date}")
            
            # Journal Trade - counts all entries
            counts['journal_trade'] += 1
            
            # Followed Plan - only if follow_strategy is True
            if entry.follow_strategy:
                print(f"Entry followed strategy: {entry.follow_strategy}")
                counts['followed_plan'] += 1
            
            # High Rating - only if review_rating is 8 or higher
            if entry.review_rating is not None and entry.review_rating >= 8:
                print(f"Entry has high rating: {entry.review_rating}")
                counts['high_rating'] += 1
            
            # Profitable Day - only if profit_loss is positive
            if entry.profit_loss is not None and entry.profit_loss > 0:
                print(f"Entry is profitable: {entry.profit_loss}")
                counts['profitable_day'] += 1
        
        # Update each milestone with the counted values
        for milestone in milestones:
            milestone_type = milestone.type
            if milestone_type in counts:
                print(f"Updating {milestone_type} milestone: was {milestone.current_progress}, now {counts[milestone_type]}")
                milestone.current_progress = counts[milestone_type]
                milestone.save()
                milestone.update_progress()  # Updates completed status
                print(f"Final milestone status: {milestone.type} - {milestone.current_progress}/{milestone.target} - Completed: {milestone.completed}")
        
        # Fetch fresh milestone data to ensure we get the most up-to-date data
        updated_milestones = Milestone.objects.filter(journal=journal)
        serializer = MilestoneSerializer(updated_milestones, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

def _call_openai_chat(*, messages, model="gpt-3.5-turbo", max_tokens=700, temperature=0.7):
    """Call the OpenAI chat completion endpoint supporting both old (<1.0) and new (>=1.0) SDK versions."""
    import openai  # local import to avoid dependency issues at module load
    try:
        # If the new client style exists (openai.OpenAI), use it
        if hasattr(openai, "OpenAI"):
            client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return response.choices[0].message.content
        # Fallback to legacy style
        openai.api_key = settings.OPENAI_API_KEY  # noqa
        response = openai.ChatCompletion.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response.choices[0].message.content
    except Exception as e:
        # Reraise so calling code can catch and handle/log gracefully
        raise e

# Community Views
class CommunityEntryListView(generics.ListAPIView):
    """View to list all community entries"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from .models import CommunityEntry
        community_entries = CommunityEntry.objects.all().order_by('-shared_at')
        
        # Serialize data manually for customization
        entries_data = []
        for entry in community_entries:
            entry_data = {
                'id': entry.id,
                'date': entry.date,
                'instrument': entry.instrument,
                'direction': entry.direction,
                'outcome': entry.outcome,
                'risk_reward_ratio': entry.risk_reward_ratio,
                'profit_loss': entry.profit_loss,
                'risk_percent': entry.risk_percent,
                'feeling_before': entry.feeling_before,
                'confidence_before': entry.confidence_before,
                'feeling_during': entry.feeling_during,
                'confidence_during': entry.confidence_during,
                'review': entry.review,
                'review_rating': entry.review_rating,
                'images': entry.images,
                'shared_at': entry.shared_at
            }
            entries_data.append(entry_data)
            
        return Response(entries_data)

class UserCommunityEntriesView(APIView):
    """View to list all community entries shared by the current user"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from .models import CommunityEntry
        
        # Get all journals owned by the user
        user_journals = Journal.objects.filter(owner=request.user)
        
        # Get all community entries that originated from the user's journals
        user_community_entries = CommunityEntry.objects.filter(
            original_journal__in=user_journals
        ).order_by('-shared_at')
        
        # Serialize data manually for customization
        entries_data = []
        for entry in user_community_entries:
            entry_data = {
                'id': entry.id,
                'date': entry.date,
                'instrument': entry.instrument,
                'direction': entry.direction,
                'outcome': entry.outcome,
                'risk_reward_ratio': entry.risk_reward_ratio,
                'profit_loss': entry.profit_loss,
                'risk_percent': entry.risk_percent,
                'feeling_before': entry.feeling_before,
                'confidence_before': entry.confidence_before,
                'feeling_during': entry.feeling_during,
                'confidence_during': entry.confidence_during,
                'review': entry.review,
                'review_rating': entry.review_rating,
                'images': entry.images,
                'shared_at': entry.shared_at,
                'original_entry_id': entry.original_entry.id,
                'original_journal_id': entry.original_journal.id
            }
            entries_data.append(entry_data)
            
        return Response(entries_data)

class DeleteCommunityEntryView(APIView):
    """View to delete a community entry shared by the current user"""
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, entry_id):
        from .models import CommunityEntry
        
        try:
            # Get all journals owned by the user
            user_journals = Journal.objects.filter(owner=request.user)
            
            # Try to get the community entry that belongs to the user
            community_entry = CommunityEntry.objects.get(
                id=entry_id,
                original_journal__in=user_journals
            )
            
            # Delete the community entry
            community_entry.delete()
            
            return Response({'message': 'Community entry deleted successfully'}, status=status.HTTP_200_OK)
            
        except CommunityEntry.DoesNotExist:
            return Response({'error': 'Community entry not found or you do not have permission to delete it'}, 
                           status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ShareJournalEntryView(APIView):
    """View to share a journal entry to the community (anonymously)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, journal_id, entry_id):
        from .models import CommunityEntry
        
        try:
            # Check if the journal belongs to the user
            journal = Journal.objects.get(id=journal_id, owner=request.user)
            
            # Check if the entry belongs to the journal
            entry = JournalEntry.objects.get(id=entry_id, journal=journal)
            
            # Create a community entry from the journal entry
            community_entry = CommunityEntry(
                original_entry=entry,
                original_journal=journal,
                date=entry.date,
                instrument=entry.instrument,
                direction=entry.direction,
                outcome=entry.outcome,
                risk_reward_ratio=entry.risk_reward_ratio,
                profit_loss=entry.profit_loss,
                risk_percent=entry.risk_percent,
                feeling_before=entry.feeling_before,
                confidence_before=entry.confidence_before,
                feeling_during=entry.feeling_during,
                confidence_during=entry.confidence_during,
                review=entry.review,
                review_rating=entry.review_rating,
                images=entry.images
            )
            community_entry.save()
            
            return Response({
                'message': 'Entry shared successfully',
                'id': community_entry.id
            }, status=status.HTTP_201_CREATED)
            
        except Journal.DoesNotExist:
            return Response({'error': 'Journal not found'}, status=status.HTTP_404_NOT_FOUND)
        except JournalEntry.DoesNotExist:
            return Response({'error': 'Entry not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CommunityEntryDetailView(APIView):
    """View to get a specific community entry"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, entry_id):
        from .models import CommunityEntry
        
        try:
            entry = CommunityEntry.objects.get(id=entry_id)
            
            entry_data = {
                'id': entry.id,
                'date': entry.date,
                'instrument': entry.instrument,
                'direction': entry.direction,
                'outcome': entry.outcome,
                'risk_reward_ratio': entry.risk_reward_ratio,
                'profit_loss': entry.profit_loss,
                'risk_percent': entry.risk_percent,
                'feeling_before': entry.feeling_before,
                'confidence_before': entry.confidence_before,
                'feeling_during': entry.feeling_during,
                'confidence_during': entry.confidence_during,
                'review': entry.review,
                'review_rating': entry.review_rating,
                'images': entry.images,
                'shared_at': entry.shared_at
            }
            
            return Response(entry_data)
            
        except CommunityEntry.DoesNotExist:
            return Response({'error': 'Community entry not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)