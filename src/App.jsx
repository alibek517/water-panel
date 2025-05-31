import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Menyu from './Menyu';
import Logout from './logout';
import SignIn from './pages/SignIn';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setIsLoggedIn(role === 'CASHIER');
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<SignIn />} />
        <Route path="/logout" element={<Logout />} />
        <Route
          path="/menyu"
          element={<Menyu />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
