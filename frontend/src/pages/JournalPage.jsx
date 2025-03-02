import { Link } from "react-router-dom";

function Journal({ journal, onDelete }) {
  return (
    <div className="journal">
      <h3>{journal.title}</h3>
      <p>{journal.description}</p>
      <button onClick={() => onDelete(journal.id)}>Delete</button>
      
      {/* Redirects to add-entry instead of journal page */}
      <Link to={`/journal/${journal.id}/add-entry`}>
        <button>Add Entry</button>
      </Link>
    </div>
  );
}

export default Journal;
