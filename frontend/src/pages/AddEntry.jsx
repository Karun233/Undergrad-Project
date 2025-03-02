import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
// Import your token constants
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";

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

function AddEntry() {
  const { id } = useParams(); // Get the journal ID from the URL
  console.log('Journal ID:', id);
  const [entries, setEntries] = useState([]); // State for journal entries
  const [showModal, setShowModal] = useState(false); // State for modal visibility
  const [formData, setFormData] = useState({
    date: '',
    instrument: '',
    direction: '',
    outcome: '',
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
    setFormData((prevData) => ({
      ...prevData,
      [id]: id === 'feeling_during' ? value.split(',') : value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const entryData = {
        ...formData,
        feeling_during: formData.feeling_during,
      };
      
      // The interceptor will handle the token refresh if needed
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
      setFormData({
        date: '',
        instrument: '',
        direction: '',
        outcome: '',
        risk_management: '',
        feeling_during: [],
        additional_comments: '',
      });
      setShowModal(false);

      // Refresh the entries list after submission
      const response = await axios.get(`${API_BASE_URL}/journal/${id}/entries/`);
      setEntries(response.data);
    } catch (error) {
      console.error('Error adding entry:', error);
      console.error('Error response:', error.response);
      alert(`Error: ${error.response?.data?.detail || 'Failed to add entry'}`);
    }
  };

  // Ensure entries is an array before rendering
  if (!Array.isArray(entries)) {
    console.error('Entries is not an array:', entries);
    return <p>No entries found or invalid data format.</p>;
  }

  return (
    <div className="container mt-4">
      <h2>Add entries to your Journal {id}</h2>

      {/* Button to open the modal */}
      <button
        className="btn btn-primary mb-4"
        onClick={() => setShowModal(true)}
      >
        Add New Entry
      </button>

      {/* Bootstrap Modal for Add Entry Form */}
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
                <h5 className="modal-title">Add New Entry</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
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
                  {/* Direction Input */}
                  <div className="mb-3">
                    <label htmlFor="direction" className="form-label">Direction</label>
                    <input
                      type="text"
                      className="form-control"
                      id="direction"
                      placeholder="Direction"
                      value={formData.direction}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  {/* Outcome Input */}
                  <div className="mb-3">
                    <label htmlFor="outcome" className="form-label">Outcome</label>
                    <input
                      type="text"
                      className="form-control"
                      id="outcome"
                      placeholder="Outcome"
                      value={formData.outcome}
                      onChange={handleChange}
                      required
                    />
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
                  {/* Feeling During Input */}
                  <div className="mb-3">
                    <label htmlFor="feeling_during" className="form-label">Feeling During</label>
                    <input
                      type="text"
                      className="form-control"
                      id="feeling_during"
                      placeholder="Feeling During"
                      value={formData.feeling_during.join(', ')}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          feeling_during: e.target.value.split(',').map((s) => s.trim()),
                        })
                      }
                      required
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
                  <button type="submit" className="btn btn-primary">Add Entry</button>
                </form>
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
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.date}</td>
              <td>{entry.instrument}</td>
              <td>{entry.direction}</td>
              <td>{entry.outcome}</td>
              <td>{entry.risk_management}</td>
              <td>{entry.feeling_during.join(', ')}</td>
              <td>{entry.additional_comments}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AddEntry;