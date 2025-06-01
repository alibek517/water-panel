import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import './editmodal.css';

const API_BASE = 'https://suddocs.uz';

function EditModal({
  show,
  onClose,
  order,
  dishes,
  newItem,
  setNewItem,
  onAddItem,
  onChangeCount,
  onRemoveItem,   // sizning prop nomingiz
  onSaveOrder,    // sizning save callback'ingiz
  token,          // ixtiyoriy
  onOrderUpdate,  // ixtiyoriy
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const modalRef = useRef(null);
  const [topPosition, setTopPosition] = useState(100);
  const [offsetY, setOffsetY] = useState(0);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    const rect = modalRef.current.getBoundingClientRect();
    setOffsetY(e.clientY - rect.top);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setTopPosition(e.clientY - offsetY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!show || !order) return null;

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // API request headers yaratish
  const createApiRequest = (authToken) => {
    return {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}` // yoki sizning auth formatga moslang
      }
    };
  };

  // Order'ni ID bo'yicha olish
  const fetchOrderById = async (orderId) => {
    try {
      const response = await axios.get(
        `${API_BASE}/order/${orderId}`,
        createApiRequest(token)
      );
      return response.data;
    } catch (error) {
      console.error('Orderni olishda xatolik:', error);
      return null;
    }
  };

  // Delete funksiyasi
  const handleRemoveItem = useCallback(
    async (itemId) => {
      if (!itemId) {
        console.error('❌ Item ID topilmadi');
        return;
      }

      // Tasdiqlash dialog
      if (!window.confirm('Ushbu elementni o\'chirishni xohlaysizmi?')) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // API'ga DELETE so'rov
        await axios.delete(
          `${API_BASE}/order/orderItem/${itemId}`,
          createApiRequest(token)
        );
        
        console.log(`✅ O'chirildi: itemId ${itemId}`);

        // Order'ni yangilash
        const updatedOrder = await fetchOrderById(order.id);
        if (updatedOrder && onOrderUpdate) {
          onOrderUpdate(updatedOrder);
        }

        // Yoki parent callback orqali yangilash
        if (onRemoveItem && typeof onRemoveItem === 'function') {
          await onRemoveItem(itemId);
        }

      } catch (error) {
        console.error('❌ O\'chirishda xatolik:', error.response?.data || error.message);
        setError('Taomni o\'chirishda xatolik yuz berdi: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    },
    [order.id, token, onOrderUpdate, onRemoveItem]
  );

  const handleSaveOrder = async () => {
    if (onSaveOrder && typeof onSaveOrder === 'function') {
      // Parent'dagi save funksiyasini chaqirish
      try {
        setLoading(true);
        setError(null);
        await onSaveOrder();
        onClose();
      } catch (err) {
        console.error('❌ Saqlash xatosi:', err);
        setError('Saqlashda xatolik yuz berdi: ' + (err.message || 'Noma\'lum xatolik'));
      } finally {
        setLoading(false);
      }
    } else {
      // Default save logic
      setLoading(true);
      setError(null);
      try {
        const itemsPayload = order.orderItems.map(item => ({
          id: item.id,
          productId: item.productId ?? item.product?.id,
          count: item.count,
          status: item.status === 'PENDING',
        }));

        const payload = {
          products: itemsPayload,
          status: 'COOKING'  // Order statusini COOKING qilish
        };

        const res = await axios.put(
          `${API_BASE}/order/${order.id}`,
          payload,
          createApiRequest(token)
        );

        console.log('PUT response:', res.data);
        onClose();
      } catch (err) {
        console.error('❌ Saqlash xatosi:', err.response?.data || err.message);
        setError('Saqlashda xatolik yuz berdi: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="edit-modal-overlay"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}>
      <div
        className="modal-content"
        ref={modalRef}
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          top: topPosition,
          left: '50%',
          transform: 'translateX(-50%)',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <h2>Buyurtmani tahrirlash (Stol №{order.table.number})</h2>

        <div className="order-items">
          {order.orderItems && order.orderItems.length > 0 ? (
            order.orderItems.map((item, idx) => (
              <div key={item.id || idx} className="order-item">
                <span>
                  {item.product?.name || 'Nomaʼlum'} — {item.count} dona{' '}
                  <small>({item.status})</small>
                </span>
                <div className="count-buttons">
                  <button
                    onClick={() => onChangeCount && onChangeCount(item.id, -1)}
                    disabled={loading}
                    title="Kamaytirish"
                  >–</button>
                  <button
                    onClick={() => onChangeCount && onChangeCount(item.id, 1)}
                    disabled={loading}
                    title="Ko'paytirish"
                  >+</button>
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={loading}
                    className="delete-button"
                    title="O'chirish"
                    style={{
                      backgroundColor: '#ff4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      marginLeft: '5px'
                    }}
                  >
                    {loading ? '⏳' : '🗑️'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>Buyurtmada hech qanday mahsulot yo'q</p>
          )}
        </div>

        <div className="new-item">
          <select
            value={newItem.productId || ''}
            onChange={e => setNewItem({ ...newItem, productId: e.target.value })}
            disabled={loading}
            className="select-dish"
          >
            <option value="">Taom tanlang</option>
            {dishes && dishes.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select><br /><br />
          <input
            type="number"
            min="1"
            className="input-count"
            placeholder="Soni"
            value={newItem.count === 0 ? '' : newItem.count}
            onChange={e => setNewItem({ ...newItem, count: Number(e.target.value) || 0 })}
            disabled={loading}
          />
          <button
            onClick={onAddItem}
            disabled={loading || !newItem.productId || !newItem.count}
          >
            Qo'shish
          </button>
        </div>

        {error && <div className="error" style={{color: 'red', marginTop: '10px'}}>{error}</div>}

        <div className="modal-actions">
          <button
            onClick={handleSaveOrder}
            className="save-button"
            disabled={loading}
          >
            {loading ? 'Yuklanmoqda...' : '✅ Saqlash'}
          </button>

          <button
            onClick={onClose}
            className="cancel-button"
            disabled={loading}
          >❌ Bekor qilish</button>
        </div>
      </div>
    </div>
  );
}

export default EditModal;
