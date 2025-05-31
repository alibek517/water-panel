import React, { useState, useEffect, useRef } from 'react';
import './Modal.css';

function SuccessModal({ onClose, onSuccess, orderCounts, dishes }) {
  const [tableId, setTableId] = useState('');
  const [tables, setTables] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const errorTimeoutRef = useRef(null);

  useEffect(() => {
    fetch('https://suddocs.uz/tables/')
      .then(res => res.json())
      .then(data => {
        setTables(data.data || data);
      })
      .catch(err => console.error('Stollarni olishda xatolik:', err));
  }, []);

  function showError(msg) {
    setErrorMessage(msg);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    errorTimeoutRef.current = setTimeout(() => {
      setErrorMessage('');
    }, 3000);
  }

  function handleConfirm() {
    const enteredNumber = parseInt(tableId);
    const matchedTable = tables.find(t => parseInt(t.number) === enteredNumber);

    if (!enteredNumber || !matchedTable) {
      showError('To‘g‘ri stol raqamini kiriting.');
      return;
    }

    if (matchedTable.status === "busy") {
      showError('Bu stol hozir band. Iltimos, boshqa stolni tanlang.');
      return;
    }

    onSuccess(true);
    sendOrder(matchedTable.id);
  }

  function sendOrder(tableId) {
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

    const totalPrice = Object.entries(orderCounts)
      .reduce((sum, [dishId, count]) => {
        const dish = dishes.find(d => d.id === parseInt(dishId));
        return sum + (dish ? dish.price * count : 0);
      }, 0);

    const userId = localStorage.getItem('userId') || 0;

    fetch('https://suddocs.uz/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        products,
        tableId,
        totalPrice,
        userId: parseInt(userId),
        time: vaqt
      })
    })
      .then(res => {
        if (!res.ok) throw new Error('Buyurtma yuborishda xatolik yuz berdi');
        return res.json();
      })
      .then(data => {
        console.log('Buyurtma qo‘shildi:', data);
        return fetch(`https://suddocs.uz/tables/${tableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: "busy" })
        });
      })
      .then(res => {
        if (!res.ok) throw new Error('Jadval statusini yangilashda xatolik');
        return res.json();
      })
      .then(() => {
        onClose();
      })
      .catch(err => {
        console.error('Xatolik:', err);
        showError(err.message);
      });
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Nechanchi stolga buyurtma?</h2>
        <input
          type="number"
          value={tableId}
          onChange={(e) => setTableId(e.target.value)}
          placeholder="Stol raqami"
          min="1"
        />
        {errorMessage && (
          <p className="error-message">{errorMessage}</p>
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
