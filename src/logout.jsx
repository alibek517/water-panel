import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Logout.css';

function Logout() {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogoutClick = () => {
    setShowConfirm(true);
  };

  const confirmLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
        navigate('/login');
      
  };

  const cancelLogout = () => {
    setShowConfirm(false);
  };

  return (
    <div className="logout-container">
      <h2>Rostan ham chiqib ketmoqchimisiz?</h2>
      <div className="btn-group">
        <button className="btn cancel" onClick={() => navigate(-1)}>Yo‘q, ortga</button>
        <button className="btn confirm" onClick={handleLogoutClick}>Ha, albatta</button>
      </div>

      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <p>Aniq tark etmoqchimisiz?</p>
            <div className="modal-buttons">
              <button className="btn cancel" onClick={cancelLogout}>Yo‘q</button>
              <button className="btn confirm" onClick={confirmLogout}>Ha</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Logout;
