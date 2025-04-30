import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
// Import your token constants
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import Navbar from '../components/Navbar';
import { getFullImageUrl } from '../utils/imageUtils';

const API_BASE_URL = 'http://localhost:8000/api';

// Add custom CSS for the table with Notion-like styling
const tableStyles = `
  /* Overall table styling with Notion-like appearance */
  .journal-entries-table {
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
    min-width: 1400px; /* Ensure table has minimum width for horizontal scroll */
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  
  /* Header styling */
  .journal-entries-table thead th {
    position: sticky;
    top: 0;
    background: #f8f9fa;
    z-index: 10;
    font-weight: 600;
    padding: 12px 10px;
    border-bottom: 2px solid #dee2e6;
  }
  
  /* Fixed height cells with scrollable content */
  .journal-entries-table td {
    padding: 12px 8px;
    border-bottom: 1px solid #eee;
    vertical-align: middle;
    color: #37352f;
    max-height: 95px;
    height: 95px;
  }
  
  /* Zebra striping for rows */
  .journal-entries-table tbody tr:nth-child(odd) {
    background-color: #fafafa;
  }
  
  /* Hover effect */
  .journal-entries-table tbody tr:hover {
    background-color: #f8f9fa;
  }
  
  /* Style for text content cells */
  .text-cell {
    max-height: 85px;
    overflow-y: auto;
    word-break: break-word;
    padding: 8px;
    border-radius: 3px;
    background-color: #f7f7f7;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
    line-height: 1.5;
  }
  
  /* Scrollbar styling for better visibility */
  .text-cell::-webkit-scrollbar {
    width: 4px;
  }
  
  .text-cell::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  
  .text-cell::-webkit-scrollbar-thumb {
    background: #d1d1d1;
    border-radius: 3px;
  }
  
  .text-cell::-webkit-scrollbar-thumb:hover {
    background: #aaa;
  }
  
  /* Ensure narrow columns for confidence and rating numbers */
  .number-column {
    text-align: center;
    vertical-align: middle;
    padding: 12px 8px;
  }
  
  /* Rating visualization */
  .rating-display {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .rating-number {
    display: inline-block;
    width: 32px;
    height: 32px;
    line-height: 32px;
    text-align: center;
    border-radius: 50%;
    background-color: #0070f3;
    color: white;
    font-weight: bold;
    font-size: 16px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  /* Make sure table container is properly scrollable */
  .journal-entries-table-container {
    width: 100%;
    overflow-x: auto;
    position: relative;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  
  /* Specific styling for various data types */
  .outcome-win {
    color: #0ca678;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 3px;
    background-color: rgba(12, 166, 120, 0.08);
  }
  
  .outcome-loss {
    color: #fa5252;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 3px;
    background-color: rgba(250, 82, 82, 0.08);
  }
  
  .outcome-breakeven {
    color: #868e96;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 3px;
    background-color: rgba(134, 142, 150, 0.08);
  }
  
  /* Card style button group */
  .action-buttons {
    display: flex;
    gap: 5px;
  }
  
  .action-button {
    padding: 5px 8px;
    border: none;
    border-radius: 3px;
    background-color: #f8f9fa;
    color: #495057;
    font-weight: 500;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  
  .action-button:hover {
    background-color: #e9ecef;
  }
  
  .action-button.edit {
    color: #1971c2;
  }
  
  .action-button.delete {
    color: #e03131;
  }
  
  .action-button.view {
    color: #5f3dc4;
  }
  
  .action-button.share {
    color: #28a745;
  }
  
  /* Entry detail modal */
  .entry-detail-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .entry-detail-content {
    background: white;
    border-radius: 8px;
    width: 90%;
    max-width: 900px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 20px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  }
  
  .entry-detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #dee2e6;
    padding-bottom: 15px;
    margin-bottom: 15px;
  }
  
  .entry-detail-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #6c757d;
  }
  
  .entry-detail-close:hover {
    color: #343a40;
  }
  
  .entry-detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 15px;
  }
  
  .entry-detail-item {
    border: 1px solid #eaeaea;
    border-radius: 4px;
    padding: 12px;
    background-color: #f8f9fa;
  }
  
  .entry-detail-label {
    font-weight: 500;
    margin-bottom: 5px;
    color: #6c757d;
    font-size: 0.9rem;
  }
  
  .entry-detail-value {
    color: #212529;
    min-height: 24px;
  }
  
  .entry-detail-images {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 15px;
  }
  
  .entry-detail-image {
    width: 150px;
    height: 150px;
    object-fit: cover;
    border-radius: 4px;
    cursor: pointer;
  }
  
  /* Enhanced styling for ratings and number columns */
  .rating-number {
    display: inline-block;
    width: 32px;
    height: 32px;
    line-height: 32px;
    text-align: center;
    border-radius: 50%;
    background-color: #0070f3;
    color: white;
    font-weight: bold;
    font-size: 16px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .feeling-cell {
    font-weight: 500;
    color: #333;
    min-width: 110px;
    white-space: nowrap;
    padding: 8px;
    background-color: #f9f9f9;
    border-radius: 4px;
  }
  
  .number-column {
    text-align: center;
    width: 60px;
    min-width: 60px;
    padding: 8px;
  }
  
  /* Table improvements */
  .journal-entries-table th {
    position: sticky;
    top: 0;
    background: #f8f9fa;
    z-index: 10;
    font-weight: 600;
    padding: 12px 10px;
    border-bottom: 2px solid #dee2e6;
  }
  
  .journal-entries-table td {
    padding: 12px 8px;
    border-bottom: 1px solid #eee;
  }
  
  .journal-entries-table tr:hover {
    background-color: #f8f9fa;
  }
`;

// Function to refresh the token
const refreshAuthToken = async () => {
  try {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN);
    
    if (!refreshToken) {
      console.error('No refresh token available');
      // Redirect to login or handle authentication failure
      window.location.href = '/login';
      return null;
    }
    
    const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
      refresh: refreshToken
    });
    
    const { access } = response.data;
    
    // Save the new access token to localStorage
    localStorage.setItem(ACCESS_TOKEN, access);
    
    console.log('Token refreshed successfully');
    return access;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    // Clear tokens and redirect to login
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    window.location.href = '/login';
    return null;
  }
};

