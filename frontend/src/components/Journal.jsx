import React from "react";
import "../styles/Journal.css";
import { Link, useNavigate } from "react-router-dom";

function Journal({ journal, onDelete }) {
  const formattedDate = new Date(journal.created_at).toLocaleDateString(
    "en-US"
  );

  const navigate = useNavigate();

  const openJournal = () => {
    navigate(`/journal/${journal.id}/add-entry`);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(journal.id);
  };

  return (
    <div className="journal">
      <h3>{journal.title}</h3>
      <p>{journal.description}</p>
      <p className="journal-date">{formattedDate}</p>
      
      <div className="journal-buttons">
        <Link to={`/journal/${journal.id}/add-entry`}>
          <button className="btn btn-primary" onClick={openJournal}>
            Open Journal
          </button>
        </Link>
        <button 
          className="btn btn-outline-danger" 
          onClick={handleDeleteClick}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default Journal;