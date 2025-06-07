import React, { useState, useEffect, useRef } from 'react';
import { Users, Wifi, WifiOff, ArrowLeft, Check, AlertTriangle, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { socket } from './socket';
import './Modal.css';

function SuccessModal({ onClose, onSuccess, orderCounts, dishes }) {
  const [tableId, setTableId] = useState('');
  const [tables, setTables] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showAllTables, setShowAllTables] = useState(false);
  const errorTimeoutRef = useRef(null);

  useEffect(() => {
    setIsLoading(true);
    fetch('https://suddocs.uz/tables/')
      .then((res) => res.json())
      .then((data) => {
        console.log('📋 Stollar yuklandi:', data);
        setTables(data.data || data);
      })
      .catch((err) => {
        console.error('❌ Stollarni olishda xatolik:', err);
        showError('Stollar ma\'lumotini olishda xatolik yuz berdi');
      })
      .finally(() => {
        setIsLoading(false);
      });

    const handleConnect = () => {
      console.log('🟢 SuccessModal: WebSocket ulandi');
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('🔴 SuccessModal: WebSocket uzildi');
      setIsConnected(false);
    };

    socket.on('create_order_response', (response) => {
      setIsLoading(false);
      if (response.status === 'ok') {
        console.log('✅ Buyurtma muvaffaqiyatli yaratildi');
        onSuccess(true);
        onClose();
      } else {
        console.error('❌ Buyurtma yaratishda xatolik:', response.message);
        showError(response.message || 'Buyurtma yuborishda xatolik yuz berdi');
      }
    });

    socket.on('update_table_status_response', (response) => {
      if (response.status === 'ok') {
        console.log('✅ Stol statusi yangilandi');
      } else {
        console.error('❌ Stol statusini yangilashda xatolik:', response.message);
        showError('Stol holatini yangilashda xatolik yuz berdi');
      }
    });

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('create_order_response');
      socket.off('update_table_status_response');
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [onClose, onSuccess]);

  function showError(msg) {
    setErrorMessage(msg);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    errorTimeoutRef.current = setTimeout(() => {
      setErrorMessage('');
    }, 5000);
  }

  function handleTableClick(table) {
    setTableId(table.number.toString());
  }

  function handleConfirm() {
    const enteredNumber = parseInt(tableId);
    const matchedTable = tables.find((t) => parseInt(t.number) === enteredNumber);

    if (!enteredNumber || !matchedTable) {
      showError('To\'g\'ri stol raqamini kiriting.');
      return;
    }

    if (matchedTable.status === 'busy') {
      showError('Bu stol hozir band. Iltimos, boshqa stolni tanlang.');
      return;
    }

    setIsLoading(true);
    sendOrder(matchedTable.id);
  }

  function sendOrder(selectedTableId) {
    const products = Object.entries(orderCounts)
      .filter(([dishId, count]) => count > 0)
      .map(([dishId, count]) => ({
        productId: parseInt(dishId),
        count: count,
      }));

    const totalPrice = Object.entries(orderCounts).reduce((sum, [dishId, count]) => {
      const dish = dishes.find((d) => d.id === parseInt(dishId));
      return sum + (dish ? dish.price * count : 0);
    }, 0);

    const userId = parseInt(localStorage.getItem('userId')) || null;

    const orderPayload = {
      products,
      tableId: selectedTableId,
      totalPrice,
      userId,
    };

    console.log('📦 Buyurtma yuborilmoqda:', orderPayload);

    if (socket.connected) {
      socket.emit('create_order', orderPayload);
      socket.emit('update_table_status', { tableId: selectedTableId, status: 'busy' });
    } else {
      console.log('🔄 Socket uzilgan, API ishlatilmoqda...');
      fallbackCreateOrder(orderPayload, selectedTableId);
    }
  }

  async function fallbackCreateOrder(orderPayload, selectedTableId) {
    try {
      const orderResponse = await fetch('https://suddocs.uz/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      if (!orderResponse.ok) {
        throw new Error('Buyurtma yaratishda xatolik');
      }

      const orderData = await orderResponse.json();
      console.log('✅ API orqali buyurtma yaratildi:', orderData);

      const tableResponse = await fetch(`https://suddocs.uz/tables/${selectedTableId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'busy' }),
      });

      if (!tableResponse.ok) {
        throw new Error('Stol statusini yangilashda xatolik');
      }

      console.log('✅ API orqali stol statusi yangilandi');
      setIsLoading(false);
      onSuccess(true);
      onClose();
    } catch (error) {
      console.error('❌ API orqali buyurtma yaratishda xatolik:', error);
      setIsLoading(false);
      showError('Buyurtma yuborishda xatolik yuz berdi. Qayta urinib ko\'ring.');
    }
  }

  const availableTables = tables.filter((table) => table.status !== 'busy');
  
  const tablesToShow = showAllTables ? availableTables : availableTables.slice(0, 10);

  return (
    <div className="modal-overlay">
      <div className="modal-content table-modal">
        <div className="modal-header">
          <h2 className="modal-title">
            <Users size={24} />
            Stol tanlash
          </h2>
          <div className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span className="connection-text">{isConnected ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        <div className="table-content">
          <p className="table-instruction">
            Buyurtmangiz qaysi stolga?{' '}
            <span className="available-count">({availableTables.length} ta bo'sh stol mavjud)</span>
          </p>

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

          {availableTables.length > 0 && (
            <div className="available-tables">
              <p className="available-label">Bo'sh stollar:</p>
              <div className="table-numbers">
                {tablesToShow.map((table) => (
                  <button
                    key={table.id}
                    className={`table-number-btn ${
                      tableId === table.number.toString() ? 'selected' : ''
                    } available`}
                    onClick={() => handleTableClick(table)}
                    disabled={isLoading}
                  >
                    {table.number}
                  </button>
                ))}
                {!showAllTables && availableTables.length > 10 && (
                  <button
                    className="more-tables-btn"
                    onClick={() => setShowAllTables(true)}
                    disabled={isLoading}
                  >
                    <ChevronRight size={16} />
                    +{availableTables.length - 10}
                  </button>
                )}
                {showAllTables && availableTables.length > 10 && (
                  <button
                    className="show-less-btn"
                    onClick={() => setShowAllTables(false)}
                    disabled={isLoading}
                  >
                    <ChevronLeft size={16} />
                    Kamroq ko'rsatish
                  </button>
                )}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="error-message">
              <AlertTriangle size={16} className="error-icon" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={isLoading}>
            <ArrowLeft size={16} />
            Orqaga
          </button>
          <button className="btn-primary" onClick={handleConfirm} disabled={isLoading || !tableId}>
            {isLoading ? (
              <>
                <Loader2 size={16} className="loading-spinner" />
                Yuborilmoqda...
              </>
            ) : (
              <>
                <Check size={16} />
                Tasdiqlash
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SuccessModal;