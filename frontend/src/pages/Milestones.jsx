import React from "react";
import { useParams } from "react-router-dom";

function Milestones() {
  const { id } = useParams(); // Get the journal ID from the URL

  return (
    <div>
      <h2>Milestones for Journal {id}</h2>
      {/* Add your milestones content here */}
    </div>
  );
}

export default Milestones;