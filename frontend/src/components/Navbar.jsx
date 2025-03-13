import React from "react";
import { Link, useParams } from "react-router-dom";
import "../styles/Navbar.css";

function Navbar() {
  // Get the journal ID from URL parameters
  const params = useParams();
  // Extract the id from params, which might be called "id" or "journalId" depending on your route setup
  const journalId = params.id || params.journalId;
  
  // Log the current journal ID for debugging
  console.log('Navbar using journal ID:', journalId);

  return (
    <nav className="navbar">
      <ul className="navbar-list">
      <li className="navbar-item">
          <Link to={`/`} className="navbar-link">
            Home
          </Link>
        </li>
        <li className="navbar-item">
          <Link to={`/journal/${journalId}/feedback`} className="navbar-link">
            Dashboard
          </Link>
        </li>
        <li className="navbar-item">
          <Link to={`/journal/${journalId}/add-entry`} className="navbar-link">
            Journal
          </Link>
        </li>
        <li className="navbar-item">
          <Link to={`/journal/${journalId}/milestones`} className="navbar-link">
            Milestones
          </Link>
        </li>
        <li className="navbar-item">
          <Link to={`/journal/${journalId}/profile`} className="navbar-link">
            Profile
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;