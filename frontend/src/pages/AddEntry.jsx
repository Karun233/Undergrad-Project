import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
// Import your token constants
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import Navbar from '../components/Navbar';

const API_BASE_URL = 'http://localhost:8000/api';

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
        src={imageUrl}
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
              src={typeof image === 'string' ? image : URL.createObjectURL(image)} 
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

function AddEntry() {
  const { id } = useParams(); // Get the journal ID from the URL
  console.log('Journal ID:', id);
  const [entries, setEntries] = useState([]); // State for journal entries
  const [showModal, setShowModal] = useState(false); // State for modal visibility
  const [editMode, setEditMode] = useState(false); // State to track if we're editing or creating
  const [currentEntryId, setCurrentEntryId] = useState(null); // Track the entry being edited
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // State for delete confirmation modal
  const [entryToDelete, setEntryToDelete] = useState(null); // Track the entry to delete
  const [selectedImages, setSelectedImages] = useState([]); // State for selected images
  const [isSubmitting, setIsSubmitting] = useState(false); // Track form submission state
  const [showImageModal, setShowImageModal] = useState(false); // State for image modal visibility
  const [selectedImageUrl, setSelectedImageUrl] = useState(null); // Track the selected image URL
  
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
  });

  const [feelingBefore, setFeelingBefore] = useState('');
  const [feelingDuring, setFeelingDuring] = useState('');
  const [review, setReview] = useState('');

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
    setFormData({
      date: entry.date,
      instrument: entry.instrument,
      direction: entry.direction,
      outcome: entry.outcome,
      risk_management: entry.risk_management,
      feeling_during: entry.feeling_during || [],
      additional_comments: entry.additional_comments || '',
      risk_reward_ratio: entry.risk_reward_ratio || '',
      profit_loss: entry.profit_loss || '',
      risk_percent: entry.risk_percent || '',
    });
    
    // Set selected images to the existing images from the entry
    setSelectedImages(entry.images || []);
    setCurrentEntryId(entry.id);
    setEditMode(true);
    setShowModal(true);
  };

  // Handle delete confirmation
  const handleDeleteClick = (entry) => {
    setEntryToDelete(entry);
    setShowDeleteConfirm(true);
  };

  // Execute delete after confirmation
  const confirmDelete = async () => {
    if (!entryToDelete) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/journal/${id}/entries/${entryToDelete.id}/delete/`);
      // Remove the deleted entry from the local state
      setEntries(entries.filter(entry => entry.id !== entryToDelete.id));
      setShowDeleteConfirm(false);
      setEntryToDelete(null);
      alert('Entry deleted successfully!');
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert(`Error: ${error.response?.data?.detail || 'Failed to delete entry'}`);
    }
  };

  // Reset form and modal state
  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().slice(0, 10), // Current date in YYYY-MM-DD format
      instrument: '',
      direction: 'Buy',
      outcome: 'Win',
      risk_management: '',
      follow_strategy: true, // Default to true for following strategy
      feeling_before: '',
      feeling_during_text: '',
      review: '',
      risk_percent: '',
      risk_reward_ratio: '',
      profit_loss: '',
      additional_comments: '',
    });
    setSelectedImages([]);
    setFeelingBefore('');
    setFeelingDuring('');
    setReview('');
    setEditMode(false);
    setCurrentEntryId(null);
    setShowModal(false);
    setIsSubmitting(false);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    
    try {
      // Create FormData object to handle file uploads
      const formDataToSend = new FormData();
      
      // Append text data
      Object.keys(formData).forEach(key => {
        if (key === 'feeling_during') {
          // Handle array data by converting to JSON string
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else if (formData[key] !== null && formData[key] !== undefined) {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      // Append new fields
      formDataToSend.append('feeling_before', feelingBefore);
      formDataToSend.append('feeling_during_text', feelingDuring);
      formDataToSend.append('review', review);
      
      // Append image files if there are any new image files (not URLs)
      const newImageFiles = selectedImages.filter(image => typeof image !== 'string');
      console.log(`Adding ${newImageFiles.length} new image files`);
      
      newImageFiles.forEach((image, index) => {
        if (image && image instanceof File && image.type.startsWith('image/')) {
          formDataToSend.append('images', image);
          console.log(`Appended image ${index}: ${image.name}, type: ${image.type}, size: ${image.size} bytes`);
        } else {
          console.warn(`Skipped invalid image at index ${index}:`, image);
        }
      });
      
      // Append existing image URLs
      const existingImageUrls = selectedImages.filter(image => typeof image === 'string');
      console.log(`Adding ${existingImageUrls.length} existing image URLs`);
      if (existingImageUrls.length > 0) {
        formDataToSend.append('existing_images', JSON.stringify(existingImageUrls));
      }
      
      // Debug output FormData contents
      console.log('FormData contents:');
      for (let pair of formDataToSend.entries()) {
        console.log(`${pair[0]}: ${typeof pair[1] === 'object' ? 'File object' : pair[1]}`);
      }
      
      let response;
      
      if (editMode && currentEntryId) {
        // Update existing entry
        console.log(`Updating entry ${currentEntryId} for journal ${id}`);
        response = await axios.put(
          `${API_BASE_URL}/journal/${id}/entries/${currentEntryId}/update/`,
          formDataToSend,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        console.log('Update response:', response.data);
        alert('Entry updated successfully!');
      } else {
        // Create new entry
        console.log(`Creating new entry for journal ${id}`);
        response = await axios.post(
          `${API_BASE_URL}/journal/${id}/entries/create/`,
          formDataToSend,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        console.log('Create response:', response.data);
        alert('Entry added successfully!');
      }
      
      resetForm();

      // Refresh the entries list after submission
      const entriesResponse = await axios.get(`${API_BASE_URL}/journal/${id}/entries/`);
      setEntries(entriesResponse.data);
    } catch (error) {
      console.error('Error with entry:', error);
      
      if (error.response) {
        console.error('Error status:', error.response.status);
        console.error('Error data:', error.response.data);
        // More detailed error information
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
    } finally {
      setIsSubmitting(false);
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
              <div className="table-responsive">
                <table className="table table-hover mb-0 journal-entries-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Followed Strategy</th>
                      <th>Instrument</th>
                      <th>Direction</th>
                      <th>Outcome</th>
                      <th>Risk:Reward</th>
                      <th>P&L</th>
                      <th>Risk %</th>
                      <th>Risk Management</th>
                      <th>Feeling Before</th>
                      <th>Feeling During</th>
                      <th>Review</th>
                      <th>Images</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                  {entries.length === 0 ? (
                      <tr>
                        <td colSpan="14" className="text-center">No entries found. Add your first entry!</td>
                      </tr>
                    ) : (
                      entries.map((entry) => (
                        <tr key={entry.id}>
                          <td>{formatDate(entry.date)}</td>
                          <td>{entry.follow_strategy === true ? 'Yes' : entry.follow_strategy === false ? 'No' : ''}</td>
                          <td>{entry.instrument}</td>
                          <td>{entry.direction}</td>
                          <td>{entry.outcome}</td>
                          <td>{entry.risk_reward_ratio || ''}</td>
                          <td className={entry.profit_loss > 0 ? 'text-success' : entry.profit_loss < 0 ? 'text-danger' : ''}>
                            {formatNumber(entry.profit_loss)}
                          </td>
                          <td>{entry.risk_percent !== undefined && entry.risk_percent !== null && entry.risk_percent !== '' ? `${parseFloat(entry.risk_percent).toFixed(2)}%` : ''}</td>
                          <td>{entry.risk_management}</td>
                          <td>{entry.feeling_before}</td>
                          <td>{entry.feeling_during_text}</td>
                          <td>{entry.review}</td>
                          <td>
                            {entry.images && entry.images.length > 0 && (
                              <div className="d-flex flex-wrap">
                                {entry.images.slice(0, 2).map((image, idx) => (
                                  <img 
                                    key={idx}
                                    src={image}
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
                            <div className="btn-group" role="group">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEdit(entry)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger ms-1"
                                onClick={() => handleDeleteClick(entry)}
                              >
                                Delete
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
                      <OverlayTrigger placement="right" overlay={<Tooltip>How did you feel before placing the trade? Scared? Hesitant or calm? Please detail.</Tooltip>}>
                        <span style={{cursor: 'pointer', marginLeft: 5, color: '#17a2b8'}}><i className="bi bi-info-circle"></i></span>
                      </OverlayTrigger>
                    </label>
                    <textarea 
                      className="form-control" 
                      value={feelingBefore} 
                      onChange={e => setFeelingBefore(e.target.value)} 
                      placeholder="Describe your feelings before the trade..." 
                    />
                  </div>
                  
                  {/* Feeling During Trade */}
                  <div className="mb-3">
                    <label>
                      Feeling During Trade
                      <OverlayTrigger placement="right" overlay={<Tooltip>How did you feel during the trade? Were you monitoring constantly, anxious, or relaxed? Please detail.</Tooltip>}>
                        <span style={{cursor: 'pointer', marginLeft: 5, color: '#17a2b8'}}><i className="bi bi-info-circle"></i></span>
                      </OverlayTrigger>
                    </label>
                    <textarea 
                      className="form-control" 
                      value={feelingDuring} 
                      onChange={e => setFeelingDuring(e.target.value)} 
                      placeholder="Describe your feelings during the trade..." 
                    />
                  </div>
                  
                  {/* Review */}
                  <div className="mb-3">
                    <label>
                      Review
                      <OverlayTrigger placement="right" overlay={<Tooltip>Reflect on your emotions and decision after the trade. Regretful, proud, or something else?</Tooltip>}>
                        <span style={{cursor: 'pointer', marginLeft: 5, color: '#17a2b8'}}><i className="bi bi-info-circle"></i></span>
                      </OverlayTrigger>
                    </label>
                    <textarea 
                      className="form-control" 
                      value={review} 
                      onChange={e => setReview(e.target.value)} 
                      placeholder="Reflect on the trade and your emotions after it..." 
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
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          {editMode ? 'Updating...' : 'Adding...'}
                        </>
                      ) : (
                        editMode ? 'Update Entry' : 'Add Entry'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
                  onClick={() => setShowDeleteConfirm(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this entry? This action cannot be undone.</p>
                <p><strong>Date:</strong> {entryToDelete?.date}</p>
                <p><strong>Instrument:</strong> {entryToDelete?.instrument}</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={confirmDelete}>
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
    </div>
  );
}

export default AddEntry;