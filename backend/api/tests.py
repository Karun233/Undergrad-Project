from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from .models import Journal, JournalEntry, UserProfile, CommunityEntry, Comment
import json
from decimal import Decimal

# Authentication Tests
class AuthenticationTests(APITestCase):
    def setUp(self):
        # Create a test user
        self.test_user = User.objects.create_user(
            username='testuser',
            password='testpassword123'
        )
        self.client = APIClient()
    
    def test_user_registration(self):
        """Test that a user can register"""
        url = '/api/user/register/'
        data = {
            'username': 'newuser',
            'password': 'newpassword123'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='newuser').exists())
        
        # Check that a UserProfile was created automatically
        self.assertTrue(UserProfile.objects.filter(user__username='newuser').exists())
    
    def test_user_login(self):
        """Test that a user can login with valid credentials"""
        url = '/api/token/'
        data = {
            'username': 'testuser',
            'password': 'testpassword123'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

# Journal Tests
class JournalTests(APITestCase):
    def setUp(self):
        # Create a test user
        self.test_user = User.objects.create_user(
            username='testuser',
            password='testpassword123'
        )
        self.client = APIClient()
        
        # Authenticate the test user
        self.client.force_authenticate(user=self.test_user)
    
    def test_create_journal(self):
        """Test that an authenticated user can create a journal"""
        url = '/api/journal/'
        data = {
            'title': 'Test Journal',
            'description': 'This is a test journal',
            'max_risk': 2.5,
            'account_size': 10000.00
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Journal.objects.count(), 1)
        self.assertEqual(Journal.objects.get().title, 'Test Journal')
    
    def test_list_journals(self):
        """Test that an authenticated user can list their journals"""
        # Create a journal for the test user
        Journal.objects.create(
            owner=self.test_user,
            title='Test Journal',
            description='This is a test journal',
            max_risk=2.5,
            account_size=10000.00
        )
        
        url = '/api/journal/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Test Journal')
    
    def test_delete_journal(self):
        """Test that an authenticated user can delete their journal"""
        # Create a journal for the test user
        journal = Journal.objects.create(
            owner=self.test_user,
            title='Test Journal',
            description='This is a test journal',
            max_risk=2.5,
            account_size=10000.00
        )
        
        url = f'/api/journal/delete/{journal.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Journal.objects.count(), 0)

# Journal Entry Tests
class JournalEntryTests(APITestCase):
    def setUp(self):
        # Create a test user
        self.test_user = User.objects.create_user(
            username='testuser',
            password='testpassword123'
        )
        self.client = APIClient()
        
        # Authenticate the test user
        self.client.force_authenticate(user=self.test_user)
        
        # Create a journal for the test user
        self.journal = Journal.objects.create(
            owner=self.test_user,
            title='Test Journal',
            description='This is a test journal',
            max_risk=2.5,
            account_size=10000.00
        )
    
    def test_create_journal_entry(self):
        """Test that an authenticated user can create a journal entry"""
        url = f'/api/journal/{self.journal.id}/entries/create/'
        data = {
            'date': '2025-05-03',
            'instrument': 'EURUSD',
            'direction': 'Buy',
            'outcome': 'Win',
            'risk_management': 'Used proper stop loss',
            'follow_strategy': True,
            'feeling_before': 'Neutral',
            'confidence_before': 7,
            'feeling_during': ['Neutral', 'Slightly confident'],
            'confidence_during': 6,
            'feeling_during_text': 'Felt good about the trade',
            'review': 'Good execution of strategy',
            'review_rating': 8,
            'risk_percent': 1.5,
            'risk_reward_ratio': 2.0,
            'profit_loss': 150.00,
            'additional_comments': 'Market conditions were favorable'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(JournalEntry.objects.count(), 1)
        
        # Check that user score was incremented
        user_profile = UserProfile.objects.get(user=self.test_user)
        self.assertEqual(user_profile.score, 1)
    
    def test_list_journal_entries(self):
        """Test that an authenticated user can list their journal entries"""
        # Create a journal entry
        JournalEntry.objects.create(
            journal=self.journal,
            date='2025-05-03',
            instrument='EURUSD',
            direction='Buy',
            outcome='Win',
            risk_management='Used proper stop loss',
            follow_strategy=True
        )
        
        url = f'/api/journal/{self.journal.id}/entries/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['instrument'], 'EURUSD')
    
    def test_delete_journal_entry(self):
        """Test that an authenticated user can delete their journal entry"""
        # Create a journal entry
        entry = JournalEntry.objects.create(
            journal=self.journal,
            date='2025-05-03',
            instrument='EURUSD',
            direction='Buy',
            outcome='Win',
            risk_management='Used proper stop loss',
            follow_strategy=True
        )
        
        url = f'/api/journal/{self.journal.id}/entries/{entry.id}/delete/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(JournalEntry.objects.count(), 0)

# Leaderboard Tests
class LeaderboardTests(APITestCase):
    def setUp(self):
        # Create test users with different scores
        self.user1 = User.objects.create_user(username='user1', password='password123')
        self.user2 = User.objects.create_user(username='user2', password='password123')
        self.user3 = User.objects.create_user(username='user3', password='password123')
        
        # Create profiles with scores - using get_or_create to ensure profiles exist
        profile1, _ = UserProfile.objects.get_or_create(user=self.user1)
        profile1.score = 10
        profile1.save()
        
        profile2, _ = UserProfile.objects.get_or_create(user=self.user2)
        profile2.score = 5
        profile2.save()
        
        profile3, _ = UserProfile.objects.get_or_create(user=self.user3)
        profile3.score = 15
        profile3.save()
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.user2)  # Login as user2
    
    def test_leaderboard_ranking(self):
        """Test that the leaderboard shows correct rankings"""
        url = '/api/leaderboard/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check leaderboard data
        self.assertEqual(len(response.data['leaderboard']), 3)
        self.assertEqual(response.data['leaderboard'][0]['username'], 'user3')  # Highest score
        self.assertEqual(response.data['leaderboard'][0]['score'], 15)
        self.assertEqual(response.data['leaderboard'][1]['username'], 'user1')
        self.assertEqual(response.data['leaderboard'][2]['username'], 'user2')  # Lowest score
        
        # Check current user's rank (user2 should be rank 3)
        self.assertEqual(response.data['user_rank'], 3)
        self.assertEqual(response.data['user_score'], 5)

