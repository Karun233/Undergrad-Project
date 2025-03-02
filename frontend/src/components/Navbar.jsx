import React from "react";
import { Link } from "react-router-dom";

function Navbar({ journalId }) {
  return (
    <nav className="navbar">
      <ul className="navbar-list">
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
        <li className="navbar-item">
          <Link to={`/journal/${journalId}/feedback`} className="navbar-link">
            Feedback
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;