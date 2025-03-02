import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Select from 'react-select';

function JournalEntries({ journalId }) {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    instrument: '',
    direction: '',
    outcome: '',
    risk_management: '',
    feeling_during: [],
    additional_comments: '',
  });

  // Predefined feelings
  const predefinedFeelings = [
    { value: 'confident', label: 'Confident' },
    { value: 'nervous', label: 'Nervous' },
    { value: 'excited', label: 'Excited' },
    { value: 'frustrated', label: 'Frustrated' },
    { value: 'calm', label: 'Calm' },
  ];

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await axios.get(`/api/journals/${journalId}/entries/`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setEntries(response.data);
      } catch (error) {
        console.error('Error fetching journal entries:', error);
        setError('Failed to fetch journal entries.');
      }
    };

    fetchEntries();
  }, [journalId]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const entryData = {
        ...formData,
        feeling_during: formData.feeling_during.map((feeling) => feeling.value),
      };
      await axios.post(`/api/journals/${journalId}/entries/create/`, entryData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      alert('Entry added successfully!');
      setFormData({
        date: '',
        instrument: '',
        direction: '',
        outcome: '',
        risk_management: '',
        feeling_during: [],
        additional_comments: '',
      });

      // Close the modal using Bootstrap JS
      const modal = document.getElementById('addEntryModal');
      const modalInstance = bootstrap.Modal.getInstance(modal);
      modalInstance.hide();

      // Refresh entries after adding
      const response = await axios.get(`/api/journals/${journalId}/entries/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setEntries(response.data);
    } catch (error) {
      console.error('Error adding entry:', error);
    }
  };

  return (
    <div className="journal-entries">
      <h2>Journal Entries</h2>

      {/* Add Entry Button */}
      <button
        type="button"
        className="btn btn-primary"
        data-bs-toggle="modal"
        data-bs-target="#addEntryModal"
      >
        Add New Entry
      </button>

      {/* Bootstrap Modal for Add Entry Form */}
      <div
        className="modal fade"
        id="addEntryModal"
        tabIndex="-1"
        aria-labelledby="addEntryModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="addEntryModalLabel">
                Add New Entry
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} className="add-entry-form">
                <div className="mb-3">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Instrument</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Instrument"
                    value={formData.instrument}
                    onChange={(e) => setFormData({ ...formData, instrument: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Direction</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Direction"
                    value={formData.direction}
                    onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Outcome</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Outcome"
                    value={formData.outcome}
                    onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Risk Management</label>
                  <textarea
                    className="form-control"
                    placeholder="Risk Management"
                    value={formData.risk_management}
                    onChange={(e) => setFormData({ ...formData, risk_management: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Feeling During</label>
                  <Select
                    isMulti
                    options={predefinedFeelings}
                    value={formData.feeling_during}
                    onChange={(selectedOptions) =>
                      setFormData({ ...formData, feeling_during: selectedOptions })
                    }
                    placeholder="How were you feeling during?"
                    isSearchable
                    isClearable
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Additional Comments</label>
                  <textarea
                    className="form-control"
                    placeholder="Additional Comments"
                    value={formData.additional_comments}
                    onChange={(e) => setFormData({ ...formData, additional_comments: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Add Entry
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Display Entries */}
      {error ? <p>{error}</p> : null}
      {entries.length === 0 ? (
        <p>No entries yet.</p>
      ) : (
        <ul className="list-group mt-3">
          {entries.map((entry, index) => (
            <li key={index} className="list-group-item">
              <strong>{entry.date}</strong> - {entry.instrument} - {entry.direction} - {entry.outcome}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default JournalEntries;
