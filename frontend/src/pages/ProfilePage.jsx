import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";

const API_BASE_URL = 'http://localhost:8000/api';

function Profile() {
  const navigate = useNavigate();
  
  // User data state
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    profile_picture: null
  });
  
  // Form states
  const [usernameForm, setUsernameForm] = useState({ username: '', password: '' });
  const [passwordForm, setPasswordForm] = useState({ 
    current_password: '', 
    new_password: '', 
    confirm_password: '' 
  });
  const [deleteForm, setDeleteForm] = useState({ password: '' });
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // File upload reference
  const fileInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`${API_BASE_URL}/user/profile/`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN)}`
          }
        });
        
        console.log('User profile data:', response.data);
        setUserData(response.data);
        setUsernameForm({ username: response.data.username, password: '' });
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Failed to load user data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);
  
  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);
  
  // Handle username form changes
  const handleUsernameChange = (e) => {
    setUsernameForm({ ...usernameForm, [e.target.name]: e.target.value });
  };
  
  // Handle password form changes
  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };
  
  // Handle delete form changes
  const handleDeleteChange = (e) => {
    setDeleteForm({ ...deleteForm, [e.target.name]: e.target.value });
  };
  
  // Handle profile picture selection
  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };
  
  // Open file dialog
  const openFileDialog = () => {
    fileInputRef.current.click();
  };
  
  // Handle username update submission
  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      await axios.put(`${API_BASE_URL}/user/update-username/`, usernameForm, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN)}`
        }
      });
      
      setUserData({ ...userData, username: usernameForm.username });
      setSuccessMessage('Username updated successfully!');
      setUsernameForm({ ...usernameForm, password: '' });
    } catch (error) {
      console.error('Error updating username:', error);
      setError(error.response?.data?.detail || 'Failed to update username.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle password update submission
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError("New passwords don't match.");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      await axios.put(`${API_BASE_URL}/user/update-password/`, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN)}`
        }
      });
      
      setSuccessMessage('Password updated successfully!');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      console.error('Error updating password:', error);
      setError(error.response?.data?.detail || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle profile picture upload
  const handleImageUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedImage) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      const formData = new FormData();
      formData.append('profile_picture', selectedImage);
      
      const response = await axios.put(`${API_BASE_URL}/user/update-profile-picture/`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN)}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setUserData({ ...userData, profile_picture: response.data.profile_picture });
      setSuccessMessage('Profile picture updated successfully!');
      setSelectedImage(null);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setError(error.response?.data?.detail || 'Failed to upload profile picture.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle account deletion
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      await axios.delete(`${API_BASE_URL}/user/delete-account/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN)}`
        },
        data: { password: deleteForm.password }
      });
      
      // Clear local storage and redirect to login
      localStorage.removeItem(ACCESS_TOKEN);
      localStorage.removeItem(REFRESH_TOKEN);
      navigate('/login');
    } catch (error) {
      console.error('Error deleting account:', error);
      setError(error.response?.data?.detail || 'Failed to delete account.');
      setShowDeleteConfirm(false);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <Navbar />
      <div className="container mt-4">
        <h2>Profile Settings</h2>
        
        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            {error}
            <button type="button" className="btn-close" onClick={() => setError(null)}></button>
          </div>
        )}
        
        {successMessage && (
          <div className="alert alert-success alert-dismissible fade show" role="alert">
            {successMessage}
            <button type="button" className="btn-close" onClick={() => setSuccessMessage(null)}></button>
          </div>
        )}
        
        <div className="row">
          <div className="col-md-4 mb-4">
            <div className="card">
              <div className="card-body text-center">
                <div className="mb-3">
                  {userData.profile_picture ? (
                    <img 
                      src={userData.profile_picture} 
                      alt="Profile" 
                      className="rounded-circle img-fluid" 
                      style={{ width: '150px', height: '150px', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div 
                      className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mx-auto" 
                      style={{ width: '150px', height: '150px' }}
                    >
                      <span className="text-white" style={{ fontSize: '3rem' }}>
                        {userData.username ? userData.username.charAt(0).toUpperCase() : '?'}
                      </span>
                    </div>
                  )}
                </div>
                
                <h5 className="card-title mb-3">{userData.username || "Loading..."}</h5>
                <p className="text-muted">{userData.email || ""}</p>
                
                <form onSubmit={handleImageUpload}>
                  <div className="mb-3">
                    <input 
                      type="file" 
                      className="d-none" 
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageSelect}
                    />
                    
                    <button 
                      type="button" 
                      className="btn btn-outline-primary w-100"
                      onClick={openFileDialog}
                    >
                      Select New Picture
                    </button>
                  </div>
                  
                  {selectedImage && (
                    <div className="mb-3">
                      <div className="mb-2">
                        <small>Selected: {selectedImage.name}</small>
                      </div>
                      <button 
                        type="submit" 
                        className="btn btn-primary w-100"
                        disabled={loading}
                      >
                        {loading ? 'Uploading...' : 'Upload Picture'}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
          
          <div className="col-md-8">
            <div className="card mb-4">
              <div className="card-header">Update Username</div>
              <div className="card-body">
                <form onSubmit={handleUsernameSubmit}>
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label">New Username</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="username" 
                      name="username"
                      value={usernameForm.username}
                      onChange={handleUsernameChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">Confirm with Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      id="password" 
                      name="password"
                      value={usernameForm.password}
                      onChange={handleUsernameChange}
                      required
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Update Username'}
                  </button>
                </form>
              </div>
            </div>
            
            <div className="card mb-4">
              <div className="card-header">Change Password</div>
              <div className="card-body">
                <form onSubmit={handlePasswordSubmit}>
                  <div className="mb-3">
                    <label htmlFor="current_password" className="form-label">Current Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      id="current_password" 
                      name="current_password"
                      value={passwordForm.current_password}
                      onChange={handlePasswordChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="new_password" className="form-label">New Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      id="new_password" 
                      name="new_password"
                      value={passwordForm.new_password}
                      onChange={handlePasswordChange}
                      required
                      minLength="8"
                    />
                    <small className="form-text text-muted">
                      Password must be at least 8 characters long.
                    </small>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="confirm_password" className="form-label">Confirm New Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      id="confirm_password" 
                      name="confirm_password"
                      value={passwordForm.confirm_password}
                      onChange={handlePasswordChange}
                      required
                      minLength="8"
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Change Password'}
                  </button>
                </form>
              </div>
            </div>
            
            <div className="card mb-4 border-danger">
              <div className="card-header bg-danger text-white">Danger Zone</div>
              <div className="card-body">
                <h5 className="card-title">Delete Account</h5>
                <p className="card-text">
                  This action cannot be undone. All your data will be permanently deleted.
                </p>
                
                <button 
                  type="button" 
                  className="btn btn-outline-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Account Deletion</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowDeleteConfirm(false)}
                ></button>
              </div>
              
              <div className="modal-body">
                <p className="text-danger">
                  Warning: This action cannot be undone. All your data will be permanently deleted.
                </p>
                
                <form onSubmit={handleDeleteAccount}>
                  <div className="mb-3">
                    <label htmlFor="delete_password" className="form-label">Enter your password to confirm</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      id="delete_password" 
                      name="password"
                      value={deleteForm.password}
                      onChange={handleDeleteChange}
                      required
                    />
                  </div>
                  
                  <div className="d-flex justify-content-end">
                    <button 
                      type="button" 
                      className="btn btn-secondary me-2"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </button>
                    
                    <button 
                      type="submit" 
                      className="btn btn-danger"
                      disabled={loading}
                    >
                      {loading ? 'Deleting...' : 'Permanently Delete Account'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;