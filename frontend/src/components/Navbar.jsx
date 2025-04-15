import React from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import "../styles/Navbar.css";

function Navbar() {
  // Get the journal ID from URL parameters
  const params = useParams();
  // Extract the id from params, which might be called "id" or "journalId" depending on your route setup
  const journalId = params.id || params.journalId;
  
  // Get current location to highlight active link
  const location = useLocation();
  const path = location.pathname;
  
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
                  to={`/journal/${journalId}/milestones`} 
                  className={`navbar-link ${path.includes('/milestones') ? 'active' : ''}`}
                >
                  Milestones
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
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;