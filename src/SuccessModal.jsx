import React, { useState, useEffect, useRef } from 'react';
import './Modal.css';

function SuccessModal({ onClose, onSuccess, orderCounts, dishes }) {
  const [tableId, setTableId] = useState('');
  const [tables, setTables] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const errorTimeoutRef = useRef(null);

  useEffect(() => {
    setIsLoading(true);
    fetch('https://suddocs.uz/tables/')
      .then(res => res.json())
      .then(data => {
        setTables(data.data || data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Stollarni olishda xatolik:', err);
        setIsLoading(false);
      });
  }, []);

  function showError(msg) {
    setErrorMessage(msg);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    errorTimeoutRef.current = setTimeout(() => {
      setErrorMessage('');
    }, 4000);
  }

  function handleConfirm() {
    const enteredNumber = parseInt(tableId);
    const matchedTable = tables.find(t => parseInt(t.number) === enteredNumber);

    if (!enteredNumber || !matchedTable) {
      showError('To\'g\'ri stol raqamini kiriting.');
      return;
    }

    if (matchedTable.status === "busy") {
      showError('Bu stol hozir band. Iltimos, boshqa stolni tanlang.');
      return;
    }

    setIsLoading(true);
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
        console.log('Buyurtma qo\'shildi:', data);
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
        setIsLoading(false);
        onClose();
      })
      .catch(err => {
        console.error('Xatolik:', err);
        setIsLoading(false);
        showError(err.message);
      });
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content table-modal">
        <div className="modal-header">
          <h2 className="modal-title">🪑 Stol tanlash</h2>
        </div>
        
        <div className="table-content">
          <p className="table-instruction">Buyurtmangiz qaysi stolga?</p>
          
          <div className="input-group">
            <label htmlFor="tableNumber" className="input-label">
              Stol raqami
            </label>
            <input
              id="tableNumber"
              type="number"
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              placeholder="Stol raqamini kiriting"
              min="1"
              className={`table-input ${errorMessage ? 'error' : ''}`}
              disabled={isLoading}
            />
          </div>

          {errorMessage && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button 
            className="btn-secondary" 
            onClick={onClose}
            disabled={isLoading}
          >
            ← Orqaga
          </button>
          <button 
            className="btn-primary" 
            onClick={handleConfirm}
            disabled={isLoading || !tableId}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Yuborilmoqda...
              </>
            ) : (
              <>
                ✓ Tasdiqlash
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SuccessModal;