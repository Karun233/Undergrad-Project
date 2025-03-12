import React from "react";
import "../styles/Journal.css";
import { useNavigate } from "react-router-dom";

function Journal({ journal, onDelete }) {
  const formattedDate = new Date(journal.created_at).toLocaleDateString(
    "en-US"
  );

  const navigate = useNavigate();

  const openJournal = () => {
    navigate(`/journal/${journal.id}/add-entry`);
  };

  // This is the key function that prevents navigation when clicking delete
  const handleDeleteClick = (e) => {
    // Stop the event from reaching the parent container
    e.stopPropagation();
    
    // Now we can safely call onDelete without triggering navigation
    onDelete(journal.id);
  };

  return (
    <div className="journal-container" onClick={openJournal}>
      <p className="journal-title">{journal.title}</p>
      <p className="journal-description">{journal.description}</p>
      <p className="journal-date">{formattedDate}</p>
      {/* Use our new handler instead of the inline function */}
      <button className="delete-button" onClick={handleDeleteClick}>
        Delete
      </button>
    </div>
  );
}

export default Journal;