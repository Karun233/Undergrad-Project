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
import openai
from django.conf import settings
import statistics
from collections import Counter
from datetime import datetime
from datetime import timedelta

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
                'review': entry.review
            })
        
        # Calculate metrics
        total_trades = len(trades)
        win_rate = (win_count / total_trades * 100) if total_trades > 0 else 0
        
        # Calculate average risk
        avg_risk = statistics.mean(risk_percentages) if risk_percentages else 0
        
        # Calculate average risk-reward ratio
        avg_risk_reward_ratio = statistics.mean(risk_reward_ratios) if risk_reward_ratios else 0
        
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
            'overtrading_days': len(overtrading_days),
            'most_common_instruments': most_common_instruments,
            'most_common_emotions_before': most_common_emotions_before,
            'most_common_emotions_during': most_common_emotions_during,
            'max_risk': float(journal.max_risk),
            'unusual_instruments': unusual_instruments
        }
        
        return {
            'trades': trades,
            'summary': summary
        }
    
    def _generate_ai_feedback(self, trades_data):
        """Generate AI feedback based on trading data"""
        summary = trades_data["summary"]
        trades = trades_data["trades"]
        
        # Count strategy compliance
        strategy_followed_count = 0
        if len(trades) >= 5:
            strategy_followed_count = sum(1 for trade in trades if trade.get('follow_strategy', True))
        
        # Create prompt for OpenAI
        prompt = f"""
As a professional trading coach, analyze this trading data and provide feedback in a CONCISE bullet-point format following this exact structure:

Trading Summary:
 - Win rate: {summary['win_rate']}%
 - Total trades: {summary['total_trades']}
 - Net P&L: {summary['net_pnl']}
 - Avg. Risk/Reward: {summary['avg_risk_reward_ratio']}

Key Strengths:
 -
Areas for Improvement:
 -
Action Plan:
 - (max 5 bullets)
"""
        try:
            feedback = _call_openai_chat(
                messages=[{"role": "user", "content": prompt}],
                model="gpt-4o-mini" if hasattr(__import__('openai'), 'OpenAI') else "gpt-4-0125-preview",
                max_tokens=1000,
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
            return response.choices[0].message.content.strip()
        # Fallback to legacy style
        openai.api_key = settings.OPENAI_API_KEY  # noqa
        response = openai.ChatCompletion.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response.choices[0].message.content.strip()
    except Exception as exc:
        # Reraise so calling code can catch and handle/log gracefully
        raise exc

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