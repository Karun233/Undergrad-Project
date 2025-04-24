import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api";
import { useNavigate } from "react-router-dom";

function Milestones() {
  const { id } = useParams(); // Get the journal ID from the URL
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Fetch milestones data
  useEffect(() => {
    const fetchMilestones = async () => {
      try {
        const response = await api.get(`/api/journal/${id}/milestones/`);
        
        setMilestones(response.data);
        setLoading(false);
        
        // If no milestones exist yet, create default ones
        if (response.data.length === 0) {
          createDefaultMilestones();
        }
      } catch (err) {
        setError("Failed to fetch milestones");
        setLoading(false);
        console.error("Error fetching milestones:", err);
      }
    };

    fetchMilestones();
  }, [id, navigate]);

  // Create default milestones if none exist
  const createDefaultMilestones = async () => {
    try {
      // Create "Followed Plan" milestone
      await api.post(
        `/api/journal/${id}/milestones/create/`,
        {
          name: "Followed Plan",
          description: "Complete 5 trades where you followed your trading plan",
          type: "followed_plan",
          target: 5,
          current_progress: 0
        }
      );

      // Create "Journal Trade" milestone
      await api.post(
        `/api/journal/${id}/milestones/create/`,
        {
          name: "Journal Trade",
          description: "Record 10 trades in your journal",
          type: "journal_trade",
          target: 10,
          current_progress: 0
        }
      );

      // Refresh the milestones
      const response = await api.get(`/api/journal/${id}/milestones/`);
      setMilestones(response.data);
    } catch (err) {
      console.error("Error creating default milestones:", err);
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container mt-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
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
      <div className="container mt-5">
        <h2 className="mb-4">Milestones for Journal {id}</h2>
        <div className="row">
          {milestones.map((milestone) => (
            <div className="col-md-6 mb-4" key={milestone.id}>
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="milestone-icon me-3">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="40" 
                        height="40" 
                        fill={milestone.completed ? "#28a745" : "#6c757d"} 
                        className="bi bi-trophy" 
                        viewBox="0 0 16 16"
                      >
                        <path d="M2.5.5A.5.5 0 0 1 3 0h10a.5.5 0 0 1 .5.5c0 .538-.012 1.05-.034 1.536a3 3 0 1 1-1.133 5.89c-.79 1.865-1.878 2.777-2.833 3.011v2.173l1.425.356c.194.048.377.135.537.255L13.3 15.1a.5.5 0 0 1-.3.9H3a.5.5 0 0 1-.3-.9l1.838-1.379c.16-.12.343-.207.537-.255L6.5 13.11v-2.173c-.955-.234-2.043-1.146-2.833-3.012a3 3 0 1 1-1.132-5.89A33.076 33.076 0 0 1 2.5.5zm.099 2.54a2 2 0 0 0 .72 3.935c-.333-1.05-.588-2.346-.72-3.935zm10.083 3.935a2 2 0 0 0 .72-3.935c-.133 1.59-.388 2.885-.72 3.935z"/>
                      </svg>
                    </div>
                    <div>
                      <h5 className="card-title mb-0">{milestone.name}</h5>
                      <p className="text-muted small mb-0">
                        {milestone.current_progress} / {milestone.target}
                      </p>
                    </div>
                  </div>
                  <p className="card-text">{milestone.description}</p>
                  <div className="progress mt-3" style={{ height: "10px" }}>
                    <div 
                      className={`progress-bar ${milestone.completed ? 'bg-success' : 'bg-primary'}`}
                      role="progressbar" 
                      style={{ width: `${milestone.progress_percentage}%` }} 
                      aria-valuenow={milestone.progress_percentage} 
                      aria-valuemin="0" 
                      aria-valuemax="100"
                    >
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Milestones;