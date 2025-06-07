import React, { useRef, useState, useEffect } from 'react';
import { ClipboardList, Utensils, Check, X } from 'lucide-react';
import './Modal.css';

function Modal({ orderCounts, dishes, onClose, onConfirm }) {
  const modalRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [topPosition, setTopPosition] = useState(100);
  const [offsetY, setOffsetY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleMouseDown = (e) => {
    if (isMobile) return;
    
    setIsDragging(true);
    const rect = modalRef.current.getBoundingClientRect();
    setOffsetY(e.clientY - rect.top);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || isMobile) return;
    
    const newTop = Math.max(20, Math.min(window.innerHeight - 100, e.clientY - offsetY));
    setTopPosition(newTop);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const orderedItems = Object.keys(orderCounts)
    .map(dishId => {
      const dish = dishes.find(d => d.id === parseInt(dishId));
      return {
        name: dish?.name,
        count: orderCounts[dishId],
        price: dish?.price,
      };
    })
    .filter(item => item.count > 0);

  const totalPrice = orderedItems.reduce((total, item) => total + item.count * item.price, 0);
  
  function formatPrice(price) {
    const formatted = price.toLocaleString('uz-UZ');
    return formatted + ' so\'m';
  }

  const modalStyle = isMobile ? {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    cursor: 'default'
  } : {
    position: 'absolute',
    top: topPosition,
    left: '50%',
    transform: 'translateX(-50%)',
    cursor: isDragging ? 'grabbing' : 'grab'
  };

  return (
    <div
      className="modal-overlay"
      onMouseMove={!isMobile ? handleMouseMove : undefined}
      onMouseUp={!isMobile ? handleMouseUp : undefined}
    >
      <div
        className="modal-content order-modal"
        ref={modalRef}
        onMouseDown={!isMobile ? handleMouseDown : undefined}
        style={modalStyle}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            <ClipboardList size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Buyurtma Tafsilotlari
          </h2>
        </div>

        <div className="order-content">
          <div className="order-list">
            {orderedItems.length > 0 ? (
              orderedItems.map((item, index) => (
                <div key={index} className="order-item">
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-quantity">{item.count} ta</span>
                  </div>
                  <div className="item-pricing">
                    <span className="item-price">{formatPrice(item.price)}</span>
                    <span className="item-total">{formatPrice(item.price * item.count)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-order">
                <Utensils size={48} className="empty-icon" style={{ color: '#ccc', marginBottom: '10px' }} />
                <p>Hozircha buyurtmalar mavjud emas</p>
              </div>
            )}
          </div>

          <div className="pricing-breakdown">
            <div className="pricing-row subtotal">
              <span>Jami:</span>
              <span className="price-value">{formatPrice(totalPrice)}</span>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-primary" onClick={onConfirm}>
            <Check size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Tasdiqlash
          </button>
          <button className="btn-secondary" onClick={onClose}>
            <X size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Bekor qilish
          </button>
        </div>
      </div>
    </div>
  );
}

export default Modal;