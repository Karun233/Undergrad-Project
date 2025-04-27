import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import "../styles/Home.scss";

function Home() {
  const [journals, setJournals] = useState([]);
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [maxRisk, setMaxRisk] = useState(1.0);
  const [accountSize, setAccountSize] = useState(10000.00);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingJournalId, setEditingJournalId] = useState(null);

  useEffect(() => {
    getJournals();
  }, []);

  const getJournals = () => {
    api
      .get("/api/journal/")
      .then((res) => res.data)
      .then((data) => {
        setJournals(data);
        console.log("Journals loaded:", data);
      })
      .catch((err) => alert(err));
  };

  const deleteJournal = (id) => {
    setIsDeleting(true);
    api
      .delete(`/api/journal/delete/${id}/`)
      .then((res) => {
        if (res.status === 204) {
          console.log("Journal was deleted successfully");
        } else console.error("Failed to delete Journal.");
        getJournals();
      })
      .catch((error) => console.error(error))
      .finally(() => setIsDeleting(false));
  };

  const createJournal = (e) => {
    e.preventDefault();
    api
      .post("/api/journal/", { 
        description, 
        title, 
        max_risk: parseFloat(maxRisk),
        account_size: parseFloat(accountSize)
      })
      .then((res) => {
        if (res.status === 201) console.log("Journal was created.");
        else console.error("Failed to create Journal");
        closeModal();
        getJournals();
      })
      .catch((error) => console.error(error));
  };

  const openModal = () => {
    console.log("Opening modal");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    console.log("Closing modal");
    setIsModalOpen(false);
    setTitle("");
    setDescription("");
    setMaxRisk(1.0);
    setAccountSize(10000.00);
  };

  // Stop propagation to prevent clicks inside the modal from closing it
  const handleModalContentClick = (e) => {
    e.stopPropagation();
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'numeric', 
      day: 'numeric' 
    });
  };

  // Update existing journal
  const updateJournal = (e, id) => {
    e.preventDefault();
    api
      .put(`/api/journal/update/${id}/`, { 
        description, 
        title, 
        max_risk: parseFloat(maxRisk),
        account_size: parseFloat(accountSize)
      })
      .then((res) => {
        if (res.status === 200) console.log("Journal was updated.");
        else console.error("Failed to update Journal");
        closeModal();
        getJournals();
        // Reset editing state
        setIsEditing(false);
        setEditingJournalId(null);
      })
      .catch((error) => console.error(error));
  };

  return (
    <div className="journal-page">
      <div className="journal-container">
        <h2>My Journals</h2>
        
        {journals.length === 0 ? (
          <p className="no-journals">No journals yet. Create your first journal to get started!</p>
        ) : (
          <div className="journals-list">
            {journals.map((journal) => (
              <div className="journal-item" key={journal.id}>
                <div className="journal-details">
                  <h3>{journal.title}</h3>
                  <p>{journal.description}</p>
                  <div className="journal-meta">
                    <p className="journal-date">{formatDate(journal.created_at)}</p>
                    <p className="journal-risk">Max Risk: {journal.max_risk}%</p>
                    <p className="journal-account-size">Account Size: ${journal.account_size || "N/A"}</p>
                  </div>
                  <div className="journal-actions">
                    <Link to={`/journal/${journal.id}/add-entry`}>
                      <button className="open-journal-btn">Open Journal</button>
                    </Link>
                    <div className="journal-management-buttons">
                      <button 
                        className="delete-btn" 
                        onClick={() => deleteJournal(journal.id)}
                        disabled={isDeleting}
                      >
                        Delete
                      </button>
                      <button 
                        className="edit-btn" 
                        onClick={() => {
                          setIsEditing(true);
                          setEditingJournalId(journal.id);
                          setTitle(journal.title);
                          setDescription(journal.description);
                          setMaxRisk(journal.max_risk);
                          setAccountSize(journal.account_size);
                          openModal();
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <button className="create-button" onClick={openModal}>
          Create New Journal
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div 
          className="modal-overlay" 
          onClick={closeModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            className="modal-content"
            onClick={handleModalContentClick}
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '5px',
              width: '80%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
          >
            <h2>{isEditing ? 'Edit Journal' : 'Create New Journal'}</h2>
            
            <form onSubmit={isEditing ? (e) => updateJournal(e, editingJournalId) : createJournal}>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label htmlFor="title" style={{ display: 'block', marginBottom: '5px' }}>Title:</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  onChange={(e) => setTitle(e.target.value)}
                  value={title}
                  placeholder="Enter journal title"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label htmlFor="description" style={{ display: 'block', marginBottom: '5px' }}>Description:</label>
                <textarea
                  id="description"
                  name="description"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter journal description"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    minHeight: '100px',
                    resize: 'vertical'
                  }}
                ></textarea>
              </div>
              
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label htmlFor="maxRisk" style={{ display: 'block', marginBottom: '5px' }}>
                  Maximum Risk Per Trade (%):
                </label>
                <input
                  type="number"
                  id="maxRisk"
                  name="maxRisk"
                  required
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={maxRisk}
                  onChange={(e) => setMaxRisk(e.target.value)}
                  placeholder="Enter maximum risk percentage"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  This is the maximum percentage of your account you're willing to risk on a single trade.
                </small>
              </div>
              
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label htmlFor="accountSize" style={{ display: 'block', marginBottom: '5px' }}>
                  Account Size ($):
                </label>
                <input
                  type="number"
                  id="accountSize"
                  name="accountSize"
                  required
                  min="0.00"
                  step="0.01"
                  value={accountSize}
                  onChange={(e) => setAccountSize(e.target.value)}
                  placeholder="Enter account size"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  This is the initial size of your trading account.
                </small>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button 
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {isEditing ? 'Update Journal' : 'Create Journal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;