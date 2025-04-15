import { useState, useEffect } from "react";
import api from "../api";
import Journal from "../components/Journal";
import "../styles/Home.css";

function Home() {
  const [journals, setJournals] = useState([]);
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [maxRisk, setMaxRisk] = useState(1.0);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    api
      .delete(`/api/journal/delete/${id}/`)
      .then((res) => {
        if (res.status === 204) alert("Journal was deleted!");
        else alert("Failed to delete Journal.");
        getJournals();
      })
      .catch((error) => alert(error));
  };

  const createJournal = (e) => {
    e.preventDefault();
    api
      .post("/api/journal/", { 
        description, 
        title, 
        max_risk: parseFloat(maxRisk)
      })
      .then((res) => {
        if (res.status === 201) alert("Journal was created.");
        else alert("Failed to create Journal");
        closeModal();
        getJournals();
      })
      .catch((error) => alert(error));
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
  };

  // Stop propagation to prevent clicks inside the modal from closing it
  const handleModalContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="journal-page">
      <div className="journal-container">
        <h2>My Journals</h2>
        
        <div className="journals-list">
          {journals.length === 0 ? (
            <p className="no-journals">No journals yet. Create your first journal to get started!</p>
          ) : (
            journals.map((journal) => (
              <Journal journal={journal} onDelete={deleteJournal} key={journal.id} />
            ))
          )}
        </div>
        
        <button className="create-button" onClick={openModal}>
          Create New Journal
        </button>
      </div>

      {/* Modal with inline styles to ensure visibility */}
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
            <h2>Create New Journal</h2>
            
            <form onSubmit={createJournal}>
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
                  <span className="text-muted" style={{ fontSize: '0.85rem', marginLeft: '5px' }}>
                    (Used for risk management analysis)
                  </span>
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
                <small className="text-muted" style={{ display: 'block', marginTop: '5px' }}>
                  This is the maximum percentage of your account you're willing to risk on a single trade.
                </small>
              </div>
              
              <div className="form-buttons" style={{ display: 'flex', justifyContent: 'space-between' }}>
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
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Create Journal
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