// Function to check if token is expired
const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    const payload = JSON.parse(atob(parts[1]));
    return Date.now() >= payload.exp * 1000;
  } catch (e) {
    console.error('Error checking token expiration:', e);
    return true;
  }
};

// Set up Axios interceptors for token refresh
axios.interceptors.request.use(
  async config => {
    // Don't intercept refresh token requests to avoid infinite loops
    if (config.url.includes('/auth/refresh/')) {
      return config;
    }
    
    let token = localStorage.getItem(ACCESS_TOKEN);
    
    // Check if token is expired
    if (isTokenExpired(token)) {
      console.log('Token is expired, attempting to refresh');
      token = await refreshAuthToken();
      
      if (!token) {
        // Token refresh failed, request will likely fail
        return config;
      }
    }
    
    // Add token to request
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  error => {
    console.error('Axios Request Error:', error);
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  response => {
    return response;
  },
  async error => {
    const originalRequest = error.config;
    
    // If error is 401 Unauthorized and we haven't tried to refresh already
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const newToken = await refreshAuthToken();
        
        if (newToken) {
          // Update the request with new token and retry
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axios(originalRequest);
        }
      } catch (refreshError) {
        console.error('Error refreshing token in response interceptor:', refreshError);
      }
    }
    
    console.error('Axios Response Error:', error.response ? {
      status: error.response.status,
      headers: error.response.headers,
      data: error.response.data
    } : error);
    
    return Promise.reject(error);
  }
);

// Image Modal Component
const ImageModal = ({ imageUrl, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="image-modal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
      }}
      onClick={onClose}
    >
      <div 
        className="modal-close"
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          color: 'white',
          fontSize: '30px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        &times;
      </div>
      <img
        src={getFullImageUrl(imageUrl)}
        alt="Trade detail"
        style={{
          maxWidth: '90%',
          maxHeight: '90%',
          objectFit: 'contain',
          boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image
      />
    </div>
  );
};

