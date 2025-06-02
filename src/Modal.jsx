import React, { useRef, useState, useEffect } from 'react';
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
    
    // Prevent body scroll when modal is open
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
          <h2 className="modal-title">📋 Buyurtma Tafsilotlari</h2>
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
                <span className="empty-icon">🍽️</span>
                <p>Hozircha buyurtmalar mavjud emas</p>
              </div>
            )}
          </div>

          <div className="pricing-breakdown">
            <div className="pricing-row subtotal">
              <span>Jami:</span>
              <span className="price-value">{formatPrice(totalPrice)}</span>
            </div>
            <div className="pricing-row service">
              <span>Xizmat haqi (4%):</span>
              <span className="price-value">{formatPrice(totalPrice * 0.04)}</span>
            </div>
            <div className="pricing-row total">
              <span>Umumiy to'lov:</span>
              <span className="price-value">{formatPrice(totalPrice * 1.04)}</span>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="btn-primary" onClick={onConfirm}>
            ✓ Tasdiqlash
          </button>
        </div>
      </div>
    </div>
  );
}

export default Modal;