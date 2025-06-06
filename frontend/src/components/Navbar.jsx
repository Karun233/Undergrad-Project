import React from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import "../styles/Navbar.css";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";

function Navbar({ journalIdProp }) {
  
  const params = useParams();
  
  const journalIdFromParams = params.id || params.journalId;
  
  const journalId = journalIdProp || journalIdFromParams;
  
  const location = useLocation();
  const path = location.pathname;
  
  // Add navigation for redirect after logout
  const navigate = useNavigate();
  
  // Logout function to clear tokens and redirect to login
  const handleLogout = () => {
    // Remove tokens from localStorage
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    // Redirect to login page
    navigate('/login');
  };
  
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span>Trading Journal</span>
        </Link>
        
        <ul className="navbar-list">
          <li className="navbar-item">
            <Link to="/" className={`navbar-link ${path === '/' ? 'active' : ''}`}>
              Home
            </Link>
          </li>
          {journalId && (
            <>
              <li className="navbar-item">
                <Link 
                  to={`/journal/${journalId}/feedback`} 
                  className={`navbar-link ${path.includes('/feedback') ? 'active' : ''}`}
                >
                  Dashboard
                </Link>
              </li>
              <li className="navbar-item">
                <Link 
                  to={`/journal/${journalId}/add-entry`} 
                  className={`navbar-link ${path.includes('/add-entry') ? 'active' : ''}`}
                >
                  Journal
                </Link>
              </li>
              <li className="navbar-item">
                <Link 
                  to="/leaderboard" 
                  className={`navbar-link ${path.includes('/leaderboard') ? 'active' : ''}`}
                >
                  Leaderboard
                </Link>
              </li>
              <li className="navbar-item">
                <Link 
                  to={`/journal/${journalId}/community`} 
                  className={`navbar-link ${path.includes('/community') ? 'active' : ''}`}
                >
                  Community
                </Link>
              </li>
              <li className="navbar-item">
                <Link 
                  to={`/journal/${journalId}/profile`} 
                  className={`navbar-link ${path.includes('/profile') ? 'active' : ''}`}
                >
                  Profile
                </Link>
              </li>
            </>
          )}
          {/* Add logout button */}
          <li className="navbar-item logout-item">
            <button onClick={handleLogout} className="navbar-link logout-button">
              Logout
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;