// Multi-select component for emotions
const EmotionMultiSelect = ({ selectedEmotions, onChange }) => {
  const emotions = [
    'Not worried',
    'Not really bothered',
    'Neutral',
    'A little worried',
    'Very uneasy'
  ];

  // Ensure selectedEmotions is always an array of strings
  const normalizedEmotions = React.useMemo(() => {
    if (!selectedEmotions) return [];
    if (typeof selectedEmotions === 'string') {
      try {
        // Try to parse it as JSON
        const parsed = JSON.parse(selectedEmotions);
        return Array.isArray(parsed) ? parsed.map(String) : [String(selectedEmotions)];
      } catch {
        // If not valid JSON, treat as a single string
        return [selectedEmotions];
      }
    }
    return Array.isArray(selectedEmotions) 
      ? selectedEmotions.map(String) 
      : [String(selectedEmotions)];
  }, [selectedEmotions]);

  const toggleEmotion = (emotion) => {
    if (normalizedEmotions.includes(emotion)) {
      onChange(normalizedEmotions.filter(e => e !== emotion));
    } else {
      onChange([...normalizedEmotions, emotion]);
    }
  };

  return (
    <div className="emotion-multiselect">
      {emotions.map(emotion => (
        <div 
          key={emotion} 
          className={`emotion-tag ${normalizedEmotions.includes(emotion) ? 'selected' : ''}`}
          style={{
            display: 'inline-block',
            margin: '4px',
            padding: '6px 12px',
            borderRadius: '15px',
            backgroundColor: normalizedEmotions.includes(emotion) ? '#007bff' : '#e9ecef',
            color: normalizedEmotions.includes(emotion) ? 'white' : 'black',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onClick={() => toggleEmotion(emotion)}
        >
          {emotion}
        </div>
      ))}
    </div>
  );
};

// Updated ImageUploader component
const ImageUploader = ({ images, onImagesChange }) => {
  const fileInputRef = useRef(null);
  
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    // Validate files - only allow image files
    const validImageFiles = files.filter(file => 
      file.type.startsWith('image/')
    );
    
    if (validImageFiles.length !== files.length) {
      alert('Some files were not images and were skipped.');
    }
    
    onImagesChange([...images, ...validImageFiles]);
  };
  
  const openFileDialog = () => {
    fileInputRef.current.click();
  };
  
  const handleRemoveImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onImagesChange(newImages);
  };
  
  return (
    <div className="image-uploader mb-3">
      <div className="d-flex flex-wrap mb-2">
        {images.map((image, index) => (
          <div 
            key={index}
            className="image-preview-container m-1"
            style={{ position: 'relative' }}
          >
            <img 
              src={typeof image === 'string' ? getFullImageUrl(image) : URL.createObjectURL(image)}
              alt={`Preview ${index}`}
              className="image-preview"
              style={{ 
                width: '100px', 
                height: '100px', 
                objectFit: 'cover',
                borderRadius: '4px'
              }}
            />
            <button
              type="button"
              className="btn btn-sm btn-danger"
              style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                padding: '2px 6px',
                fontSize: '12px'
              }}
              onClick={() => handleRemoveImage(index)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      
      <button 
        type="button" 
        className="btn btn-outline-secondary"
        onClick={openFileDialog}
      >
        Add Images
      </button>
      
      <input 
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        multiple
        onChange={handleFileSelect}
      />
    </div>
  );
};

// Share Preview Modal Component
function SharePreviewModal({ entry, isOpen, onClose, onConfirm }) {
  if (!isOpen || !entry) return null;
  
  // Function to format date to include day name (e.g., "Tuesday, 11th April 2025")
  const formatDate = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', options);
  };

  // Function to get full image URL
  const getFullImageUrl = (imagePath) => {
    // If the path already contains http:// or https://, return it as is
    if (imagePath && (imagePath.startsWith('http://') || imagePath.startsWith('https://'))) {
      return imagePath;
    }
    // Otherwise, prepend the API_BASE_URL to the image path
    return `${API_BASE_URL}${imagePath}`;
  };

  return (
    <div className="modal share-preview-modal" style={{ display: 'block', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Share to Community</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="share-preview-heading">
              <h6 className="mb-3">Preview your entry before sharing</h6>
              <div className="preview-notice">
                <i className="bi bi-info-circle me-2"></i>
                This entry will be shared anonymously. Your username and personal information will not be visible to other users.
              </div>
            </div>

            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">{entry.instrument}</h5>
                <span className={`badge ${entry.outcome === 'Win' ? 'bg-success' : entry.outcome === 'Loss' ? 'bg-danger' : 'bg-secondary'}`}>
                  {entry.outcome}
                </span>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <small className="text-muted">Traded on {formatDate(entry.date)}</small>
                </div>
                
                <div className="row mb-3">
                  <div className="col-6">
                    <div className="trade-detail">
                      <span className="detail-label">Direction:</span>
                      <span className="detail-value">{entry.direction}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="trade-detail">
                      <span className="detail-label">Risk/Reward:</span>
                      <span className="detail-value">{entry.risk_reward_ratio || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="row mb-3">
                  <div className="col-6">
                    <div className="trade-detail">
                      <span className="detail-label">P/L:</span>
                      <span className={`detail-value ${parseFloat(entry.profit_loss) > 0 ? 'text-success' : parseFloat(entry.profit_loss) < 0 ? 'text-danger' : ''}`}>
                        {entry.profit_loss ? `${parseFloat(entry.profit_loss) > 0 ? '+' : ''}${entry.profit_loss}` : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="trade-detail">
                      <span className="detail-label">Risk %:</span>
                      <span className="detail-value">{entry.risk_percent ? `${entry.risk_percent}%` : 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mb-3">
                  <h6>Emotions Before Trade:</h6>
                  <div className="d-flex justify-content-between align-items-center">
                    <span>{entry.feeling_before || 'Not specified'}</span>
                    {entry.confidence_before && (
                      <div className="confidence-badge">
                        Confidence: {entry.confidence_before}/10
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mb-3">
                  <h6>Emotions During Trade:</h6>
                  <div className="d-flex justify-content-between align-items-center">
                    <span>{entry.feeling_during || 'Not specified'}</span>
                    {entry.confidence_during && (
                      <div className="confidence-badge">
                        Confidence: {entry.confidence_during}/10
                      </div>
                    )}
                  </div>
                </div>
                
                {entry.review && (
                  <div className="mb-3">
                    <h6>Trade Review:</h6>
                    <p className="review-text">{entry.review}</p>
                    {entry.review_rating && (
                      <div className="review-rating">
                        Rating: {entry.review_rating}/10
                      </div>
                    )}
                  </div>
                )}
                
                {entry.images && entry.images.length > 0 && (
                  <div className="mt-3">
                    <h6>Trade Images:</h6>
                    <div className="d-flex flex-wrap">
                      {entry.images.map((image, idx) => (
                        <div key={idx} className="trade-image-wrapper">
                          <img 
                            src={getFullImageUrl(image)}
                            alt={`Trade image ${idx + 1}`}
                            className="trade-image"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="share-buttons mt-4">
              <button className="btn btn-secondary share-cancel-btn" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary share-confirm-btn" onClick={onConfirm}>Share to Community</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddEntry() {
  const { id } = useParams(); // Get the journal ID from the URL
  console.log('Journal ID:', id);
  const [entries, setEntries] = useState([]); // State for journal entries
  const [showModal, setShowModal] = useState(false); // State for modal visibility
  const [editMode, setEditMode] = useState(false); // State to track if we're editing or creating
  const [currentEntryId, setCurrentEntryId] = useState(null); // Track the entry being edited
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false); // State for delete confirmation modal
  const [entryToDelete, setEntryToDelete] = useState(null); // Track the entry to delete
  const [selectedImages, setSelectedImages] = useState([]); // State for selected images
  const [isSubmitting, setIsSubmitting] = useState(false); // Track form submission state
  const [showImageModal, setShowImageModal] = useState(false); // State for image modal visibility
  const [selectedImageUrl, setSelectedImageUrl] = useState(null); // Track the selected image URL
  const [detailEntry, setDetailEntry] = useState(null); // Track the entry being viewed in detail
  const [selectedEntryForShare, setSelectedEntryForShare] = useState(null); // Track the entry to share
  const [showSharedModal, setShowSharedModal] = useState(false); // State for share modal visibility
  const [sharingStatus, setSharingStatus] = useState({ isSharing: false, message: '', error: false }); // Track sharing status

  const [formData, setFormData] = useState({
    date: '',
    instrument: '',
    direction: 'Buy',
    outcome: 'Win',
    risk_management: '',
    feeling_during: [],
    additional_comments: '',
    risk_reward_ratio: '',  // New field
    profit_loss: '',        // New field
    risk_percent: '',       // New field
    follow_strategy: true,  // Default to true for following strategy
    feeling_before: 'Neutral', // Default feeling before
    confidence_before: 5,   // Default confidence before (1-10)
    feeling_during: 'Neutral', // Default feeling during
    confidence_during: 5,   // Default confidence during (1-10)
    review_rating: 5,       // Default review rating (1-10)
  });

  const [feelingBefore, setFeelingBefore] = useState('');
  const [feelingDuring, setFeelingDuring] = useState('');
  const [review, setReview] = useState('');

  // Load saved column widths from localStorage on mount
  useEffect(() => {
    const savedWidths = localStorage.getItem('journalTableColumnWidths');
    if (savedWidths) {
      try {
        // setColumnWidths(JSON.parse(savedWidths));
      } catch (e) {
        console.error('Error loading saved column widths:', e);
      }
    }
  }, []);

  // Debug token validity on component mount
  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN);
      console.log('Looking for token with key:', ACCESS_TOKEN);
      console.log('Token found:', token ? 'Yes' : 'No');
      
      if (token) {
        console.log('Token preview:', token.substring(0, 15) + '...');
        
        if (isTokenExpired(token)) {
          console.log('Token is expired, attempting to refresh');
          const newToken = await refreshAuthToken();
          if (newToken) {
            console.log('Token refreshed successfully');
          }
        } else {
          console.log('Token is valid');
        }
      } else {
        console.error('No token found, user may need to log in');
      }
    };
    
    checkToken();
  }, []);

  // Fetch existing entries for the journal
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/journal/${id}/entries/`);
        console.log('API Response:', response.data);
        
        // Sort entries by date (oldest to newest) before setting state
        const sortedEntries = Array.isArray(response.data) 
          ? [...response.data].sort((a, b) => new Date(a.date) - new Date(b.date))
          : [];
          
        // Log each entry to inspect what data is coming from API
        sortedEntries.forEach(entry => {
          console.log(`Entry ${entry.id} data:`, {
            feeling_before: entry.feeling_before,
            confidence_before: entry.confidence_before,
            feeling_during: entry.feeling_during,
            confidence_during: entry.confidence_during,
            review_rating: entry.review_rating
          });
        });
        
        setEntries(sortedEntries);
      } catch (error) {
        console.error('Error fetching entries:', error);
      }
    };
    fetchEntries();
  }, [id]);

  // Handle form field changes
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [id]: value
    }));
  };

  // Handle number field changes with validation
  const handleNumberChange = (e) => {
    const { id, value } = e.target;
    // Allow empty string, numbers with up to 2 decimal places, and negative numbers
    if (value === '' || /^-?\d*\.?\d{0,2}$/.test(value)) {
      setFormData(prevData => ({
        ...prevData,
        [id]: value
      }));
    }
  };

  // Handle emotion selection changes
  const handleEmotionChange = (selectedEmotions) => {
    // Ensure we're always working with an array of strings
    const emotions = Array.isArray(selectedEmotions) 
      ? selectedEmotions.map(emotion => String(emotion)) 
      : [String(selectedEmotions)];
    
    console.log('Setting emotions:', emotions);
    
    setFormData(prevData => ({
      ...prevData,
      feeling_during: emotions
    }));
  };

  // Handle image selection changes
  const handleImagesChange = (newImages) => {
    setSelectedImages(newImages);
  };

  // Initialize edit mode with the current entry data
  const handleEdit = (entry) => {
    console.log("Editing entry with data:", entry); // Debug log
    
    // Handle feeling_during which might be coming as an array
    let feelingDuringValue = 'Neutral';
    if (typeof entry.feeling_during === 'string') {
      feelingDuringValue = entry.feeling_during;
    } else if (Array.isArray(entry.feeling_during) && entry.feeling_during.length > 0) {
      feelingDuringValue = entry.feeling_during[0];
    }
    
    console.log("Processing feeling_during:", {
      original: entry.feeling_during,
      processed: feelingDuringValue
    });
    
    // Ensure all numeric values have proper defaults if they're missing
    setFormData({
      date: entry.date,
      instrument: entry.instrument,
      direction: entry.direction,
      outcome: entry.outcome,
      risk_management: entry.risk_management || '',
      feeling_during: feelingDuringValue,
      additional_comments: entry.additional_comments || '',
      risk_reward_ratio: entry.risk_reward_ratio || '',
      profit_loss: entry.profit_loss || '',
      risk_percent: entry.risk_percent || '',
      follow_strategy: entry.follow_strategy,
      feeling_before: entry.feeling_before || 'Neutral',
      confidence_before: entry.confidence_before !== undefined && entry.confidence_before !== null 
                        ? Number(entry.confidence_before) : 5,
      confidence_during: entry.confidence_during !== undefined && entry.confidence_during !== null 
                        ? Number(entry.confidence_during) : 5,
      review_rating: entry.review_rating !== undefined && entry.review_rating !== null 
                    ? Number(entry.review_rating) : 5,
    });
    
    console.log("Setting form data with confidence values:", {
      confidence_before: entry.confidence_before !== undefined && entry.confidence_before !== null 
                        ? Number(entry.confidence_before) : 5,
      confidence_during: entry.confidence_during !== undefined && entry.confidence_during !== null 
                        ? Number(entry.confidence_during) : 5,
      review_rating: entry.review_rating !== undefined && entry.review_rating !== null 
                    ? Number(entry.review_rating) : 5
    });
    
    // Set selected images to the existing images from the entry
    setSelectedImages(entry.images || []);
    setFeelingBefore(entry.feeling_before_text || '');
    setFeelingDuring(entry.feeling_during_text || '');
    setReview(entry.review || '');
    setCurrentEntryId(entry.id);
    setEditMode(true);
    setShowModal(true);
  };

  // Handle delete confirmation
  const handleDeleteClick = (entry) => {
    setEntryToDelete(entry);
    setShowDeleteConfirmation(true);
  };

  // Execute delete after confirmation
  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/journal/${id}/entries/${entryToDelete.id}/delete/`);
      
      // Remove the deleted entry from the local state
      setEntries(entries.filter(entry => entry.id !== entryToDelete.id));
      
      // Close the confirmation modal
      setShowDeleteConfirmation(false);
      setEntryToDelete(null);
      
      // Show success message
      alert('Entry deleted successfully!');
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert(`Error: ${error.response?.data?.detail || 'Could not delete entry. Please try again.'}`);
    }
  };

  // Cancel delete operation
  const handleDeleteCancel = () => {
    setShowDeleteConfirmation(false);
    setEntryToDelete(null);
  };

  // Reset form and modal state
  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      instrument: '',
      direction: 'Buy',
      outcome: 'Win',
      risk_management: '',
      feeling_during: [],
      additional_comments: '',
      risk_reward_ratio: '',
      profit_loss: '',
      risk_percent: '',
      follow_strategy: true,
      feeling_before: 'Neutral',
      confidence_before: 5,
      feeling_during: 'Neutral',
      confidence_during: 5,
      review_rating: 5,
    });
    setSelectedImages([]);
    setFeelingBefore('');
    setFeelingDuring('');
    setReview('');
    setCurrentEntryId(null);
    setEditMode(false);
    setShowModal(false);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      console.log("Form submission started with form data:", formData);
      
      // Step 1: Create the entry data object
      const entryData = {
        date: formData.date,
        follow_strategy: formData.follow_strategy === 'true' || formData.follow_strategy === true,
        instrument: formData.instrument,
        direction: formData.direction,
        outcome: formData.outcome,
        risk_reward_ratio: formData.risk_reward_ratio ? parseFloat(formData.risk_reward_ratio) : null,
        profit_loss: formData.profit_loss ? parseFloat(formData.profit_loss) : null,
        risk_percent: formData.risk_percent ? parseFloat(formData.risk_percent) : null,
        risk_management: formData.risk_management,
        feeling_before: formData.feeling_before || 'Neutral',
        feeling_during: formData.feeling_during || 'Neutral',
        confidence_before: Number(formData.confidence_before || 5),
        confidence_during: Number(formData.confidence_during || 5),
        review_rating: Number(formData.review_rating || 5),
        review: review
      };
      
      console.log("Entry data prepared:", entryData);
      
      // Step 2: Create or update the entry
      let entryId;
      
      if (editMode) {
        console.log(`Updating entry with ID: ${currentEntryId}`);
        await axios.put(
          `${API_BASE_URL}/journal/${id}/entries/${currentEntryId}/update/`,
          entryData,
          { headers: { 'Content-Type': 'application/json' } }
        );
        entryId = currentEntryId;
      } else {
        console.log("Creating new entry");
        const response = await axios.post(
          `${API_BASE_URL}/journal/${id}/entries/create/`,
          entryData,
          { headers: { 'Content-Type': 'application/json' } }
        );
        entryId = response.data.id;
        console.log("New entry created with ID:", entryId);
      }
      
      // Step 3: Handle image uploads if there are any
      if (selectedImages && selectedImages.length > 0) {
        console.log("Processing images:", selectedImages.length);
        
        // Create a new FormData instance just for images
        const imageFormData = new FormData();
        
        // Add new image files (File objects)
        const newImages = selectedImages.filter(img => typeof img !== 'string');
        console.log("New images to upload:", newImages.length);
        
        newImages.forEach((image, index) => {
          imageFormData.append(`image${index}`, image);
        });
        
        // Add existing image URLs (strings)
        const existingImages = selectedImages.filter(img => typeof img === 'string');
        console.log("Existing images to preserve:", existingImages.length);
        
        if (existingImages.length > 0) {
          imageFormData.append('existing_images', JSON.stringify(existingImages));
        }
        
        // Only upload if there's something to upload
        if (newImages.length > 0 || (editMode && existingImages.length > 0)) {
          console.log("Uploading images for entry ID:", entryId);
          await axios.post(
            `${API_BASE_URL}/journal/${id}/entries/${entryId}/images/upload/`,
            imageFormData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );
          console.log("Image upload complete");
        }
      }
      
      // Step 4: Refresh entries after submission
      console.log("Refreshing entries list");
      const updatedEntries = await axios.get(`${API_BASE_URL}/journal/${id}/entries/`);
      const sortedEntries = [...updatedEntries.data].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      
      setEntries(sortedEntries);
      
      // Step 5: Reset form and show success message
      console.log("Form submission complete, resetting form");
      setShowModal(false);
      resetForm();
      
      alert(editMode ? 'Entry updated successfully!' : 'Entry added successfully!');
    } catch (error) {
      console.error('Error submitting form:', error);
      
      if (error.response) {
        console.error('Error status:', error.response.status);
        console.error('Error data:', error.response.data);
        
        if (error.response.data) {
          const errorDetails = Object.entries(error.response.data)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
          alert(`Error: ${errorDetails}`);
        } else {
          alert(`Error ${error.response.status}: ${error.response.statusText || 'Unknown error'}`);
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
        alert('Error: No response received from server. Please check your connection.');
      } else {
        console.error('Error message:', error.message);
        alert(`Error: ${error.message}`);
      }
    }
  };

  // Close the modal and reset form
  const handleCloseModal = () => {
    resetForm();
  };

  // Initialize new entry creation
  const handleAddNew = () => {
    resetForm();
    setShowModal(true);
  };

  // Format number for display in the table
  const formatNumber = (value) => {
    if (!value && value !== 0) return '';
    
    // Ensure 2 decimal places and add + sign for positive numbers
    const num = parseFloat(value);
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}`;
  };

  // Format date as 'Tuesday, 11th April 2025'
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const dayName = date.toLocaleString('default', { weekday: 'long' });
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    
    // Get ordinal suffix
    const getOrdinal = (n) => {
      if (n > 3 && n < 21) return 'th';
      switch (n % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };
    
    return `${dayName}, ${day}${getOrdinal(day)} ${month} ${year}`;
  };

  // Ensure entries is an array before rendering
  if (!Array.isArray(entries)) {
    console.error('Entries is not an array:', entries);
    return <p>No entries found or invalid data format.</p>;
  }

  // Function to handle image click for modal display
  const handleImageClick = (imageUrl, e) => {
    e.preventDefault(); // Prevent the default behavior of opening a new tab
    e.stopPropagation(); // Prevent event bubbling
    setSelectedImageUrl(imageUrl);
    setShowImageModal(true);
  };

  // Function to close the image modal
  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setSelectedImageUrl(null);
  };

  // Function to open entry detail modal
  const handleViewDetail = (entry) => {
    setDetailEntry(entry);
  };

  // Function to close entry detail modal
  const handleCloseDetail = () => {
    setDetailEntry(null);
  };

  // Function to handle share click
  const handleShareClick = (entry) => {
    setSelectedEntryForShare(entry);
    setShowSharedModal(true);
  };

  // Function to handle share confirmation
  const handleShareConfirm = async () => {
    if (!selectedEntryForShare) return;
    
    try {
      setSharingStatus({ isSharing: true, message: 'Sharing entry...', error: false });
      
      const response = await axios.post(
        `${API_BASE_URL}/journal/${id}/entries/${selectedEntryForShare.id}/share/`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        }
      );
      
      setSharingStatus({ 
        isSharing: false, 
        message: 'Entry shared successfully! It is now available in the community section.', 
        error: false 
      });
      
      // Close modal after a delay to show success message
      setTimeout(() => {
        setShowSharedModal(false);
        setSelectedEntryForShare(null);
        setSharingStatus({ isSharing: false, message: '', error: false });
      }, 2000);
      
    } catch (error) {
      console.error('Error sharing entry:', error);
      setSharingStatus({ 
        isSharing: false, 
        message: error.response?.data?.error || 'Failed to share entry. Please try again.', 
        error: true 
      });
    }
  };

  // Function to close share modal
  const handleCloseShareModal = () => {
    setShowSharedModal(false);
    setSelectedEntryForShare(null);
    setSharingStatus({ isSharing: false, message: '', error: false });
  };

  return (
    <div className="container-fluid mt-4">
      <Navbar />
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="card-title mb-0">Journal Entries for Journal {id}</h2>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAddNew}
              >
                Add New Entry
              </button>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive journal-entries-table-container">
                <table className="table table-hover mb-0 journal-entries-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Followed Strategy</th>
                      <th>Instrument</th>
                      <th>Direction</th>
                      <th>Outcome</th>
                      <th>Risk:Reward</th>
                      <th>P/L</th>
                      <th>Risk %</th>
                      <th>Risk Management</th>
                      <th>Feeling Before</th>
                      <th>Conf.</th>
                      <th>Feeling During</th>
                      <th>Conf.</th>
                      <th>Review</th>
                      <th>Rating</th>
                      <th>Images</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                  {entries.length === 0 ? (
                      <tr>
                        <td colSpan="17" className="text-center">No entries found. Add your first entry!</td>
                      </tr>
                    ) : (
                      entries.map((entry) => (
                        <tr key={entry.id}>
                          <td>{formatDate(entry.date)}</td>
                          <td>{entry.follow_strategy === true ? 'Yes' : entry.follow_strategy === false ? 'No' : ''}</td>
                          <td>{entry.instrument}</td>
                          <td>{entry.direction}</td>
                          <td>
                            <span className={`outcome-${entry.outcome.toLowerCase()}`}>
                              {entry.outcome}
                            </span>
                          </td>
                          <td>{entry.risk_reward_ratio || '-'}</td>
                          <td className={entry.profit_loss > 0 ? 'text-success' : entry.profit_loss < 0 ? 'text-danger' : ''}>
                            {formatNumber(entry.profit_loss)}
                          </td>
                          <td>{entry.risk_percent !== undefined && entry.risk_percent !== null && entry.risk_percent !== '' ? `${parseFloat(entry.risk_percent).toFixed(2)}%` : '-'}</td>
                          <td>
                            <div className="text-cell">
                              {entry.risk_management || '-'}
                            </div>
                          </td>
                          <td className="feeling-cell">
                            {entry.feeling_before || 'Neutral'}
                          </td>
                          <td className="number-column">
                            <div className="rating-display">
                              <span className="rating-number">
                                {entry.confidence_before || '5'}
                              </span>
                            </div>
                          </td>
                          <td className="feeling-cell">
                            {(() => {
                              // Handle various formats of feeling_during
                              if (typeof entry.feeling_during === 'string') {
                                return entry.feeling_during;
                              } 
                              else if (Array.isArray(entry.feeling_during)) {
                                if (entry.feeling_during.length > 0) {
                                  // Get first item if it's an array
                                  const feeling = entry.feeling_during[0];
                                  // Remove any quotes if it's a string with quotes
                                  return typeof feeling === 'string' ? feeling.replace(/['"[\]]/g, '') : feeling;
                                }
                              }
                              // Default fallback
                              return 'Neutral';
                            })()}
                          </td>
                          <td className="number-column">
                            <div className="rating-display">
                              <span className="rating-number">
                                {entry.confidence_during || '5'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="text-cell">
                              {entry.review || '-'}
                            </div>
                          </td>
                          <td className="number-column">
                            <div className="rating-display">
                              <span className="rating-number">
                                {entry.review_rating || '5'}
                              </span>
                            </div>
                          </td>
                          <td>
                            {entry.images && entry.images.length > 0 && (
                              <div className="d-flex flex-wrap">
                                {entry.images.slice(0, 2).map((image, idx) => (
                                  <img 
                                    key={idx}
                                    src={getFullImageUrl(image)}
                                    alt={`Trade image ${idx + 1}`}
                                    style={{ 
                                      width: '40px', 
                                      height: '40px', 
                                      objectFit: 'cover',
                                      margin: '2px',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                    }}
                                    onClick={(e) => handleImageClick(image, e)}
                                  />
                                ))}
                                {entry.images.length > 2 && (
                                  <span 
                                    className="badge bg-secondary"
                                    style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center',
                                      width: '40px', 
                                      height: '40px',
                                      margin: '2px',
                                      cursor: 'pointer'
                                    }}
                                    onClick={(e) => handleImageClick(entry.images[2], e)}
                                  >
                                    +{entry.images.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="action-button edit"
                                onClick={() => handleEdit(entry)}
                              >
                                Edit
                              </button>
                              <button
                                className="action-button delete"
                                onClick={() => handleDeleteClick(entry)}
                              >
                                Delete
                              </button>
                              <button
                                className="action-button view"
                                onClick={() => handleViewDetail(entry)}
                              >
                                View
                              </button>
                              <button
                                className="action-button share"
                                onClick={() => handleShareClick(entry)}
                              >
                                Share
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Add/Edit Entry Form */}
      {showModal && (
        <div
          className="modal"
          style={{
            display: 'block',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1050,
            overflowY: 'auto', // Allow scrolling for long forms
          }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editMode ? 'Edit Entry' : 'Add New Entry'}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseModal}
                ></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    {/* First column */}
                    <div className="col-md-6">
                      {/* Date Input */}
                      <div className="mb-3">
                        <label htmlFor="date" className="form-label">Date</label>
                        <input
                          type="date"
                          className="form-control"
                          id="date"
                          value={formData.date}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      
                      {/* Instrument Input */}
                      <div className="mb-3">
                        <label htmlFor="instrument" className="form-label">Instrument</label>
                        <input
                          type="text"
                          className="form-control"
                          id="instrument"
                          placeholder="Instrument"
                          value={formData.instrument}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      
                      {/* Direction Dropdown */}
                      <div className="mb-3">
                        <label htmlFor="direction" className="form-label">Direction</label>
                        <select
                          className="form-select"
                          id="direction"
                          value={formData.direction}
                          onChange={handleChange}
                          required
                        >
                          <option value="Buy">Buy</option>
                          <option value="Sell">Sell</option>
                        </select>
                      </div>
                      
                      {/* Outcome Dropdown */}
                      <div className="mb-3">
                        <label htmlFor="outcome" className="form-label">Outcome</label>
                        <select
                          className="form-select"
                          id="outcome"
                          value={formData.outcome}
                          onChange={handleChange}
                          required
                        >
                          <option value="Win">Win</option>
                          <option value="Loss">Loss</option>
                          <option value="Breakeven">Breakeven</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Second column */}
                    <div className="col-md-6">
                      {/* Risk-to-Reward Ratio Input */}
                      <div className="mb-3">
                        <label htmlFor="risk_reward_ratio" className="form-label">
                          Risk-to-Reward Ratio
                          <small className="text-muted ms-2">(e.g., 1.5 for 1:1.5)</small>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="risk_reward_ratio"
                          placeholder="Risk-to-Reward Ratio"
                          value={formData.risk_reward_ratio}
                          onChange={handleNumberChange}
                        />
                      </div>
                      
                      {/* Profit/Loss Input */}
                      <div className="mb-3">
                        <label htmlFor="profit_loss" className="form-label">
                          Profit/Loss
                          <small className="text-muted ms-2">(+ for profit, - for loss)</small>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="profit_loss"
                          placeholder="Profit/Loss Amount"
                          value={formData.profit_loss}
                          onChange={handleNumberChange}
                        />
                      </div>
                      
                      {/* Amount Risked (%) Input */}
                      <div className="mb-3">
                        <label>
                          Amount Risked (%)
                          <OverlayTrigger placement="right" overlay={<Tooltip>Enter the percentage of your account you risked on this trade.</Tooltip>}>
                            <span style={{cursor: 'pointer', marginLeft: 5, color: '#17a2b8'}}><i className="bi bi-info-circle"></i></span>
                          </OverlayTrigger>
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.risk_percent || ''}
                          min="0" max="100" step="0.01"
                          onChange={e => setFormData({ ...formData, risk_percent: e.target.value })}
                          placeholder="e.g. 1.5"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Feeling Before Trade */}
                  <div className="mb-3">
                    <label>
                      Feeling Before Trade
                      <OverlayTrigger placement="right" overlay={<Tooltip>How did you feel before placing the trade?</Tooltip>}>
                        <span style={{cursor: 'pointer', marginLeft: 5, color: '#17a2b8'}}><i className="bi bi-info-circle"></i></span>
                      </OverlayTrigger>
                    </label>
                    <div className="row align-items-center">
                      <div className="col-md-6">
                        <select 
                          className="form-select" 
                          value={formData.feeling_before}
                          onChange={(e) => setFormData({...formData, feeling_before: e.target.value})}
                        >
                          <option value="Hesitant">Hesitant</option>
                          <option value="Slightly hesitant">Slightly hesitant</option>
                          <option value="Neutral">Neutral</option>
                          <option value="Slightly confident">Slightly confident</option>
                          <option value="Very confident">Very confident</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <div className="d-flex align-items-center">
                          <label className="me-2 form-label mb-0">Confidence (1-10):</label>
                          <input 
                            type="number" 
                            className="form-control" 
                            min="1" 
                            max="10" 
                            value={formData.confidence_before}
                            onChange={(e) => {
                              console.log('Changing confidence before to:', e.target.value);
                              setFormData({...formData, confidence_before: Number(e.target.value)});
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <textarea 
                        className="form-control" 
                        value={feelingBefore} 
                        onChange={e => setFeelingBefore(e.target.value)} 
                        placeholder="Additional details about your feelings before the trade..." 
                      />
                    </div>
                  </div>
                  
                  {/* Feeling During Trade */}
                  <div className="mb-3">
                    <label>
                      Feeling During Trade
                      <OverlayTrigger placement="right" overlay={<Tooltip>How did you feel during the trade?</Tooltip>}>
                        <span style={{cursor: 'pointer', marginLeft: 5, color: '#17a2b8'}}><i className="bi bi-info-circle"></i></span>
                      </OverlayTrigger>
                    </label>
                    <div className="row align-items-center">
                      <div className="col-md-6">
                        <select 
                          className="form-select" 
                          value={formData.feeling_during}
                          onChange={(e) => {
                            console.log('Setting feeling during to:', e.target.value);
                            setFormData({...formData, feeling_during: e.target.value});
                          }}
                        >
                          <option value="Very worried">Very worried</option>
                          <option value="Worried">Worried</option>
                          <option value="Slightly worried">Slightly worried</option>
                          <option value="Neutral">Neutral</option>
                          <option value="Slightly confident">Slightly confident</option>
                          <option value="Very confident">Very confident</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <div className="d-flex align-items-center">
                          <label className="me-2 form-label mb-0">Confidence (1-10):</label>
                          <input 
                            type="number" 
                            className="form-control" 
                            min="1" 
                            max="10" 
                            value={formData.confidence_during}
                            onChange={(e) => {
                              console.log('Changing confidence during to:', e.target.value);
                              setFormData({...formData, confidence_during: Number(e.target.value)});
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <textarea 
                        className="form-control" 
                        value={feelingDuring} 
                        onChange={e => setFeelingDuring(e.target.value)} 
                        placeholder="Additional details about your feelings during the trade..." 
                      />
                    </div>
                  </div>
                  
                  {/* Review */}
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <label>Review (rate 1-10)</label>
                      <div className="d-flex align-items-center">
                        <label className="me-2 form-label mb-0">Rating:</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          style={{ width: '70px' }}
                          min="1" 
                          max="10" 
                          value={formData.review_rating}
                          onChange={(e) => {
                            console.log('Changing review rating to:', e.target.value);
                            setFormData({...formData, review_rating: Number(e.target.value)});
                          }}
                        />
                      </div>
                    </div>
                    <textarea 
                      className="form-control mt-2" 
                      value={review} 
                      onChange={e => setReview(e.target.value)} 
                      rows="3" 
                      placeholder="Review of your trade..."
                    />
                  </div>
                  
                  {/* Risk Management Input */}
                  <div className="mb-3">
                    <label htmlFor="risk_management" className="form-label">Risk Management Strategy</label>
                    <textarea
                      className="form-control"
                      id="risk_management"
                      placeholder="Risk Management"
                      value={formData.risk_management}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  {/* Follow Strategy Checkbox */}
                  <div className="mb-3 form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="follow_strategy"
                      checked={formData.follow_strategy}
                      onChange={(e) => setFormData({...formData, follow_strategy: e.target.checked})}
                    />
                    <label className="form-check-label" htmlFor="follow_strategy">
                      I followed my trading strategy for this trade
                    </label>
                  </div>
                  
                  {/* Additional Comments Input */}
                  <div className="mb-3">
                    <label htmlFor="additional_comments" className="form-label">Additional Comments</label>
                    <textarea
                      className="form-control"
                      id="additional_comments"
                      placeholder="Additional Comments"
                      value={formData.additional_comments}
                      onChange={handleChange}
                    />
                  </div>
                  
                  {/* Image Upload Section */}
                  <div className="mb-3">
                    <label className="form-label">Trade Images</label>
                    <ImageUploader 
                      images={selectedImages}
                      onImagesChange={handleImagesChange}
                    />
                  </div>
                  
                  <div className="d-flex justify-content-end">
                    <button 
                      type="button" 
                      className="btn btn-secondary me-2" 
                      onClick={handleCloseModal}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                    >
                      {editMode ? 'Update Entry' : 'Add Entry'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div
          className="modal"
          style={{
            display: 'block',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1050,
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleDeleteCancel}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this entry? This action cannot be undone.</p>
                <p><strong>Date:</strong> {entryToDelete?.date}</p>
                <p><strong>Instrument:</strong> {entryToDelete?.instrument}</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleDeleteCancel}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteConfirm}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      <ImageModal 
        imageUrl={selectedImageUrl} 
        isOpen={showImageModal} 
        onClose={handleCloseImageModal} 
      />

      {/* Share Preview Modal */}
      <SharePreviewModal
        entry={selectedEntryForShare}
        isOpen={showSharedModal}
        onClose={handleCloseShareModal}
        onConfirm={handleShareConfirm}
      />
      
      {/* Feedback message for sharing status */}
      {sharingStatus.message && (
        <div 
          className={`position-fixed bottom-0 end-0 p-3 m-3 alert ${sharingStatus.error ? 'alert-danger' : 'alert-success'}`}
          style={{ zIndex: 2000, maxWidth: '350px' }}
        >
          {sharingStatus.isSharing ? (
            <>
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              {sharingStatus.message}
            </>
          ) : (
            sharingStatus.message
          )}
        </div>
      )}

      {/* Entry Detail Modal */}
      {detailEntry && (
        <div
          className="entry-detail-modal"
          style={{
            display: 'block',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="entry-detail-content">
            <div className="entry-detail-header">
              <h5 className="mb-0">Trade on {formatDate(detailEntry.date)}</h5>
              <button
                type="button"
                className="entry-detail-close"
                onClick={handleCloseDetail}
              >
                &times;
              </button>
            </div>
            
            <div className="mb-4">
              <div className="d-flex align-items-center gap-3 mb-3">
                <div className={`outcome-${detailEntry.outcome.toLowerCase()}`} style={{ fontSize: '1.1rem' }}>
                  {detailEntry.outcome}
                </div>
                <div>
                  <strong>{detailEntry.direction}</strong> {detailEntry.instrument}
                </div>
                <div className={detailEntry.profit_loss > 0 ? 'text-success' : detailEntry.profit_loss < 0 ? 'text-danger' : ''} style={{ fontSize: '1.1rem', fontWeight: 500 }}>
                  {formatNumber(detailEntry.profit_loss)}
                </div>
              </div>
            </div>
            
            <div className="entry-detail-grid">
              <div className="entry-detail-item">
                <div className="entry-detail-label">Risk:Reward Ratio</div>
                <div className="entry-detail-value">{detailEntry.risk_reward_ratio || '-'}</div>
              </div>
              
              <div className="entry-detail-item">
                <div className="entry-detail-label">Risk %</div>
                <div className="entry-detail-value">
                  {detailEntry.risk_percent ? `${parseFloat(detailEntry.risk_percent).toFixed(2)}%` : '-'}
                </div>
              </div>
              
              <div className="entry-detail-item">
                <div className="entry-detail-label">Followed Strategy</div>
                <div className="entry-detail-value">
                  {detailEntry.follow_strategy === true ? 'Yes' : detailEntry.follow_strategy === false ? 'No' : '-'}
                </div>
              </div>
              
              <div className="entry-detail-item">
                <div className="entry-detail-label">Feeling Before</div>
                <div className="entry-detail-value d-flex align-items-center">
                  <span>{detailEntry.feeling_before || '-'}</span>
                  {detailEntry.confidence_before && (
                    <span className="rating-number ms-2">
                      {detailEntry.confidence_before}/10
                    </span>
                  )}
                </div>
              </div>
              
              <div className="entry-detail-item">
                <div className="entry-detail-label">Feeling During</div>
                <div className="entry-detail-value d-flex align-items-center">
                  <span>{detailEntry.feeling_during || '-'}</span>
                  {detailEntry.confidence_during && (
                    <span className="rating-number ms-2">
                      {detailEntry.confidence_during}/10
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="entry-detail-item" style={{ gridColumn: "1 / -1" }}>
                <div className="entry-detail-label">Risk Management</div>
                <div className="entry-detail-value" style={{ minHeight: '60px', whiteSpace: 'pre-wrap' }}>
                  {detailEntry.risk_management || '-'}
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="entry-detail-item" style={{ gridColumn: "1 / -1" }}>
                <div className="entry-detail-label d-flex align-items-center justify-content-between">
                  <span>Review</span>
                  {detailEntry.review_rating && (
                    <span className="rating-number">
                      Rating: {detailEntry.review_rating}/10
                    </span>
                  )}
                </div>
                <div className="entry-detail-value" style={{ minHeight: '100px', whiteSpace: 'pre-wrap' }}>
                  {detailEntry.review || '-'}
                </div>
              </div>
            </div>
            
            {detailEntry.images && detailEntry.images.length > 0 && (
              <div className="mt-4">
                <div className="entry-detail-label mb-2">Trade Images</div>
                <div className="entry-detail-images">
                  {detailEntry.images.map((image, idx) => (
                    <img 
                      key={idx}
                      src={getFullImageUrl(image)}
                      alt={`Trade image ${idx + 1}`}
                      className="entry-detail-image"
                      onClick={(e) => handleImageClick(image, e)}
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-4 d-flex justify-content-end">
              <button
                className="action-button edit me-2"
                onClick={() => {
                  handleCloseDetail();
                  handleEdit(detailEntry);
                }}
              >
                Edit Entry
              </button>
              <button
                className="action-button"
                onClick={handleCloseDetail}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{tableStyles}</style>
    </div>
  );
}

export default AddEntry;