import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { getFullImageUrl } from '../utils/imageUtils';

// Helper to format date as 'Tuesday, 11th April 2025'
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const dayName = date.toLocaleString('default', { weekday: 'long' });
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();
  // Get ordinal suffix
  const getOrdinal = (n) => {
    if (n > 3 && n < 21) return 'th';
    switch (n % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  return `${dayName}, ${day}${getOrdinal(day)} ${month} ${year}`;
}

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

      {/* Table for displaying entries */}
      {error ? <p>{error}</p> : null}
      {entries.length === 0 ? (
        <p>No entries yet.</p>
      ) : (
        <div className="table-responsive mt-3">
          <table className="table table-bordered table-striped compact-journal-table journal-entries-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Followed Strategy</th>
                <th>Instrument</th>
                <th>Direction</th>
                <th>Outcome</th>
                <th>Risk:Reward</th>
                <th>P&L</th>
                <th>Risk %</th>
                <th>Risk Management</th>
                <th>Feeling Before</th>
                <th>Feeling During</th>
                <th>Review</th>
                <th>Images</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={index}>
                  <td>{formatDate(entry.date)}</td>
                  <td>{entry.follow_strategy === true ? 'Yes' : entry.follow_strategy === false ? 'No' : ''}</td>
                  <td>{entry.instrument}</td>
                  <td>{entry.direction}</td>
                  <td>{entry.outcome}</td>
                  <td>{entry.risk_reward_ratio || ''}</td>
                  <td className={entry.profit_loss > 0 ? 'text-success' : entry.profit_loss < 0 ? 'text-danger' : ''}>
                    {entry.profit_loss !== undefined && entry.profit_loss !== null && entry.profit_loss !== '' ? parseFloat(entry.profit_loss).toFixed(2) : ''}
                  </td>
                  <td>{entry.risk_percent !== undefined && entry.risk_percent !== null && entry.risk_percent !== '' ? `${parseFloat(entry.risk_percent).toFixed(2)}%` : ''}</td>
                  <td>{entry.risk_management}</td>
                  <td>{entry.feeling_before}</td>
                  <td>{entry.feeling_during_text}</td>
                  <td>{entry.review}</td>
                  <td>
                    {entry.images && entry.images.length > 0 && (
                      <div className="d-flex flex-wrap">
                        {entry.images.slice(0, 2).map((image, idx) => (
                          <img 
                            key={idx}
                            src={getFullImageUrl(image)}
                            alt={`Trade image ${idx + 1}`}
                            style={{ 
                              width: '40px', 
                              height: '40px', 
                              objectFit: 'cover',
                              margin: '2px',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                            // Optional: add onClick for modal preview
                          />
                        ))}
                        {entry.images.length > 2 && (
                          <span 
                            className="badge bg-secondary"
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              width: '40px', 
                              height: '40px',
                              margin: '2px',
                              cursor: 'pointer'
                            }}
                          >
                            +{entry.images.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    {/* Placeholder for Edit/Delete actions if implemented */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default JournalEntries;
