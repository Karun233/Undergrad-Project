import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { format } from 'date-fns';

// Constants
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const ACCESS_TOKEN = localStorage.getItem('access_token');

// Main component
const CommunityPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('community');
  const [posts, setPosts] = useState([]);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    instrument: '',
    outcome: '',
    direction: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [userRating, setUserRating] = useState(0);

  // Fetch all community posts
  const fetchCommunityPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let url = `${API_BASE_URL}/api/community/posts/`;
      
      // Add filters if they exist
      const params = new URLSearchParams();
      if (filters.instrument) params.append('instrument', filters.instrument);
      if (filters.outcome) params.append('outcome', filters.outcome);
      if (filters.direction) params.append('direction', filters.direction);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        }
      });
      
      // Ensure all posts have the necessary properties
      const formattedPosts = (response.data || []).map(post => {
        // Ensure entry_data exists
        if (!post.entry_data) {
          post.entry_data = {};
        }
        
        return post;
      });
      
      setPosts(formattedPosts);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching community posts:', err);
      setError('Failed to load community posts. Please try again.');
      setLoading(false);
    }
  };

  // Fetch user's posts
  const fetchUserPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_BASE_URL}/api/community/my-posts/`, {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        }
      });
      
      // Ensure all posts have the necessary properties
      const formattedPosts = (response.data || []).map(post => {
        // Ensure entry_data exists
        if (!post.entry_data) {
          post.entry_data = {};
        }
        
        return post;
      });
      
      setUserPosts(formattedPosts);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching user posts:', err);
      setError('Failed to load your posts. Please try again.');
      setLoading(false);
    }
  };

  // Fetch post details
  const fetchPostDetails = async (postId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/community/posts/${postId}/`,
        {
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`
          }
        }
      );
      
      setSelectedPost(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching post details:', err);
      setError('Failed to load post details. Please try again.');
      setLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'community') {
      fetchCommunityPosts();
    } else if (tab === 'my-posts') {
      fetchUserPosts();
    }
  };

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters({
      ...filters,
      [filterName]: value,
    });
  };

  // Apply filters
  const applyFilters = () => {
    fetchCommunityPosts();
    setShowFilters(false);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      instrument: '',
      outcome: '',
      direction: '',
    });
    fetchCommunityPosts();
    setShowFilters(false);
  };

  // Handle opening post details
  const handleOpenPostDetails = (postId) => {
    setError(null); // Clear any previous errors
    setSelectedPost(null); // Clear previous post data while loading
    setCommentText(''); // Reset comment text
    setLoading(true); // Show loading state
    fetchPostDetails(postId);
  };

  // Handle closing post details
  const handleClosePostDetails = () => {
    setSelectedPost(null);
    setCommentText('');
    setUserRating(0);
  };

  // Handle submit comment
  const handleSubmitComment = async () => {
    if (!commentText.trim() || !selectedPost) return;
    
    try {
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}/api/community/posts/${selectedPost.id}/comment/`, 
        { content: commentText.trim() },
        {
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Refresh post details to show the new comment
      await fetchPostDetails(selectedPost.id);
      setCommentText('');
      setLoading(false);
    } catch (err) {
      console.error('Error submitting comment:', err);
      let errorMessage = 'Failed to submit comment. Please try again.';
      if (err.response && err.response.data && err.response.data.error) {
        errorMessage = err.response.data.error;
      }
      alert(errorMessage);
      setLoading(false);
    }
  };

  // Handle submit rating
  const handleSubmitRating = async (newValue) => {
    if (!selectedPost) return;
    
    try {
      await axios.post(
        `${API_BASE_URL}/api/community/posts/${selectedPost.id}/rate/`,
        { rating: newValue },
        {
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`
          }
        }
      );
      
      // Refresh post details to show the updated rating
      fetchPostDetails(selectedPost.id);
    } catch (err) {
      console.error('Error submitting rating:', err);
    }
  };

  // Handle delete post
  const handleDeletePost = async (postId) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/community/posts/${postId}/delete/`, {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        }
      });
      
      // Remove the deleted post from the list
      if (activeTab === 'community') {
        setPosts(posts.filter(post => post.id !== postId));
      } else {
        setUserPosts(userPosts.filter(post => post.id !== postId));
      }
      
      // Close the post details if it's open
      if (selectedPost && selectedPost.id === postId) {
        handleClosePostDetails();
      }
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchCommunityPosts();
  }, []);

  // Safe date formatting
  const formatDateSafe = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), "EEEE, do MMMM yyyy");
    } catch (error) {
      console.error("Date formatting error:", error);
      return dateString || 'N/A';
    }
  };

  // Render post card
  const renderPostCard = (post, isUserPost = false) => {
    if (!post) return null;
    
    const { id, title, description, username, created_at, average_rating, rating_count, comment_count, entry_data } = post;
    
    // Safety check for entry_data
    if (!entry_data) {
      return (
        <div className="card mb-3" key={id || 'unknown'}>
          <div className="card-body">
            <h5 className="card-title">{title || 'Untitled Post'}</h5>
            <p className="card-text">{description || 'No description available'}</p>
            <div className="text-muted">Data unavailable</div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="card mb-3" key={id || 'unknown'}>
        <div className="card-body">
          <h5 className="card-title">{title || 'Untitled Post'}</h5>
          
          <div className="d-flex justify-content-between mb-2">
            <small className="text-muted">Posted by: Anonymous</small>
            <small className="text-muted">{formatDateSafe(created_at)}</small>
          </div>
          
          <p className="card-text">{description || 'No description available'}</p>
          
          <div className="d-flex flex-wrap mb-3">
            {entry_data.instrument && (
              <span className="badge bg-light text-dark me-2 mb-1">Symbol: {entry_data.instrument}</span>
            )}
            {entry_data.direction && (
              <span className={`badge ${entry_data.direction === 'BUY' ? 'bg-success' : 'bg-danger'} me-2 mb-1`}>
                Direction: {entry_data.direction}
              </span>
            )}
            {entry_data.outcome && (
              <span className={`badge ${entry_data.outcome === 'WIN' ? 'bg-success' : 'bg-danger'} me-2 mb-1`}>
                Outcome: {entry_data.outcome}
              </span>
            )}
            {entry_data.date && (
              <span className="badge bg-light text-dark me-2 mb-1">Date: {entry_data.date}</span>
            )}
          </div>
          
          <div className="d-flex align-items-center mb-2">
            <div className="star-rating me-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <i 
                  key={i} 
                  className={`bi ${i < Math.round(average_rating || 0) ? 'bi-star-fill' : 'bi-star'}`}
                  style={{ color: '#FFD700' }}
                ></i>
              ))}
            </div>
            <small className="text-muted">
              ({rating_count || 0} {(rating_count || 0) === 1 ? 'rating' : 'ratings'})
            </small>
          </div>
        </div>
        
        <div className="card-footer bg-transparent">
          <button 
            className="btn btn-sm btn-outline-secondary me-2"
            onClick={() => handleOpenPostDetails(id)}
          >
            <i className="bi bi-chat-text me-1"></i>
            {comment_count || 0} {(comment_count || 0) === 1 ? 'Comment' : 'Comments'}
          </button>
          
          {isUserPost && (
            <button 
              className="btn btn-sm btn-outline-danger"
              onClick={() => handleDeletePost(id)}
            >
              <i className="bi bi-trash me-1"></i>
              Delete
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <Navbar />
      <div className="container mt-4 mb-4">
        <h1 className="mb-3">Trading Community</h1>
        
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'community' ? 'active' : ''}`}
              onClick={() => handleTabChange('community')}
            >
              Community Feed
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'my-posts' ? 'active' : ''}`}
              onClick={() => handleTabChange('my-posts')}
            >
              My Posts
            </button>
          </li>
        </ul>
        
        {activeTab === 'community' && (
          <>
            <div className="d-flex justify-content-end mb-3">
              <button 
                className="btn btn-outline-secondary"
                onClick={() => setShowFilters(!showFilters)}
              >
                <i className="bi bi-funnel me-1"></i>
                Filter
              </button>
            </div>
            
            {showFilters && (
              <div className="card mb-4">
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Instrument</label>
                      <input
                        type="text"
                        className="form-control"
                        value={filters.instrument}
                        onChange={(e) => handleFilterChange('instrument', e.target.value)}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Outcome</label>
                      <select
                        className="form-select"
                        value={filters.outcome}
                        onChange={(e) => handleFilterChange('outcome', e.target.value)}
                      >
                        <option value="">All</option>
                        <option value="WIN">WIN</option>
                        <option value="LOSS">LOSS</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Direction</label>
                      <select
                        className="form-select"
                        value={filters.direction}
                        onChange={(e) => handleFilterChange('direction', e.target.value)}
                      >
                        <option value="">All</option>
                        <option value="BUY">BUY</option>
                        <option value="SELL">SELL</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="d-flex justify-content-end mt-3">
                    <button 
                      className="btn btn-outline-secondary me-2"
                      onClick={resetFilters}
                    >
                      Reset
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={applyFilters}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {loading ? (
              <div className="d-flex justify-content-center mt-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : error ? (
              <div className="alert alert-danger">{error}</div>
            ) : posts.length === 0 ? (
              <div className="text-center mt-5">
                <p>No community posts available. Be the first to share a trade!</p>
              </div>
            ) : (
              posts.map(post => renderPostCard(post))
            )}
          </>
        )}
        
        {activeTab === 'my-posts' && (
          <>
            {loading ? (
              <div className="d-flex justify-content-center mt-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : error ? (
              <div className="alert alert-danger">{error}</div>
            ) : userPosts.length === 0 ? (
              <div className="text-center mt-5">
                <p>You haven't shared any trades yet. Go to your journal entries and click the share button to share a trade.</p>
              </div>
            ) : (
              userPosts.map(post => renderPostCard(post, true))
            )}
          </>
        )}
        
        {/* Post Details Modal */}
        <div className={`modal ${selectedPost ? 'show' : ''}`} style={{ display: selectedPost ? 'block' : 'none' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              {loading ? (
                <div className="modal-body text-center p-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3">Loading post details...</p>
                </div>
              ) : error ? (
                <div className="modal-body text-center p-5">
                  <div className="alert alert-danger">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={handleClosePostDetails}
                  >
                    Close
                  </button>
                </div>
              ) : selectedPost && (
                <>
                  <div className="modal-header">
                    <h5 className="modal-title">{selectedPost.title}</h5>
                    <button 
                      type="button" 
                      className="btn-close"
                      onClick={handleClosePostDetails} 
                      aria-label="Close"
                    ></button>
                  </div>
                  
                  <div className="modal-body">
                    <p className="text-muted mb-3">
                      Posted by Anonymous on {formatDateSafe(selectedPost.created_at)}
                    </p>
                    
                    <p className="mb-4">{selectedPost.description}</p>
                    
                    {/* Trade information section */}
                    {selectedPost.entry_data && (
                      <div className="mb-4">
                        <h6>Trade Details:</h6>
                        <div className="row g-3">
                          {selectedPost.entry_data.instrument && (
                            <div className="col-6 col-sm-3">
                              <small className="text-muted d-block">Symbol:</small>
                              <span>{selectedPost.entry_data.instrument}</span>
                            </div>
                          )}
                          {selectedPost.entry_data.direction && (
                            <div className="col-6 col-sm-3">
                              <small className="text-muted d-block">Direction:</small>
                              <span className={selectedPost.entry_data.direction === 'BUY' ? 'text-success' : 'text-danger'}>
                                {selectedPost.entry_data.direction}
                              </span>
                            </div>
                          )}
                          {selectedPost.entry_data.outcome && (
                            <div className="col-6 col-sm-3">
                              <small className="text-muted d-block">Outcome:</small>
                              <span className={selectedPost.entry_data.outcome === 'WIN' ? 'text-success' : 'text-danger'}>
                                {selectedPost.entry_data.outcome}
                              </span>
                            </div>
                          )}
                          {selectedPost.entry_data.date && (
                            <div className="col-6 col-sm-3">
                              <small className="text-muted d-block">Date:</small>
                              <span>{selectedPost.entry_data.date}</span>
                            </div>
                          )}
                          {selectedPost.entry_data.profit_loss && (
                            <div className="col-6 col-sm-3">
                              <small className="text-muted d-block">P/L:</small>
                              <span className={parseFloat(selectedPost.entry_data.profit_loss) > 0 ? 'text-success' : 'text-danger'}>
                                {selectedPost.entry_data.profit_loss}
                              </span>
                            </div>
                          )}
                          {selectedPost.entry_data.risk_reward_ratio && (
                            <div className="col-6 col-sm-3">
                              <small className="text-muted d-block">R:R:</small>
                              <span>{selectedPost.entry_data.risk_reward_ratio}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {selectedPost.entry_images && selectedPost.entry_images.length > 0 && (
                      <div className="mb-4">
                        <h6>Trade Images</h6>
                        <div className="row g-2">
                          {selectedPost.entry_images.map(image => (
                            <div key={image.id} className="col-12 col-md-6 col-lg-4">
                              <div className="card h-100">
                                <img src={image.url} alt="Trade chart" className="card-img-top img-fluid" style={{ maxHeight: '200px', objectFit: 'contain' }} />
                                {image.description && (
                                  <div className="card-body p-2">
                                    <small className="text-muted">{image.description}</small>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mb-4">
                      <h6>Rate this trade:</h6>
                      <div className="rating-stars mb-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <i 
                            key={i}
                            className={`bi ${userRating >= i + 1 ? 'bi-star-fill' : 'bi-star'} text-warning me-1`}
                            style={{cursor: 'pointer', fontSize: '1.5rem'}}
                            onClick={() => {
                              setUserRating(i + 1);
                              handleSubmitRating(i + 1);
                            }}
                          ></i>
                        ))}
                      </div>
                      <small className="text-muted">
                        Current Rating: {parseFloat(selectedPost.average_rating || 0).toFixed(1)} ({selectedPost.rating_count || 0} {(selectedPost.rating_count || 0) === 1 ? 'rating' : 'ratings'})
                      </small>
                    </div>
                    
                    <div className="mb-4">
                      <h6>Comments ({selectedPost.comments ? selectedPost.comments.length : 0})</h6>
                      {!selectedPost.comments || selectedPost.comments.length === 0 ? (
                        <p className="text-muted">No comments yet. Be the first to comment!</p>
                      ) : (
                        selectedPost.comments.map(comment => (
                          <div key={comment.id || 'unknown'} className="mb-3 p-3 bg-light rounded">
                            <small className="text-muted d-block mb-1">
                              Anonymous on {formatDateSafe(comment.created_at)}:
                            </small>
                            <p className="mb-0">{comment.content || 'No content'}</p>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div>
                      <h6>Add a Comment</h6>
                      <textarea
                        className="form-control mb-2"
                        rows="3"
                        placeholder="What do you think about this trade?"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                  
                  <div className="modal-footer">
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={handleClosePostDetails}
                    >
                      Close
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={handleSubmitComment}
                      disabled={!commentText.trim()}
                    >
                      Submit Comment
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityPage;
