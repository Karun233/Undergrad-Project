import React from "react";
import "../styles/Journal.css";
import { Navigate, useNavigate } from "react-router-dom";

function Journal({ journal, onDelete }) {
  const formattedDate = new Date(journal.created_at).toLocaleDateString(
    "en-US"
  );

  const navigate = useNavigate();

  const openJournal = () => {
    navigate(`/journal/${journal.id}/add-entry`)

}

  return (
    <div className="journal-container" onClick={openJournal}>
      <p className="journal-title">{journal.title}</p>
      <p className="journal-description">{journal.description}</p>
      <p className="journal-date">{formattedDate}</p>
      <button className="delete-button" onClick={() => onDelete(journal.id)}>
        Delete
      </button>
    </div>
  );
}

export default Journal;
