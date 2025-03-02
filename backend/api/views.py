from django.shortcuts import render
from django.contrib.auth.models import User
from rest_framework import generics
from .serializers import UserSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Journal
from .serializers import JournalSerializer, JournalEntrySerializer
from .models import Journal, JournalEntry
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


# Create your views here.

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


class CreateJournalView(generics.ListCreateAPIView):
    serializer_class = JournalSerializer
    permission_classes = [IsAuthenticated]     #change this to [IsAuthenticated] to make it private later.
    
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

    def get(self, request, journal_id):  # Change 'id' to 'journal_id'
        try:
            journal = Journal.objects.get(id=journal_id, owner=request.user)
            serializer = JournalSerializer(journal)
            return Response(serializer.data)
        except Journal.DoesNotExist:
            return Response({"error": "Journal not found"}, status=404)

        

class JournalEntryCreateView(APIView):
    permission_classes = [IsAuthenticated]
    

    def post(self, request, journal_id):
        print(f"Received journal_id: {journal_id}")  # Debugging line
        try:
            journal = Journal.objects.get(id=journal_id, owner=request.user)
        except Journal.DoesNotExist:
            return Response({"error": "Journal not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = JournalEntrySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(journal=journal)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
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
            return Response(serializer.data)  # Returns JSON
        except Exception as e:
            return Response({"error": str(e)}, status=400)
        
class CreateEntryView(APIView):
    def post(self, request, journal_id):
        try:
            journal = Journal.objects.get(id=journal_id)
        except Journal.DoesNotExist:
            return Response({"error": "Journal not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = JournalEntrySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(journal=journal)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


