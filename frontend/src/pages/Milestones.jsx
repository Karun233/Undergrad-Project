import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import api from "../api";
import { useNavigate } from "react-router-dom";

function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/leaderboard/`);
        
        setLeaderboard(response.data.leaderboard);
        setUserRank(response.data.user_rank);
        setUserScore(response.data.user_score);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch leaderboard data");
        setLoading(false);
        console.error("Error with leaderboard:", err);
      }
    };

    fetchLeaderboard();
  }, [navigate]);

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container mt-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading leaderboard...</p>
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
        <h2 className="mb-4">Leaderboard</h2>
        
        {/* User's rank if not in top 10 */}
        {!leaderboard.some(user => user.username === localStorage.getItem('username')) && (
          <div className="card mb-4 shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Your Ranking</h5>
              <div className="d-flex align-items-center">
                <div className="badge bg-secondary rounded-pill me-3" style={{ fontSize: "1.2rem", padding: "8px 16px" }}>
                  #{userRank}
                </div>
                <div>
                  <h6 className="mb-0">{localStorage.getItem('username')}</h6>
                  <small className="text-muted">{userScore} {userScore === 1 ? 'score' : 'scores'}</small>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Top 10 Leaderboard */}
        <div className="card shadow-sm">
          <div className="card-header bg-light">
            <h4 className="mb-0">Top 10 Traders</h4>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th className="ps-4">Rank</th>
                    <th>Username</th>
                    <th className="text-end pe-4">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length > 0 ? (
                    leaderboard.map((user, index) => (
                      <tr key={index} className={user.username === localStorage.getItem('username') ? "table-primary" : ""}>
                        <td className="ps-4">
                          <span className="badge bg-primary rounded-pill">#{index + 1}</span>
                        </td>
                        <td>{user.username}</td>
                        <td className="text-end pe-4">{user.score}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="text-center py-4">No data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-center text-muted">
          <small>Earn 1 score point for each journal entry you create</small>
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;