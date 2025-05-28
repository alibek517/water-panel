import React, { useState, useEffect } from 'react';
import './Modal.css';

function SuccessModal({ onClose, onSuccess, orderCounts, dishes }) {
  const [tableNumber, setTableNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [hideError, setHideError] = useState(false); 

  useEffect(() => {
    if (errorMessage) {
      setHideError(false); 
      const timer = setTimeout(() => {
        setHideError(true); 
        setTimeout(() => setErrorMessage(''), 500); 
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  function handleConfirm() {
    const isValid = tableNumber && parseInt(tableNumber) > 0;
    if (isValid) {
      onSuccess(isValid);
      back();
    } else {
      setErrorMessage('Iltimos, to‘g‘ri stol raqamini kiriting.');
    }
  }

  function back() {
    const now = new Date();
    const vaqt = now.toLocaleString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  

    const products = Object.entries(orderCounts)
      .filter(([dishId, count]) => count > 0)
      .map(([dishId, count]) => ({
        productId: parseInt(dishId),
        count: count
      }));
  
      fetch('http://109.172.37.41:4000/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          products: products,
          tableNumber: tableNumber,
          totalPrice: vaqt,
          userId: 2
        })
      })
      .then(res => {
        if (!res.ok) {
          throw new Error('Buyurtma yuborishda xatolik yuz berdi');
        }
        return res.json();
      })
      .then(data => {
        console.log('Buyurtma qo‘shildi:', data);
        onClose();
      })
      .catch(err => {
        console.error('Xatolik:', err);
        setErrorMessage('Buyurtma yuborishda xatolik yuz berdi. Iltimos, qayta urinib ko‘ring.');
      });
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Nechanchi stolga buyurtma?</h2>
        <input
          type="number"
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          placeholder="Stol raqami"
          min="1"
        />
        {errorMessage && (
          <p className={`error-message ${hideError ? 'hide' : ''}`}>{errorMessage}</p>
        )}
        <div className="button-group">
          <button className="close-btn" onClick={onClose}>Orqaga</button>
          <button className="confirm-btn" onClick={handleConfirm}>Tasdiqlash</button>
        </div>
      </div>
    </div>
  );
}

export default SuccessModal;
