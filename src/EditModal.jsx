import React, { useEffect, useState, useRef } from 'react';
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

  const handleSaveOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      // Dinamik uzunlikdagi payload
      const itemsPayload = order.orderItems.map(item => ({
        productId: item.productId ?? item.product?.id,
        count: item.count
      }));

      // Agar backend products nomi yoki orderItems nomi kerak bo'lsa shu yerda o'zgartiring
      const payload = { 
        products: itemsPayload 
      };

      const res = await axios.put(
        `${API_BASE}/order/${order.id}`,
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );
      console.log('PUT response:', res.data);
      onClose();
    } catch (err) {
      console.error('❌ Saqlash xatosi:', err.response?.data || err.message);
      setError('Saqlashda xatolik yuz berdi');
    } finally {
      setLoading(false);
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

        

        <h2>Buyurtmani tahrirlash (Stol №{order.tableNumber})</h2>

        <div className="order-items">
          {order.orderItems.map((item, idx) => (
            <div key={item.id || idx} className="order-item">
              <span>
                {item.product?.name || 'Nomaʼlum'} — {item.count} dona
              </span>
              <div className="count-buttons">
                <button 
                  onClick={() => onChangeCount(item.id, -1)} 
                  disabled={loading}
                >–</button>
                <button 
                  onClick={() => onChangeCount(item.id, 1)} 
                  disabled={loading}
                >+</button>
              </div>
            </div>
          ))}
        </div>

        <div className="new-item">
          <select
            value={newItem.productId}
            onChange={e => setNewItem({ ...newItem, productId: e.target.value })}
            disabled={loading}
            className='select-dish'
          >
            <option value="">Taom tanlang</option>
            {dishes.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select><br /><br />
          <input
            type="number"
            min="1"
            className='input-count'
            placeholder="Soni"
            value={newItem.count === 0 ? '' : newItem.count}
            onChange={e => setNewItem({ ...newItem, count: Number(e.target.value) })}
            
            disabled={loading}
          />
          <button onClick={onAddItem} disabled={loading || !newItem.productId || !newItem.count}>

            Qo‘shish
          </button>
        </div>

        {error && <div className="error">{error}</div>}

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
