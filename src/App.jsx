import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Menyu from './Menyu';
import SignIn from './pages/SignIn';

function App() {
  // localStorage'dan ro'lni olish
  const isLoggedIn = localStorage.getItem('userRole') === 'CASHIER';

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<SignIn />} />
        <Route
          path="/menyu"
          element={isLoggedIn ? <Menyu /> : <Navigate to="/login" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
