import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../api";


function JournalPage() {
  const { id } = useParams(); // Get the journal ID from the URL
  const [journal, setJournal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getJournal(); // Fetch the journal data when the component mounts
  }, []);

  const getJournal = () => {
    api
      .get(`/api/journal/${id}/`) // API call to fetch a single journal
      .then((res) => res.data)
      .then((data) => {
        setJournal(data); // Set the journal data
        setLoading(false); // Mark loading as complete
      })
      .catch((err) => {
        console.error("Error fetching journal:", err);
        setError("Failed to fetch the journal.");
        setLoading(false);
      });
  };

  if (loading) {
    return <p>Loading...</p>; // Display loading state
  }

  if (error) {
    return <p>{error}</p>; // Display error state
  }

  if (!journal) {
    return <p>Journal not found.</p>; // Handle case where no journal is found
  }

  return (
    <div className="journal-page">
      <h1>{journal.title}</h1>
    </div>
  );
}

export default JournalPage;