# Community Tests
class CommunityTests(APITestCase):
    def setUp(self):
        # Create test users
        self.test_user = User.objects.create_user(username='testuser', password='testpassword123')
        self.other_user = User.objects.create_user(username='otheruser', password='testpassword123')
        
        # Authenticate the test user
        self.client = APIClient()
        self.client.force_authenticate(user=self.test_user)
        
        # Create a journal for the test user
        self.journal = Journal.objects.create(
            owner=self.test_user,
            title='Test Journal',
            description='This is a test journal'
        )
        
        # Create a journal entry
        self.entry = JournalEntry.objects.create(
            journal=self.journal,
            date='2025-05-03',
            instrument='EURUSD',
            direction='Buy',
            outcome='Win',
            risk_management='Used proper stop loss',
            follow_strategy=True
        )
    
    def test_share_journal_entry(self):
        """Test that a user can share a journal entry to the community"""
        url = f'/api/journal/{self.journal.id}/entries/{self.entry.id}/share/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CommunityEntry.objects.count(), 1)
        
        # Check that the community entry has the correct data
        community_entry = CommunityEntry.objects.first()
        self.assertEqual(community_entry.original_entry, self.entry)
        self.assertEqual(community_entry.instrument, 'EURUSD')
    
    def test_list_community_entries(self):
        """Test that a user can list community entries"""
        # First share an entry
        share_url = f'/api/journal/{self.journal.id}/entries/{self.entry.id}/share/'
        self.client.post(share_url)
        
        # Then list community entries
        url = '/api/community-entries/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['instrument'], 'EURUSD')
    
    def test_add_comment_to_community_entry(self):
        """Test that a user can add a comment to a community entry"""
        # First share an entry
        share_url = f'/api/journal/{self.journal.id}/entries/{self.entry.id}/share/'
        share_response = self.client.post(share_url)
        community_entry_id = share_response.data['id']
        
        # Then add a comment
        url = f'/api/community-entries/{community_entry_id}/comments/create/'
        data = {
            'content': 'This is a test comment'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Comment.objects.count(), 1)
        self.assertEqual(Comment.objects.first().content, 'This is a test comment')

# Trading Feedback Tests
class TradingFeedbackTests(APITestCase):
    def setUp(self):
        # Create test user
        self.test_user = User.objects.create_user(username='testuser', password='testpassword123')
        
        # Authenticate the test user
        self.client = APIClient()
        self.client.force_authenticate(user=self.test_user)
        
        # Create a journal for the test user
        self.journal = Journal.objects.create(
            owner=self.test_user,
            title='Test Journal',
            description='This is a test journal'
        )
        
        # Create several journal entries with different outcomes
        JournalEntry.objects.create(
            journal=self.journal,
            date='2025-05-01',
            instrument='EURUSD',
            direction='Buy',
            outcome='Win',
            risk_management='Used proper stop loss',
            follow_strategy=True,
            profit_loss=100.00
        )
        
        JournalEntry.objects.create(
            journal=self.journal,
            date='2025-05-02',
            instrument='GBPUSD',
            direction='Sell',
            outcome='Loss',
            risk_management='Used proper stop loss',
            follow_strategy=False,
            profit_loss=-50.00
        )
        
        JournalEntry.objects.create(
            journal=self.journal,
            date='2025-05-03',
            instrument='USDJPY',
            direction='Buy',
            outcome='Win',
            risk_management='Used proper stop loss',
            follow_strategy=True,
            profit_loss=75.00
        )
    
    def test_generate_trading_feedback(self):
        """Test that the system can generate trading feedback"""
        url = f'/api/journal/{self.journal.id}/generate-feedback/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that the response contains data
        self.assertIn('feedback', response.data)
        
        # If there's enough data, check for detailed sections
        if response.data.get('has_enough_data', False):
            self.assertIn('performance_metrics', response.data)
            self.assertIn('trading_patterns', response.data)
            self.assertIn('improvement_suggestions', response.data)
            self.assertIn('emotional_analysis', response.data)
        else:
            # If not enough data, check for the appropriate message
            self.assertIn('Not enough trading data', response.data['feedback'])
    
    def test_weekly_report(self):
        """Test that the system can generate a weekly report"""
        url = f'/api/journal/{self.journal.id}/weekly-report/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that the response contains data
        self.assertTrue(len(response.data) > 0)
