import react from 'react';

import { useParams } from 'react-router-dom';


function Profile () {
    const { id } = useParams(); // Get the journal ID from the URL


return (
    <div>
        <h2>Profile for Journal {id}</h2>
        {/* Add your profile content here */}
    </div>
)

};

export default Profile;