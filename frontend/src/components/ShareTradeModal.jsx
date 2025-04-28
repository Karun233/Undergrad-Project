import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const ACCESS_TOKEN = localStorage.getItem('access_token');

const ShareTradeModal = ({ open, onClose, journalId, entryId, entryData }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({
    show: false,
    message: '',
    type: 'success'
  });

  const handleShare = async () => {
    try {
      setLoading(true);
      
      // Clear any previous alerts
      setAlert({
        show: false,
        message: '',
        type: 'success'
      });
      
      const response = await axios.post(
        `${API_BASE_URL}/api/journal/${journalId}/entries/${entryId}/share/`,
        {
          title: title.trim() || undefined, // If title is empty, backend will use default
          description: description.trim() || undefined // If description is empty, backend will use default
        },
        {
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setAlert({
        show: true,
        message: 'Trade shared successfully to the community!',
        type: 'success'
      });
      
      // Reset form and close modal
      setTitle('');
      setDescription('');
      
      // Wait a moment to show success message before closing
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error('Error sharing trade:', error);
      
      let errorMessage = 'Failed to share trade. Please try again.';
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setAlert({
        show: true,
        message: errorMessage,
        type: 'danger'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAlert = () => {
    setAlert({
      ...alert,
      show: false
    });
  };

  // Create summary of trade for preview
  const renderTradePreview = () => {
    if (!entryData) return null;
    
    return (
      <div className="border rounded p-3 mb-3 bg-light">
        <h6 className="mb-2">Trade Preview (visible to community):</h6>
        
        <div className="d-flex flex-wrap gap-3">
          <div>
            <small className="text-muted d-block">Symbol:</small>
            <span>{entryData.instrument}</span>
          </div>
          
          <div>
            <small className="text-muted d-block">Direction:</small>
            <span className={entryData.direction === 'BUY' ? 'text-success' : 'text-danger'}>
              {entryData.direction}
            </span>
          </div>
          
          <div>
            <small className="text-muted d-block">Outcome:</small>
            <span className={entryData.outcome === 'WIN' ? 'text-success' : 'text-danger'}>
              {entryData.outcome}
            </span>
          </div>
          
          <div>
            <small className="text-muted d-block">Date:</small>
            <span>{entryData.date}</span>
          </div>
          
          {entryData.profit_loss && (
            <div>
              <small className="text-muted d-block">P/L:</small>
              <span>{entryData.profit_loss}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!open) return null;

  return (
    <>
      <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Share Trade to Community</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            
            <div className="modal-body">
              <p className="text-muted">
                Share your trade anonymously with the trading community. Other traders can view, comment, and rate your trade.
              </p>
              
              {renderTradePreview()}
              
              <div className="mb-3">
                <label htmlFor="title" className="form-label">Title (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  id="title"
                  placeholder="E.g., 'My Best AAPL Trade' or 'Breakout Strategy Success'"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              
              <div className="mb-3">
                <label htmlFor="description" className="form-label">Description (Optional)</label>
                <textarea
                  className="form-control"
                  id="description"
                  rows="4"
                  placeholder="Share your thoughts, strategy, or lessons learned from this trade..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>
              
              <small className="text-muted">
                Note: Your username will not be shared. All posts are anonymous.
              </small>
            </div>
            
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleShare}
                disabled={loading}
              >
                {loading ? 'Sharing...' : 'Share to Community'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {alert.show && (
        <div className={`position-fixed bottom-0 end-0 p-3`} style={{ zIndex: 11 }}>
          <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
            {alert.message}
            <button type="button" className="btn-close" onClick={handleCloseAlert}></button>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareTradeModal;
