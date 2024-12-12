import React from "react";

function Journal({ journal, onDelete }) {
  const formattedDate = new Date(journal.created_at).toLocaleDateString(
    "en-US"
  );

  return (
    <div className="journal-container">
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
