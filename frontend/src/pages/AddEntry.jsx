import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
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
    
    console.log('Axios Request:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      data: config.data
    });
    
    return config;
  },
  error => {
    console.error('Axios Request Error:', error);
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  response => {
    console.log('Axios Response:', {
      status: response.status,
      headers: response.headers,
      data: response.data
    });
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

// Multi-select component for emotions
const EmotionMultiSelect = ({ selectedEmotions, onChange }) => {
  const emotions = [
    'Not worried',
    'Not really bothered',
    'Neutral',
    'A little worried',
    'Very uneasy'
  ];

  const toggleEmotion = (emotion) => {
    if (selectedEmotions.includes(emotion)) {
      onChange(selectedEmotions.filter(e => e !== emotion));
    } else {
      onChange([...selectedEmotions, emotion]);
    }
  };

  return (
    <div className="emotion-multiselect">
      {emotions.map(emotion => (
        <div 
          key={emotion} 
          className={`emotion-tag ${selectedEmotions.includes(emotion) ? 'selected' : ''}`}
          style={{
            display: 'inline-block',
            margin: '4px',
            padding: '6px 12px',
            borderRadius: '15px',
            backgroundColor: selectedEmotions.includes(emotion) ? '#007bff' : '#e9ecef',
            color: selectedEmotions.includes(emotion) ? 'white' : 'black',
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

function AddEntry() {
  const { id } = useParams(); // Get the journal ID from the URL
  console.log('Journal ID:', id);
  const [entries, setEntries] = useState([]); // State for journal entries
  const [showModal, setShowModal] = useState(false); // State for modal visibility
  const [editMode, setEditMode] = useState(false); // State to track if we're editing or creating
  const [currentEntryId, setCurrentEntryId] = useState(null); // Track the entry being edited
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // State for delete confirmation modal
  const [entryToDelete, setEntryToDelete] = useState(null); // Track the entry to delete
  
  const [formData, setFormData] = useState({
    date: '',
    instrument: '',
    direction: 'Buy', // Default value
    outcome: 'Win',   // Default value
    risk_management: '',
    feeling_during: [],
    additional_comments: '',
  });

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
        setEntries(Array.isArray(response.data) ? response.data : []);
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

  // Handle emotion selection changes
  const handleEmotionChange = (selectedEmotions) => {
    setFormData(prevData => ({
      ...prevData,
      feeling_during: selectedEmotions
    }));
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
    });
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
      date: '',
      instrument: '',
      direction: 'Buy',
      outcome: 'Win',
      risk_management: '',
      feeling_during: [],
      additional_comments: '',
    });
    setEditMode(false);
    setCurrentEntryId(null);
    setShowModal(false);
  };

  // Handle form submission (for both create and update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const entryData = {
        ...formData
      };
      
      if (editMode && currentEntryId) {
        // Update existing entry
        await axios.put(
          `${API_BASE_URL}/journal/${id}/entries/${currentEntryId}/update/`,
          entryData,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        alert('Entry updated successfully!');
      } else {
        // Create new entry
        await axios.post(
          `${API_BASE_URL}/journal/${id}/entries/create/`,
          entryData,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        alert('Entry added successfully!');
      }
      
      resetForm();

      // Refresh the entries list after submission
      const response = await axios.get(`${API_BASE_URL}/journal/${id}/entries/`);
      setEntries(response.data);
    } catch (error) {
      console.error('Error with entry:', error);
      console.error('Error response:', error.response);
      alert(`Error: ${error.response?.data?.detail || 'Failed to process entry'}`);
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

  // Ensure entries is an array before rendering
  if (!Array.isArray(entries)) {
    console.error('Entries is not an array:', entries);
    return <p>No entries found or invalid data format.</p>;
  }

  return (
    <div className="container mt-4">
      <Navbar />
      <h2>Journal Entries for Journal {id}</h2>

      {/* Button to open the modal for adding a new entry */}
      <button
        className="btn btn-primary mb-4"
        onClick={handleAddNew}
      >
        Add New Entry
      </button>

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
          }}
        >
          <div className="modal-dialog">
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
                  
                  {/* Risk Management Input */}
                  <div className="mb-3">
                    <label htmlFor="risk_management" className="form-label">Risk Management</label>
                    <textarea
                      className="form-control"
                      id="risk_management"
                      placeholder="Risk Management"
                      value={formData.risk_management}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  {/* Feeling During Multi-Select */}
                  <div className="mb-3">
                    <label className="form-label">Feeling During Trade</label>
                    <EmotionMultiSelect 
                      selectedEmotions={formData.feeling_during}
                      onChange={handleEmotionChange}
                    />
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
                  
                  <button type="submit" className="btn btn-primary">{editMode ? 'Update Entry' : 'Add Entry'}</button>
                  <button type="button" className="btn btn-secondary ms-2" onClick={handleCloseModal}>Cancel</button>
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

      {/* Display Journal Entries in a Table */}
      <table className="table table-striped table-bordered">
        <thead>
          <tr>
            <th>Date</th>
            <th>Instrument</th>
            <th>Direction</th>
            <th>Outcome</th>
            <th>Risk Management</th>
            <th>Feeling During</th>
            <th>Additional Comments</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan="8" className="text-center">No entries found. Add your first entry!</td>
            </tr>
          ) : (
            entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.date}</td>
                <td>{entry.instrument}</td>
                <td>{entry.direction}</td>
                <td>{entry.outcome}</td>
                <td>{entry.risk_management}</td>
                <td>
                  {entry.feeling_during && entry.feeling_during.map((feeling, idx) => (
                    <span 
                      key={idx} 
                      className="badge bg-primary me-1"
                      style={{ 
                        borderRadius: '12px', 
                        padding: '5px 10px',
                        margin: '2px'
                      }}
                    >
                      {feeling}
                    </span>
                  ))}
                </td>
                <td>{entry.additional_comments}</td>
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
  );
}

export default AddEntry;