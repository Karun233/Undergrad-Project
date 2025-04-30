import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/CommunityPage.css';
import Navbar from '../components/Navbar';

// Define API_BASE_URL consistent with other components
const API_BASE_URL = 'http://localhost:8000/api';

// Image Modal Component for community entries
function ImageModal({ imageUrl, isOpen, onClose }) {
  if (!isOpen) return null;
  
  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <div className="image-modal-content" onClick={e => e.stopPropagation()}>
        <button className="image-modal-close" onClick={onClose}>×</button>
        <img src={imageUrl} alt="Trade chart" className="image-modal-img" />
      </div>
    </div>
  );
}

function CommunityPage() {
  const [communityEntries, setCommunityEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const { journalId } = useParams();
  
  useEffect(() => {
    const fetchCommunityEntries = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/community-entries/`);
        // Ensure the data is always an array
        const entries = Array.isArray(response.data) ? response.data : [];
        setCommunityEntries(entries);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching community entries:', err);
        setError('Failed to load community entries. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchCommunityEntries();
  }, []);

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
    // Otherwise, prepend the API base URL
    return `${API_BASE_URL}${imagePath}`;
  };

  // Handle image click
  const handleImageClick = (image) => {
    setSelectedImage(getFullImageUrl(image));
    setShowImageModal(true);
  };

  // Close image modal
  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container mt-5">
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading community entries...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Navbar />
        <div className="container mt-5">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="community-page">
        <div className="container mt-4">
          <h1 className="mb-4">Community Trading Journal</h1>
          <p className="lead mb-4">
            Learn from the trading community! Browse anonymously shared trade entries from other traders.
          </p>

          {communityEntries.length === 0 ? (
            <div className="text-center py-5">
              <h3>No shared entries yet</h3>
              <p>Be the first to share your trading insights with the community!</p>
            </div>
          ) : (
            <div className="row">
              {communityEntries.map((entry) => (
                <div className="col-lg-6 mb-4" key={entry.id}>
                  <div className="card community-entry-card h-100">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">{entry.instrument}</h5>
                      <span className={`badge ${entry.outcome === 'Win' ? 'bg-success' : entry.outcome === 'Loss' ? 'bg-danger' : 'bg-secondary'}`}>
                        {entry.outcome}
                      </span>
                    </div>
                    <div className="card-body">
                      <div className="mb-3">
                        <small className="text-muted">Posted on {formatDate(entry.date)}</small>
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
                                  onClick={() => handleImageClick(image)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Image Modal */}
        <ImageModal 
          imageUrl={selectedImage}
          isOpen={showImageModal}
          onClose={handleCloseImageModal}
        />
      </div>
    </div>
  );
}

export default CommunityPage;
