import { useState, useEffect } from "react";
import api from "../api";
import Journal from "../components/Journal";

function Home() {
  const [journals, setJournals] = useState([]);
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
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
        console.log(data);
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
      .post("/api/journal/", { description, title })
      .then((res) => {
        if (res.status === 201) alert("Journal was created.");
        else alert("Failed to create Journal");
        handleCloseModal();
        getJournals();
      })
      .catch((error) => alert(error));
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div>
      <div>
        <h2>Journals</h2>
        {journals.map((journal) => (
          <Journal journal={journal} onDelete={deleteJournal} key={journal.id} />
        ))}
      </div>
      <button onClick={handleOpenModal}>Create New Journal</button>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Add a Journal</h2>
            <form onSubmit={createJournal}>
              <label htmlFor="title">Title:</label>
              <br />
              <input
                type="text"
                id="title"
                name="title"
                required
                onChange={(e) => setTitle(e.target.value)}
                value={title}
              />
              <label htmlFor="title">Description:</label>
              <br />
              <textarea
                id="description"
                name="description"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
              <input type="submit" value="Submit"></input>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
