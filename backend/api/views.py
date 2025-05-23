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
from django.db.models import F, Count

# create user view
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
            # Get the journal
            journal = Journal.objects.get(id=journal_id, owner=request.user)
            
            # Create a dictionary with the request data
            data = request.data.copy()
            
            # Ensure we have a proper date format
            if 'date' in data and not isinstance(data['date'], str):
                data['date'] = data['date'][0]
                
            # Extract image files and other data
            images = request.FILES.getlist('images[]') if 'images[]' in request.FILES else []
            
            
            serializer = JournalEntrySerializer(data=data)
            
            if serializer.is_valid():
                
                entry = serializer.save(journal=journal)
                
                
                for image in images:
                    EntryImage.objects.create(entry=entry, image=image)
                
                
                self.update_milestones(journal, entry)
                
                
                profile = UserProfile.objects.get(user=request.user)
                profile.score += 1
                profile.save()
                
                # Get the saved entry with all data
                saved_entry = JournalEntry.objects.get(id=entry.id)
                response_serializer = JournalEntrySerializer(saved_entry)
                
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            else:
                print(serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Journal.DoesNotExist:
            return Response({"error": "Journal not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(str(e))
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    def update_milestones(self, journal, entry):
        try:
            
            journal_trade_milestones = Milestone.objects.filter(journal=journal, type='journal_trade')
            for milestone in journal_trade_milestones:
                milestone.current_progress += 1
                milestone.update_progress()
            
            # Updates "Followed Plan" milestone if the trade followed the plan
            if entry.follow_strategy:
                followed_plan_milestones = Milestone.objects.filter(journal=journal, type='followed_plan')
                for milestone in followed_plan_milestones:
                    milestone.current_progress += 1
                    milestone.update_progress()
            
            # Updates "High Rating" milestone if review rating is 8 or above
            if entry.review_rating is not None and entry.review_rating >= 8:
                high_rating_milestones = Milestone.objects.filter(journal=journal, type='high_rating')
                for milestone in high_rating_milestones:
                    milestone.current_progress += 1
                    milestone.update_progress()
            
            # Updates "Profitable Day" milestone if profit_loss is positive
            if entry.profit_loss is not None and entry.profit_loss > 0:
                profitable_day_milestones = Milestone.objects.filter(journal=journal, type='profitable_day')
                for milestone in profitable_day_milestones:
                    milestone.current_progress += 1
                    milestone.update_progress()
        except Exception as e:
            print(f"Error updating milestones: {str(e)}")
            
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
            
        
        data = request.data.copy()
        
        if 'images' in data:
            del data['images']
        
        
        serializer = JournalEntrySerializer(entry, data=data, partial=True)
        if serializer.is_valid():
            # Save  the existing images yet
            updated_entry = serializer.save()
            
            # Reset images list with existing images that were kept
            updated_entry.images = existing_images if existing_images else []
            
            # Handle new image files if present
            images = request.FILES.getlist('images')
            print(f"Processing {len(images)} new uploaded images")
            
            for image in images:
                try:
                    image_instance = EntryImage.objects.create(entry=updated_entry, image=image)
                    # Make sure the correct URL with domain
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
        
        # Delete  images from storage
        for image_path in entry.images:
            try:
                
                file_path = os.path.join(settings.MEDIA_ROOT, image_path.replace('/media/', ''))
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"Error deleting image {image_path}: {e}")
        
        
        entry.delete()
        
        
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
            trading_helper = TradingFeedbackView()
            trades_data = trading_helper._prepare_trades_data(entries, journal)
            
            # Generate AI feedback
            feedback = self._generate_ai_feedback(trades_data)
            
            # Debug values to help troubleshoot risk-reward ratio 
            print(f"DEBUG RESPONSE: avg_risk_reward_ratio = {trades_data['summary']['avg_risk_reward_ratio']}")
            
            return Response({
                "feedback": feedback,
                "has_enough_data": True,
                "trades_analyzed": entries.count(),
                "summary": trades_data["summary"],
                "debug_info": {
                    "avg_risk_reward_ratio": trades_data["summary"]["avg_risk_reward_ratio"]
                }
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
        total_risk = 0
        total_reward = 0
        
        for entry in entries:
            # Count trade outcomes
            if entry.outcome == 'Win':
                win_count += 1
                if entry.profit_loss:
                    total_profit += float(entry.profit_loss)
                    # Add to total reward for risk-reward calculation
                    if entry.risk_percent and entry.profit_loss:
                        try:
                            reward = float(entry.profit_loss)
                            risk = float(entry.risk_percent) / 100 * float(journal.account_size)
                            total_reward += reward
                            total_risk += risk
                        except (ValueError, TypeError):
                            pass
            elif entry.outcome == 'Loss':
                loss_count += 1
                if entry.profit_loss:
                    total_loss += abs(float(entry.profit_loss))
                    # Add to total risk for risk-reward calculation
                    if entry.risk_percent:
                        try:
                            risk = float(entry.risk_percent) / 100 * float(journal.account_size)
                            total_risk += risk
                        except (ValueError, TypeError):
                            pass
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
        
        # metrics
        total_trades = len(trades)
        win_loss_total = win_count + loss_count  # Exclude breakeven trades
        win_rate = (win_count / win_loss_total * 100) if win_loss_total > 0 else 0
        
        # average risk
        avg_risk = statistics.mean(risk_percentages) if risk_percentages else 0
        
        # Sum of all risk-reward ratios divided by total number of entries
        sum_risk_reward = sum(risk_reward_ratios) if risk_reward_ratios else 0
        avg_risk_reward_ratio = sum_risk_reward / len(entries) if entries else 0
        
        # Add detailed debug print statements for the risk-reward calculation
        print(f"DEBUG: Risk-Reward Calculation")
        print(f"DEBUG: Number of entries with risk-reward values: {len(risk_reward_ratios)}")
        print(f"DEBUG: Total number of entries: {len(entries)}")
        print(f"DEBUG: Sum of risk-reward ratios: {sum_risk_reward}")
        print(f"DEBUG: Final risk-reward ratio (sum / total entries): {avg_risk_reward_ratio}")
        
        # Debug the AI feedback data flow
        print(f"DEBUG: Summary before AI feedback: avg_risk_reward_ratio = {round(avg_risk_reward_ratio, 2)}")
        
        # Make sure the summary uses the proper risk-reward ratio
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
            'profit_factor': round(total_profit / total_loss, 2) if total_loss > 0 else total_profit if total_profit > 0 else 0,
            'account_size': journal.account_size if hasattr(journal, 'account_size') and journal.account_size else 10000.0,
            'account_return_percentage': ((total_profit - total_loss) / float(journal.account_size)) * 100 if journal.account_size else 0,
            'overtrading_days': len([date for date, count in daily_trade_counts.items() if count > 2]),
            'most_common_instruments': common_instruments.most_common(3),
            'most_common_emotions_before': emotions_before.most_common(3),
            'most_common_emotions_during': emotions_during.most_common(3),
            'max_risk': float(journal.max_risk),
            'unusual_instruments': [],
            'strategy_followed_count': sum(1 for trade in trades if trade.get('follow_strategy', True)),
            'strategy_followed_percentage': (sum(1 for trade in trades if trade.get('follow_strategy', True)) / total_trades * 100) if total_trades > 0 else 0,
            'emotion_outcomes': {}
        }
        
        # Analyze emotion correlations with outcomes
        for emotion in emotions_before:
            # Get trades with this emotion
            emotion_trades = [trade for trade in trades if trade.get('feeling_before') == emotion]
            # Count winning trades with this emotion (excluding breakeven)
            winning_trades = sum(1 for trade in emotion_trades if trade.get('outcome') == 'Win')
            # Count total trades with this emotion (excluding breakeven)
            total_with_emotion = sum(1 for trade in emotion_trades if trade.get('outcome') in ['Win', 'Loss'])
            
            # Calculate win rate with this emotion
            win_rate_with_emotion = (winning_trades / total_with_emotion * 100) if total_with_emotion > 0 else 0
            
            # Store in summary
            summary["emotion_outcomes"][emotion] = {
                'win_rate': round(win_rate_with_emotion, 2),
                'count': emotions_before[emotion],
                'difference': round(win_rate_with_emotion - win_rate, 2)
            }
        
        return {
            'trades': trades,
            'summary': summary
        }
    
    def _generate_ai_feedback(self, trades_data):
        """Generate AI feedback based on trading data"""
        summary = trades_data["summary"]
        trades = trades_data["trades"]
        
        # Debug the risk-reward ratio in the AI feedback function
        print(f"DEBUG AI FEEDBACK: avg_risk_reward_ratio = {summary['avg_risk_reward_ratio']}")
        
        # Prepare emotion data properly
        emotions_before = [emotion[0] for emotion in summary['most_common_emotions_before'][:3]] if summary['most_common_emotions_before'] else []
        emotions_during = [emotion[0] for emotion in summary['most_common_emotions_during'][:3]] if summary['most_common_emotions_during'] else []
        
        # Check if there are any trades with hesitant feelings and analyze risk
        hesitant_trades = [trade for trade in trades if trade.get('feeling_before') in ['Hesitant', 'Slightly hesitant']]
        high_risk_hesitant = any(float(trade.get('risk_percent', 0)) > float(summary['avg_risk']) for trade in hesitant_trades)
        
        # Prepare trade data with more details
        trade_details = []
        for trade in trades[:5]:
            trade_date = str(trade['date'])
            instrument = trade['instrument']
            outcome = trade['outcome']
            feeling = trade.get('feeling_before', 'Unknown')
            risk = trade.get('risk_percent', 'Unknown')
            profit_loss = trade.get('profit_loss', 'Unknown')
            
            trade_details.append(f"Trade on {trade_date}: {instrument} {outcome} with feeling '{feeling}', risk {risk}%, P/L: {profit_loss}")
        
        prompt = f"""As a professional trading coach, analyze this SPECIFIC trading data and provide PERSONALIZED feedback directly addressing this trader's patterns. Focus on their actual metrics and provide actionable advice tailored to their trading style.

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
Most common emotions before trading: {', '.join([f"'{emotion}'" for emotion in emotions_before]) if emotions_before else 'None recorded'}
Most common emotions during trading: {', '.join([f"'{emotion}'" for emotion in emotions_during]) if emotions_during else 'None recorded'}

RISK PATTERNS:
Risk exceeded max setting: {summary['risk_exceeded_count']} times
Average risk per trade: {summary['avg_risk']}%

RECENT TRADES (with details):
{'; '.join(trade_details)}

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

## Performance Analysis

[Provide a PERSONALIZED assessment of THIS trader's performance, directly referencing their specific metrics. For example: "Your win rate of {summary['win_rate']}% combined with your average risk-reward of {summary['avg_risk_reward_ratio']} shows..." Use actual numbers from their trading data.]

If win rate is high (>50%) but risk-reward is low (<1.5), you MUST include: "With your strong win rate of {summary['win_rate']}%, you should consider increasing your risk-reward ratio targets. Your current average of {summary['avg_risk_reward_ratio']} is below the recommended 1.5 minimum. This adjustment would significantly improve your overall profitability while maintaining your edge."

## Strengths

- [List 2-3 specific strengths based on THIS trader's actual metrics and patterns]
- [Reference specific trades or patterns from their data]

## Areas for Improvement

- [List 2-3 specific areas that need improvement based on THIS trader's actual data]
- [Reference specific trades or patterns from their data]

## Emotional Analysis

[Analyze how THIS trader's specific emotions are impacting their trading performance. Reference their actual emotional patterns and specific trades. Be very specific about the emotions mentioned in the data.]

If the trader feels hesitant or slightly hesitant on any trades:
- If their risk on those trades is higher than average: "I notice when you feel {emotions_before[0] if 'hesitant' in emotions_before[0].lower() else 'hesitant'}, you're taking higher risk trades. You should lower your position size when experiencing hesitation, as this emotion correlates with poor trade outcomes."
- If their risk is within normal limits: "Since your risk is within limits but you still feel {emotions_before[0] if 'hesitant' in emotions_before[0].lower() else 'hesitant'}, this suggests you need more practice with your strategy to build confidence in identifying proper setups. Consider paper trading similar setups more frequently or reviewing your successful trades to build conviction."

SPECIFIC GUIDANCE:
- DIRECTLY reference the trader's actual metrics in your feedback
- If you see they've exceeded their risk limit {summary['risk_exceeded_count']} times, address this specifically
- If certain instruments show better/worse performance, mention them by name
- If specific emotions correlate with better/worse outcomes in THEIR data, highlight this
- Make all advice SPECIFIC to their trading style and patterns
- Avoid generic advice that could apply to any trader"""
        try:
            feedback = _call_openai_chat(
                messages=[{"role": "user", "content": prompt}],
                model="gpt-4-turbo",
                max_tokens=1500,
                temperature=0.7,
            )
            
            #  Emotional Analysis section
            if "## Emotional Analysis" not in feedback:
                
                feedback += "\n\n## Emotional Analysis\n\nThe trader's emotional patterns show significant impact on trading outcomes. "
                if any(emotion in str(summary['most_common_emotions_before']).lower() for emotion in ['hesitant', 'slightly hesitant']):
                    feedback += "When feeling hesitant, you should lower your risk when taking trades as this emotion correlates with poor trade outcomes. "
                    feedback += "If your risk is already within limits but you still feel hesitant, this suggests you need more practice with your strategy to build confidence in identifying proper setups."
            
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

        # Re‑used helper from TradingFeedbackView for stats
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
                model="gpt-4-turbo",
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
                
                progress_count = entries.filter(profit_loss__gt=0).count()
            
            
            milestone.current_progress = progress_count
            milestone.update_progress()
            
        except Exception as e:
            print(f"Error initializing milestone progress: {str(e)}")
            

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
    import openai 
    try:
        
        if hasattr(openai, "OpenAI"):
            client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return response.choices[0].message.content
        
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

# Leaderboard View
class LeaderboardView(APIView):
    """View to get the top 10 users by score and the current user's rank"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Get top 10 users by score
            top_users = UserProfile.objects.select_related('user').order_by('-score')[:10]
            
            # Get or create current user's profile
            current_user_profile, created = UserProfile.objects.get_or_create(
                user=request.user,
                defaults={'score': 0}
            )
            
            # Get current user's rank
            user_rank = UserProfile.objects.filter(score__gt=current_user_profile.score).count() + 1
            
            # Prepare response data
            leaderboard_data = []
            for profile in top_users:
                leaderboard_data.append({
                    'username': profile.user.username,
                    'score': profile.score,
                })
            
            response_data = {
                'leaderboard': leaderboard_data,
                'user_rank': user_rank,
                'user_score': current_user_profile.score
            }
            
            return Response(response_data)
        except Exception as e:
            print(f"Error in leaderboard view: {str(e)}")
            return Response(
                {"error": "Failed to retrieve leaderboard data"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
        
        # Get all community entries from the user's journals
        user_community_entries = CommunityEntry.objects.filter(
            original_journal__in=user_journals
        ).order_by('-shared_at')
        
        
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

# Comment Views
class CommentListView(APIView):
    """View to list all comments for a community entry"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, entry_id):
        from .models import CommunityEntry, Comment
        from .serializers import CommentSerializer
        
        try:
            
            CommunityEntry.objects.get(id=entry_id)
            
            # Get all comments for this entry
            comments = Comment.objects.filter(community_entry_id=entry_id)
            serializer = CommentSerializer(comments, many=True)
            
            return Response(serializer.data)
            
        except CommunityEntry.DoesNotExist:
            return Response({'error': 'Community entry not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CommentCreateView(APIView):
    """View to create a new comment on a community entry"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, entry_id):
        from .models import CommunityEntry, Comment
        from .serializers import CommentSerializer
        
        try:
            # Check if  entry exists
            community_entry = CommunityEntry.objects.get(id=entry_id)
            
            # serializer with the request data
            serializer = CommentSerializer(data=request.data)
            if serializer.is_valid():
                # Save the comment with the community entry and user
                comment = serializer.save(
                    community_entry=community_entry,
                    user=request.user
                )
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except CommunityEntry.DoesNotExist:
            return Response({'error': 'Community entry not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print("Error adding comment:", str(e))
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CommentDeleteView(APIView):
    """View to delete a comment"""
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, comment_id):
        from .models import Comment
        
        try:
            # Try to get the comment
            comment = Comment.objects.get(id=comment_id)
            
            # Check if the user is the owner of the comment by comparing usernames
            if comment.user.username != request.user.username:
                return Response(
                    {'error': 'You can only delete your own comments'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Delete the comment
            comment.delete()
            
            return Response({'message': 'Comment deleted successfully'}, status=status.HTTP_200_OK)
            
        except Comment.DoesNotExist:
            return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)