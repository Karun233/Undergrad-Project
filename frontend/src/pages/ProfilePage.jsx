import react from 'react';

import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';



function Profile () {
    const { id } = useParams(); // Get the journal ID from the URL


return (
    <div>
        <Navbar />
        <h2>Profile for Journal {id}</h2>
        {/* Add your profile content here */}
    </div>
)

};

export default Profile;