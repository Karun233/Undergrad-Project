import React from "react";
import { useParams } from "react-router-dom";

function Feedback() {
  const { id } = useParams(); // Get the journal ID from the URL

  return (
    <div>
      <h2>Feedback for Journal {id}</h2>
      {/* Add your feedback content here */}
      <p>This is where you can view and manage feedback for this journal.</p>
    </div>
  );
}

export default Feedback;